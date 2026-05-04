import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SharedModule } from 'src/app/demo/shared/shared.module';
import { AcademicReportDto, AcademicReportService } from 'src/app/@theme/services/academic-report.service';
import { ToastService } from 'src/app/@theme/services/toast.service';
import {
  ACADEMIC_HOMEWORK_STATUS_OPTIONS,
  ACADEMIC_STAGE_OPTIONS,
  ACADEMIC_STUDENT_PERFORMANCE_OPTIONS
} from 'src/app/@theme/types/academic-report-options';

@Component({
  selector: 'app-academic-report-details',
  standalone: true,
  imports: [CommonModule, SharedModule, RouterModule],
  templateUrl: './academic-report-details.component.html',
  styleUrl: './academic-report-details.component.scss'
})
export class AcademicReportDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private academicReportService = inject(AcademicReportService);
  private toast = inject(ToastService);

  report: AcademicReportDto | null = null;
  isLoading = false;

  ngOnInit(): void {
    const reportId = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(reportId) || reportId <= 0) {
      this.toast.error('معرّف التقرير غير صحيح');
      this.goBack();
      return;
    }

    this.loadReport(reportId);
  }

  goBack(): void {
    this.router.navigate(['/online-course/academic/reports']);
  }

  formatReportDate(value: string | Date | undefined): string {
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

  private loadReport(id: number): void {
    this.isLoading = true;
    this.academicReportService.get(id).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (!response.isSuccess || !response.data) {
          this.toast.error('تعذر تحميل التقرير');
          return;
        }

        this.report = response.data;
      },
      error: () => {
        this.isLoading = false;
        this.toast.error('تعذر تحميل التقرير');
      }
    });
  }
}
