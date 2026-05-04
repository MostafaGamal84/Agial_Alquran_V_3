import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { SharedModule } from 'src/app/demo/shared/shared.module';
import { LoadingOverlayComponent } from 'src/app/@theme/components/loading-overlay/loading-overlay.component';
import { AcademicCircleDto, AcademicCircleService } from 'src/app/@theme/services/academic-circle.service';
import { AcademicLookupService } from 'src/app/@theme/services/academic-lookup.service';
import { AuthenticationService } from 'src/app/@theme/services/authentication.service';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { LookupDto } from 'src/app/@theme/services/lookup.service';
import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';

@Component({
  selector: 'app-academic-circle-list',
  standalone: true,
  imports: [CommonModule, SharedModule, RouterModule, ReactiveFormsModule, NgSelectModule, LoadingOverlayComponent],
  templateUrl: './academic-circle-list.component.html',
  styleUrl: './academic-circle-list.component.scss'
})
export class AcademicCircleListComponent implements OnInit {
  private fb = inject(FormBuilder);
  private academicCircleService = inject(AcademicCircleService);
  private academicLookupService = inject(AcademicLookupService);
  private auth = inject(AuthenticationService);
  private toast = inject(ToastService);
  private router = inject(Router);

  readonly filterForm = this.fb.group({
    searchTerm: [''],
    managerId: [null as number | null],
    teacherId: [null as number | null]
  });

  circles: AcademicCircleDto[] = [];
  managers: LookupDto[] = [];
  teachers: LookupDto[] = [];
  isLoading = false;
  isDeletingId: number | null = null;
  pageIndex = 0;
  pageSize = 15;
  totalCount = 0;

  readonly role = this.auth.getRole();
  readonly canManage = [UserTypesEnum.Admin, UserTypesEnum.Manager, UserTypesEnum.BranchLeader].includes(
    (this.role ?? UserTypesEnum.Student) as UserTypesEnum
  );

  get activeFilterCount(): number {
    const filterValue = this.filterForm.getRawValue();
    return [filterValue.searchTerm?.trim(), filterValue.managerId, filterValue.teacherId].filter(
      (value) => value !== null && value !== undefined && value !== ''
    ).length;
  }

  get totalPages(): number {
    return this.totalCount > 0 ? Math.ceil(this.totalCount / this.pageSize) : 1;
  }

  ngOnInit(): void {
    this.loadFilters();
    this.loadCircles();
  }

  loadCircles(reset = false): void {
    if (reset) {
      this.pageIndex = 0;
    }

    const filterValue = this.filterForm.getRawValue();
    this.isLoading = true;

    this.academicCircleService
      .getAll(
        {
          skipCount: this.pageIndex * this.pageSize,
          maxResultCount: this.pageSize,
          searchTerm: filterValue.searchTerm?.trim() || undefined,
          sortBy: 'CreatedAt',
          sortingDirection: 'desc'
        },
        {
          managerId: filterValue.managerId,
          teacherId: filterValue.teacherId
        }
      )
      .subscribe({
        next: (response) => {
          if (!response.isSuccess) {
            this.circles = [];
            this.totalCount = 0;
            response.errors?.forEach((error) => this.toast.error(error.message));
            if (!response.errors?.length) {
              this.toast.error(response.message || 'تعذر تحميل الحلقات الدراسية');
            }
            this.isLoading = false;
            return;
          }

          this.circles = response.data?.items ?? [];
          this.totalCount = response.data?.totalCount ?? 0;
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
          this.toast.error('تعذر تحميل الحلقات الدراسية');
        }
      });
  }

  deleteCircle(circle: AcademicCircleDto): void {
    if (!circle.id || this.isDeletingId === circle.id) {
      return;
    }

    const confirmed = window.confirm(`هل تريد حذف الحلقة الدراسية "${circle.name ?? ''}"؟`);
    if (!confirmed) {
      return;
    }

    this.isDeletingId = circle.id;
    this.academicCircleService.delete(circle.id).subscribe({
      next: (response) => {
        this.isDeletingId = null;
        if (!response.isSuccess) {
          response.errors?.forEach((error) => this.toast.error(error.message));
          if (!response.errors?.length) {
            this.toast.error('تعذر حذف الحلقة الدراسية');
          }
          return;
        }

        this.toast.success(response.message || 'تم حذف الحلقة الدراسية بنجاح');
        this.loadCircles();
      },
      error: () => {
        this.isDeletingId = null;
        this.toast.error('تعذر حذف الحلقة الدراسية');
      }
    });
  }

  goToAdd(): void {
    this.router.navigate(['/online-course/academic/circles/add']);
  }

  goToEdit(id: number): void {
    this.router.navigate(['/online-course/academic/circles/edit', id]);
  }

  nextPage(): void {
    if ((this.pageIndex + 1) * this.pageSize >= this.totalCount) {
      return;
    }

    this.pageIndex += 1;
    this.loadCircles();
  }

  previousPage(): void {
    if (this.pageIndex === 0) {
      return;
    }

    this.pageIndex -= 1;
    this.loadCircles();
  }

  clearFilters(): void {
    this.filterForm.reset({
      searchTerm: '',
      managerId: null,
      teacherId: null
    });
    this.loadCircles(true);
  }

  trackByCircleId(_: number, circle: AcademicCircleDto): number {
    return circle.id;
  }

  getVisibleNames(names: string[] | null | undefined, limit = 2): string[] {
    return names?.slice(0, limit) ?? [];
  }

  getHiddenNamesCount(names: string[] | null | undefined, limit = 2): number {
    return Math.max((names?.length ?? 0) - limit, 0);
  }

  private loadFilters(): void {
    this.academicLookupService.getManagers().subscribe({
      next: (response) => {
        this.managers = response.isSuccess ? response.data ?? [] : [];
      },
      error: () => {
        this.managers = [];
        this.toast.error('تعذر تحميل المشرفين');
      }
    });

    this.academicLookupService.getTeachersForAssignment().subscribe({
      next: (response) => {
        this.teachers = response.isSuccess ? response.data ?? [] : [];
      },
      error: () => {
        this.teachers = [];
        this.toast.error('تعذر تحميل المعلمين');
      }
    });
  }
}
