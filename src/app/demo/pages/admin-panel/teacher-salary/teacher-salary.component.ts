import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
  inject
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatDrawer, MatSidenavModule } from '@angular/material/sidenav';
import { MatDatepicker, MatDatepickerModule } from '@angular/material/datepicker';
import {
  DateAdapter,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE
} from '@angular/material/core';
import {
  MatMomentDateModule,
  MomentDateAdapter,
  MAT_MOMENT_DATE_ADAPTER_OPTIONS
} from '@angular/material-moment-adapter';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import moment, { Moment } from 'moment';
import {
  MatSlideToggleChange,
  MatSlideToggleModule
} from '@angular/material/slide-toggle';
import { Subscription } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  finalize
} from 'rxjs/operators';

import {
  TeacherSalaryService,
  TeacherSalaryInvoice,
  TeacherMonthlySummary,
  TeacherSalaryInvoiceDetails,
  ApiError,
  GenerateMonthlyResponse
} from 'src/app/@theme/services/teacher-salary.service';
import { ToastService } from 'src/app/@theme/services/toast.service';
import {
  LookupService,
  LookUpUserDto,
  FilteredResultRequestDto
} from 'src/app/@theme/services/lookup.service';
import { AuthenticationService } from 'src/app/@theme/services/authentication.service';
import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';

export const MONTH_FORMATS = {
  parse: { dateInput: 'MMMM YYYY' },
  display: {
    dateInput: 'MMMM YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY'
  }
};

interface SummaryMetric {
  label: string;
  value: number | string;
  type: 'number' | 'currency' | 'percentage' | 'text';
  suffix?: string;
}

