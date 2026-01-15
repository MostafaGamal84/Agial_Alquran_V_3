// angular import
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// angular material
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { finalize } from 'rxjs/operators';

// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';
import {
  LookupService,
  LookUpUserDto,
  FilteredResultRequestDto,
  NationalityDto
} from 'src/app/@theme/services/lookup.service';
import { UserService } from 'src/app/@theme/services/user.service';
import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';
import { StudentDetailsComponent } from '../student-details/student-details.component';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { DisableUserConfirmDialogComponent } from './student-list.disable-user-confirm-dialog.component';
import { RESIDENCY_GROUP_OPTIONS, ResidencyGroupFilter } from 'src/app/@theme/types/residency-group';
import { LoadingOverlayComponent } from 'src/app/@theme/components/loading-overlay/loading-overlay.component';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-student-list',
  imports: [CommonModule, SharedModule, RouterModule, MatDialogModule, LoadingOverlayComponent],
  templateUrl: './student-list.component.html',
  styleUrl: './student-list.component.scss'
})
export class StudentListComponent implements OnInit {
  private lookupService = inject(LookupService);
  private userService = inject(UserService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  dialog = inject(MatDialog);

  // public props
  displayedColumns: string[] = ['fullName', 'email', 'mobile', 'nationality', 'action'];
  dataSource = new MatTableDataSource<LookUpUserDto>();
  totalCount = 0;
  filter: FilteredResultRequestDto = { skipCount: 0, maxResultCount: 10 };
  pageIndex = 0;
  pageSize = 10;
  showInactive = false;
  nationalities: NationalityDto[] = [];
  selectedResidentId: number | null = null;
  residencyGroupOptions = RESIDENCY_GROUP_OPTIONS;
  selectedResidencyGroup: ResidencyGroupFilter = 'all';
  private pendingStudentIds = new Set<number>();
  isLoading = false;
  isLoadingMore = false;

  // table search filter
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.filter.searchTerm = filterValue.trim().toLowerCase();
    this.pageIndex = 0;
    this.filter.skipCount = 0;
    this.loadStudents();
  }

  toggleInactiveFilter(): void {
    this.showInactive = !this.showInactive;
    if (this.showInactive) {
      this.filter.filter = 'inactive=true';
    } else {
      delete this.filter.filter;
    }
    this.pageIndex = 0;
    this.filter.skipCount = 0;
    this.loadStudents();
  }

  ngOnInit() {
    this.loadNationalities();
    this.loadStudents();
  }

  private loadNationalities(): void {
    this.lookupService.getAllNationalities().subscribe((res) => {
      if (res.isSuccess && Array.isArray(res.data)) {
        this.nationalities = res.data;
      } else {
        this.nationalities = [];
      }
    });
  }

  private loadStudents(append = false) {
    this.filter.residentGroup = this.selectedResidencyGroup;
    this.isLoading = !append;
    this.isLoadingMore = append;
    this.lookupService
      .getUsersForSelects(
        this.filter,
        Number(UserTypesEnum.Student),
        0,
        0,
        0,
        this.selectedResidentId ?? undefined
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

  onResidencyChange(value: number | null): void {
    this.selectedResidentId = value && value > 0 ? value : null;
    this.pageIndex = 0;
    this.filter.skipCount = 0;
    this.loadStudents();
  }

  onResidencyGroupChange(value: ResidencyGroupFilter | null): void {
    this.selectedResidencyGroup = value ?? 'all';
    this.pageIndex = 0;
    this.filter.skipCount = 0;
    this.loadStudents();
  }

  studentDetails(student: LookUpUserDto): void {
    this.lookupService.getUserDetails(student.id).subscribe({
      next: (res) => {
        if (res.isSuccess && res.data) {
          this.dialog.open(StudentDetailsComponent, {
            width: '800px',
            maxWidth: '95vw',
            data: res.data
          });
          return;
        }
        this.toast.error(this.translate.instant('Failed to load student details'));
      },
      error: () => this.toast.error(this.translate.instant('Failed to load student details'))
    });
  }

  confirmDisable(student: LookUpUserDto): void {
    if (this.isProcessing(student.id)) {
      return;
    }

    const dialogRef = this.dialog.open(DisableUserConfirmDialogComponent, {
      data: { fullName: student.fullName }
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.changeStatus(student, false);
      }
    });
  }

  isProcessing(studentId: number): boolean {
    return this.pendingStudentIds.has(studentId);
  }

  changeStatus(student: LookUpUserDto, statue: boolean): void {
    if (this.pendingStudentIds.has(student.id)) {
      return;
    }

    this.pendingStudentIds.add(student.id);

    this.userService
      .disableUser(student.id, statue)
      .pipe(finalize(() => this.pendingStudentIds.delete(student.id)))
      .subscribe({
        next: (res) => {
          if (res.isSuccess) {
            if (statue) {
              student.inactive = false;
              this.toast.success(this.translate.instant('User restored successfully'));
            } else {
              this.dataSource.data = this.dataSource.data.filter((s) => s.id !== student.id);
              this.totalCount = Math.max(this.totalCount - 1, 0);
              this.toast.success(this.translate.instant('User disabled successfully'));
            }
            return;
          }

          if (res.errors?.length) {
            res.errors.forEach((error) => this.toast.error(error.message));
          } else {
            this.toast.error(this.translate.instant('Failed to update user status'));
          }
        },
        error: () => this.toast.error(this.translate.instant('Failed to update user status'))
      });
  }

  onScroll(event: Event): void {
    if (this.isLoading || this.isLoadingMore) {
      return;
    }

    if (!this.hasMoreResults()) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }

    const threshold = target.scrollHeight - target.clientHeight - 200;
    if (target.scrollTop >= threshold) {
      this.pageIndex += 1;
      this.filter.skipCount = this.pageIndex * this.pageSize;
      this.filter.maxResultCount = this.pageSize;
      this.loadStudents(true);
    }
  }

  hasMoreResults(): boolean {
    return this.dataSource.data.length < this.totalCount;
  }
}
