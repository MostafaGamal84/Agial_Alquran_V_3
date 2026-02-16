// angular import
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';

// angular material
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';


// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';
import {
  LookupService,
  LookUpUserDto,
  FilteredResultRequestDto,
} from 'src/app/@theme/services/lookup.service';
import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';
import { ManagerDetailsComponent } from '../manager-details/manager-details.component';
import { LoadingOverlayComponent } from 'src/app/@theme/components/loading-overlay/loading-overlay.component';
import { ToastService } from 'src/app/@theme/services/toast.service';
@Component({
  selector: 'app-manager-list',
  imports: [CommonModule, SharedModule, RouterModule, MatDialogModule, LoadingOverlayComponent],
  templateUrl: './manager-list.component.html',
  styleUrl: './manager-list.component.scss'
})
export class ManagerListComponent implements OnInit, OnDestroy {
  private lookupService = inject(LookupService);
  private toast = inject(ToastService);
  dialog = inject(MatDialog);

  // public props
  displayedColumns: string[] = ['serial', 'fullName', 'email', 'mobile', 'nationality', 'action'];
  dataSource = new MatTableDataSource<LookUpUserDto>();
  totalCount = 0;
  filter: FilteredResultRequestDto = { skipCount: 0, maxResultCount: 10 };
  pageIndex = 0;
  pageSize = 10;
  isLoading = false;
  isLoadingMore = false;
  statusFilter = 'all' as const;
  private intersectionObserver?: IntersectionObserver;
  private loadMoreElement?: ElementRef<HTMLElement>;


  @ViewChild(MatSort)
  set matSort(sort: MatSort | undefined) {
    if (!sort) {
      return;
    }

    this.dataSource.sort = sort;
    this.dataSource.sortingDataAccessor = (item, property) => {
      const value = item[property as keyof LookUpUserDto];
      if (value === null || value === undefined) {
        return '';
      }
      return typeof value === 'string' ? value.toLowerCase() : String(value);
    };
  }

  @ViewChild('loadMoreTrigger')
  set loadMoreTrigger(element: ElementRef<HTMLElement> | undefined) {
    this.loadMoreElement = element;
    this.setupIntersectionObserver();
  }


  // table search filter
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.filter.searchTerm = filterValue.trim().toLowerCase();
    this.pageIndex = 0;
    this.filter.skipCount = 0;
    this.loadManagers();
  }

  ngOnInit() {
    this.loadManagers();
  }

  onStatusFilterChange(): void {
    this.statusFilter = 'all';
    delete this.filter.filter;

    this.pageIndex = 0;
    this.filter.skipCount = 0;
    this.loadManagers();
  }

  getSerialNumber(index: number): number {
    return (this.filter.skipCount ?? 0) + index + 1;
  }


  ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
  }

  private loadManagers(append = false) {
    this.isLoading = !append;
    this.isLoadingMore = append;
    this.lookupService
      .getUsersForSelects(
        this.filter,
        Number(UserTypesEnum.Manager),
        0,
        0,
        0,
        undefined,
        false
      )
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.isLoadingMore = false;
        })
      )
      .subscribe({
        next: (res) => {
          if (res.isSuccess && res.data?.items) {
            this.dataSource.data = append
              ? [...this.dataSource.data, ...res.data.items]
              : res.data.items;
            this.totalCount = res.data.totalCount;
          } else {
            if (!append) {
              this.dataSource.data = [];
            }
            this.totalCount = 0;
          }
        },
        error: () => {
          if (!append) {
            this.dataSource.data = [];
          }
          this.totalCount = 0;
        }
      });
  }

  managerDetails(manager: LookUpUserDto): void {
    this.lookupService.getUserDetails(manager.id).subscribe({
      next: (res) => {
        if (res.isSuccess && res.data) {
          this.dialog.open(ManagerDetailsComponent, {
            width: '800px',
            maxWidth: '95vw',
            data: res.data
          });
          return;
        }
        this.toast.error('Failed to load manager details');
      },
      error: () => this.toast.error('Failed to load manager details')
    });
  }

  private setupIntersectionObserver(): void {
    if (!this.loadMoreElement) {
      return;
    }

    this.intersectionObserver?.disconnect();
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          this.loadNextPage();
        }
      },
      { root: null, rootMargin: '0px 0px 20% 0px' }
    );
    this.intersectionObserver.observe(this.loadMoreElement.nativeElement);
  }

  private loadNextPage(): void {
    if (this.isLoading || this.isLoadingMore) {
      return;
    }

    if (!this.hasMoreResults()) {
      return;
    }

    this.pageIndex += 1;
    this.filter.skipCount = this.pageIndex * this.pageSize;
    this.filter.maxResultCount = this.pageSize;
    this.loadManagers(true);
  }

  buildWhatsAppLink(phone: string | null | undefined): string | undefined {
    const digits = String(phone ?? "").replace(/[^\d]/g, "");
    return digits ? `https://wa.me/${digits}` : undefined;
  }

  buildMailtoLink(email: string | null | undefined): string | undefined {
    const value = String(email ?? "").trim();
    return value ? `mailto:${value}` : undefined;
  }

  hasMoreResults(): boolean {
    return this.dataSource.data.length < this.totalCount;
  }

  hasMissingAssignments(manager: LookUpUserDto): boolean {
    const hasTeacher =
      typeof manager.teacherId === 'number' ||
      !!String(manager.teacherName ?? '').trim() ||
      (Array.isArray(manager.teachers) && manager.teachers.length > 0);
    const hasStudents = Array.isArray(manager.students) && manager.students.length > 0;
    const hasCircle =
      typeof manager.circleId === 'number' ||
      !!String(manager.circleName ?? '').trim() ||
      (Array.isArray(manager.managerCircles) && manager.managerCircles.length > 0);

    return !(hasTeacher && hasStudents && hasCircle);
  }
}
