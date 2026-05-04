import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { SharedModule } from 'src/app/demo/shared/shared.module';
import { LoadingOverlayComponent } from 'src/app/@theme/components/loading-overlay/loading-overlay.component';
import { AcademicSubjectDto, AcademicSubjectService } from 'src/app/@theme/services/academic-subject.service';
import { AuthenticationService } from 'src/app/@theme/services/authentication.service';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';

@Component({
  selector: 'app-academic-subject-list',
  standalone: true,
  imports: [CommonModule, SharedModule, RouterModule, ReactiveFormsModule, LoadingOverlayComponent],
  templateUrl: './academic-subject-list.component.html',
  styleUrl: './academic-subject-list.component.scss'
})
export class AcademicSubjectListComponent implements OnInit {
  private fb = inject(FormBuilder);
  private academicSubjectService = inject(AcademicSubjectService);
  private auth = inject(AuthenticationService);
  private toast = inject(ToastService);
  private router = inject(Router);

  readonly filterForm = this.fb.group({
    searchTerm: ['']
  });

  subjects: AcademicSubjectDto[] = [];
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
    const searchTerm = this.filterForm.getRawValue().searchTerm?.trim();
    return searchTerm ? 1 : 0;
  }

  get totalPages(): number {
    return this.totalCount > 0 ? Math.ceil(this.totalCount / this.pageSize) : 1;
  }

  get usedSubjectsCount(): number {
    return this.subjects.filter((subject) => subject.isUsed).length;
  }

  ngOnInit(): void {
    this.loadSubjects();
  }

  loadSubjects(reset = false): void {
    if (reset) {
      this.pageIndex = 0;
    }

    const filterValue = this.filterForm.getRawValue();
    this.isLoading = true;

    this.academicSubjectService
      .getAll({
        skipCount: this.pageIndex * this.pageSize,
        maxResultCount: this.pageSize,
        searchTerm: filterValue.searchTerm?.trim() || undefined,
        sortBy: 'DisplayOrder',
        sortingDirection: 'asc'
      })
      .subscribe({
        next: (response) => {
          if (!response.isSuccess) {
            this.subjects = [];
            this.totalCount = 0;
            response.errors?.forEach((error) => this.toast.error(error.message));
            if (!response.errors?.length) {
              this.toast.error(response.message || 'تعذر تحميل المواد الدراسية');
            }
            this.isLoading = false;
            return;
          }

          this.subjects = response.data?.items ?? [];
          this.totalCount = response.data?.totalCount ?? 0;
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
          this.toast.error('تعذر تحميل المواد الدراسية');
        }
      });
  }

  deleteSubject(subject: AcademicSubjectDto): void {
    if (!subject.id || this.isDeletingId === subject.id || subject.isUsed) {
      return;
    }

    const confirmed = window.confirm(`هل تريد حذف المادة الدراسية "${subject.name ?? ''}"؟`);
    if (!confirmed) {
      return;
    }

    this.isDeletingId = subject.id;
    this.academicSubjectService.delete(subject.id).subscribe({
      next: (response) => {
        this.isDeletingId = null;
        if (!response.isSuccess) {
          response.errors?.forEach((error) => this.toast.error(error.message));
          if (!response.errors?.length) {
            this.toast.error(response.message || 'تعذر حذف المادة الدراسية');
          }
          return;
        }

        this.toast.success(response.message || 'تم حذف المادة الدراسية بنجاح');
        this.loadSubjects();
      },
      error: () => {
        this.isDeletingId = null;
        this.toast.error('تعذر حذف المادة الدراسية');
      }
    });
  }

  goToAdd(): void {
    this.router.navigate(['/online-course/academic/subjects/add']);
  }

  goToEdit(id: number): void {
    this.router.navigate(['/online-course/academic/subjects/edit', id]);
  }

  nextPage(): void {
    if ((this.pageIndex + 1) * this.pageSize >= this.totalCount) {
      return;
    }

    this.pageIndex += 1;
    this.loadSubjects();
  }

  previousPage(): void {
    if (this.pageIndex === 0) {
      return;
    }

    this.pageIndex -= 1;
    this.loadSubjects();
  }

  clearFilters(): void {
    this.filterForm.reset({
      searchTerm: ''
    });
    this.loadSubjects(true);
  }

  trackBySubjectId(_: number, subject: AcademicSubjectDto): number {
    return subject.id;
  }
}
