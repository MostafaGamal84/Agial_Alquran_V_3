import { CommonModule } from '@angular/common';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
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
import jsPDF from 'jspdf';
import {
  MatSlideToggleChange,
  MatSlideToggleModule
} from '@angular/material/slide-toggle';
import { Subscription } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  finalize,
  switchMap
} from 'rxjs/operators';

import {
  TeacherSalaryService,
  TeacherSalaryInvoice,
  TeacherMonthlySummary,
  TeacherSalaryInvoiceDetails,
  ApiError,
  ApiResponse,
  GenerateMonthlyResponse,
  UpdateTeacherPaymentDto,
  ReceiptUpload
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

interface InvoicePdfContext {
  invoice: TeacherSalaryInvoice;
  summary: TeacherMonthlySummary | null;
  details: TeacherSalaryInvoiceDetails | null;
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
  private readonly dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
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
    if (!invoiceId) {
      event.source.checked = !event.checked;
      this.toastService.error('Invoice identifier was invalid.');
      return;
    }

    const invoiceSnapshot: TeacherSalaryInvoice = { ...invoice };
    const newValue = event.checked;
    const payload = this.buildUpdatePaymentPayload(invoice, newValue);
    this.updatingStatusIds.add(invoiceId);

    const update$ = newValue
      ? this.teacherSalaryService
          .getPaymentReceipt(invoiceId)
          .pipe(
            switchMap((response) => {
              const receipt = this.buildReceiptUpload(response, invoice);
              return this.teacherSalaryService.updatePayment(payload, receipt);
            })
          )
      : this.teacherSalaryService.updatePayment(payload);

    update$
      .pipe(
        finalize(() => {
          this.updatingStatusIds.delete(invoiceId);
        })
      )
      .subscribe({
        next: (response) => {
          if (response.isSuccess) {
            const updatedInvoice = this.mergeInvoiceData(
              invoiceSnapshot,
              this.extractInvoiceFromStatusResponse(response)
            );
            this.toastService.success(
              `Invoice marked as ${newValue ? 'paid' : 'unpaid'}.`
            );
            if (this.canGenerateInvoices && newValue) {
              this.queueInvoicePdfGeneration(invoiceId, updatedInvoice);
            }
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
        error: async (error) => {
          event.source.checked = !newValue;
          if (newValue && this.isReceiptDownloadError(error)) {
            await this.notifyReceiptDownloadFailure(error);
          } else {
            await this.notifyHttpError(
              error,
              'Failed to update invoice payment status.'
            );
          }
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

  private formatDateTime(value: unknown): string {
    if (value === null || value === undefined || value === '') {
      return '—';
    }

    let date: Date | null = null;
    if (value instanceof Date) {
      date = value;
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      date = new Date(value);
    } else if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length === 0) {
        return '—';
      }
      const parsed = new Date(trimmed);
      if (!Number.isNaN(parsed.getTime())) {
        date = parsed;
      }
    }

    if (date && !Number.isNaN(date.getTime())) {
      try {
        return this.dateTimeFormatter.format(date);
      } catch {
        return date.toLocaleString();
      }
    }

    return String(value);
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

  private buildUpdatePaymentPayload(
    invoice: TeacherSalaryInvoice,
    isPaid: boolean
  ): UpdateTeacherPaymentDto {
    const payload: UpdateTeacherPaymentDto = {
      id: invoice.id
    };

    const amount = this.getSalaryAmount(invoice);
    if (amount !== null) {
      payload.amount = amount;
    }

    if (isPaid) {
      payload.payStatue = true;
      payload.isCancelled = false;
    } else {
      payload.payStatue = false;
      payload.isCancelled = true;
    }

    return payload;
  }

  private buildReceiptUpload(
    response: HttpResponse<Blob>,
    invoice: TeacherSalaryInvoice
  ): ReceiptUpload {
    const blob = response.body;
    if (!blob || blob.size === 0) {
      throw new Error('RECEIPT_UNAVAILABLE');
    }

    const fileNameFromHeader = this.extractFileNameFromContentDisposition(
      response.headers.get('content-disposition')
    );
    const fileName = fileNameFromHeader ?? this.buildReceiptFileName(invoice);
    const type = blob.type && blob.type.trim().length > 0 ? blob.type : 'application/pdf';
    const normalizedBlob = blob.type && blob.type.trim().length > 0 ? blob : new Blob([blob], { type });

    return {
      file: normalizedBlob,
      fileName
    };
  }

  private extractFileNameFromContentDisposition(
    headerValue: string | null
  ): string | null {
    if (!headerValue) {
      return null;
    }
    const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i.exec(headerValue);
    if (!match) {
      return null;
    }
    let fileName = match[1];
    if (!fileName) {
      return null;
    }
    fileName = fileName.replace(/^['"]|['"]$/g, '');
    try {
      return decodeURIComponent(fileName);
    } catch {
      return fileName;
    }
  }

  private buildReceiptFileName(invoice: TeacherSalaryInvoice): string {
    const teacherPart = this.toSlug(invoice.teacherName ?? 'teacher');
    const monthDisplay = this.formatMonth(invoice);
    const monthPart = this.toSlug(monthDisplay);
    const teacher = teacherPart.length > 0 ? teacherPart : 'teacher';
    const month = monthPart.length > 0 ? monthPart : 'month';
    const idPart = invoice.id ? `-${invoice.id}` : '';
    return `teacher-invoice-${teacher}-${month}${idPart}.pdf`;
  }

  private mergeInvoiceData(
    fallback: TeacherSalaryInvoice,
    updates?: TeacherSalaryInvoice | null
  ): TeacherSalaryInvoice {
    const base = { ...fallback };
    if (!updates) {
      return base;
    }
    return { ...base, ...updates };
  }

  private extractInvoiceFromStatusResponse(
    response: ApiResponse<
      TeacherSalaryInvoice | TeacherSalaryInvoiceDetails | boolean | null
    >
  ): TeacherSalaryInvoice | null {
    if (!response) {
      return null;
    }
    return this.resolveInvoiceFromPayload(response.data);
  }

  private resolveInvoiceFromPayload(payload: unknown): TeacherSalaryInvoice | null {
    if (!payload || typeof payload === 'boolean') {
      return null;
    }
    if (this.isTeacherSalaryInvoice(payload)) {
      return payload;
    }
    if (Array.isArray(payload)) {
      const match = payload.find((item) => this.isTeacherSalaryInvoice(item));
      return match ?? null;
    }
    if (typeof payload === 'object') {
      const record = payload as Record<string, unknown>;
      const invoiceCandidate = record['invoice'];
      if (this.isTeacherSalaryInvoice(invoiceCandidate)) {
        return invoiceCandidate;
      }
      const dataCandidate = record['data'];
      if (dataCandidate && dataCandidate !== payload) {
        const nested = this.resolveInvoiceFromPayload(dataCandidate);
        if (nested) {
          return nested;
        }
      }
    }
    return null;
  }

  private isTeacherSalaryInvoice(
    value: unknown
  ): value is TeacherSalaryInvoice {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }
    const invoice = value as TeacherSalaryInvoice;
    return Number.isFinite(invoice.id ?? NaN);
  }

  private toSlug(value: string): string {
    const normalized = value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return normalized;
  }

  private queueInvoicePdfGeneration(
    invoiceId: number,
    fallbackInvoice: TeacherSalaryInvoice
  ): void {
    if (!this.canGenerateInvoices) {
      return;
    }

    const context = this.buildInvoicePdfContext(invoiceId, fallbackInvoice);
    if (context) {
      this.generateInvoicePdf(context);
      return;
    }

    const subscription = this.teacherSalaryService
      .getInvoiceDetails(invoiceId)
      .subscribe({
        next: (response) => {
          if (response.isSuccess) {
            const fetched = response.data ?? null;
            const fetchedContext = this.buildInvoicePdfContext(
              invoiceId,
              fallbackInvoice,
              fetched
            );
            if (fetchedContext) {
              this.generateInvoicePdf(fetchedContext);
            } else {
              this.toastService.error(
                'Invoice data was incomplete for PDF generation.'
              );
            }
          } else {
            this.handleErrors(
              response.errors,
              'Failed to generate the invoice PDF.'
            );
          }
        },
        error: () => {
          this.toastService.error('Failed to generate the invoice PDF.');
        }
      });

    this.subscriptions.add(subscription);
  }

  private buildInvoicePdfContext(
    invoiceId: number,
    fallbackInvoice: TeacherSalaryInvoice,
    details?: TeacherSalaryInvoiceDetails | null
  ): InvoicePdfContext | null {
    const detailSource =
      details ??
      (this.invoiceDetails?.invoice?.id === invoiceId ? this.invoiceDetails : null);

    const invoiceCandidate =
      detailSource?.invoice ??
      this.findInvoiceById(invoiceId) ??
      (this.selectedInvoice?.id === invoiceId ? this.selectedInvoice : null) ??
      fallbackInvoice ??
      null;

    if (!invoiceCandidate) {
      return null;
    }

    const summaryCandidate =
      detailSource?.monthlySummary ??
      (this.selectedInvoice?.id === invoiceId ? this.detailSummary : null) ??
      null;

    return {
      invoice: invoiceCandidate,
      summary: summaryCandidate ?? null,
      details: detailSource ?? null
    };
  }

  private generateInvoicePdf(context: InvoicePdfContext): void {
    try {
      const doc = this.createInvoicePdfDocument(context);
      const fileName = this.buildReceiptFileName(context.invoice);
      this.presentInvoicePdf(doc, fileName);
    } catch (error) {
      console.error('Failed to generate invoice PDF', error);
      this.toastService.error('Failed to generate the invoice PDF.');
    }
  }

  private createInvoicePdfDocument(context: InvoicePdfContext): jsPDF {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const leftMargin = 14;
    const rightMargin = 14;
    const maxWidth = pageWidth - leftMargin - rightMargin;
    let y = 20;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Teacher Salary Invoice', pageWidth / 2, y, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    y += 10;

    const invoice = context.invoice;
    const summary = context.summary;
    const invoiceNumber = invoice.id ? invoice.id.toString() : '—';
    const teacherId =
      this.resolveInvoiceNumber(invoice, ['teacherId']) ??
      this.resolveSummaryNumber(summary, ['teacherId']);
    const teacherName = this.resolveTeacherName(invoice, summary);
    const billingMonth = this.resolveInvoiceMonth(context);
    const paymentDate = this.resolvePaymentDateDisplay(invoice);
    const statusLabel = this.getStatusLabel(invoice);
    const invoiceAmount = this.formatCurrency(this.getSalaryAmount(invoice));
    const generatedOn = this.formatDateTime(new Date());

    y = this.drawKeyValue(doc, 'Invoice Number', invoiceNumber, leftMargin, y, maxWidth);
    if (teacherId !== null) {
      y = this.drawKeyValue(
        doc,
        'Teacher ID',
        this.numberFormatter.format(teacherId),
        leftMargin,
        y,
        maxWidth
      );
    }
    y = this.drawKeyValue(doc, 'Teacher', teacherName, leftMargin, y, maxWidth);
    y = this.drawKeyValue(doc, 'Billing Month', billingMonth, leftMargin, y, maxWidth);
    y = this.drawKeyValue(doc, 'Payment Date', paymentDate, leftMargin, y, maxWidth);
    y = this.drawKeyValue(doc, 'Status', statusLabel, leftMargin, y, maxWidth);
    y = this.drawKeyValue(doc, 'Invoice Amount', invoiceAmount, leftMargin, y, maxWidth);
    y = this.drawKeyValue(doc, 'Generated On', generatedOn, leftMargin, y, maxWidth);

    y = this.drawSectionDivider(doc, y, leftMargin, pageWidth - rightMargin);
    y = this.drawSectionHeader(doc, 'Salary Breakdown', leftMargin, y);

    const baseSalary = this.resolveSummaryNumber(summary, ['baseSalary']);
    const salaryTotal =
      this.resolveSummaryNumber(summary, ['salaryTotal', 'totalSalary']) ??
      this.getSalaryAmount(invoice);
    const bonuses = this.resolveSummaryNumber(summary, [
      'bonusTotal',
      'bonuses',
      'totalBonus'
    ]);
    const deductions = this.resolveSummaryNumber(summary, [
      'deductionTotal',
      'deductions',
      'totalDeduction'
    ]);
    const netSalary =
      this.resolveSummaryNumber(summary, ['netSalary', 'takeHomePay']) ??
      this.resolveInvoiceNumber(invoice, ['netSalary', 'netPay']);
    const hourlyRate = this.resolveSummaryNumber(summary, ['hourlyRate']);

    const salaryRows: Array<[string, number | null]> = [
      ['Base Salary', baseSalary],
      ['Bonuses', bonuses],
      ['Deductions', deductions],
      ['Net Salary', netSalary ?? salaryTotal],
      ['Total Salary', salaryTotal],
      ['Hourly Rate', hourlyRate]
    ];

    for (const [label, value] of salaryRows) {
      if (value !== null && value !== undefined) {
        y = this.drawKeyValue(
          doc,
          label,
          this.formatCurrency(value),
          leftMargin,
          y,
          maxWidth
        );
      }
    }

    y = this.drawSectionDivider(doc, y, leftMargin, pageWidth - rightMargin);
    y = this.drawSectionHeader(doc, 'Attendance Summary', leftMargin, y);

    const attendanceCount = this.resolveSummaryNumber(summary, [
      'attendanceCount',
      'totalAttendance',
      'attendedSessions'
    ]);
    const absenceCount = this.resolveSummaryNumber(summary, [
      'absenceCount',
      'totalAbsence',
      'missedSessions'
    ]);
    const sessionCount = this.resolveSummaryNumber(summary, [
      'sessionCount',
      'lessonsCount'
    ]);
    const teachingMinutes = this.resolveSummaryNumber(summary, [
      'teachingMinutes',
      'totalMinutes'
    ]);
    const overtimeMinutes = this.resolveSummaryNumber(summary, ['overtimeMinutes']);
    const attendanceRate = this.resolveSummaryNumber(summary, ['attendanceRate']);

    if (attendanceCount !== null) {
      y = this.drawKeyValue(
        doc,
        'Attendance',
        this.numberFormatter.format(attendanceCount),
        leftMargin,
        y,
        maxWidth
      );
    }
    if (absenceCount !== null) {
      y = this.drawKeyValue(
        doc,
        'Absence',
        this.numberFormatter.format(absenceCount),
        leftMargin,
        y,
        maxWidth
      );
    }
    if (sessionCount !== null) {
      y = this.drawKeyValue(
        doc,
        'Sessions',
        this.numberFormatter.format(sessionCount),
        leftMargin,
        y,
        maxWidth
      );
    }
    if (teachingMinutes !== null) {
      y = this.drawKeyValue(
        doc,
        'Teaching Minutes',
        `${this.numberFormatter.format(teachingMinutes)} min`,
        leftMargin,
        y,
        maxWidth
      );
    }
    if (overtimeMinutes !== null) {
      y = this.drawKeyValue(
        doc,
        'Overtime Minutes',
        `${this.numberFormatter.format(overtimeMinutes)} min`,
        leftMargin,
        y,
        maxWidth
      );
    }
    if (attendanceRate !== null) {
      const normalizedRate =
        Math.abs(attendanceRate) <= 1
          ? attendanceRate * 100
          : attendanceRate;
      const rateDisplay = `${this.percentFormatter.format(normalizedRate)}%`;
      y = this.drawKeyValue(doc, 'Attendance Rate', rateDisplay, leftMargin, y, maxWidth);
    }

    y = this.drawSectionDivider(doc, y, leftMargin, pageWidth - rightMargin);
    y = this.drawSectionHeader(doc, 'Notes', leftMargin, y);

    const notes =
      'This invoice has been generated automatically based on recorded salary and attendance data for the selected period.';
    const noteLines = doc.splitTextToSize(notes, maxWidth);
    const noteHeight = (Array.isArray(noteLines) ? noteLines.length : 1) * 6 + 2;
    y = this.ensurePdfSpace(doc, y, noteHeight);
    doc.setFont('helvetica', 'italic');
    doc.text(noteLines, leftMargin, y);
    doc.setFont('helvetica', 'normal');

    return doc;
  }

  private drawSectionDivider(
    doc: jsPDF,
    y: number,
    left: number,
    right: number
  ): number {
    y = this.ensurePdfSpace(doc, y, 6);
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.2);
    doc.line(left, y, right, y);
    doc.setDrawColor(0, 0, 0);
    return y + 4;
  }

  private drawSectionHeader(doc: jsPDF, title: string, x: number, y: number): number {
    y = this.ensurePdfSpace(doc, y, 10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(title, x, y);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    return y + 6;
  }

  private drawKeyValue(
    doc: jsPDF,
    label: string,
    value: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight = 6
  ): number {
    const safeValue = value && value.trim().length > 0 ? value : '—';
    const labelText = `${label}: `;
    const labelWidth = doc.getTextWidth(labelText);
    const availableWidth = Math.max(maxWidth - labelWidth, 40);
    const valueLines = doc.splitTextToSize(safeValue, availableWidth);
    const lineCount = Array.isArray(valueLines) ? valueLines.length : 1;
    const requiredHeight = lineCount * lineHeight + 2;
    y = this.ensurePdfSpace(doc, y, requiredHeight);
    doc.setFont('helvetica', 'bold');
    doc.text(labelText, x, y);
    doc.setFont('helvetica', 'normal');
    doc.text(valueLines, x + labelWidth, y);
    return y + lineCount * lineHeight + 2;
  }

  private ensurePdfSpace(doc: jsPDF, y: number, requiredHeight: number): number {
    const topMargin = 20;
    const bottomMargin = 20;
    const pageHeight = doc.internal.pageSize.getHeight();
    if (y < topMargin) {
      return topMargin;
    }
    if (y + requiredHeight > pageHeight - bottomMargin) {
      doc.addPage();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      return topMargin;
    }
    return y;
  }

  private presentInvoicePdf(doc: jsPDF, fileName: string): void {
    try {
      if (typeof doc.autoPrint === 'function') {
        doc.autoPrint();
      }
    } catch {
      // Ignore failures from autoPrint support on different browsers.
    }

    const blob = doc.output('blob');
    const blobUrl = typeof URL !== 'undefined' ? URL.createObjectURL(blob) : '';

    if (typeof window !== 'undefined' && blobUrl) {
      const printWindow = window.open(blobUrl, '_blank');
      if (!printWindow && typeof document !== 'undefined') {
        const anchor = document.createElement('a');
        anchor.href = blobUrl;
        anchor.download = fileName;
        anchor.click();
      }
    }

    if (blobUrl) {
      setTimeout(() => {
        try {
          URL.revokeObjectURL(blobUrl);
        } catch {
          // Ignore revoke errors.
        }
      }, 120000);
    }
  }

  private resolveTeacherName(
    invoice: TeacherSalaryInvoice,
    summary: TeacherMonthlySummary | null
  ): string {
    const invoiceName =
      typeof invoice.teacherName === 'string' && invoice.teacherName.trim().length > 0
        ? invoice.teacherName.trim()
        : null;
    if (invoiceName) {
      return invoiceName;
    }
    const summaryName = this.resolveSummaryString(summary, ['teacherName']);
    return summaryName ?? '—';
  }

  private resolveInvoiceMonth(context: InvoicePdfContext): string {
    const invoiceMonth = this.formatMonth(context.invoice);
    if (invoiceMonth && invoiceMonth !== '—') {
      return invoiceMonth;
    }
    const summaryMonth = this.resolveSummaryString(context.summary, ['month']);
    if (summaryMonth) {
      return this.formatMonthString(summaryMonth);
    }
    return '—';
  }

  private resolvePaymentDateDisplay(invoice: TeacherSalaryInvoice): string {
    const candidates: unknown[] = [
      invoice.payedAt,
      (invoice as Record<string, unknown>)['paidAt'],
      (invoice as Record<string, unknown>)['paymentDate'],
      (invoice as Record<string, unknown>)['lastPaymentDate']
    ];
    for (const candidate of candidates) {
      const formatted = this.formatDateTime(candidate);
      if (formatted !== '—') {
        return formatted;
      }
    }
    return this.formatDateTime(new Date());
  }

  private resolveInvoiceNumber(
    invoice: TeacherSalaryInvoice | null | undefined,
    fields: string[]
  ): number | null {
    if (!invoice) {
      return null;
    }
    for (const field of fields) {
      const value = (invoice as Record<string, unknown>)[field];
      const numeric = this.coerceNumber(value);
      if (numeric !== null) {
        return numeric;
      }
    }
    return null;
  }

  private resolveSummaryNumber(
    summary: TeacherMonthlySummary | null | undefined,
    fields: string[]
  ): number | null {
    if (!summary) {
      return null;
    }
    for (const field of fields) {
      const value = (summary as Record<string, unknown>)[field];
      const numeric = this.coerceNumber(value);
      if (numeric !== null) {
        return numeric;
      }
    }
    return null;
  }

  private resolveSummaryString(
    summary: TeacherMonthlySummary | null | undefined,
    fields: string[]
  ): string | null {
    if (!summary) {
      return null;
    }
    for (const field of fields) {
      const value = (summary as Record<string, unknown>)[field];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }
    return null;
  }

  private isReceiptDownloadError(error: unknown): boolean {
    if (error instanceof HttpErrorResponse) {
      return error.url?.includes('/GetPaymentReceipt') ?? false;
    }
    if (error instanceof Error) {
      return error.message === 'RECEIPT_UNAVAILABLE';
    }
    return false;
  }

  private async notifyReceiptDownloadFailure(error: unknown): Promise<void> {
    if (error instanceof Error && error.message === 'RECEIPT_UNAVAILABLE') {
      this.toastService.error('Receipt file for this invoice was unavailable.');
      return;
    }
    if (error instanceof HttpErrorResponse) {
      const message = await this.extractHttpErrorMessage(error);
      if (message && message.trim().length > 0) {
        this.toastService.error(message);
        return;
      }
      if (error.status === 404) {
        this.toastService.error('No stored receipt was found for this invoice.');
        return;
      }
      if (error.status === 500) {
        this.toastService.error('The stored receipt could not be read.');
        return;
      }
    }
    this.toastService.error('Failed to retrieve the teacher payment receipt.');
  }

  private async notifyHttpError(
    error: unknown,
    fallback: string
  ): Promise<void> {
    if (error instanceof HttpErrorResponse) {
      const message = await this.extractHttpErrorMessage(error);
      if (message && message.trim().length > 0) {
        this.toastService.error(message);
        return;
      }
    }
    this.toastService.error(fallback);
  }

  private async extractHttpErrorMessage(
    error: HttpErrorResponse
  ): Promise<string | null> {
    const raw = error.error;
    if (!raw) {
      return null;
    }
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
    if (raw instanceof Blob) {
      try {
        const text = (await raw.text()).trim();
        if (!text) {
          return null;
        }
        try {
          const parsed = JSON.parse(text);
          if (typeof parsed === 'string') {
            return parsed;
          }
          if (parsed && typeof parsed.message === 'string') {
            return parsed.message;
          }
          if (parsed && typeof parsed.error === 'string') {
            return parsed.error;
          }
        } catch {
          return text;
        }
      } catch {
        return null;
      }
    }
    if (typeof raw === 'object' && raw !== null) {
      const maybeMessage =
        (raw as { message?: string; error?: string }).message ??
        (raw as { message?: string; error?: string }).error;
      if (typeof maybeMessage === 'string') {
        const trimmed = maybeMessage.trim();
        if (trimmed.length > 0) {
          return trimmed;
        }
      }
    }
    return null;
  }

}
