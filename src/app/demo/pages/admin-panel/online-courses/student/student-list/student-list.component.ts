// angular import
import { AfterViewInit, Component, OnInit, inject, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// angular material
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
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

@Component({
  selector: 'app-student-list',
  imports: [CommonModule, SharedModule, RouterModule, MatDialogModule],
  templateUrl: './student-list.component.html',
  styleUrl: './student-list.component.scss'
})
export class StudentListComponent implements OnInit, AfterViewInit {
  private lookupService = inject(LookupService);
  private userService = inject(UserService);
  private toast = inject(ToastService);
  dialog = inject(MatDialog);

  // public props
  displayedColumns: string[] = ['fullName', 'email', 'mobile', 'nationality', 'action'];
  dataSource = new MatTableDataSource<LookUpUserDto>();
  totalCount = 0;
  filter: FilteredResultRequestDto = { skipCount: 0, maxResultCount: 10 };
  showInactive = false;
  nationalities: NationalityDto[] = [];
  selectedNationalityId: number | null = null;
  private pendingStudentIds = new Set<number>();

  // paginator
readonly paginator = viewChild.required(MatPaginator);  // if Angular ≥17


  // table search filter
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.filter.searchTerm = filterValue.trim().toLowerCase();
    this.filter.skipCount = 0;
    this.paginator().firstPage();
    this.loadStudents();
  }

  toggleInactiveFilter(): void {
    this.showInactive = !this.showInactive;
    if (this.showInactive) {
      this.filter.filter = 'inactive=true';
    } else {
      delete this.filter.filter;
    }
    this.filter.skipCount = 0;
    this.paginator().firstPage();
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

  private loadStudents() {
    this.lookupService
      .getUsersForSelects(
        this.filter,
        Number(UserTypesEnum.Student),
        0,
        0,
        0,
        this.selectedNationalityId ?? undefined
      )
      .subscribe((res) => {
        if (res.isSuccess && res.data?.items) {
          this.dataSource.data = res.data.items;
          this.totalCount = res.data.totalCount;
        } else {
          this.dataSource.data = [];
          this.totalCount = 0;
        }
      });
  }

  onNationalityChange(value: number | null): void {
    this.selectedNationalityId = value && value > 0 ? value : null;
    this.filter.skipCount = 0;
    this.paginator().firstPage();
    this.loadStudents();
  }

  studentDetails(student: LookUpUserDto): void {
    this.dialog.open(StudentDetailsComponent, {
      width: '800px',
      data: student
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
              this.toast.success('User restored successfully');
            } else {
              this.dataSource.data = this.dataSource.data.filter((s) => s.id !== student.id);
              this.totalCount = Math.max(this.totalCount - 1, 0);
              this.toast.success('User disabled successfully');
            }
            return;
          }

          if (res.errors?.length) {
            res.errors.forEach((error) => this.toast.error(error.message));
          } else {
            this.toast.error('Failed to update user status');
          }
        },
        error: () => this.toast.error('Failed to update user status')
      });
  }

  // life cycle event
  ngAfterViewInit() {
    this.paginator().page.subscribe(() => {
      this.filter.skipCount = this.paginator().pageIndex * this.paginator().pageSize;
      this.filter.maxResultCount = this.paginator().pageSize;
      this.loadStudents();
    });
  }
}
