import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription, finalize } from 'rxjs';

import {
  TeacherMonthlySummary,
  TeacherSalaryInvoice,
  TeacherSalaryInvoiceDetails,
  TeacherSalaryService
} from 'src/app/@theme/services/teacher-salary.service';
import { LoadingOverlayComponent } from 'src/app/@theme/components/loading-overlay/loading-overlay.component';
import { ToastService } from 'src/app/@theme/services/toast.service';

interface SummaryMetric {
  label: string;
  value: number | string;
  type: 'number' | 'currency' | 'percentage' | 'text';
  suffix?: string;
}

interface InvoiceReportItem {
  title: string;
  date: string;
  status: string;
  minutes: string;
  amount: string;
}

@Component({
  selector: 'app-teacher-salary-details',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    LoadingOverlayComponent
  ],
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
  reportItems: InvoiceReportItem[] = [];

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
      this.readNumber(this.invoice, ['salaryAmount', 'totalSalary', 'salary']) ??
      this.readNumber(this.detailSummary, ['netSalary', 'takeHomePay', 'salaryTotal', 'totalSalary']);
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
    this.reportItems = this.extractReportItems(details);
  }

  private extractReportItems(details: TeacherSalaryInvoiceDetails | null): InvoiceReportItem[] {
    if (!details) {
      return [];
    }

    const candidateArrays: unknown[] = [
      this.readUnknown(details, ['reports', 'teacherReports', 'reportItems', 'attendanceReports', 'sessions', 'items']),
      this.readUnknown(details.monthlySummary, ['reports', 'teacherReports', 'reportItems', 'attendanceReports', 'sessions', 'items'])
    ];

    const reportsArray = candidateArrays.find((candidate) => Array.isArray(candidate));
    if (!Array.isArray(reportsArray)) {
      return [];
    }

    return reportsArray
      .map((item, index) => {
        const source = item as Record<string, unknown>;
        const title = this.readString(source, ['title', 'name', 'reportName', 'sessionTitle']) ?? `تقرير ${index + 1}`;
        const date = this.formatDate(this.readUnknown(source, ['date', 'reportDate', 'createdAt', 'attendanceDate']));
        const status =
          this.readString(source, ['status', 'attendanceStatus', 'state']) ??
          (this.readBoolean(source, ['isPresent', 'present']) ? 'حضور' : '—');
        const minutesValue = this.readNumber(source, ['minutes', 'teachingMinutes', 'durationMinutes']);
        const amountValue = this.readNumber(source, ['amount', 'salaryAmount', 'reportAmount']);

        return {
          title,
          date,
          status,
          minutes: minutesValue === null ? '—' : `${this.numberFormatter.format(minutesValue)} دقيقة`,
          amount: amountValue === null ? '—' : this.currencyFormatter.format(amountValue)
        };
      })
      .filter((item) => item.title || item.date !== '—' || item.amount !== '—');
  }

  private buildSummaryMetrics(summary: TeacherMonthlySummary | null): SummaryMetric[] {
    if (!summary) {
      return [];
    }
    const metrics: SummaryMetric[] = [];
    const addMetric = (
      label: string,
      keys: string[],
      type: SummaryMetric['type'],
      suffix?: string
    ) => {
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

    addMetric('التقارير', ['totalReports', 'reportCount'], 'number');
    addMetric('الحضور', ['presentCount', 'attendanceCount', 'totalAttendance', 'attendedSessions'], 'number');
    addMetric('الغياب المبرر', ['absentWithExcuseCount'], 'number');
    addMetric('الغياب غير المبرر', ['absentWithoutExcuseCount'], 'number');
    addMetric('إجمالي الغياب', ['absenceCount', 'totalAbsence', 'missedSessions'], 'number');
    addMetric('عدد الحصص', ['sessionCount', 'lessonsCount'], 'number');
    addMetric('دقائق التدريس', ['teachingMinutes', 'totalMinutes'], 'number', 'دقيقة');
    addMetric('الدقائق الإضافية', ['overtimeMinutes'], 'number', 'دقيقة');
    addMetric('الراتب الأساسي', ['baseSalary'], 'currency');
    addMetric('إجمالي الراتب', ['salaryTotal', 'totalSalary'], 'currency');
    addMetric('المكافآت', ['bonusTotal', 'bonuses', 'totalBonus'], 'currency');
    addMetric('الخصومات', ['deductionTotal', 'deductions', 'totalDeduction'], 'currency');
    addMetric('صافي الراتب', ['netSalary', 'takeHomePay'], 'currency');
    addMetric('الأجر بالساعة', ['hourlyRate'], 'currency');
    addMetric('نسبة الحضور', ['attendanceRate'], 'percentage');

    return metrics;
  }

  private formatDate(value: unknown): string {
    if (typeof value !== 'string' || !value.trim()) {
      return '—';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
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
