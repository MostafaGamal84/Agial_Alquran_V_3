import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { Subscription, finalize } from 'rxjs';
import jsPDF from 'jspdf';

import {
  TeacherMonthlySummary,
  TeacherSalaryInvoice,
  TeacherSalaryInvoiceDetails,
  TeacherSalaryService,
  TeacherMonthlyReportRecordDto
} from 'src/app/@theme/services/teacher-salary.service';
import { LoadingOverlayComponent } from 'src/app/@theme/components/loading-overlay/loading-overlay.component';
import { ToastService } from 'src/app/@theme/services/toast.service';



interface ReportRecordTableItem extends TeacherMonthlyReportRecordDto {
  displayIndex: number;
}
interface SummaryMetric {
  label: string;
  value: number | string;
  type: 'number' | 'currency' | 'percentage' | 'text';
  suffix?: string;
}

@Component({
  selector: 'app-teacher-salary-details',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule, MatTableModule, LoadingOverlayComponent],
  templateUrl: './teacher-salary-details.component.html',
  styleUrls: ['./teacher-salary-details.component.scss']
})
export class TeacherSalaryDetailsComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly teacherSalaryService = inject(TeacherSalaryService);
  private readonly toastService = inject(ToastService);
  private readonly subscriptions = new Subscription();

  detailsLoading = false;
  invoiceId: number | null = null;
  invoice: TeacherSalaryInvoice | null = null;
  detailSummary: TeacherMonthlySummary | null = null;
  detailSummaryMetrics: SummaryMetric[] = [];
  monthlyReportRecords: ReportRecordTableItem[] = [];
  reportRecordsLoading = false;
  reportRecordsError: string | null = null;
  readonly reportColumns = ['index', 'studentName', 'minutes', 'salary', 'attendStatusId', 'recordCreatedAt'];

  private readonly numberFormatter = new Intl.NumberFormat('ar-EG', {
    maximumFractionDigits: 0
  });
  private readonly percentFormatter = new Intl.NumberFormat('ar-EG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
  private readonly currencyFormatter = new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  ngOnInit(): void {
    this.subscriptions.add(
      this.route.paramMap.subscribe((params) => {
        const id = Number(params.get('invoiceId'));
        if (!Number.isFinite(id) || id <= 0) {
          this.toastService.error('معرف الفاتورة غير صالح.');
          this.router.navigate(['teacher-salary']);
          return;
        }
        this.invoiceId = id;
        this.loadInvoiceDetails(id);
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  goBack(): void {
    this.router.navigate(['teacher-salary']);
  }

  formatMetricValue(metric: SummaryMetric): string {
    if (metric.value === null || metric.value === undefined || metric.value === '') {
      return '—';
    }
    if (metric.type === 'currency') {
      const num = this.coerceNumber(metric.value);
      return num !== null ? this.currencyFormatter.format(num) : String(metric.value);
    }
    if (metric.type === 'number') {
      const num = this.coerceNumber(metric.value);
      if (num !== null) {
        const formatted = this.numberFormatter.format(num);
        return metric.suffix ? `${formatted} ${metric.suffix}` : formatted;
      }
      return String(metric.value);
    }
    if (metric.type === 'percentage') {
      const num = this.coerceNumber(metric.value);
      if (num !== null) {
        const percent = Math.abs(num) <= 1 ? num * 100 : num;
        return `${this.percentFormatter.format(percent)}%`;
      }
      return String(metric.value);
    }
    return String(metric.value);
  }

  formatMonth(): string {
    const month = this.readString(this.invoice, ['month']) ?? this.readString(this.detailSummary, ['month']);
    if (!month) {
      return '—';
    }
    const parsed = new Date(month);
    if (Number.isNaN(parsed.getTime())) {
      return month;
    }
    return new Intl.DateTimeFormat('ar-EG', { month: 'long', year: 'numeric' }).format(parsed);
  }

  formatSalary(): string {
    const amount =
      this.readNumber(this.invoice, ['salary']) ??
      this.readNumber(this.invoice, ['salaryAmount', 'totalSalary']) ??
      this.readNumber(this.detailSummary, ['totalSalary', 'salaryTotal', 'netSalary', 'takeHomePay']);
    return amount === null ? '—' : this.currencyFormatter.format(amount);
  }

  formatPaidAt(): string {
    const value = this.readString(this.invoice, ['payedAt']);
    if (!value) {
      return '—';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
  }

  getStatusLabel(): string {
    const value = this.readString(this.invoice, ['status', 'paymentStatus']);
    if (value) {
      return value;
    }
    const isPaid = this.readBoolean(this.invoice, ['isPayed', 'isPaid', 'paid']);
    return isPaid ? 'مدفوع' : 'غير مدفوع';
  }

  private loadInvoiceDetails(invoiceId: number): void {
    this.detailsLoading = true;
    this.teacherSalaryService
      .getInvoiceDetails(invoiceId)
      .pipe(finalize(() => (this.detailsLoading = false)))
      .subscribe({
        next: (response) => {
          if (!response.isSuccess) {
            this.toastService.error('فشل تحميل تفاصيل الفاتورة.');
            return;
          }
          this.applyDetails(response.data ?? null);
          this.loadMonthlyReportRecords();
        },
        error: () => {
          this.toastService.error('فشل تحميل تفاصيل الفاتورة.');
        }
      });
  }

  private applyDetails(details: TeacherSalaryInvoiceDetails | null): void {
    this.invoice = details?.invoice ?? null;
    this.detailSummary = details?.monthlySummary ?? null;
    this.detailSummaryMetrics = this.buildSummaryMetrics(this.detailSummary);
    this.monthlyReportRecords = [];
    this.reportRecordsError = null;
  }

  private loadMonthlyReportRecords(): void {
    const teacherId = this.readNumber(this.invoice, ['teacherId']) ?? this.readNumber(this.detailSummary, ['teacherId']);
    const month = this.readString(this.invoice, ['month']) ?? this.readString(this.detailSummary, ['month']);

    if (!teacherId || !month) {
      this.reportRecordsError = 'تعذر تحميل السجلات التفصيلية لعدم اكتمال بيانات المعلم أو الشهر.';
      return;
    }

    this.reportRecordsLoading = true;
    this.teacherSalaryService
      .getMonthlyReportRecords(month, teacherId)
      .pipe(finalize(() => (this.reportRecordsLoading = false)))
      .subscribe({
        next: (response) => {
          if (!response.isSuccess) {
            this.reportRecordsError = 'فشل تحميل السجلات التفصيلية للتقارير.';
            return;
          }

          const records = [...(response.data ?? [])].sort((a, b) => {
            const aTime = this.parseDateToTime(a.recordCreatedAt);
            const bTime = this.parseDateToTime(b.recordCreatedAt);
            return bTime - aTime;
          });

          this.monthlyReportRecords = records.map((record, index) => ({
            ...record,
            displayIndex: index + 1
          }));
          this.reportRecordsError = null;
        },
        error: (error: HttpErrorResponse) => {
          const status = error?.status;
          this.reportRecordsError =
            status === 401 || status === 403
              ? 'ليس لديك صلاحية الوصول إلى التقارير التفصيلية لهذا المعلم.'
              : 'فشل تحميل السجلات التفصيلية للتقارير.';
        }
      });
  }


  exportSummaryPdf(): void {
    if (this.detailSummaryMetrics.length === 0) {
      this.toastService.error('لا توجد بيانات إجمالية لتصديرها.');
      return;
    }

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 15;

    doc.setFontSize(14);
    doc.text('Teacher Salary Monthly Summary', pageWidth / 2, y, { align: 'center' });
    y += 8;

    doc.setFontSize(10);
    doc.text(`Teacher: ${this.invoice?.teacherName ?? this.detailSummary?.teacherName ?? '-'}`, 10, y);
    y += 6;
    doc.text(`Month: ${this.formatMonth()}`, 10, y);
    y += 10;

    for (const metric of this.detailSummaryMetrics) {
      doc.text(`${metric.label}: ${this.formatMetricValue(metric)}`, 10, y);
      y += 7;
      if (y > 280) {
        doc.addPage();
        y = 15;
      }
    }

    doc.save(this.buildPdfFileName('summary'));
  }

  exportDetailedReportPdf(): void {
    if (this.monthlyReportRecords.length === 0) {
      this.toastService.error('لا توجد بيانات تفصيلية لتصديرها.');
      return;
    }

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 15;

    doc.setFontSize(14);
    doc.text('Teacher Salary Detailed Records', pageWidth / 2, y, { align: 'center' });
    y += 8;

    doc.setFontSize(10);
    doc.text(`Teacher: ${this.invoice?.teacherName ?? this.detailSummary?.teacherName ?? '-'}`, 10, y);
    y += 6;
    doc.text(`Month: ${this.formatMonth()}`, 10, y);
    y += 8;

    for (const record of this.monthlyReportRecords) {
      const line = `#${record.displayIndex} | Student: ${record.studentName ?? '-'} | Minutes: ${record.minutes ?? 0} | Salary: ${this.formatRecordSalary(record.salary)} | Status: ${record.attendStatusId ?? '-'} | Date: ${this.formatRecordDate(record.recordCreatedAt)}`;
      const wrapped = doc.splitTextToSize(line, pageWidth - 20);
      doc.text(wrapped, 10, y);
      y += wrapped.length * 5 + 2;

      if (y > 280) {
        doc.addPage();
        y = 15;
      }
    }

    doc.save(this.buildPdfFileName('detailed'));
  }

  private buildPdfFileName(type: 'summary' | 'detailed'): string {
    const teacher = (this.invoice?.teacherName ?? this.detailSummary?.teacherName ?? 'teacher')
      .trim()
      .replace(/\s+/g, '-');
    const month = this.readString(this.invoice, ['month']) ?? this.readString(this.detailSummary, ['month']) ?? 'month';
    return `${type}-report-${teacher}-${month}.pdf`;
  }

  formatRecordSalary(value: number | null | undefined): string {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return '—';
    }
    return this.currencyFormatter.format(value);
  }

  formatRecordDate(value: string | null | undefined): string {
    if (!value) {
      return '—';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
  }

  private parseDateToTime(value: string | null | undefined): number {
    if (!value) {
      return 0;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }

  private buildSummaryMetrics(summary: TeacherMonthlySummary | null): SummaryMetric[] {
    if (!summary) {
      return [];
    }
    const metrics: SummaryMetric[] = [];
    const addMetric = (label: string, keys: string[], type: SummaryMetric['type'], suffix?: string) => {
      for (const key of keys) {
        const raw = (summary as Record<string, unknown>)[key];
        if (raw === null || raw === undefined || raw === '') {
          continue;
        }
        if (type === 'currency' || type === 'number' || type === 'percentage') {
          const numeric = this.coerceNumber(raw);
          if (numeric !== null) {
            metrics.push({ label, value: numeric, type, suffix });
            return;
          }
        }
        if (typeof raw === 'string' && raw.trim().length > 0) {
          metrics.push({ label, value: raw, type: 'text', suffix });
          return;
        }
      }
    };

    addMetric('التقارير', ['totalReports'], 'number');
    addMetric('الحضور', ['presentCount'], 'number');
    addMetric('الغياب المبرر', ['absentWithExcuseCount'], 'number');
    addMetric('الغياب غير المبرر', ['absentWithoutExcuseCount'], 'number');
    addMetric('دقائق التدريس', ['totalMinutes', 'teachingMinutes'], 'number', 'دقيقة');
    addMetric('إجمالي الراتب', ['totalSalary', 'salaryTotal'], 'currency');

    return metrics;
  }

  private coerceNumber(value: unknown): number | null {
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value.trim());
      return Number.isNaN(parsed) ? null : parsed;
    }
    return null;
  }

  private readUnknown(source: unknown, keys: string[]): unknown {
    if (!source || typeof source !== 'object') {
      return null;
    }
    const record = source as Record<string, unknown>;
    for (const key of keys) {
      if (record[key] !== undefined && record[key] !== null) {
        return record[key];
      }
    }
    return null;
  }

  private readString(source: unknown, keys: string[]): string | null {
    const value = this.readUnknown(source, keys);
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
  }

  private readNumber(source: unknown, keys: string[]): number | null {
    const value = this.readUnknown(source, keys);
    return this.coerceNumber(value);
  }

  private readBoolean(source: unknown, keys: string[]): boolean {
    const value = this.readUnknown(source, keys);
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const normalized = value.toLowerCase();
      return normalized === 'true' || normalized === 'paid' || normalized === 'present';
    }
    return false;
  }
}
