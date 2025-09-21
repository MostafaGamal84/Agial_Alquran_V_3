import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
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
import { MatTooltipModule } from '@angular/material/tooltip';
import moment, { Moment } from 'moment';
import jsPDF, { TextOptionsLight } from 'jspdf';
import {
  MatSlideToggleChange,
  MatSlideToggleModule
} from '@angular/material/slide-toggle';
import { Observable, Subscription, of } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  finalize,
  map,
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
import { environment } from 'src/environments/environment';
import {
  PDF_ARABIC_FONT_FILE,
  PDF_ARABIC_FONT_NAME,
  PDF_ARABIC_FONT_VFS
} from 'src/app/@theme/utils/pdf-fonts';

type RgbColor = { r: number; g: number; b: number };

const PDF_ACCENT_COLOR: RgbColor = { r: 19, g: 66, b: 115 };
const PDF_ACCENT_LIGHT: RgbColor = { r: 243, g: 246, b: 253 };
const PDF_BORDER_COLOR: RgbColor = { r: 223, g: 230, b: 242 };
const PDF_TEXT_MUTED: RgbColor = { r: 90, g: 90, b: 90 };
const PDF_TEXT_PRIMARY: RgbColor = { r: 33, g: 33, b: 33 };

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

interface KeyValueOptions {
  labelAr?: string;
  valueAr?: string;
  highlight?: boolean;
}

interface SummaryCardItem {
  titleEn: string;
  titleAr: string;
  value: string;
  valueAr?: string;
}

interface SummaryCardLayout {
  englishLines: string[];
  arabicLines: string[];
  height: number;
  horizontalPadding: number;
  verticalPadding: number;
}

interface InvoicePdfContext {
  invoice: TeacherSalaryInvoice;
  summary: TeacherMonthlySummary | null;
  details: TeacherSalaryInvoiceDetails | null;
}

interface InvoicePdfArtifacts {
  doc: jsPDF;
  blob: Blob;
  fileName: string;
  receipt: ReceiptUpload;
}

class InvoicePdfContextError extends Error {
  constructor(message: string, readonly apiErrors?: ApiError[]) {
    super(message);
    this.name = 'InvoicePdfContextError';
  }
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
    MatTooltipModule,
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
  private static pdfFontsRegistered = false;

  private teacherSalaryService = inject(TeacherSalaryService);
  private toastService = inject(ToastService);
  private lookupService = inject(LookupService);
  private authenticationService = inject(AuthenticationService);

  private readonly apiBaseUrl = environment.apiUrl.replace(/\/+$/, '');
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
  private readonly uploadingReceiptIds = new Set<number>();
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
    this.uploadingReceiptIds.clear();
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

