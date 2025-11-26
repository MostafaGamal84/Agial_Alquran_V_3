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
import { TranslateModule } from '@ngx-translate/core';
import { LoadingOverlayComponent } from 'src/app/@theme/components/loading-overlay/loading-overlay.component';
const PRINT_ACCENT_COLOR = '#134273';
const PRINT_ACCENT_LIGHT = '#f3f6fd';
const PRINT_BORDER_COLOR = '#dfe6f2';
const PRINT_TEXT_MUTED = '#5a5a5a';
const PRINT_TEXT_PRIMARY = '#212121';

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
interface SummaryCardItem {
  titleEn: string;
  titleAr: string;
  value: string;
  valueAr?: string;
}

interface InvoicePrintContext {
  invoice: TeacherSalaryInvoice;
  summary: TeacherMonthlySummary | null;
  details: TeacherSalaryInvoiceDetails | null;
}

interface InvoicePrintArtifacts {
  html: string;
  blob: Blob;
  fileName: string;
  receipt: ReceiptUpload;
}

class InvoicePrintContextError extends Error {
  constructor(message: string, readonly apiErrors?: ApiError[]) {
    super(message);
    this.name = 'InvoicePrintContextError';
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
    MatPaginatorModule,
    TranslateModule,
    LoadingOverlayComponent
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

  private readonly apiBaseUrl = environment.apiUrl.replace(/\/+$/, '');
  private subscriptions = new Subscription();
  private readonly numberFormatter = new Intl.NumberFormat('ar-EG', {
    maximumFractionDigits: 0
  });
  private readonly percentFormatter = new Intl.NumberFormat('ar-EG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
  private readonly currencyFormatter = new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  private readonly dateTimeFormatter = new Intl.DateTimeFormat('ar-EG', {
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

  get pageLoading(): boolean {
    return (
      this.teacherLoading ||
      this.invoicesLoading ||
      this.summaryLoading ||
      this.detailsLoading ||
      this.manualGenerationLoading
    );
  }

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
      this.toastService.error('معرف الفاتورة غير صالح.');
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
              `تم تحديث حالة الفاتورة إلى ${newValue ? 'مدفوعة' : 'غير مدفوعة'}.`
            );
            this.applyInvoiceUpdate(updatedInvoice);
            this.loadInvoices();
          } else {
            event.source.checked = !newValue;
            this.handleErrors(
              response.errors,
              'فشل تحديث حالة دفع الفاتورة.'
            );
          }
        },
        error: async (error) => {
          event.source.checked = !newValue;
          await this.notifyHttpError(
            error,
            'فشل تحديث حالة دفع الفاتورة.'
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
      this.toastService.error('معرف الفاتورة غير صالح.');
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

    const subscription = this.getInvoicePrintContext(invoiceId, invoiceSnapshot)
      .pipe(
        map((context) => this.createInvoicePrintArtifacts(context)),
        switchMap((artifacts) => {
          this.presentInvoicePrint(artifacts.html, artifacts.fileName, artifacts.blob);
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
              'تم إنشاء نسخة الفاتورة للطباعة ورفعها بنجاح.'
            );
          } else {
            this.handleErrors(
              response.errors,
              'فشل رفع نسخة الفاتورة للطباعة.'
            );
          }
        },
        error: async (error) => {
          if (error instanceof InvoicePrintContextError) {
            if (error.apiErrors?.length) {
              this.handleErrors(
                error.apiErrors,
                'فشل رفع نسخة الفاتورة للطباعة.'
              );
            } else {
              this.toastService.error(
                error.message || 'فشل رفع نسخة الفاتورة للطباعة.'
              );
            }
            return;
          }

          if (error instanceof Error && error.message === 'PRINT_RENDER_FAILED') {
            this.toastService.error('تعذر إنشاء نسخة الفاتورة للطباعة.');
            return;
          }

          await this.notifyHttpError(
            error,
            'فشل رفع نسخة الفاتورة للطباعة.'
          );
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
              `اكتمل التوليد. تم إنشاء ${created} وتحديث ${updated} وتخطي ${skipped}.`
            );
            this.loadInvoices();
            this.loadMonthlySummary();
          } else {
            this.handleErrors(
              response.errors,
              'فشل إنشاء فواتير الشهر.'
            );
          }
        },
        error: () => {
          this.toastService.error('فشل إنشاء فواتير الشهر.');
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

  /**
   * Attempts to parse a value into a Date object.
   * Returns null if parsing fails.
   */
  private parseDate(value: unknown): Date | null {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value;
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return null;
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
      searchTerm: searchTerm?.trim() ?? undefined,
      lookupOnly: true
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
            this.handleErrors(response.errors, 'فشل تحميل بيانات المعلمين.');
          }
        },
        error: () => {
          this.teachers = [];
          this.toastService.error('فشل تحميل بيانات المعلمين.');
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
              'فشل تحميل فواتير رواتب المعلمين.'
            );
          }
        },
        error: () => {
          this.applyInvoices([]);
          this.toastService.error('فشل تحميل فواتير رواتب المعلمين.');
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
              'فشل تحميل الملخص الشهري للمعلمين.'
            );
          }
        },
        error: () => {
          this.summary = null;
          this.summaryMetrics = [];
          this.toastService.error('فشل تحميل الملخص الشهري للمعلمين.');
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
            this.handleErrors(response.errors, 'فشل تحميل تفاصيل الفاتورة.');
          }
        },
        error: () => {
          this.toastService.error('فشل تحميل تفاصيل الفاتورة.');
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
      return new Intl.DateTimeFormat('ar-EG', {
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

      addMetric('التقارير', ['totalReports', 'reportCount'], 'number');
      addMetric(
        'الحضور',
        ['presentCount', 'attendanceCount', 'totalAttendance', 'attendedSessions'],
        'number'
      );
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
    const teacherPart = this.toSlug(invoice.teacherName ?? 'المعلم');
    const monthDisplay = this.formatMonth(invoice);
    const monthPart = this.toSlug(monthDisplay);
    const teacher = teacherPart.length > 0 ? teacherPart : 'المعلم';
    const month = monthPart.length > 0 ? monthPart : 'الشهر';
    const idPart = invoice.id ? `-${invoice.id}` : '';
    return `فاتورة-راتب-${teacher}-${month}${idPart}.html`;
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
      .normalize('NFKD')
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '');
    return normalized;
  }

  private getInvoicePrintContext(
    invoiceId: number,
    fallbackInvoice: TeacherSalaryInvoice
  ): Observable<InvoicePrintContext> {
    const immediateContext = this.buildInvoicePrintContext(
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
          const context = this.buildInvoicePrintContext(
            invoiceId,
            fallbackInvoice,
            details
          );
          if (context) {
            return context;
          }
          throw new InvoicePrintContextError(
            'بيانات الفاتورة غير مكتملة لإنشاء نسخة الطباعة.'
          );
        }
        throw new InvoicePrintContextError(
          'فشل تحميل بيانات الفاتورة الخاصة بالطباعة.',
          response.errors
        );
      })
    );
  }

  private buildInvoicePrintContext(
    invoiceId: number,
    fallbackInvoice: TeacherSalaryInvoice,
    details?: TeacherSalaryInvoiceDetails | null
  ): InvoicePrintContext | null {
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

  private createInvoicePrintArtifacts(
    context: InvoicePrintContext
  ): InvoicePrintArtifacts {
    try {
      const html = this.buildInvoicePrintHtml(context);
      const fileName = this.buildReceiptFileName(context.invoice);
      const blob = new Blob([html], { type: 'text/html' });
      return {
        html,
        blob,
        fileName,
        receipt: {
          file: blob,
          fileName
        }
      };
    } catch (error) {
      console.error('تعذر إنشاء نسخة الفاتورة للطباعة', error);
      throw new Error('PRINT_RENDER_FAILED');
    }
  }

  private buildInvoicePrintHtml(context: InvoicePrintContext): string {
    const invoice = context.invoice;
    const summary = context.summary;
    const invoiceNumberValue = invoice.id ?? null;
    const invoiceNumberAr = this.formatArabicNumber(invoiceNumberValue);
    const teacherIdValue =
      this.resolveInvoiceNumber(invoice, ['teacherId']) ??
      this.resolveSummaryNumber(summary, ['teacherId']);
    const teacherName = this.resolveTeacherName(invoice, summary);
    const teacherNameAr =
      this.resolveSummaryString(summary, [
        'teacherNameAr',
        'teacherArabicName',
        'teacherName'
      ]) ?? teacherName;
    const billingMonthAr = this.resolveInvoiceMonthArabic(context);
    const paymentDateAr = this.resolvePaymentDateDisplay(invoice, 'ar-EG');
    const statusLabelAr = this.getStatusLabel(invoice);
    const invoiceAmountValue = this.getSalaryAmount(invoice);
    const invoiceAmountAr = this.formatArabicCurrency(invoiceAmountValue);
    const generatedOnAr = this.formatDateTime(new Date(), 'ar-EG');

    const baseSalary = this.resolveSummaryNumber(summary, ['baseSalary']);
    const salaryTotal =
      this.resolveSummaryNumber(summary, ['salaryTotal', 'totalSalary']) ??
      invoiceAmountValue;
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
    const attendanceRateDisplay =
      attendanceRateNormalized === null
        ? '—'
        : `${this.formatArabicPercent(attendanceRateNormalized)}٪`;

    const summaryCards: SummaryCardItem[] = [
      {
        titleEn: 'إجمالي الفاتورة',
        titleAr: 'إجمالي الفاتورة',
        value: invoiceAmountAr,
        valueAr: invoiceAmountAr
      },
      {
        titleEn: 'صافي الراتب',
        titleAr: 'صافي الراتب',
        value: this.formatArabicCurrency(netSalaryValue),
        valueAr: this.formatArabicCurrency(netSalaryValue)
      },
      {
        titleEn: 'نسبة الحضور',
        titleAr: 'نسبة الحضور',
        value: attendanceRateDisplay,
        valueAr: attendanceRateDisplay
      },
      {
        titleEn: 'الحالة',
        titleAr: 'الحالة',
        value: statusLabelAr,
        valueAr: statusLabelAr
      }
    ];

    const infoRows = [
      {
        labelEn: 'رقم الفاتورة',
        valueEn: invoiceNumberAr,
        labelAr: 'رقم الفاتورة',
        valueAr: invoiceNumberAr
      },
      {
        labelEn: 'رقم المعلم',
        valueEn: this.formatArabicNumber(teacherIdValue),
        labelAr: 'رقم المعلم',
        valueAr: this.formatArabicNumber(teacherIdValue)
      },
      {
        labelEn: 'اسم المعلم',
        valueEn: teacherNameAr,
        labelAr: 'اسم المعلم',
        valueAr: teacherNameAr
      },
      {
        labelEn: 'شهر الفاتورة',
        valueEn: billingMonthAr,
        labelAr: 'شهر الفاتورة',
        valueAr: billingMonthAr
      },
      {
        labelEn: 'تاريخ الدفع',
        valueEn: paymentDateAr,
        labelAr: 'تاريخ الدفع',
        valueAr: paymentDateAr
      },
      {
        labelEn: 'الحالة',
        valueEn: statusLabelAr,
        labelAr: 'الحالة',
        valueAr: statusLabelAr
      },
      {
        labelEn: 'قيمة الفاتورة',
        valueEn: invoiceAmountAr,
        labelAr: 'قيمة الفاتورة',
        valueAr: invoiceAmountAr,
        highlight: true
      },
      {
        labelEn: 'تاريخ الإنشاء',
        valueEn: generatedOnAr,
        labelAr: 'تاريخ الإنشاء',
        valueAr: generatedOnAr
      }
    ];

    const salaryRows = [
      { labelEn: 'الراتب الأساسي', value: baseSalary, labelAr: 'الراتب الأساسي' },
      { labelEn: 'المكافآت', value: bonuses, labelAr: 'المكافآت' },
      { labelEn: 'الخصومات', value: deductions, labelAr: 'الخصومات' },
      { labelEn: 'صافي الراتب', value: netSalaryValue, labelAr: 'صافي الراتب', highlight: true },
      { labelEn: 'إجمالي الراتب', value: salaryTotal, labelAr: 'إجمالي الراتب', highlight: true },
      { labelEn: 'الأجر بالساعة', value: hourlyRate, labelAr: 'الأجر بالساعة' }
    ];

    const attendanceRows = [
      {
        labelEn: 'الحضور',
        value: attendanceCount,
        labelAr: 'الحضور',
        formatEn: (value: number) => this.formatArabicNumber(value),
        formatAr: (value: number) => `${this.formatArabicNumber(value)} حضور`
      },
      {
        labelEn: 'الغياب',
        value: absenceCount,
        labelAr: 'الغياب',
        formatEn: (value: number) => this.formatArabicNumber(value),
        formatAr: (value: number) => `${this.formatArabicNumber(value)} غياب`
      },
      {
        labelEn: 'عدد الحصص',
        value: sessionCount,
        labelAr: 'عدد الحصص',
        formatEn: (value: number) => this.formatArabicNumber(value),
        formatAr: (value: number) => `${this.formatArabicNumber(value)} حصة`
      },
      {
        labelEn: 'دقائق التدريس',
        value: teachingMinutes,
        labelAr: 'دقائق التدريس',
        formatEn: (value: number) => `${this.formatArabicNumber(value)} دقيقة`,
        formatAr: (value: number) => `${this.formatArabicNumber(value)} دقيقة`
      },
      {
        labelEn: 'الدقائق الإضافية',
        value: overtimeMinutes,
        labelAr: 'الدقائق الإضافية',
        formatEn: (value: number) => `${this.formatArabicNumber(value)} دقيقة إضافية`,
        formatAr: (value: number) => `${this.formatArabicNumber(value)} دقيقة إضافية`
      }
    ];

    const attendanceRowsHtml = attendanceRows
      .filter((row) => row.value !== null && row.value !== undefined)
      .map((row) =>
        this.buildPrintRow(
          row.labelEn,
          row.formatEn(row.value as number),
          row.labelAr,
          row.formatAr(row.value as number)
        )
      )
      .join('');

    const salaryRowsHtml = salaryRows
      .filter((row) => row.value !== null && row.value !== undefined)
      .map((row) =>
        this.buildPrintRow(
          row.labelEn,
          this.formatCurrency(row.value as number),
          row.labelAr,
          this.formatArabicCurrency(row.value as number),
          { highlight: Boolean(row.highlight) }
        )
      )
      .join('');

    const infoRowsHtml = infoRows
      .map((row) =>
        this.buildPrintRow(
          row.labelEn,
          row.valueEn,
          row.labelAr,
          row.valueAr,
          { highlight: Boolean((row as { highlight?: boolean }).highlight) }
        )
      )
      .join('');

    const summaryCardsHtml = summaryCards
      .map((card) => this.buildSummaryCardHtml(card))
      .join('');

    const notesText =
      'تم إنشاء هذه الفاتورة تلقائياً استناداً إلى بيانات الراتب والحضور للفترة المحددة.';

    const styles = this.buildPrintStyles();
    const attendanceRateRowHtml =
      attendanceRateNormalized !== null
        ? this.buildPrintRow(
            'نسبة الحضور',
            attendanceRateDisplay,
            'نسبة الحضور',
            attendanceRateDisplay
          )
        : '';
    const documentTitleSuffix =
      invoiceNumberAr !== '—' ? ` رقم ${invoiceNumberAr}` : '';
    const documentTitle = `فاتورة راتب المعلم${documentTitleSuffix}`;

    return `<!DOCTYPE html>
<html lang="ar">
<head>
  <meta charset="utf-8" />
  <title>${this.escapeHtml(documentTitle)}</title>
  <style>
${styles}
  </style>
</head>
<body>
  <div class="print-page">
    <header class="print-header">
      <div class="header-text">
        <h1 dir="rtl">فاتورة راتب المعلم</h1>
        <h2 dir="rtl">سند دفع الراتب</h2>
      </div>
      <div class="header-meta">
        <span class="label">رقم الفاتورة</span>
        <span class="value" dir="rtl">${this.escapeHtml(invoiceNumberAr)}</span>
      </div>
    </header>
    <section class="summary-cards">
      ${summaryCardsHtml}
    </section>
    <section class="print-section">
      <div class="section-title">
        <h3 dir="rtl">بيانات الفاتورة</h3>
        <h4 dir="rtl">تفاصيل الطلب</h4>
      </div>
      <div class="print-grid">
        ${infoRowsHtml}
      </div>
    </section>
    <section class="print-section">
      <div class="section-title">
        <h3 dir="rtl">تفاصيل الراتب</h3>
        <h4 dir="rtl">ملخص المستحقات</h4>
      </div>
      <div class="print-grid">
        ${salaryRowsHtml}
      </div>
    </section>
      <section class="print-section">
        <div class="section-title">
        <h3 dir="rtl">ملخص الحضور</h3>
        <h4 dir="rtl">بيانات الالتزام</h4>
        </div>
        <div class="print-grid">
          ${attendanceRowsHtml}
        ${attendanceRateRowHtml}
      </div>
    </section>
    <section class="print-section">
      <div class="section-title">
        <h3 dir="rtl">ملاحظات</h3>
        <h4 dir="rtl">معلومات إضافية</h4>
      </div>
      <div class="notes-card">
        <p dir="rtl">${this.escapeHtml(notesText)}</p>
      </div>
    </section>
  </div>
  <script>
    window.addEventListener('load', () => {
      setTimeout(() => {
        try {
          window.print();
        } catch (err) {
          console.error(err);
        }
      }, 300);
    });
  </script>
</body>
</html>`;
  }

  private buildPrintStyles(): string {
    return `
      :root {
        color-scheme: only light;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        padding: 24px;
        background: ${PRINT_ACCENT_LIGHT};
        color: ${PRINT_TEXT_PRIMARY};
        font-family: 'Cairo Variable', 'Cairo', 'Tajawal', 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
      }
      .print-page {
        max-width: 860px;
        margin: 0 auto;
        background: #fff;
        padding: 32px;
        border-radius: 20px;
        box-shadow: 0 24px 48px rgba(19, 66, 115, 0.12);
      }
      .print-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        background: ${PRINT_ACCENT_COLOR};
        color: #fff;
        padding: 24px;
        border-radius: 16px;
      }
      .header-text h1 {
        margin: 0;
        font-size: 28px;
      }
      .header-text h2 {
        margin: 4px 0 0;
        font-size: 22px;
        font-weight: 500;
      }
      .header-meta {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        font-weight: 600;
      }
      .header-meta .label {
        text-transform: uppercase;
        font-size: 12px;
        letter-spacing: 1px;
        opacity: 0.8;
      }
      .header-meta .value {
        font-size: 20px;
      }
      .summary-cards {
        display: grid;
        gap: 16px;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        margin: 28px 0;
      }
      .summary-card {
        background: ${PRINT_ACCENT_LIGHT};
        border: 1px solid ${PRINT_BORDER_COLOR};
        border-radius: 14px;
        padding: 18px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .summary-card .summary-title {
        font-weight: 600;
        color: ${PRINT_TEXT_MUTED};
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .summary-card .summary-value {
        font-size: 20px;
        font-weight: 700;
        color: ${PRINT_ACCENT_COLOR};
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .print-section + .print-section {
        margin-top: 32px;
      }
      .section-title h3,
      .section-title h4 {
        margin: 0;
      }
      .section-title h4 {
        color: ${PRINT_TEXT_MUTED};
        font-weight: 500;
      }
      .print-grid {
        margin-top: 16px;
        display: grid;
        gap: 12px;
      }
      .print-row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 12px;
        align-items: stretch;
        border: 1px solid ${PRINT_BORDER_COLOR};
        border-radius: 12px;
        padding: 14px 18px;
        background: #fff;
      }
      .print-row.highlight {
        border-color: ${PRINT_ACCENT_COLOR};
        background: rgba(19, 66, 115, 0.08);
      }
      .row-text {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .row-text .label {
        font-size: 13px;
        font-weight: 600;
        text-transform: uppercase;
        color: ${PRINT_TEXT_MUTED};
        letter-spacing: 0.5px;
      }
      .row-text .value {
        font-size: 16px;
        font-weight: 600;
        color: ${PRINT_TEXT_PRIMARY};
        word-break: break-word;
      }
      .row-text.ar {
        text-align: right;
        direction: rtl;
      }
      .row-text.ar .value {
        font-family: 'Cairo Variable', 'Cairo', 'Tajawal', 'Helvetica Neue', Arial, sans-serif;
      }
      .notes-card {
        border: 1px dashed ${PRINT_ACCENT_COLOR};
        border-radius: 12px;
        padding: 18px;
        background: ${PRINT_ACCENT_LIGHT};
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .notes-card p {
        margin: 0;
        color: ${PRINT_TEXT_MUTED};
        font-size: 15px;
      }
      @media print {
        body {
          background: #fff;
          padding: 0;
        }
        .print-page {
          box-shadow: none;
          border-radius: 0;
        }
      }
    `;
  }

  private buildPrintRow(
    labelEn: string,
    valueEn: string,
    labelAr: string,
    valueAr: string,
    options: { highlight?: boolean } = {}
  ): string {
    const classes = ['print-row'];
    if (options.highlight) {
      classes.push('highlight');
    }
    return `
      <div class="${classes.join(' ')}">
        <div class="row-text en">
          <span class="label">${this.escapeHtml(labelEn)}</span>
          <span class="value">${this.escapeHtml(valueEn)}</span>
        </div>
        <div class="row-text ar" dir="rtl">
          <span class="label">${this.escapeHtml(labelAr)}</span>
          <span class="value">${this.escapeHtml(valueAr)}</span>
        </div>
      </div>
    `;
  }

  private buildSummaryCardHtml(card: SummaryCardItem): string {
    return `
      <div class="summary-card">
        <div class="summary-title">
          <span>${this.escapeHtml(card.titleEn)}</span>
          <span dir="rtl">${this.escapeHtml(card.titleAr)}</span>
        </div>
        <div class="summary-value">
          <span>${this.escapeHtml(card.value)}</span>
          <span dir="rtl">${this.escapeHtml(card.valueAr ?? card.value)}</span>
        </div>
      </div>
    `;
  }

  private escapeHtml(value: string | null | undefined): string {
    if (value === null || value === undefined) {
      return '';
    }
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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

  private resolveInvoiceMonthArabic(context: InvoicePrintContext): string {
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

  private presentInvoicePrint(html: string, fileName: string, blob?: Blob): void {
    const printableBlob = blob ?? new Blob([html], { type: 'text/html' });

    if (typeof window !== 'undefined') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          try {
            printWindow.print();
          } catch {
            // Ignore print errors.
          }
        }, 400);
        return;
      }
      if (typeof URL !== 'undefined') {
        const blobUrl = URL.createObjectURL(printableBlob);
        const anchor = document.createElement('a');
        anchor.href = blobUrl;
        anchor.download = fileName;
        anchor.click();
        setTimeout(() => {
          try {
            URL.revokeObjectURL(blobUrl);
          } catch {
            // Ignore revoke errors.
          }
        }, 120000);
      }
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

  private resolveInvoiceMonth(context: InvoicePrintContext): string {
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
