import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';

import { SharedModule } from 'src/app/demo/shared/shared.module';
import {
  CircleReportAddDto,
  CircleReportListDto,
  CircleReportService
} from 'src/app/@theme/services/circle-report.service';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { AttendStatusEnum } from 'src/app/@theme/types/AttendStatusEnum';
import { AuthenticationService } from 'src/app/@theme/services/authentication.service';
import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';

type ReportDetails = Omit<CircleReportAddDto, 'creationTime'> &
  Partial<CircleReportListDto> & {
    creationTime?: Date | string | null;
  };

@Component({
  selector: 'app-report-details',
  imports: [CommonModule, SharedModule, RouterModule],
  templateUrl: './report-details.component.html',
  styleUrl: './report-details.component.scss'
})
export class ReportDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(CircleReportService);
  private toast = inject(ToastService);
  private auth = inject(AuthenticationService);

  report?: ReportDetails;
  isLoading = true;

  readonly role = this.auth.getRole();
  readonly canEdit = this.role !== UserTypesEnum.Student;

  ngOnInit(): void {
    const stateReport = history.state.report as ReportDetails | undefined;
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!Number.isFinite(id) || !id) {
      this.toast.error('Invalid report identifier');
      this.isLoading = false;
      return;
    }

    const stateId = this.toNumber(stateReport?.id);
    if (stateReport && stateId === id) {
      this.report = { ...stateReport, id: stateId };
      this.isLoading = false;
      return;
    }

    this.loadReport(id, stateReport);
  }

  private toNumber(value: unknown): number | undefined {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private loadReport(id: number, stateReport?: ReportDetails): void {
    this.isLoading = true;
    this.service.get(id).subscribe({
      next: (res) => {
        if (res.isSuccess && res.data) {
          const { creationTime, ...data } = res.data;
          const merged: ReportDetails = {
            ...stateReport,
            ...data,
            id,
            ...(creationTime !== null && { creationTime })
          };
          this.report = merged;
        } else if (stateReport) {
          this.report = stateReport;
        } else {
          this.toast.error('Unable to load report details');
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        if (stateReport) {
          this.report = stateReport;
        } else {
          this.toast.error('Error loading report details');
        }
      }
    });
  }

  getStatusLabel(status?: number | null): string {
    switch (status) {
      case AttendStatusEnum.Attended:
        return 'حضر';
      case AttendStatusEnum.ExcusedAbsence:
        return 'غياب بعذر';
      case AttendStatusEnum.UnexcusedAbsence:
        return 'غياب بدون عذر';
      default:
        return '—';
    }
  }

  formatDate(value?: string | Date | null): string {
    if (!value) {
      return '—';
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }
    return date.toLocaleString();
  }

  displayValue(value: unknown): string {
    if (value === null || value === undefined || value === '') {
      return '—';
    }
    return String(value);
  }

  getStudentName(): string {
    const report = this.report;
    if (!report) {
      return '—';
    }
    return (
      (report.studentName as string | undefined) ||
      (report['student'] as string | undefined) ||
      (report['studentFullName'] as string | undefined) ||
      (typeof report.studentId === 'number' ? `Student #${report.studentId}` : '—')
    );
  }

  getCircleName(): string {
    const report = this.report;
    if (!report) {
      return '—';
    }
    return (
      (report.circleName as string | undefined) ||
      (report['circle'] as string | undefined) ||
      (report['circleTitle'] as string | undefined) ||
      (typeof report.circleId === 'number' ? `Circle #${report.circleId}` : '—')
    );
  }

  getTeacherName(): string {
    const report = this.report;
    if (!report) {
      return '—';
    }
    return (
      (report.teacherName as string | undefined) ||
      (report['teacher'] as string | undefined) ||
      (typeof report.teacherId === 'number' ? `Teacher #${report.teacherId}` : '—')
    );
  }

  editReport(): void {
    if (!this.report?.id) {
      return;
    }
    this.router.navigate(['/online-course/report/edit', this.report.id], {
      state: { report: this.report }
    });
  }
}
