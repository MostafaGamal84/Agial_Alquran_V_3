// angular import
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

// angular material
import { MatTableDataSource } from '@angular/material/table';

// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';
import {
  LookupService,
  LookUpUserDto,
  FilteredResultRequestDto
} from 'src/app/@theme/services/lookup.service';
import { UserService } from 'src/app/@theme/services/user.service';
import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';

@Component({
  selector: 'app-student-apply',
  imports: [SharedModule, CommonModule],
  templateUrl: './student-apply.component.html',
  styleUrl: './student-apply.component.scss'
})
export class StudentApplyComponent implements OnInit, OnDestroy {
  private lookupService = inject(LookupService);
  private userService = inject(UserService);

  // public props
  displayedColumns: string[] = ['fullName', 'email', 'mobile', 'action'];
  dataSource = new MatTableDataSource<LookUpUserDto>();
  totalCount = 0;
  filter: FilteredResultRequestDto = {
    skipCount: 0,
    maxResultCount: 10,
    filter: 'inactive=true'
  };
  pageIndex = 0;
  pageSize = 10;
  isLoading = false;
  isLoadingMore = false;
  private intersectionObserver?: IntersectionObserver;
  private loadMoreElement?: ElementRef<HTMLElement>;

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
    this.loadStudents();
  }

  ngOnInit() {
    this.loadStudents();
  }

  ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
  }

  private loadStudents(append = false) {
    this.isLoading = !append;
    this.isLoadingMore = append;
    this.lookupService
      .getUsersForSelects(
        this.filter,
        Number(UserTypesEnum.Student),
        0,
        0,
        0
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
          this.isLoading = false;
          this.isLoadingMore = false;
        },
        error: () => {
          if (!append) {
            this.dataSource.data = [];
          }
          this.totalCount = 0;
          this.isLoading = false;
          this.isLoadingMore = false;
        }
      });
  }

  changeStatus(student: LookUpUserDto, status: boolean): void {
    this.userService.disableUser(student.id, status).subscribe((res) => {
      if (res.isSuccess) {
        this.dataSource.data = this.dataSource.data.filter((s) => s.id !== student.id);
        this.totalCount--;
      }
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
    this.loadStudents(true);
  }

  hasMoreResults(): boolean {
    return this.dataSource.data.length < this.totalCount;
  }
}