@Component({
  selector: 'app-teacher-salary',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatSidenavModule,
    MatIconModule,
    MatDividerModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatMomentDateModule,
    MatSelectModule,
    MatProgressBarModule,
    MatTableModule,
    MatSlideToggleModule,
    MatPaginatorModule
  ],
  templateUrl: './teacher-salary.component.html',
  styleUrls: ['./teacher-salary.component.scss'],
  providers: [
    {
      provide: DateAdapter,
      useClass: MomentDateAdapter,
      deps: [MAT_DATE_LOCALE, MAT_MOMENT_DATE_ADAPTER_OPTIONS]
    },
    { provide: MAT_DATE_FORMATS, useValue: MONTH_FORMATS }
  ]
})
export class TeacherSalaryComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  private teacherSalaryService = inject(TeacherSalaryService);
  private toastService = inject(ToastService);
  private lookupService = inject(LookupService);
  private authenticationService = inject(AuthenticationService);

  private subscriptions = new Subscription();
  private readonly numberFormatter = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 0
  });
  private readonly percentFormatter = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
  private readonly currencyFormatter = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  readonly selectedMonth = new FormControl<Moment>(
    moment().startOf('month').subtract(1, 'month').utc(true)
  );
  readonly selectedTeacher = new FormControl<number | null>(null);
  readonly teacherSearchControl = new FormControl<string>('');

  readonly dataSource = new MatTableDataSource<TeacherSalaryInvoice>([]);
  displayedColumns: string[] = [];

  teachers: LookUpUserDto[] = [];
  teacherLoading = false;

  invoicesLoading = false;
  summaryLoading = false;
  detailsLoading = false;
  manualGenerationLoading = false;

  selectedInvoice: TeacherSalaryInvoice | null = null;
  invoiceDetails: TeacherSalaryInvoiceDetails | null = null;
  detailSummary: TeacherMonthlySummary | null = null;
  summary: TeacherMonthlySummary | null = null;

  summaryMetrics: SummaryMetric[] = [];
  detailSummaryMetrics: SummaryMetric[] = [];

  generationResult: GenerateMonthlyResponse | null = null;

  private readonly updatingStatusIds = new Set<number>();
  private readonly role = this.authenticationService.getRole();
  readonly canManagePayments =
    this.role === UserTypesEnum.Admin || this.role === UserTypesEnum.Manager;
  readonly canGenerateInvoices = this.role === UserTypesEnum.Admin;
  readonly isTeacher = this.role === UserTypesEnum.Teacher;

  @ViewChild(MatPaginator) paginator?: MatPaginator;
  @ViewChild('detailDrawer') detailDrawer?: MatDrawer;

  ngOnInit(): void {
    this.updateDisplayedColumns();
    if (this.canManagePayments) {
      this.loadTeachers();
      this.subscriptions.add(
        this.teacherSearchControl.valueChanges
          .pipe(debounceTime(300), distinctUntilChanged())
          .subscribe((value) => {
            this.loadTeachers(value ?? '');
          })
      );
    }

    this.subscriptions.add(
      this.selectedTeacher.valueChanges
        .pipe(distinctUntilChanged())
        .subscribe(() => {
          this.resetPaginator();
          this.loadInvoices();
          this.loadMonthlySummary();
        })
    );

    this.loadInvoices();
    this.loadMonthlySummary();
  }

  ngAfterViewInit(): void {
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.updatingStatusIds.clear();
  }

  setMonth(normalizedMonthAndYear: Moment, datepicker: MatDatepicker<Moment>): void {
    const normalized = normalizedMonthAndYear
      .clone()
      .startOf('month')
      .utc(true);
    this.selectedMonth.setValue(normalized);
    datepicker.close();
    this.resetPaginator();
    this.loadInvoices();
    this.loadMonthlySummary();
  }

  reloadAll(): void {
    this.loadInvoices();
    this.loadMonthlySummary();
  }

  refreshTeachers(): void {
    if (this.canManagePayments) {
      this.loadTeachers(this.teacherSearchControl.value ?? '');
    }
  }

  clearTeacherSearch(): void {
    if (this.canManagePayments) {
      this.teacherSearchControl.setValue('', { emitEvent: false });
      this.loadTeachers('');
    }
  }

  openInvoice(invoice: TeacherSalaryInvoice): void {
    if (!invoice) {
      return;
    }
    this.selectedInvoice = invoice;
    this.loadInvoiceDetails(invoice.id);
  }

  closeDetails(): void {
    this.selectedInvoice = null;
    this.invoiceDetails = null;
    this.detailSummary = null;
    this.detailSummaryMetrics = [];
    this.detailDrawer?.close();
  }

  onDrawerClosed(): void {
    this.selectedInvoice = null;
    this.invoiceDetails = null;
    this.detailSummary = null;
    this.detailSummaryMetrics = [];
  }

  onTogglePaid(
    event: MatSlideToggleChange,
    invoice: TeacherSalaryInvoice
  ): void {
    event.source.checked = event.checked;
    const invoiceId = invoice.id;
    const newValue = event.checked;
    const payload = {
      isPayed: newValue,
      payedAt: newValue ? undefined : null
    };
    this.updatingStatusIds.add(invoiceId);

    this.teacherSalaryService
      .updateInvoiceStatus(invoiceId, payload)
      .pipe(
        finalize(() => {
          this.updatingStatusIds.delete(invoiceId);
        })
      )
      .subscribe({
        next: (response) => {
          if (response.isSuccess) {
            this.toastService.success(
              `Invoice marked as ${newValue ? 'paid' : 'unpaid'}.`
            );
            this.loadInvoices();
            if (this.selectedInvoice?.id === invoiceId) {
              this.loadInvoiceDetails(invoiceId, false);
            }
          } else {
            event.source.checked = !newValue;
            this.handleErrors(
              response.errors,
              'Failed to update invoice payment status.'
            );
          }
        },
        error: () => {
          event.source.checked = !newValue;
          this.toastService.error('Failed to update invoice payment status.');
        }
      });
  }

  isStatusUpdating(invoiceId: number): boolean {
    return this.updatingStatusIds.has(invoiceId);
  }

  onGenerateMonthly(): void {
    if (this.manualGenerationLoading) {
      return;
    }
    const monthParam = this.toMonthParam(this.selectedMonth.value);
    this.manualGenerationLoading = true;
    this.teacherSalaryService
      .generateMonthly(monthParam)
      .pipe(finalize(() => (this.manualGenerationLoading = false)))
      .subscribe({
        next: (response) => {
          if (response.isSuccess) {
            this.generationResult = response.data ?? null;
            const created = this.generationResult?.createdCount ?? 0;
            const updated = this.generationResult?.updatedCount ?? 0;
            const skipped = this.generationResult?.skippedCount ?? 0;
            this.toastService.success(
              `Generation complete. Created ${created}, updated ${updated}, skipped ${skipped}.`
            );
            this.loadInvoices();
            this.loadMonthlySummary();
          } else {
            this.handleErrors(
              response.errors,
              'Failed to generate monthly invoices.'
            );
          }
        },
        error: () => {
          this.toastService.error('Failed to generate monthly invoices.');
        }
      });
  }

  formatMonth(invoice: TeacherSalaryInvoice | null): string {
    if (!invoice) {
      return '—';
    }
    return this.formatMonthString(this.extractMonthValue(invoice));
  }

  formatSummaryMonth(): string {
    const summaryMonth = this.summary?.month;
    if (summaryMonth) {
      return this.formatMonthString(summaryMonth);
    }
    const selected = this.selectedMonth.value;
    return selected ? this.formatMonthString(selected.toISOString()) : '—';
  }

  formatSalary(invoice: TeacherSalaryInvoice | null): string {
    const amount = this.getSalaryAmount(invoice);
    return this.formatCurrency(amount);
  }

  formatCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '—';
    }
    try {
      return this.currencyFormatter.format(value);
    } catch {
      return value.toFixed(2);
    }
  }

  formatMetricValue(metric: SummaryMetric): string {
    if (metric.value === null || metric.value === undefined || metric.value === '') {
      return '—';
    }
    if (metric.type === 'currency') {
      const num = this.coerceNumber(metric.value);
      return num !== null ? this.formatCurrency(num) : String(metric.value);
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

  getStatusLabel(invoice: TeacherSalaryInvoice | null): string {
    if (!invoice) {
      return 'Unpaid';
    }
    const statusCandidates: unknown[] = [
      invoice.status,
      (invoice as Record<string, unknown>)['paymentStatus'],
      this.isInvoicePaid(invoice) ? 'Paid' : 'Unpaid'
    ];
    for (const candidate of statusCandidates) {
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        return candidate;
      }
    }
    return this.isInvoicePaid(invoice) ? 'Paid' : 'Unpaid';
  }

  isInvoicePaid(invoice: TeacherSalaryInvoice | null): boolean {
    if (!invoice) {
      return false;
    }
    const candidateValues: unknown[] = [
      invoice.isPayed,
      (invoice as Record<string, unknown>)['isPaid'],
      (invoice as Record<string, unknown>)['paid']
    ];
    for (const candidate of candidateValues) {
      if (typeof candidate === 'boolean') {
        return candidate;
      }
      if (typeof candidate === 'string') {
        const normalized = candidate.toLowerCase();
        if (normalized === 'paid' || normalized === 'true') {
          return true;
        }
        if (normalized === 'unpaid' || normalized === 'false') {
          return false;
        }
      }
    }
    const statusString =
      typeof invoice.status === 'string'
        ? invoice.status.toLowerCase()
        : typeof (invoice as Record<string, unknown>)['paymentStatus'] === 'string'
        ? String((invoice as Record<string, unknown>)['paymentStatus']).toLowerCase()
        : undefined;
    if (statusString) {
      if (statusString.includes('paid') && !statusString.includes('un')) {
        return true;
      }
      if (statusString.includes('unpaid')) {
        return false;
      }
    }
    return false;
  }

  getReceiptUrl(invoice: TeacherSalaryInvoice): string | null {
    const candidates: unknown[] = [
      invoice.receiptUrl,
      (invoice as Record<string, unknown>)['receiptLink'],
      (invoice as Record<string, unknown>)['receipt'],
      (invoice as Record<string, unknown>)['receiptUrl']
    ];
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        return candidate;
      }
    }
    return null;
  }

  getMonthDisplay(invoice: TeacherSalaryInvoice): string {
    return this.formatMonth(invoice);
  }

  handleRowKey(index: number, invoice: TeacherSalaryInvoice): number {
    return invoice.id ?? index;
  }

  private loadTeachers(searchTerm?: string): void {
    if (!this.canManagePayments) {
      return;
    }
    const filter: FilteredResultRequestDto = {
      skipCount: 0,
      maxResultCount: 50,
      searchTerm: searchTerm?.trim() ?? undefined
    };
    this.teacherLoading = true;
    this.lookupService
      .getUsersForSelects(
        filter,
        Number(UserTypesEnum.Teacher),
        0,
        0,
        0
      )
      .pipe(finalize(() => (this.teacherLoading = false)))
      .subscribe({
        next: (response) => {
          if (response.isSuccess) {
            this.teachers = response.data?.items ?? [];
          } else {
            this.teachers = [];
            this.handleErrors(response.errors, 'Failed to load teachers.');
          }
        },
        error: () => {
          this.teachers = [];
          this.toastService.error('Failed to load teachers.');
        }
      });
  }

  private loadInvoices(): void {
    const monthParam = this.toMonthParam(this.selectedMonth.value);
    const teacherId = this.canManagePayments ? this.selectedTeacher.value : null;
    this.invoicesLoading = true;
    this.teacherSalaryService
      .getInvoices(monthParam, teacherId ?? null)
      .pipe(finalize(() => (this.invoicesLoading = false)))
      .subscribe({
        next: (response) => {
          if (response.isSuccess) {
            const invoices = Array.isArray(response.data)
              ? response.data
              : [];
            this.applyInvoices(invoices);
          } else {
            this.applyInvoices([]);
            this.handleErrors(
              response.errors,
              'Failed to load teacher salary invoices.'
            );
          }
        },
        error: () => {
          this.applyInvoices([]);
          this.toastService.error('Failed to load teacher salary invoices.');
        }
      });
  }

  loadMonthlySummary(): void {

    const monthParam = this.toMonthParam(this.selectedMonth.value);
    const teacherId = this.canManagePayments ? this.selectedTeacher.value : null;
    this.summaryLoading = true;
    this.teacherSalaryService
      .getMonthlySummary(monthParam, teacherId ?? null)
      .pipe(finalize(() => (this.summaryLoading = false)))
      .subscribe({
        next: (response) => {
          if (response.isSuccess) {
            this.summary = response.data ?? null;
            this.summaryMetrics = this.buildSummaryMetrics(this.summary);
          } else {
            this.summary = null;
            this.summaryMetrics = [];
            this.handleErrors(
              response.errors,
              'Failed to load teacher monthly summary.'
            );
          }
        },
        error: () => {
          this.summary = null;
          this.summaryMetrics = [];
          this.toastService.error('Failed to load teacher monthly summary.');
        }
      });
  }

  private loadInvoiceDetails(invoiceId: number, openDrawer = true): void {
    this.detailsLoading = true;
    this.teacherSalaryService
      .getInvoiceDetails(invoiceId)
      .pipe(finalize(() => (this.detailsLoading = false)))
      .subscribe({
        next: (response) => {
          if (response.isSuccess) {
            this.invoiceDetails = response.data;
            this.detailSummary = response.data?.monthlySummary ?? null;
            const invoiceCandidate =
              this.detailSummary?.invoice ?? response.data?.invoice ?? this.selectedInvoice;
            this.selectedInvoice = this.findInvoiceById(invoiceId) ?? invoiceCandidate ?? null;
            this.detailSummaryMetrics = this.buildSummaryMetrics(this.detailSummary);
            if (openDrawer) {
              setTimeout(() => this.detailDrawer?.open(), 0);
            }
          } else {
            this.handleErrors(response.errors, 'Failed to load invoice details.');
          }
        },
        error: () => {
          this.toastService.error('Failed to load invoice details.');
        }
      });
  }

  private updateDisplayedColumns(): void {
    const baseColumns = ['teacher', 'month', 'salary', 'status', 'paidAt', 'receipt'];
    this.displayedColumns = this.canManagePayments
      ? [...baseColumns, 'toggle']
      : baseColumns;
  }

  private resetPaginator(): void {
    if (this.paginator) {
      this.paginator.firstPage();
    }
  }

  private toMonthParam(month: Moment | null): string | null {
    if (!month) {
      return null;
    }
    return month.clone().startOf('month').utc(true).format('YYYY-MM-DD');
  }

  private applyInvoices(invoices: TeacherSalaryInvoice[]): void {
    const sorted = [...invoices].sort((a, b) => this.compareByMonthDesc(a, b));
    this.dataSource.data = sorted;
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
    if (this.selectedInvoice) {
      const updated = sorted.find((invoice) => invoice.id === this.selectedInvoice?.id);
      if (updated) {
        this.selectedInvoice = updated;
      } else {
        this.closeDetails();
      }
    }
  }

  private compareByMonthDesc(
    a: TeacherSalaryInvoice,
    b: TeacherSalaryInvoice
  ): number {
    const aTime = this.resolveInvoiceTime(a);
    const bTime = this.resolveInvoiceTime(b);
    if (bTime !== aTime) {
      return bTime - aTime;
    }
    return (b.id ?? 0) - (a.id ?? 0);
  }

  private resolveInvoiceTime(invoice: TeacherSalaryInvoice): number {
    const monthValue = this.extractMonthValue(invoice);
    if (monthValue) {
      const parsed = new Date(monthValue);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.getTime();
      }
    }
    const fallbackCandidates: unknown[] = [
      invoice.payedAt,
      (invoice as Record<string, unknown>)['createdAt'],
      (invoice as Record<string, unknown>)['invoiceDate'],
      (invoice as Record<string, unknown>)['updatedAt']
    ];
    for (const candidate of fallbackCandidates) {
      if (candidate instanceof Date) {
        return candidate.getTime();
      }
      if (typeof candidate === 'string') {
        const parsed = new Date(candidate);
        if (!Number.isNaN(parsed.getTime())) {
          return parsed.getTime();
        }
      }
    }
    return invoice.id ?? 0;
  }

  private extractMonthValue(invoice: TeacherSalaryInvoice): string | undefined {
    const candidates: unknown[] = [
      invoice.month,
      (invoice as Record<string, unknown>)['monthDate'],
      (invoice as Record<string, unknown>)['monthValue'],
      (invoice as Record<string, unknown>)['monthStart'],
      (invoice as Record<string, unknown>)['period'],
      (invoice as Record<string, unknown>)['month'],
      (invoice as Record<string, unknown>)['monthUtc']
    ];
    for (const candidate of candidates) {
      if (candidate instanceof Date) {
        return candidate.toISOString();
      }
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        return candidate;
      }
    }
    return undefined;
  }

  private formatMonthString(value?: string | null): string {
    if (!value) {
      return '—';
    }
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return new Intl.DateTimeFormat(undefined, {
        month: 'long',
        year: 'numeric'
      }).format(parsed);
    }
    return value;
  }

  private getSalaryAmount(invoice: TeacherSalaryInvoice | null): number | null {
    if (!invoice) {
      return null;
    }
    const fields = [
      'salaryAmount',
      'totalSalary',
      'salaryTotal',
      'netSalary',
      'amount'
    ];
    for (const field of fields) {
      const raw = (invoice as Record<string, unknown>)[field];
      const numeric = this.coerceNumber(raw);
      if (numeric !== null) {
        return numeric;
      }
    }
    return null;
  }

  private buildSummaryMetrics(
    summary: TeacherMonthlySummary | null
  ): SummaryMetric[] {
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

    addMetric('Attendance', ['attendanceCount', 'totalAttendance', 'attendedSessions'], 'number');
    addMetric('Absence', ['absenceCount', 'totalAbsence', 'missedSessions'], 'number');
    addMetric('Sessions', ['sessionCount', 'lessonsCount'], 'number');
    addMetric('Teaching Minutes', ['teachingMinutes', 'totalMinutes'], 'number', 'min');
    addMetric('Overtime Minutes', ['overtimeMinutes'], 'number', 'min');
    addMetric('Base Salary', ['baseSalary'], 'currency');
    addMetric('Salary Total', ['salaryTotal', 'totalSalary'], 'currency');
    addMetric('Bonuses', ['bonusTotal', 'bonuses', 'totalBonus'], 'currency');
    addMetric('Deductions', ['deductionTotal', 'deductions', 'totalDeduction'], 'currency');
    addMetric('Net Salary', ['netSalary', 'takeHomePay'], 'currency');
    addMetric('Hourly Rate', ['hourlyRate'], 'currency');
    addMetric('Attendance Rate', ['attendanceRate'], 'percentage');

    return metrics;
  }

  private coerceNumber(value: unknown): number | null {
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length === 0) {
        return null;
      }
      const parsed = Number(trimmed);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
    return null;
  }

  private handleErrors(errors: ApiError[] | undefined, fallback: string): void {
    if (errors && errors.length > 0) {
      const message = errors
        .map((error) => error.message || error.code)
        .filter((msg): msg is string => !!msg && msg.trim().length > 0)
        .join(' \u2022 ');
      if (message.length > 0) {
        this.toastService.error(message);
        return;
      }
    }
    this.toastService.error(fallback);
  }

  private findInvoiceById(id: number): TeacherSalaryInvoice | null {
    return this.dataSource.data.find((invoice) => invoice.id === id) ?? null;
  }
}