    const update$ = this.teacherSalaryService.updatePayment(payload);

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
            this.applyInvoiceUpdate(updatedInvoice);
            this.loadInvoices();
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
          await this.notifyHttpError(
            error,
            'Failed to update invoice payment status.'
          );
        }
      });
  }

  isStatusUpdating(invoiceId: number): boolean {
    return this.updatingStatusIds.has(invoiceId);
  }

  isReceiptUploading(invoiceId: number | null | undefined): boolean {
    return typeof invoiceId === 'number' && this.uploadingReceiptIds.has(invoiceId);
  }

  onGenerateInvoiceReceipt(
    event: MouseEvent,
    invoice: TeacherSalaryInvoice
  ): void {
    event.stopPropagation();
    if (!this.canGenerateInvoices) {
      return;
    }

    const invoiceId = invoice.id;
    if (!invoiceId) {
      this.toastService.error('Invoice identifier was invalid.');
      return;
    }

    if (this.isReceiptUploading(invoiceId)) {
      return;
    }

    const invoiceSnapshot: TeacherSalaryInvoice = { ...invoice };
    const additionalFields: Partial<UpdateTeacherPaymentDto> = {
      payStatue: true,
      isCancelled: false
    };
    const salaryAmount = this.getSalaryAmount(invoiceSnapshot);
    if (salaryAmount !== null) {
      additionalFields.amount = salaryAmount;
    }

    this.uploadingReceiptIds.add(invoiceId);

    const subscription = this.getInvoicePdfContext(invoiceId, invoiceSnapshot)
      .pipe(
        map((context) => this.createInvoicePdfArtifacts(context)),
        switchMap((artifacts) => {
          this.presentInvoicePdf(artifacts.doc, artifacts.fileName, artifacts.blob);
          return this.teacherSalaryService.uploadInvoiceReceipt(
            invoiceId,
            artifacts.receipt,
            additionalFields
          );
        }),
        finalize(() => {
          this.uploadingReceiptIds.delete(invoiceId);
        })
      )
      .subscribe({
        next: (response) => {
          if (response.isSuccess) {
            const updatedInvoice = this.mergeInvoiceData(
              invoiceSnapshot,
              this.extractInvoiceFromStatusResponse(response)
            );
            this.applyInvoiceUpdate(updatedInvoice);
            this.toastService.success(
              'Invoice PDF generated and uploaded successfully.'
            );
          } else {
            this.handleErrors(response.errors, 'Failed to upload the invoice PDF.');
          }
        },
        error: async (error) => {
          if (error instanceof InvoicePdfContextError) {
            if (error.apiErrors?.length) {
              this.handleErrors(error.apiErrors, 'Failed to upload the invoice PDF.');
            } else {
              this.toastService.error(
                error.message || 'Failed to upload the invoice PDF.'
              );
            }
            return;
          }

          if (error instanceof Error && error.message === 'PDF_GENERATION_FAILED') {
            this.toastService.error('Failed to generate the invoice PDF.');
            return;
          }

          await this.notifyHttpError(error, 'Failed to upload the invoice PDF.');
        }
      });

    this.subscriptions.add(subscription);
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

  private formatDateTime(value: unknown, locale?: string): string {
    if (value === null || value === undefined || value === '') {
      return '—';
    }

    const date = this.parseDate(value);
    if (!date) {
      return typeof value === 'string' ? value : '—';
    }

    if (locale) {
      try {
        return new Intl.DateTimeFormat(locale, {
          dateStyle: 'medium',
          timeStyle: 'short'
        }).format(date);
      } catch {
        return date.toLocaleString(locale);
      }
    }

    try {
      return this.dateTimeFormatter.format(date);
    } catch {
      return date.toLocaleString();
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
    const directCandidates: unknown[] = [
      invoice.receiptUrl,
      (invoice as Record<string, unknown>)['receiptLink'],
      (invoice as Record<string, unknown>)['receipt'],
      (invoice as Record<string, unknown>)['receiptUrl']
    ];
    for (const candidate of directCandidates) {
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        const trimmed = candidate.trim();
        if (/^(https?:)?\/\//i.test(trimmed) || /^blob:/i.test(trimmed) || /^data:/i.test(trimmed)) {
          return trimmed;
        }
        return this.toAbsoluteApiUrl(trimmed);
      }
    }

    const receiptPath = (invoice as Record<string, unknown>)['receiptPath'];
    if (typeof receiptPath === 'string' && receiptPath.trim().length > 0) {
      return this.toAbsoluteApiUrl(receiptPath);
    }

    if (invoice.id) {
      return `${this.apiBaseUrl}/api/TeacherSallary/GetPaymentReceipt?invoiceId=${invoice.id}`;
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
    if (this.canGenerateInvoices) {
      baseColumns.push('actions');
    }
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
      (invoice as Record<string, unknown>)['updatedAt'],
      (invoice as Record<string, unknown>)['modifiedAt'],
      (invoice as Record<string, unknown>)['modefiedAt']
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
      'salary',
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

    addMetric('Reports', ['totalReports', 'reportCount'], 'number');
    addMetric(
      'Attendance',
      ['presentCount', 'attendanceCount', 'totalAttendance', 'attendedSessions'],
      'number'
    );
    addMetric('Absence (Excused)', ['absentWithExcuseCount'], 'number');
    addMetric('Absence (Unexcused)', ['absentWithoutExcuseCount'], 'number');
    addMetric('Absence (Total)', ['absenceCount', 'totalAbsence', 'missedSessions'], 'number');
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

  private applyInvoiceUpdate(updatedInvoice: TeacherSalaryInvoice | null): void {
    if (!updatedInvoice?.id) {
      this.loadInvoices();
      return;
    }

    const index = this.dataSource.data.findIndex(
      (invoice) => invoice.id === updatedInvoice.id
    );

    if (index === -1) {
      this.loadInvoices();
      return;
    }

    const updatedData = [...this.dataSource.data];
    updatedData[index] = this.mergeInvoiceData(updatedData[index], updatedInvoice);
    this.applyInvoices(updatedData);

    if (this.selectedInvoice?.id === updatedInvoice.id) {
      this.loadInvoiceDetails(updatedInvoice.id, false);
    }
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

  private toAbsoluteApiUrl(path: string): string {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }
    const sanitized = path.replace(/^\/+/, '');
    return `${this.apiBaseUrl}/${sanitized}`;
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

  private getInvoicePdfContext(
    invoiceId: number,
    fallbackInvoice: TeacherSalaryInvoice
  ): Observable<InvoicePdfContext> {
    const immediateContext = this.buildInvoicePdfContext(
      invoiceId,
      fallbackInvoice
    );
    if (immediateContext) {
      return of(immediateContext);
    }

    return this.teacherSalaryService.getInvoiceDetails(invoiceId).pipe(
      map((response) => {
        if (response.isSuccess) {
          const details = response.data ?? null;
          const context = this.buildInvoicePdfContext(
            invoiceId,
            fallbackInvoice,
            details
          );
          if (context) {
            return context;
          }
          throw new InvoicePdfContextError(
            'Invoice data was incomplete for PDF generation.'
          );
        }
        throw new InvoicePdfContextError(
          'Failed to generate the invoice PDF.',
          response.errors
        );
      })
    );
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

  private createInvoicePdfArtifacts(
    context: InvoicePdfContext
  ): InvoicePdfArtifacts {
    try {
      const doc = this.createInvoicePdfDocument(context);
      const blob = doc.output('blob');
      const fileName = this.buildReceiptFileName(context.invoice);
      return {
        doc,
        blob,
        fileName,
        receipt: {
          file: blob,
          fileName
        }
      };
    } catch (error) {
      console.error('Failed to generate invoice PDF', error);
      throw new Error('PDF_GENERATION_FAILED');
    }
  }

  private generateInvoicePdf(context: InvoicePdfContext): void {
    try {
      const artifacts = this.createInvoicePdfArtifacts(context);
      this.presentInvoicePdf(artifacts.doc, artifacts.fileName, artifacts.blob);
    } catch (error) {
      console.error('Failed to generate invoice PDF', error);
      this.toastService.error('Failed to generate the invoice PDF.');
    }
  }

  private handleInvoicePdfError(error: unknown, fallback: string): void {
    if (error instanceof InvoicePdfContextError) {
      if (error.apiErrors?.length) {
        this.handleErrors(error.apiErrors, fallback);
        return;
      }
      if (error.message) {
        this.toastService.error(error.message);
        return;
      }
    }

    if (error instanceof Error && error.message === 'PDF_GENERATION_FAILED') {
      this.toastService.error('Failed to generate the invoice PDF.');
      return;
    }

    this.toastService.error(fallback);
  }

  private createInvoicePdfDocument(context: InvoicePdfContext): jsPDF {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    this.preparePdfDocument(doc);

    const pageWidth = doc.internal.pageSize.getWidth();
    const leftMargin = 14;
    const rightMargin = 14;
    const maxWidth = pageWidth - leftMargin - rightMargin;
    let y = 20;

    const invoice = context.invoice;
    const summary = context.summary;
    const invoiceNumberValue = invoice.id ?? null;
    const invoiceNumber =
      invoiceNumberValue !== null ? this.numberFormatter.format(invoiceNumberValue) : '—';
    const invoiceNumberAr = this.formatArabicNumber(invoiceNumberValue);
    const teacherIdValue =
      this.resolveInvoiceNumber(invoice, ['teacherId']) ??
      this.resolveSummaryNumber(summary, ['teacherId']);
    const teacherName = this.resolveTeacherName(invoice, summary);
    const billingMonthEn = this.resolveInvoiceMonth(context);
    const billingMonthAr = this.resolveInvoiceMonthArabic(context);
    const paymentDateEn = this.resolvePaymentDateDisplay(invoice);
    const paymentDateAr = this.resolvePaymentDateDisplay(invoice, 'ar-EG');
    const statusLabelEn = this.getStatusLabel(invoice);
    const statusLabelAr = this.getStatusLabelAr(invoice);
    const invoiceAmountValue = this.getSalaryAmount(invoice);
    const invoiceAmountEn = this.formatCurrency(invoiceAmountValue);
    const invoiceAmountAr = this.formatArabicCurrency(invoiceAmountValue);
    const generatedOnEn = this.formatDateTime(new Date());
    const generatedOnAr = this.formatDateTime(new Date(), 'ar-EG');

    const baseSalary = this.resolveSummaryNumber(summary, ['baseSalary']);
    const salaryTotal =
      this.resolveSummaryNumber(summary, ['salaryTotal', 'totalSalary']) ?? invoiceAmountValue;
    const bonuses = this.resolveSummaryNumber(summary, ['bonusTotal', 'bonuses', 'totalBonus']);
    const deductions = this.resolveSummaryNumber(summary, [
      'deductionTotal',
      'deductions',
      'totalDeduction'
    ]);
    const netSalaryValue =
      this.resolveSummaryNumber(summary, ['netSalary', 'takeHomePay']) ??
      this.resolveInvoiceNumber(invoice, ['netSalary', 'netPay']) ??
      salaryTotal ??
      invoiceAmountValue;
    const hourlyRate = this.resolveSummaryNumber(summary, ['hourlyRate']);

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
    const sessionCount = this.resolveSummaryNumber(summary, ['sessionCount', 'lessonsCount']);
    const teachingMinutes = this.resolveSummaryNumber(summary, [
      'teachingMinutes',
      'totalMinutes'
    ]);
    const overtimeMinutes = this.resolveSummaryNumber(summary, ['overtimeMinutes']);
    const attendanceRateRaw = this.resolveSummaryNumber(summary, ['attendanceRate']);
    const attendanceRateNormalized =
      attendanceRateRaw === null || attendanceRateRaw === undefined
        ? null
        : Math.abs(attendanceRateRaw) <= 1
        ? attendanceRateRaw * 100
        : attendanceRateRaw;
    const attendanceRateEn =
      attendanceRateNormalized === null
        ? '—'
        : `${this.percentFormatter.format(attendanceRateNormalized)}%`;
    const attendanceRateAr =
      attendanceRateNormalized === null
        ? '—'
        : `${this.formatArabicPercent(attendanceRateNormalized)}٪`;

    y = this.drawInvoiceHeader(
      doc,
      leftMargin,
      y,
      maxWidth,
      'Teacher Salary Invoice',
      'فاتورة راتب المعلم'
    );

    const summaryCards: SummaryCardItem[] = [
      {
        titleEn: 'Invoice Amount',
        titleAr: 'إجمالي الفاتورة',
        value: invoiceAmountEn,
        valueAr: invoiceAmountAr
      },
      {
        titleEn: 'Net Salary',
        titleAr: 'صافي الراتب',
        value: this.formatCurrency(netSalaryValue),
        valueAr: this.formatArabicCurrency(netSalaryValue)
      },
      {
        titleEn: 'Attendance Rate',
        titleAr: 'نسبة الحضور',
        value: attendanceRateEn,
        valueAr: attendanceRateAr
      },
      {
        titleEn: 'Status',
        titleAr: 'الحالة',
        value: statusLabelEn,
        valueAr: statusLabelAr
      }
    ];

    y = this.drawSummaryCards(doc, summaryCards, leftMargin, y, maxWidth);

    y = this.drawSectionDivider(doc, y, leftMargin, pageWidth - rightMargin);
    y = this.drawSectionHeader(
      doc,
      'Invoice Details',
      'بيانات الفاتورة',
      leftMargin,
      y,
      maxWidth
    );

    y = this.drawKeyValue(doc, 'Invoice Number', invoiceNumber, leftMargin, y, maxWidth, 6, {
      labelAr: 'رقم الفاتورة',
      valueAr: invoiceNumberAr
    });
    y = this.drawKeyValue(
      doc,
      'Teacher ID',
      teacherIdValue !== null ? this.numberFormatter.format(teacherIdValue) : '—',
      leftMargin,
      y,
      maxWidth,
      6,
      {
        labelAr: 'رقم المعلم',
        valueAr: this.formatArabicNumber(teacherIdValue)
      }
    );
    y = this.drawKeyValue(doc, 'Teacher', teacherName, leftMargin, y, maxWidth, 6, {
      labelAr: 'اسم المعلم',
      valueAr: teacherName
    });
    y = this.drawKeyValue(
      doc,
      'Billing Month',
      billingMonthEn,
      leftMargin,
      y,
      maxWidth,
      6,
      {
        labelAr: 'شهر الفاتورة',
        valueAr: billingMonthAr
      }
    );
    y = this.drawKeyValue(
      doc,
      'Payment Date',
      paymentDateEn,
      leftMargin,
      y,
      maxWidth,
      6,
      {
        labelAr: 'تاريخ الدفع',
        valueAr: paymentDateAr
      }
    );
    y = this.drawKeyValue(doc, 'Status', statusLabelEn, leftMargin, y, maxWidth, 6, {
      labelAr: 'الحالة',
      valueAr: statusLabelAr
    });
    y = this.drawKeyValue(
      doc,
      'Invoice Amount',
      invoiceAmountEn,
      leftMargin,
      y,
      maxWidth,
      6,
      {
        labelAr: 'قيمة الفاتورة',
        valueAr: invoiceAmountAr,
        highlight: true
      }
    );
    y = this.drawKeyValue(
      doc,
      'Generated On',
      generatedOnEn,
      leftMargin,
      y,
      maxWidth,
      6,
      {
        labelAr: 'تاريخ الإنشاء',
        valueAr: generatedOnAr
      }
    );

    y = this.drawSectionDivider(doc, y, leftMargin, pageWidth - rightMargin);
    y = this.drawSectionHeader(
      doc,
      'Salary Breakdown',
      'تفاصيل الراتب',
      leftMargin,
      y,
      maxWidth
    );

    const salaryRows: Array<[string, number | null | undefined, string]> = [
      ['Base Salary', baseSalary, 'الراتب الأساسي'],
      ['Bonuses', bonuses, 'المكافآت'],
      ['Deductions', deductions, 'الخصومات'],
      ['Net Salary', netSalaryValue, 'صافي الراتب'],
      ['Total Salary', salaryTotal, 'إجمالي الراتب'],
      ['Hourly Rate', hourlyRate, 'الأجر بالساعة']
    ];

    for (const [label, value, labelAr] of salaryRows) {
      if (value !== null && value !== undefined) {
        const englishValue = this.formatCurrency(value);
        const arabicValue = this.formatArabicCurrency(value);
        y = this.drawKeyValue(
          doc,
          label,
          englishValue,
          leftMargin,
          y,
          maxWidth,
          6,
          {
            labelAr,
            valueAr: arabicValue,
            highlight: label === 'Net Salary' || label === 'Total Salary'
          }
        );
      }
    }

    y = this.drawSectionDivider(doc, y, leftMargin, pageWidth - rightMargin);
    y = this.drawSectionHeader(
      doc,
      'Attendance Summary',
      'ملخص الحضور',
      leftMargin,
      y,
      maxWidth
    );

    const attendanceRows: Array<
      [string, number | null, string, (value: number) => string, string]
    > = [
      [
        'Attendance',
        attendanceCount,
        'الحضور',
        (value) => this.numberFormatter.format(value),
        ' حضور'
      ],
      [
        'Absence',
        absenceCount,
        'الغياب',
        (value) => this.numberFormatter.format(value),
        ' غياب'
      ],
      [
        'Sessions',
        sessionCount,
        'عدد الحصص',
        (value) => this.numberFormatter.format(value),
        ' حصة'
      ],
      [
        'Teaching Minutes',
        teachingMinutes,
        'دقائق التدريس',
        (value) => `${this.numberFormatter.format(value)} min`,
        ' دقيقة'
      ],
      [
        'Overtime Minutes',
        overtimeMinutes,
        'الدقائق الإضافية',
        (value) => `${this.numberFormatter.format(value)} min`,
        ' دقيقة إضافية'
      ]
    ];

    for (const [label, value, labelAr, formatter, suffixAr] of attendanceRows) {
      if (value !== null && value !== undefined) {
        y = this.drawKeyValue(
          doc,
          label,
          formatter(value),
          leftMargin,
          y,
          maxWidth,
          6,
          {
            labelAr,
            valueAr: `${this.formatArabicNumber(value)}${suffixAr}`
          }
        );
      }
    }

    if (attendanceRateNormalized !== null) {
      y = this.drawKeyValue(
        doc,
        'Attendance Rate',
        attendanceRateEn,
        leftMargin,
        y,
        maxWidth,
        6,
        {
          labelAr: 'نسبة الحضور',
          valueAr: attendanceRateAr
        }
      );
    }

    y = this.drawSectionDivider(doc, y, leftMargin, pageWidth - rightMargin);
    y = this.drawSectionHeader(doc, 'Notes', 'ملاحظات', leftMargin, y, maxWidth);

    const notesEn =
      'This invoice has been generated automatically based on recorded salary and attendance data for the selected period.';
    const notesAr =
      'تم إنشاء هذه الفاتورة تلقائياً استناداً إلى بيانات الراتب والحضور للفترة المحددة.';
    const noteLinesEn = this.normalizeLines(doc.splitTextToSize(notesEn, maxWidth - 12));
    const noteLinesAr = this.normalizeLines(doc.splitTextToSize(notesAr, maxWidth - 12));
    const noteHeight = Math.max(noteLinesEn.length, noteLinesAr.length) * 6 + 16;

    y = this.ensurePdfSpace(doc, y, noteHeight);
    doc.setFillColor(PDF_ACCENT_LIGHT.r, PDF_ACCENT_LIGHT.g, PDF_ACCENT_LIGHT.b);
    doc.setDrawColor(PDF_BORDER_COLOR.r, PDF_BORDER_COLOR.g, PDF_BORDER_COLOR.b);
    doc.roundedRect(leftMargin, y, maxWidth, noteHeight, 3, 3, 'FD');
    doc.setDrawColor(0, 0, 0);
    doc.setTextColor(PDF_TEXT_MUTED.r, PDF_TEXT_MUTED.g, PDF_TEXT_MUTED.b);
    doc.setFont(PDF_ARABIC_FONT_NAME, 'normal');
    doc.setFontSize(11);

    let noteY = y + 8;
    for (const line of noteLinesEn) {
      doc.text(line, leftMargin + 6, noteY);
      noteY += 6;
    }
    this.drawArabicText(doc, noteLinesAr, leftMargin + maxWidth - 6, y + 8, 6, {
      align: 'right'
    });

    doc.setFont(PDF_ARABIC_FONT_NAME, 'normal');
    doc.setFontSize(12);
    doc.setTextColor(PDF_TEXT_PRIMARY.r, PDF_TEXT_PRIMARY.g, PDF_TEXT_PRIMARY.b);

    return doc;
  }

  private drawSummaryCards(
    doc: jsPDF,
    items: SummaryCardItem[],
    x: number,
    y: number,
    width: number,
    lineHeight = 6
  ): number {
    if (!items.length) {
      return y;
    }
    const columns = width > 160 ? 3 : 2;
    const gutter = 6;
    const cardWidth = (width - gutter * (columns - 1)) / columns;
    let currentX = x;
    let currentY = y;
    let rowHeight = 0;

    items.forEach((item, index) => {
      const layout = this.buildSummaryCardLayout(doc, item, cardWidth, lineHeight);
      const ensuredY = this.ensurePdfSpace(doc, currentY, layout.height + 4);
      if (ensuredY !== currentY) {
        currentY = ensuredY;
        currentX = x;
        rowHeight = 0;
      }

      const height = this.drawSummaryCard(
        doc,
        item,
        currentX,
        currentY,
        cardWidth,
        lineHeight,
        layout
      );

      rowHeight = Math.max(rowHeight, height);

      if ((index + 1) % columns === 0) {
        currentX = x;
        currentY += rowHeight + gutter;
        rowHeight = 0;
      } else {
        currentX += cardWidth + gutter;
      }
    });

    if (items.length % columns !== 0) {
      currentY += rowHeight + gutter;
    }

    return currentY;
  }

  private drawSummaryCard(
    doc: jsPDF,
    item: SummaryCardItem,
    x: number,
    y: number,
    width: number,
    lineHeight: number,
    layout: SummaryCardLayout
  ): number {
    doc.setFillColor(PDF_ACCENT_LIGHT.r, PDF_ACCENT_LIGHT.g, PDF_ACCENT_LIGHT.b);
    doc.setDrawColor(PDF_BORDER_COLOR.r, PDF_BORDER_COLOR.g, PDF_BORDER_COLOR.b);
    doc.roundedRect(x, y, width, layout.height, 3, 3, 'FD');
    doc.setDrawColor(0, 0, 0);

    doc.setFillColor(PDF_ACCENT_COLOR.r, PDF_ACCENT_COLOR.g, PDF_ACCENT_COLOR.b);
    doc.roundedRect(x, y, width, 3, 3, 'F');

    const labelY = y + layout.verticalPadding + lineHeight - 1;
    doc.setFont(PDF_ARABIC_FONT_NAME, 'bold');
    doc.setFontSize(11);
    doc.setTextColor(PDF_ACCENT_COLOR.r, PDF_ACCENT_COLOR.g, PDF_ACCENT_COLOR.b);
    doc.text(item.titleEn, x + layout.horizontalPadding, labelY);
    this.drawArabicText(
      doc,
      item.titleAr,
      x + width - layout.horizontalPadding,
      labelY,
      lineHeight,
      { align: 'right' }
    );

    doc.setFont(PDF_ARABIC_FONT_NAME, 'bold');
    doc.setFontSize(12);
    doc.setTextColor(PDF_TEXT_PRIMARY.r, PDF_TEXT_PRIMARY.g, PDF_TEXT_PRIMARY.b);
    let englishY = y + layout.verticalPadding + lineHeight + 2;
    for (const line of layout.englishLines) {
      doc.text(line, x + layout.horizontalPadding, englishY);
      englishY += lineHeight;
    }

    this.drawArabicText(
      doc,
      layout.arabicLines,
      x + width - layout.horizontalPadding,
      y + layout.verticalPadding + lineHeight + 2,
      lineHeight,
      { align: 'right' }
    );

    doc.setFont(PDF_ARABIC_FONT_NAME, 'normal');
    doc.setFontSize(12);
    doc.setTextColor(PDF_TEXT_PRIMARY.r, PDF_TEXT_PRIMARY.g, PDF_TEXT_PRIMARY.b);

    return layout.height;
  }

  private buildSummaryCardLayout(
    doc: jsPDF,
    item: SummaryCardItem,
    width: number,
    lineHeight: number
  ): SummaryCardLayout {
    const horizontalPadding = 8;
    const verticalPadding = 8;
    const availableWidth = width - horizontalPadding * 2;
    const englishLines = this.normalizeLines(doc.splitTextToSize(item.value, availableWidth));
    const arabicLines = this.normalizeLines(
      doc.splitTextToSize(item.valueAr ?? item.value, availableWidth)
    );
    const contentHeight = Math.max(
      englishLines.length * lineHeight,
      arabicLines.length * lineHeight
    );
    const height = verticalPadding * 2 + lineHeight + contentHeight + 2;
    return {
      englishLines,
      arabicLines,
      height,
      horizontalPadding,
      verticalPadding
    };
  }

  private drawSectionDivider(
    doc: jsPDF,
    y: number,
    left: number,
    right: number
  ): number {
    y = this.ensurePdfSpace(doc, y, 6);
    doc.setDrawColor(PDF_BORDER_COLOR.r, PDF_BORDER_COLOR.g, PDF_BORDER_COLOR.b);
    doc.setLineWidth(0.3);
    doc.line(left, y, right, y);
    doc.setDrawColor(0, 0, 0);
    return y + 6;
  }

  private drawSectionHeader(
    doc: jsPDF,
    titleEn: string,
    titleAr: string,
    x: number,
    y: number,
    maxWidth: number
  ): number {
    y = this.ensurePdfSpace(doc, y, 12);
    doc.setFont(PDF_ARABIC_FONT_NAME, 'bold');
    doc.setFontSize(13);
    doc.setTextColor(PDF_ACCENT_COLOR.r, PDF_ACCENT_COLOR.g, PDF_ACCENT_COLOR.b);
    doc.text(titleEn, x, y);
    this.drawArabicText(doc, titleAr, x + maxWidth, y, 6, { align: 'right' });
    doc.setFontSize(12);
    doc.setFont(PDF_ARABIC_FONT_NAME, 'normal');
    doc.setTextColor(PDF_TEXT_PRIMARY.r, PDF_TEXT_PRIMARY.g, PDF_TEXT_PRIMARY.b);
    return y + 6;
  }

  private drawKeyValue(
    doc: jsPDF,
    label: string,
    value: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight = 6,
    options: KeyValueOptions = {}
  ): number {
    const safeValue = value && value.trim().length > 0 ? value : '—';
    const englishLines = this.normalizeLines(doc.splitTextToSize(safeValue, maxWidth));
    const arabicLines =
      options.labelAr || options.valueAr
        ? this.normalizeLines(
            doc.splitTextToSize(options.valueAr ?? safeValue, maxWidth)
          )
        : [];
    const contentHeight = Math.max(
      englishLines.length * lineHeight,
      arabicLines.length * lineHeight
    );
    const paddingY = 3;
    const blockHeight = paddingY * 2 + lineHeight + contentHeight;

    y = this.ensurePdfSpace(doc, y, blockHeight + 2);

    if (options.highlight) {
      doc.setFillColor(PDF_ACCENT_LIGHT.r, PDF_ACCENT_LIGHT.g, PDF_ACCENT_LIGHT.b);
      doc.setDrawColor(PDF_BORDER_COLOR.r, PDF_BORDER_COLOR.g, PDF_BORDER_COLOR.b);
      doc.roundedRect(x, y, maxWidth, blockHeight, 3, 3, 'FD');
      doc.setDrawColor(0, 0, 0);
    }

    const labelY = y + paddingY + lineHeight - 1;
    doc.setFont(PDF_ARABIC_FONT_NAME, 'bold');
    doc.setFontSize(11);
    doc.setTextColor(PDF_TEXT_MUTED.r, PDF_TEXT_MUTED.g, PDF_TEXT_MUTED.b);
    doc.text(`${label}`, x, labelY);
    if (options.labelAr) {
      this.drawArabicText(doc, options.labelAr, x + maxWidth, labelY, lineHeight, {
        align: 'right'
      });
    }

    doc.setFont(
      PDF_ARABIC_FONT_NAME,
      options.highlight ? 'bold' : 'normal'
    );
    doc.setFontSize(options.highlight ? 12 : 11);
    doc.setTextColor(
      options.highlight ? PDF_ACCENT_COLOR.r : PDF_TEXT_PRIMARY.r,
      options.highlight ? PDF_ACCENT_COLOR.g : PDF_TEXT_PRIMARY.g,
      options.highlight ? PDF_ACCENT_COLOR.b : PDF_TEXT_PRIMARY.b
    );
    let englishY = y + paddingY + lineHeight + 2;
    for (const line of englishLines) {
      doc.text(line, x, englishY);
      englishY += lineHeight;
    }

    if (options.labelAr || options.valueAr) {
      const displayLines = arabicLines.length ? arabicLines : englishLines;
      this.drawArabicText(
        doc,
        displayLines,
        x + maxWidth,
        y + paddingY + lineHeight + 2,
        lineHeight,
        { align: 'right' }
      );
    }

    doc.setFont(PDF_ARABIC_FONT_NAME, 'normal');
    doc.setFontSize(12);
    doc.setTextColor(PDF_TEXT_PRIMARY.r, PDF_TEXT_PRIMARY.g, PDF_TEXT_PRIMARY.b);

    return y + blockHeight + 2;
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
      this.preparePdfDocument(doc);
      return topMargin;
    }
    return y;
  }

  private drawArabicText(
    doc: jsPDF,
    text: string | string[],
    x: number,
    y: number,
    lineHeight: number,
    options: TextOptionsLight = {}
  ): number {
    const lines = this.normalizeLines(text);
    const mergedOptions: TextOptionsLight = {
      align: 'right',
      isInputRtl: true,
      isOutputRtl: true,
      ...options
    };
    let currentY = y;
    for (const line of lines) {
      doc.text(line, x, currentY, mergedOptions);
      currentY += lineHeight;
    }
    return currentY;
  }

  private normalizeLines(value: string | string[]): string[] {
    if (Array.isArray(value)) {
      return value.length ? value : [''];
    }
    const text = value ?? '';
    return text.length ? [text] : [''];
  }

  private preparePdfDocument(doc: jsPDF): void {
    this.ensurePdfFonts(doc);
    doc.setFont(PDF_ARABIC_FONT_NAME, 'normal');
    doc.setFontSize(12);
    doc.setTextColor(PDF_TEXT_PRIMARY.r, PDF_TEXT_PRIMARY.g, PDF_TEXT_PRIMARY.b);
  }

  private ensurePdfFonts(doc: jsPDF): void {
    if (!TeacherSalaryComponent.pdfFontsRegistered) {
      doc.addFileToVFS(PDF_ARABIC_FONT_FILE, PDF_ARABIC_FONT_VFS);
      doc.addFont(PDF_ARABIC_FONT_FILE, PDF_ARABIC_FONT_NAME, 'normal', 'Identity-H');
      doc.addFont(PDF_ARABIC_FONT_FILE, PDF_ARABIC_FONT_NAME, 'bold', 'Identity-H');
      TeacherSalaryComponent.pdfFontsRegistered = true;
    }
  }

  private drawInvoiceHeader(
    doc: jsPDF,
    x: number,
    y: number,
    width: number,
    titleEn: string,
    titleAr: string
  ): number {
    const headerHeight = 28;
    y = this.ensurePdfSpace(doc, y, headerHeight + 6);
    doc.setFillColor(PDF_ACCENT_COLOR.r, PDF_ACCENT_COLOR.g, PDF_ACCENT_COLOR.b);
    doc.roundedRect(x, y, width, headerHeight, 4, 4, 'F');
    const titleY = y + headerHeight / 2 + 1;
    doc.setFont(PDF_ARABIC_FONT_NAME, 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text(titleEn, x + 10, titleY, { baseline: 'middle' });
    this.drawArabicText(doc, titleAr, x + width - 10, titleY, 6, {
      align: 'right',
      baseline: 'middle'
    });
    doc.setFont(PDF_ARABIC_FONT_NAME, 'normal');
    doc.setFontSize(12);
    doc.setTextColor(PDF_TEXT_PRIMARY.r, PDF_TEXT_PRIMARY.g, PDF_TEXT_PRIMARY.b);
    return y + headerHeight + 8;
  }

  private formatArabicNumber(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '—';
    }
    try {
      return new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 0 }).format(value);
    } catch {
      return this.numberFormatter.format(value);
    }
  }

  private formatArabicCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '—';
    }
    try {
      return new Intl.NumberFormat('ar-EG', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(value);
    } catch {
      return this.formatCurrency(value);
    }
  }

  private formatArabicPercent(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '—';
    }
    try {
      return new Intl.NumberFormat('ar-EG', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }).format(value);
    } catch {
      return this.percentFormatter.format(value);
    }
  }

  private formatArabicMonthString(value?: string | null): string {
    if (!value) {
      return '—';
    }
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      try {
        return new Intl.DateTimeFormat('ar-EG', {
          month: 'long',
          year: 'numeric'
        }).format(parsed);
      } catch {
        return this.formatMonthString(value);
      }
    }
    return value;
  }

  private resolveInvoiceMonthArabic(context: InvoicePdfContext): string {
    const invoiceMonthValue = this.extractMonthValue(context.invoice);
    if (invoiceMonthValue) {
      const formatted = this.formatArabicMonthString(invoiceMonthValue);
      if (formatted !== '—') {
        return formatted;
      }
    }
    const summaryMonth = this.resolveSummaryString(context.summary, ['month']);
    if (summaryMonth) {
      return this.formatArabicMonthString(summaryMonth);
    }
    const selected = this.selectedMonth.value;
    return selected ? this.formatArabicMonthString(selected.toISOString()) : '—';
  }

  private getStatusLabelAr(invoice: TeacherSalaryInvoice | null): string {
    if (!invoice) {
      return '—';
    }
    return this.isInvoicePaid(invoice) ? 'مدفوعة' : 'غير مدفوعة';
  }

  private parseDate(value: unknown): Date | null {
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return null;
      }
      const parsed = new Date(trimmed);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  }

  private presentInvoicePdf(doc: jsPDF, fileName: string, blob?: Blob): void {
    try {
      if (typeof doc.autoPrint === 'function') {
        doc.autoPrint();
      }
    } catch {
      // Ignore failures from autoPrint support on different browsers.
    }

    const pdfBlob = blob ?? doc.output('blob');
    const blobUrl = typeof URL !== 'undefined' ? URL.createObjectURL(pdfBlob) : '';

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

  private resolvePaymentDateDisplay(
    invoice: TeacherSalaryInvoice,
    locale?: string
  ): string {
    const candidates: unknown[] = [
      invoice.payedAt,
      (invoice as Record<string, unknown>)['paidAt'],
      (invoice as Record<string, unknown>)['paymentDate'],
      (invoice as Record<string, unknown>)['lastPaymentDate']
    ];
    for (const candidate of candidates) {
      const formatted = this.formatDateTime(candidate, locale);
      if (formatted !== '—') {
        return formatted;
      }
    }
    return this.formatDateTime(new Date(), locale);
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
