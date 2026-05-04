import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { SharedModule } from 'src/app/demo/shared/shared.module';
import { LoadingOverlayComponent } from 'src/app/@theme/components/loading-overlay/loading-overlay.component';
import { AcademicReportDto, AcademicReportService } from 'src/app/@theme/services/academic-report.service';
import { AcademicLookupService } from 'src/app/@theme/services/academic-lookup.service';
import { AuthenticationService } from 'src/app/@theme/services/authentication.service';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { LookupDto } from 'src/app/@theme/services/lookup.service';
import {
  ACADEMIC_HOMEWORK_STATUS_OPTIONS,
  ACADEMIC_STAGE_OPTIONS,
  ACADEMIC_STUDENT_PERFORMANCE_OPTIONS
} from 'src/app/@theme/types/academic-report-options';
import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';

@Component({
  selector: 'app-academic-report-list',
  standalone: true,
  imports: [CommonModule, SharedModule, RouterModule, ReactiveFormsModule, NgSelectModule, LoadingOverlayComponent],
  templateUrl: './academic-report-list.component.html',
  styleUrl: './academic-report-list.component.scss'
})
export class AcademicReportListComponent implements OnInit {
  private fb = inject(FormBuilder);
  private academicReportService = inject(AcademicReportService);
  private academicLookupService = inject(AcademicLookupService);
  private auth = inject(AuthenticationService);
  private toast = inject(ToastService);
  private router = inject(Router);

  readonly filterForm = this.fb.group({
    searchTerm: [''],
    circleId: [null as number | null],
    subjectId: [null as number | null],
    studentId: [null as number | null],
    fromDate: [null as Date | null],
    toDate: [null as Date | null]
  });

  reports: AcademicReportDto[] = [];
  circles: LookupDto[] = [];
  subjects: LookupDto[] = [];
  students: LookupDto[] = [];
  isLoading = false;
  isDeletingId: number | null = null;
  pageIndex = 0;
  pageSize = 15;
  totalCount = 0;

  readonly role = this.auth.getRole();
  readonly canManage = this.role !== UserTypesEnum.Student;

  get activeFilterCount(): number {
    const filterValue = this.filterForm.getRawValue();
    return [
      filterValue.searchTerm?.trim(),
      filterValue.circleId,
      filterValue.subjectId,
      filterValue.studentId,
      filterValue.fromDate,
      filterValue.toDate
    ].filter((value) => value !== null && value !== undefined && value !== '').length;
  }

  get totalPages(): number {
    return this.totalCount > 0 ? Math.ceil(this.totalCount / this.pageSize) : 1;
  }

  ngOnInit(): void {
    this.loadLookups();
    this.loadStudents();
    this.loadReports();

    this.filterForm.get('circleId')?.valueChanges.subscribe((circleId) => {
      this.filterForm.patchValue({ studentId: null }, { emitEvent: false });
      this.loadStudents(circleId);
    });
  }

  loadReports(reset = false): void {
    if (reset) {
      this.pageIndex = 0;
    }

    const filterValue = this.filterForm.getRawValue();
    this.isLoading = true;

    this.academicReportService
      .getAll(
        {
          skipCount: this.pageIndex * this.pageSize,
          maxResultCount: this.pageSize,
          searchTerm: filterValue.searchTerm?.trim() || undefined,
          sortBy: 'ReportDate',
          sortingDirection: 'desc'
        },
        {
          circleId: filterValue.circleId,
          subjectId: filterValue.subjectId,
          studentId: filterValue.studentId,
          fromDate: this.toApiDate(filterValue.fromDate),
          toDate: this.toApiDate(filterValue.toDate)
        }
      )
      .subscribe({
        next: (response) => {
          if (!response.isSuccess) {
            this.reports = [];
            this.totalCount = 0;
            response.errors?.forEach((error) => this.toast.error(error.message));
            if (!response.errors?.length) {
              this.toast.error(response.message || 'تعذر تحميل تقارير المواد');
            }
            this.isLoading = false;
            return;
          }

          this.reports = response.data?.items ?? [];
          this.totalCount = response.data?.totalCount ?? 0;
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
          this.toast.error('تعذر تحميل تقارير المواد');
        }
      });
  }

