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
import { TeacherDetailsComponent } from '../teacher-details/teacher-details.component';
import { LoadingOverlayComponent } from 'src/app/@theme/components/loading-overlay/loading-overlay.component';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { UserService } from 'src/app/@theme/services/user.service';
import { DisableUserConfirmDialogComponent } from '../../student/student-list/student-list.disable-user-confirm-dialog.component';
import { TranslateService } from '@ngx-translate/core';
import { getUserManagers } from 'src/app/demo/shared/utils/user-managers';

@Component({
  selector: 'app-teacher-list',
  imports: [CommonModule, SharedModule, RouterModule, MatDialogModule, LoadingOverlayComponent],
  templateUrl: './teacher-list.component.html',
  styleUrl: './teacher-list.component.scss'
})
export class TeacherListComponent implements OnInit, OnDestroy {
  private lookupService = inject(LookupService);
  private userService = inject(UserService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
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
  statusFilter: 'all' | 'active' | 'inactive' = 'all';
  private pendingTeacherIds = new Set<number>();
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
    this.loadTeachers();
  }

  ngOnInit() {
    this.loadTeachers();
  }
  onStatusFilterChange(value: 'all' | 'active' | 'inactive'): void {
    this.statusFilter = value;
    if (value === 'all') {
      delete this.filter.filter;
    } else if (value === 'inactive') {
      this.filter.filter = 'inactive=true';
    } else {
      this.filter.filter = 'inactive=false';
    }

    this.pageIndex = 0;
    this.filter.skipCount = 0;
    this.loadTeachers();
  }

  getSerialNumber(index: number): number {
    return (this.filter.skipCount ?? 0) + index + 1;
  }


  ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
  }

  private loadTeachers(append = false) {
    this.isLoading = !append;
    this.isLoadingMore = append;
    this.lookupService
      .getUsersForSelects(
        this.filter,
        Number(UserTypesEnum.Teacher),
        0,
        0,
        0,
        undefined,
        true
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

  teacherDetails(teacher: LookUpUserDto): void {
    this.lookupService.getUserDetails(teacher.id).subscribe({
      next: (res) => {
        if (res.isSuccess && res.data) {
          this.dialog.open(TeacherDetailsComponent, {
            width: '800px',
            maxWidth: '95vw',
            data: res.data
          });
          return;
        }
        this.toast.error('Failed to load teacher details');
      },
      error: () => this.toast.error('Failed to load teacher details')
    });
  }

  confirmDisable(teacher: LookUpUserDto): void {
    if (this.isProcessing(teacher.id)) {
      return;
    }

    const dialogRef = this.dialog.open(DisableUserConfirmDialogComponent, {
      data: { fullName: teacher.fullName }
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.disableTeacher(teacher);
      }
    });
  }

  isProcessing(teacherId: number): boolean {
    return this.pendingTeacherIds.has(teacherId);
  }

  private disableTeacher(teacher: LookUpUserDto): void {
    if (this.pendingTeacherIds.has(teacher.id)) {
      return;
    }

    this.pendingTeacherIds.add(teacher.id);

    this.userService
      .disableUser(teacher.id, false)
      .pipe(finalize(() => this.pendingTeacherIds.delete(teacher.id)))
      .subscribe({
        next: (res) => {
          if (res.isSuccess) {
            this.dataSource.data = this.dataSource.data.filter((item) => item.id !== teacher.id);
            this.totalCount = Math.max(this.totalCount - 1, 0);
            this.toast.success(this.translate.instant('Teacher disabled successfully'));
            return;
          }

          if (res.errors?.length) {
            res.errors.forEach((error) => this.toast.error(error.message));
          } else {
            this.toast.error(this.translate.instant('Failed to disable teacher'));
          }
        },
        error: () => this.toast.error(this.translate.instant('Failed to disable teacher'))
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
    this.loadTeachers(true);
  }

  hasMoreResults(): boolean {
    return this.dataSource.data.length < this.totalCount;
  }

  hasMissingAssignments(teacher: LookUpUserDto): boolean {
    const hasManager = getUserManagers(teacher).length > 0;
    const hasCircle =
      typeof teacher.circleId === 'number' || !!String(teacher.circleName ?? '').trim();
    const hasStudents = Array.isArray(teacher.students) && teacher.students.length > 0;

    return !(hasManager && hasCircle && hasStudents);
  }
}