  deleteReport(report: AcademicReportDto): void {
    if (!report.id || this.isDeletingId === report.id) {
      return;
    }

    const confirmed = window.confirm(`هل تريد حذف تقرير المادة للطالب "${report.studentName ?? ''}"؟`);
    if (!confirmed) {
      return;
    }

    this.isDeletingId = report.id;
    this.academicReportService.delete(report.id).subscribe({
      next: (response) => {
        this.isDeletingId = null;
        if (!response.isSuccess) {
          response.errors?.forEach((error) => this.toast.error(error.message));
          if (!response.errors?.length) {
            this.toast.error('تعذر حذف التقرير');
          }
          return;
        }

        this.toast.success(response.message || 'تم حذف التقرير بنجاح');
        this.loadReports();
      },
      error: () => {
        this.isDeletingId = null;
        this.toast.error('تعذر حذف التقرير');
      }
    });
  }

  goToAdd(): void {
    this.router.navigate(['/online-course/academic/reports/add']);
  }

  goToEdit(id: number): void {
    this.router.navigate(['/online-course/academic/reports/edit', id]);
  }

  goToDetails(id: number): void {
    this.router.navigate(['/online-course/academic/reports/details', id]);
  }

  previousPage(): void {
    if (this.pageIndex === 0) {
      return;
    }

    this.pageIndex -= 1;
    this.loadReports();
  }

  nextPage(): void {
    if ((this.pageIndex + 1) * this.pageSize >= this.totalCount) {
      return;
    }

    this.pageIndex += 1;
    this.loadReports();
  }

  clearFilters(): void {
    this.filterForm.reset({
      searchTerm: '',
      circleId: null,
      subjectId: null,
      studentId: null,
      fromDate: null,
      toDate: null
    });
    this.loadStudents();
    this.loadReports(true);
  }

  formatReportDate(value: string | Date): string {
    if (!value) {
      return '-';
    }

    return formatDate(value, 'yyyy/MM/dd', 'en-US');
  }

  resolveStageName(stageId?: number | null): string {
    return ACADEMIC_STAGE_OPTIONS.find((item) => item.id === stageId)?.name ?? '-';
  }

  resolvePerformanceName(value?: number | null): string {
    return ACADEMIC_STUDENT_PERFORMANCE_OPTIONS.find((item) => item.id === value)?.name ?? '-';
  }

  resolveHomeworkStatusName(value?: number | null): string {
    return ACADEMIC_HOMEWORK_STATUS_OPTIONS.find((item) => item.id === value)?.name ?? '-';
  }

  private loadLookups(): void {
    this.academicLookupService.getCircles().subscribe({
      next: (response) => {
        this.circles = response.isSuccess ? response.data ?? [] : [];
      },
      error: () => {
        this.circles = [];
        this.toast.error('تعذر تحميل الحلقات الدراسية');
      }
    });

    this.academicLookupService.getSubjects().subscribe({
      next: (response) => {
        this.subjects = response.isSuccess ? response.data ?? [] : [];
      },
      error: () => {
        this.subjects = [];
        this.toast.error('تعذر تحميل المواد الدراسية');
      }
    });
  }

  private loadStudents(circleId?: number | null): void {
    this.academicLookupService.getStudents(circleId).subscribe({
      next: (response) => {
        this.students = response.isSuccess ? response.data ?? [] : [];
      },
      error: () => {
        this.students = [];
        this.toast.error(circleId ? 'تعذر تحميل طلاب الحلقة' : 'تعذر تحميل الطلاب');
      }
    });
  }

  private toApiDate(value: Date | null): string | null {
    if (!value) {
      return null;
    }

    return formatDate(value, 'yyyy-MM-dd', 'en-US');
  }
}
