import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
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

interface PdfField {
  label: string;
  value: string;
}

interface PdfColumn<T> {
  header: string;
  width: number;
  align?: 'left' | 'center' | 'right';
  getValue: (row: T) => string;
}

@Component({
  selector: 'app-teacher-salary-details',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule, MatTableModule, LoadingOverlayComponent],
  templateUrl: './teacher-salary-details.component.html',
  styleUrls: ['./teacher-salary-details.component.scss']
})
export class TeacherSalaryDetailsComponent implements OnInit, OnDestroy {
  @ViewChild('reportsExportSection', { read: ElementRef }) reportsExportSection?: ElementRef<HTMLElement>;
  @ViewChild('summaryExportSection', { read: ElementRef }) summaryExportSection?: ElementRef<HTMLElement>;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly teacherSalaryService = inject(TeacherSalaryService);
  private readonly toastService = inject(ToastService);
  private readonly subscriptions = new Subscription();
  private readonly pdfMargin = 12;
  private readonly pdfPageFill: [number, number, number] = [8, 12, 20];
  private readonly pdfHeaderLineColor: [number, number, number] = [60, 83, 118];
  private readonly pdfMutedColor: [number, number, number] = [154, 169, 191];
  private readonly pdfTextColor: [number, number, number] = [241, 245, 255];
  private readonly pdfSectionFill: [number, number, number] = [16, 24, 38];
  private readonly pdfCardFill: [number, number, number] = [12, 19, 31];
  private readonly pdfCardAltFill: [number, number, number] = [18, 28, 44];
  private readonly pdfTableHeaderFill: [number, number, number] = [27, 39, 60];
  private readonly pdfTableRowFill: [number, number, number] = [12, 19, 31];
  private readonly pdfTableRowAltFill: [number, number, number] = [16, 24, 38];
  private readonly pdfLogoCardFill: [number, number, number] = [248, 250, 252];
  private readonly pdfArabicFontFile = 'Tahoma.ttf';
  private readonly pdfArabicFontFamily = 'Tahoma';
  private readonly pdfLogoFile = 'logo.png';
  private readonly pdfLabels = {
    detailsTitle: '\u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u0641\u0627\u062a\u0648\u0631\u0629',
    invoiceInfo: '\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0641\u0627\u062a\u0648\u0631\u0629',
    invoiceNumber: '\u0631\u0642\u0645 \u0627\u0644\u0641\u0627\u062a\u0648\u0631\u0629',
    teacher: '\u0627\u0644\u0645\u0639\u0644\u0645',
    month: '\u0627\u0644\u0634\u0647\u0631',
    status: '\u0627\u0644\u062d\u0627\u0644\u0629',
    paidAt: '\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u062f\u0641\u0639',
    salary: '\u0627\u0644\u0631\u0627\u062a\u0628',
    summary: '\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a\u0627\u062a',
    detailed: '\u0627\u0644\u062a\u0642\u0627\u0631\u064a\u0631 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u0629 \u0641\u064a \u0627\u062d\u062a\u0633\u0627\u0628 \u0627\u0644\u0631\u0627\u062a\u0628',
    index: '#',
    student: '\u0627\u0644\u0637\u0627\u0644\u0628',
    minutes: '\u0627\u0644\u062f\u0642\u0627\u0626\u0642',
    attendStatus: '\u062d\u0627\u0644\u0629 \u0627\u0644\u062d\u0636\u0648\u0631',
    recordDate: '\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0633\u062c\u0644',
    page: '\u0635\u0641\u062d\u0629',
    of: '\u0645\u0646',
    unavailable: '\u063a\u064a\u0631 \u0645\u062a\u0627\u062d'
  } as const;
  private pdfArabicFontData: string | null = null;
  private pdfArabicFontPromise: Promise<string> | null = null;
  private pdfLogoDataUrl: string | null = null;
  private pdfLogoPromise: Promise<string> | null = null;

  detailsLoading = false;
  invoiceId: number | null = null;
  invoice: TeacherSalaryInvoice | null = null;
  detailSummary: TeacherMonthlySummary | null = null;
  detailSummaryMetrics: SummaryMetric[] = [];
  monthlyReportRecords: ReportRecordTableItem[] = [];
  reportRecordsLoading = false;
  reportRecordsError: string | null = null;
  summaryPdfLoading = false;
  detailedPdfLoading = false;
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
  private readonly pdfNumberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0
  });
  private readonly pdfPercentFormatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
  private readonly pdfCurrencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  private readonly pdfDateLocale = 'ar-EG-u-nu-latn';
  private readonly pdfCompactDateFormatter = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  private readonly pdfCompactTimeFormatter = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  private readonly displayDateFormatter = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  private readonly displayTimeFormatter = new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
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

  get pageLoading(): boolean {
    return this.detailsLoading || this.pdfExportLoading;
  }

  get pdfExportLoading(): boolean {
    return this.summaryPdfLoading || this.detailedPdfLoading;
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
    const month =
      this.readString(this.invoice, ['month']) ??
      this.readString(this.detailSummary, ['month']);
    if (!month) {
      return '—';
    }
    const parsed = new Date(month);
    if (Number.isNaN(parsed.getTime())) {
      return month;
    }
    return new Intl.DateTimeFormat(this.pdfDateLocale, { month: 'long', year: 'numeric' }).format(parsed);
  }

  getTeacherName(): string {
    return this.readString(this.invoice, ['teacherName']) ?? this.readString(this.detailSummary, ['teacherName']) ?? '—';
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
    return this.formatDisplayDateTime(parsed);
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
    const payload = details as Record<string, unknown> | null;
    const monthlySummary =
      details?.monthlySummary ??
      (payload?.['MonthlySummary'] as TeacherMonthlySummary | null | undefined) ??
      null;

    const invoiceFromPayload =
      details?.invoice ??
      (payload?.['invoice'] as TeacherSalaryInvoice | null | undefined) ??
      (payload?.['Invoice'] as TeacherSalaryInvoice | null | undefined) ??
      ((monthlySummary as Record<string, unknown> | null)?.['invoice'] as TeacherSalaryInvoice | null | undefined) ??
      ((monthlySummary as Record<string, unknown> | null)?.['Invoice'] as TeacherSalaryInvoice | null | undefined) ??
      null;

    this.invoice = invoiceFromPayload;
    this.detailSummary = monthlySummary;
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
    if (this.pdfExportLoading) {
      return;
    }

    if (this.detailSummaryMetrics.length === 0) {
      this.toastService.error('لا توجد بيانات إجمالية لتصديرها.');
      return;
    }

    const element = this.summaryExportSection?.nativeElement;
    if (!element) {
      this.toastService.error('تعذر تجهيز تقرير الإجماليات للتصدير.');
      return;
    }

    void this.exportDataAsPdf('summary');
  }

  exportDetailedReportPdf(): void {
    if (this.pdfExportLoading) {
      return;
    }

    if (this.monthlyReportRecords.length === 0) {
      this.toastService.error('لا توجد بيانات تفصيلية لتصديرها.');
      return;
    }

    const element = this.reportsExportSection?.nativeElement;
    if (!element) {
      this.toastService.error('تعذر تجهيز التقرير التفصيلي للتصدير.');
      return;
    }

    void this.exportDataAsPdf('detailed');
  }

  getAttendStatusLabel(statusId: number | null | undefined): string {
    switch (statusId) {
      case 1:
        return 'حضر';
      case 2:
        return 'تغيب بعذر';
      case 3:
        return 'تغيب بدون عذر';
      default:
        return 'غير محدد';
    }
  }

  private async exportDataAsPdf(type: 'summary' | 'detailed'): Promise<void> {
    this.setPdfLoading(type, true);

    try {
      await this.waitForNextPaint();
      const doc = await this.createPdfDocument();
      const pageTitle = type === 'summary' ? this.pdfLabels.summary : this.pdfLabels.detailed;

      let currentY = this.startPdfPage(doc, pageTitle);
      currentY = this.drawInvoiceInfoSection(doc, currentY, pageTitle);

      if (type === 'summary') {
        currentY = this.drawSectionHeading(doc, currentY, this.pdfLabels.summary);
        this.drawFieldGrid(
          doc,
          currentY,
          this.buildSummaryPdfFields(),
          pageTitle,
          this.pdfLabels.summary,
          2
        );
      } else {
        currentY = this.drawSectionHeading(doc, currentY, this.pdfLabels.detailed);
        this.drawReportTable(doc, currentY, pageTitle, this.pdfLabels.detailed);
      }

      this.addPdfPageNumbers(doc);
      doc.save(this.buildPdfFileName(type));
    } catch {
      this.toastService.error('Ø­Ø¯Ø« Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ ØªØµØ¯ÙŠØ± Ù…Ù„Ù PDF.');
    } finally {
      this.setPdfLoading(type, false);
    }
  }

  private async createPdfDocument(): Promise<jsPDF> {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    await this.ensurePdfArabicFont(doc);
    await this.preloadPdfLogo();
    doc.setLanguage('ar');
    doc.setR2L(false);
    doc.setTextColor(...this.pdfTextColor);
    return doc;
  }

  private async ensurePdfArabicFont(doc: jsPDF): Promise<void> {
    const fontData = await this.getPdfArabicFontData();
    doc.addFileToVFS(this.pdfArabicFontFile, fontData);
    doc.addFont(this.pdfArabicFontFile, this.pdfArabicFontFamily, 'normal');
    doc.setFont(this.pdfArabicFontFamily, 'normal');
  }

  private getPdfArabicFontData(): Promise<string> {
    if (this.pdfArabicFontData) {
      return Promise.resolve(this.pdfArabicFontData);
    }

    if (!this.pdfArabicFontPromise) {
      this.pdfArabicFontPromise = this.loadPdfArabicFontData();
    }

    return this.pdfArabicFontPromise;
  }

  private async loadPdfArabicFontData(): Promise<string> {
    const response = await fetch(this.getPdfArabicFontUrl());
    if (!response.ok) {
      throw new Error('Unable to load Arabic PDF font.');
    }

    const buffer = await response.arrayBuffer();
    const fontData = this.arrayBufferToBase64(buffer);
    this.pdfArabicFontData = fontData;
    return fontData;
  }

  private getPdfArabicFontUrl(): string {
    const baseUri = typeof document !== 'undefined' ? document.baseURI : '/';
    return new URL(`assets/fonts/${this.pdfArabicFontFile}`, baseUri).toString();
  }

  private async preloadPdfLogo(): Promise<void> {
    try {
      await this.getPdfLogoDataUrl();
    } catch {
      this.pdfLogoDataUrl = null;
    }
  }

  private getPdfLogoDataUrl(): Promise<string> {
    if (this.pdfLogoDataUrl) {
      return Promise.resolve(this.pdfLogoDataUrl);
    }

    if (!this.pdfLogoPromise) {
      this.pdfLogoPromise = this.loadPdfLogoDataUrl();
    }

    return this.pdfLogoPromise;
  }

  private async loadPdfLogoDataUrl(): Promise<string> {
    const response = await fetch(this.getPdfLogoUrl());
    if (!response.ok) {
      throw new Error('Unable to load PDF logo.');
    }

    const buffer = await response.arrayBuffer();
    const logoDataUrl = `data:image/png;base64,${this.arrayBufferToBase64(buffer)}`;
    this.pdfLogoDataUrl = logoDataUrl;
    return logoDataUrl;
  }

  private getPdfLogoUrl(): string {
    const baseUri = typeof document !== 'undefined' ? document.baseURI : '/';
    return new URL(`assets/images/${this.pdfLogoFile}`, baseUri).toString();
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    let binary = '';

    for (let index = 0; index < bytes.length; index += chunkSize) {
      const chunk = bytes.subarray(index, index + chunkSize);
      binary += String.fromCharCode(...chunk);
    }

    return btoa(binary);
  }

  private startPdfPage(doc: jsPDF, title: string): number {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = this.pdfMargin;
    const logoBoxX = margin + 3;
    const logoBoxY = margin + 3;
    const logoBoxWidth = 28;
    const logoBoxHeight = 24;
    const logoInset = 2;
    const contentRight = pageWidth - margin - 4;
    const contentLeft = this.pdfLogoDataUrl ? logoBoxX + logoBoxWidth + 5 : margin + 4;

    doc.setFillColor(...this.pdfPageFill);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    doc.setFillColor(...this.pdfSectionFill);
    doc.setDrawColor(...this.pdfHeaderLineColor);
    doc.roundedRect(margin, margin, pageWidth - margin * 2, 30, 3, 3, 'FD');

    if (this.pdfLogoDataUrl) {
      doc.setFillColor(...this.pdfLogoCardFill);
      doc.roundedRect(logoBoxX, logoBoxY, logoBoxWidth, logoBoxHeight, 2, 2, 'F');
      doc.addImage(
        this.pdfLogoDataUrl,
        'PNG',
        logoBoxX + logoInset,
        logoBoxY + logoInset,
        logoBoxWidth - logoInset * 2,
        logoBoxHeight - logoInset * 2,
        undefined,
        'FAST'
      );
    }

    this.applyPdfText(doc, this.pdfLabels.detailsTitle, 18);
    doc.setTextColor(...this.pdfTextColor);
    doc.text(this.getPdfText(doc, this.pdfLabels.detailsTitle), contentRight, margin + 8, {
      align: 'right'
    });

    this.applyPdfText(doc, title, 11);
    doc.setTextColor(...this.pdfMutedColor);
    doc.text(this.getPdfText(doc, title), contentRight, margin + 15, {
      align: 'right'
    });

    const teacherName = this.getPdfTeacherName();
    this.applyPdfText(doc, this.pdfLabels.teacher, 9.5);
    doc.setTextColor(...this.pdfMutedColor);
    doc.text(this.getPdfText(doc, this.pdfLabels.teacher), contentRight, margin + 22, {
      align: 'right'
    });

    this.applyPdfText(doc, teacherName, 10);
    doc.setTextColor(...this.pdfTextColor);
    doc.text(
      this.getPdfText(doc, teacherName),
      this.getPdfTextAlign(teacherName, 'right') === 'left' ? contentLeft : contentRight - 24,
      margin + 22,
      { align: this.getPdfTextAlign(teacherName, 'right') }
    );

    const monthLabel = this.getSafePdfValue(this.formatPdfMonth());
    this.applyPdfText(doc, this.pdfLabels.month, 9.5);
    doc.setTextColor(...this.pdfMutedColor);
    doc.text(this.getPdfText(doc, this.pdfLabels.month), contentRight, margin + 27, {
      align: 'right'
    });

    this.applyPdfText(doc, monthLabel, 10);
    doc.setTextColor(...this.pdfTextColor);
    doc.text(
      this.getPdfText(doc, monthLabel),
      this.getPdfTextAlign(monthLabel, 'right') === 'left' ? contentLeft : contentRight - 24,
      margin + 27,
      { align: this.getPdfTextAlign(monthLabel, 'right') }
    );

    return margin + 37;
  }

  private drawInvoiceInfoSection(doc: jsPDF, startY: number, pageTitle: string): number {
    const sectionY = this.drawSectionHeading(doc, startY, this.pdfLabels.invoiceInfo);
    return this.drawInvoiceFieldRows(doc, sectionY, this.buildInvoicePdfFields(), pageTitle);
  }

  private buildInvoicePdfFields(): PdfField[] {
    return [
      { label: this.pdfLabels.invoiceNumber, value: this.formatPdfInteger(this.invoice?.id ?? null) },
      { label: this.pdfLabels.teacher, value: this.getPdfTeacherName() },
      { label: this.pdfLabels.month, value: this.formatPdfMonth() },
      { label: this.pdfLabels.status, value: this.getPdfStatusLabel() },
      { label: this.pdfLabels.paidAt, value: this.formatPdfPaidAt() },
      { label: this.pdfLabels.salary, value: this.formatPdfSalary() }
    ];
  }

  private buildSummaryPdfFields(): PdfField[] {
    return this.detailSummaryMetrics.map((metric) => ({
      label: metric.label,
      value: this.formatPdfMetricValue(metric)
    }));
  }

  private getPdfTeacherName(): string {
    const arabicName =
      this.readString(this.detailSummary, ['teacherNameAr', 'teacherArabicName']) ??
      this.readString(this.invoice, ['teacherNameAr', 'teacherArabicName']);

    if (arabicName) {
      return arabicName;
    }

    const teacherName = this.getTeacherName();
    return this.usesArabicScript(teacherName) ? teacherName : this.pdfLabels.unavailable;
  }

  private getPdfStudentName(record: ReportRecordTableItem): string {
    const studentName = this.readString(record, [
      'studentName',
      'studentNameAr',
      'studentArabicName',
      'studentArName'
    ]);

    return studentName ?? this.pdfLabels.unavailable;
  }

  private getPdfStatusLabel(): string {
    const status = this.getSafePdfValue(this.getStatusLabel());
    const normalized = status.replace(/\s+/g, '').toLowerCase();

    if (['paid', 'settled', 'completed'].includes(normalized)) {
      return '\u0645\u062f\u0641\u0648\u0639';
    }

    if (['unpaid', 'pending', 'due', 'notpaid'].includes(normalized)) {
      return '\u063a\u064a\u0631 \u0645\u062f\u0641\u0648\u0639';
    }

    return this.usesArabicScript(status) ? status : this.pdfLabels.unavailable;
  }

  private drawInvoiceFieldRows(
    doc: jsPDF,
    startY: number,
    fields: PdfField[],
    pageTitle: string
  ): number {
    const rows: PdfField[][] = [];

    for (let index = 0; index < fields.length; index += 2) {
      rows.push(fields.slice(index, index + 2));
    }

    let currentY = startY;

    for (const rowFields of rows) {
      const rowHeight = this.measureInvoiceRowHeight(doc, rowFields);
      currentY = this.ensurePdfSpace(
        doc,
        currentY,
        rowHeight,
        pageTitle,
        this.pdfLabels.invoiceInfo
      );
      this.drawInvoiceRow(doc, currentY, rowHeight, rowFields);
      currentY += rowHeight + 4;
    }

    return currentY;
  }

  private measureInvoiceRowHeight(doc: jsPDF, fields: PdfField[]): number {
    const segmentWidth = (doc.internal.pageSize.getWidth() - this.pdfMargin * 2) / 2;
    const heights = fields.map((field) => {
      const valueLines = this.splitPdfText(doc, this.getSafePdfValue(field.value), segmentWidth - 32, 11.5);
      return Math.max(14, 8 + valueLines.length * 4.6);
    });

    return Math.max(...heights, 14);
  }

  private drawInvoiceRow(
    doc: jsPDF,
    y: number,
    height: number,
    fields: PdfField[]
  ): void {
    const fullWidth = doc.internal.pageSize.getWidth() - this.pdfMargin * 2;
    const segmentWidth = fullWidth / 2;
    const x = this.pdfMargin;

    doc.setDrawColor(...this.pdfHeaderLineColor);
    doc.setFillColor(...this.pdfCardFill);
    doc.roundedRect(x, y, fullWidth, height, 2, 2, 'FD');
    if (fields.length > 1) {
      doc.line(x + segmentWidth, y, x + segmentWidth, y + height);
    }

    fields.forEach((field, index) => {
      const fieldX = x + (fields.length === 1 ? 0 : (fields.length - 1 - index) * segmentWidth);
      const fieldWidth = fields.length === 1 ? fullWidth : segmentWidth;
      this.drawInvoiceInlineField(doc, fieldX, y, fieldWidth, height, field);
    });
  }

  private drawInvoiceInlineField(
    doc: jsPDF,
    x: number,
    y: number,
    width: number,
    height: number,
    field: PdfField
  ): void {
    const padding = 4;
    const labelWidth = 26;
    const valueText = this.getSafePdfValue(field.value);
    const valueLines = this.splitPdfText(doc, valueText, width - labelWidth - padding * 3, 11.5);

    this.applyPdfText(doc, field.label, 9.5);
    doc.setTextColor(...this.pdfMutedColor);
    doc.text(this.getPdfText(doc, field.label), x + width - padding, y + 5.5, { align: 'right' });

    this.applyPdfText(doc, valueText, 11.5);
    doc.setTextColor(...this.pdfTextColor);
    doc.text(
      valueLines,
      this.getPdfTextAlign(valueText, 'right') === 'left'
        ? x + padding
        : x + width - labelWidth - padding,
      y + 5.8,
      { align: this.getPdfTextAlign(valueText, 'right') }
    );
  }

  private drawSectionHeading(doc: jsPDF, startY: number, title: string): number {
    const pageWidth = doc.internal.pageSize.getWidth();
    const width = pageWidth - this.pdfMargin * 2;
    const height = 10;

    doc.setFillColor(...this.pdfSectionFill);
    doc.setDrawColor(...this.pdfHeaderLineColor);
    doc.roundedRect(this.pdfMargin, startY, width, height, 2, 2, 'FD');

    this.applyPdfText(doc, title, 12);
    doc.setTextColor(...this.pdfTextColor);
    doc.text(this.getPdfText(doc, title), pageWidth - this.pdfMargin - 3, startY + 6.5, {
      align: 'right'
    });

    return startY + height + 5;
  }

  private drawFieldGrid(
    doc: jsPDF,
    startY: number,
    fields: PdfField[],
    pageTitle: string,
    sectionTitle: string,
    columns: number
  ): number {
    const pageWidth = doc.internal.pageSize.getWidth();
    const gap = 6;
    const safeColumns = Math.max(1, columns);
    const cellWidth = (pageWidth - this.pdfMargin * 2 - gap * (safeColumns - 1)) / safeColumns;
    let currentY = startY;

    for (let index = 0; index < fields.length; index += safeColumns) {
      const rowFields = fields.slice(index, index + safeColumns);
      const rowHeight = Math.max(
        ...rowFields.map((field) => this.measureFieldHeight(doc, field, cellWidth)),
        20
      );

      currentY = this.ensurePdfSpace(doc, currentY, rowHeight, pageTitle, sectionTitle);

      rowFields.forEach((field, columnIndex) => {
        const x = pageWidth - this.pdfMargin - cellWidth - columnIndex * (cellWidth + gap);
        this.drawFieldCell(doc, x, currentY, cellWidth, rowHeight, field);
      });

      currentY += rowHeight + gap;
    }

    return currentY;
  }

  private measureFieldHeight(doc: jsPDF, field: PdfField, width: number): number {
    const padding = 4;
    const labelLines = this.splitPdfText(doc, field.label, width - padding * 2, 10);
    const valueLines = this.splitPdfText(
      doc,
      this.getSafePdfValue(field.value),
      width - padding * 2,
      12
    );

    return 8 + labelLines.length * 4.2 + valueLines.length * 5.2;
  }

  private drawFieldCell(
    doc: jsPDF,
    x: number,
    y: number,
    width: number,
    height: number,
    field: PdfField
  ): void {
    const padding = 4;
    const topPadding = 6;
    const labelLines = this.splitPdfText(doc, field.label, width - padding * 2, 10);
    const safeValue = this.getSafePdfValue(field.value);
    const valueLines = this.splitPdfText(doc, safeValue, width - padding * 2, 12);

    doc.setDrawColor(...this.pdfHeaderLineColor);
    doc.setFillColor(...this.pdfCardAltFill);
    doc.roundedRect(x, y, width, height, 2, 2, 'FD');

    this.applyPdfText(doc, field.label, 10);
    doc.setTextColor(...this.pdfMutedColor);
    doc.text(labelLines, x + width - padding, y + topPadding, { align: 'right' });

    this.applyPdfText(doc, safeValue, 12);
    doc.setTextColor(...this.pdfTextColor);
    doc.text(
      valueLines,
      this.getPdfValueX(x, width, safeValue),
      y + topPadding + labelLines.length * 4.2 + 3,
      { align: this.getPdfTextAlign(safeValue, 'right') }
    );
  }

  private drawReportTable(
    doc: jsPDF,
    startY: number,
    pageTitle: string,
    sectionTitle: string
  ): number {
    const columns = this.buildReportPdfColumns();
    let currentY = this.drawReportTableHeader(doc, startY, columns);

    for (const row of this.monthlyReportRecords) {
      const rowHeight = this.measureReportRowHeight(doc, row, columns);

      if (currentY + rowHeight > doc.internal.pageSize.getHeight() - this.pdfMargin) {
        doc.addPage();
        currentY = this.startPdfPage(doc, pageTitle);
        currentY = this.drawSectionHeading(doc, currentY, sectionTitle);
        currentY = this.drawReportTableHeader(doc, currentY, columns);
      }

      this.drawReportRow(doc, currentY, row, rowHeight, columns);
      currentY += rowHeight;
    }

    return currentY;
  }

  private buildReportPdfColumns(): PdfColumn<ReportRecordTableItem>[] {
    return [
      {
        header: this.pdfLabels.index,
        width: 12,
        align: 'center',
        getValue: (row) => this.formatPdfInteger(row.displayIndex)
      },
      {
        header: this.pdfLabels.student,
        width: 50,
        align: 'right',
        getValue: (row) => this.getPdfStudentName(row)
      },
      {
        header: this.pdfLabels.minutes,
        width: 20,
        align: 'center',
        getValue: (row) => this.formatPdfInteger(row.minutes)
      },
      {
        header: this.pdfLabels.salary,
        width: 28,
        align: 'right',
        getValue: (row) => this.formatPdfRecordSalary(row.salary)
      },
      {
        header: this.pdfLabels.attendStatus,
        width: 34,
        align: 'right',
        getValue: (row) => this.getAttendStatusLabel(row.attendStatusId)
      },
      {
        header: this.pdfLabels.recordDate,
        width: 42,
        align: 'right',
        getValue: (row) => this.formatPdfRecordDate(row.recordCreatedAt)
      }
    ];
  }

  private drawReportTableHeader(
    doc: jsPDF,
    startY: number,
    columns: PdfColumn<ReportRecordTableItem>[]
  ): number {
    let currentX = doc.internal.pageSize.getWidth() - this.pdfMargin;
    const height = 10;

    for (const column of columns) {
      currentX -= column.width;
      doc.setFillColor(...this.pdfTableHeaderFill);
      doc.setDrawColor(...this.pdfHeaderLineColor);
      doc.rect(currentX, startY, column.width, height, 'FD');

      const headerLines = this.splitPdfText(doc, column.header, column.width - 4, 10);
      this.applyPdfText(doc, column.header, 10);
      doc.setTextColor(...this.pdfTextColor);
      doc.text(headerLines, this.getPdfCellX(currentX, column.width, column.header, column.align), startY + 6, {
        align: column.align ?? 'right'
      });
    }

    return startY + height;
  }

  private measureReportRowHeight(
    doc: jsPDF,
    row: ReportRecordTableItem,
    columns: PdfColumn<ReportRecordTableItem>[]
  ): number {
    const lineCounts = columns.map((column) =>
      this.splitPdfText(doc, column.getValue(row), column.width - 4, 9.5).length
    );
    return Math.max(10, Math.max(...lineCounts) * 4.6 + 4);
  }

  private drawReportRow(
    doc: jsPDF,
    startY: number,
    row: ReportRecordTableItem,
    rowHeight: number,
    columns: PdfColumn<ReportRecordTableItem>[]
  ): void {
    let currentX = doc.internal.pageSize.getWidth() - this.pdfMargin;
    const fillColor: [number, number, number] =
      row.displayIndex % 2 === 0 ? this.pdfTableRowFill : this.pdfTableRowAltFill;

    for (const column of columns) {
      currentX -= column.width;
      const cellValue = column.getValue(row);
      const cellLines = this.splitPdfText(doc, cellValue, column.width - 4, 9.5);

      doc.setFillColor(...fillColor);
      doc.setDrawColor(...this.pdfHeaderLineColor);
      doc.rect(currentX, startY, column.width, rowHeight, 'FD');

      this.applyPdfText(doc, cellValue, 9.5);
      doc.setTextColor(...this.pdfTextColor);
      doc.text(cellLines, this.getPdfCellX(currentX, column.width, cellValue, column.align), startY + 5.8, {
        align: this.getPdfTextAlign(cellValue, column.align ?? 'right')
      });
    }
  }

  private getPdfCellX(
    x: number,
    width: number,
    text: string,
    align: PdfColumn<ReportRecordTableItem>['align']
  ): number {
    if (align === 'center') {
      return x + width / 2;
    }

    if (this.getPdfTextAlign(text, align ?? 'right') === 'left') {
      return x + 2;
    }

    return x + width - 2;
  }

  private addPdfPageNumbers(doc: jsPDF): void {
    const totalPages = doc.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
      doc.setPage(pageNumber);
      const label = `${this.pdfLabels.page} ${this.formatPdfInteger(pageNumber)} ${this.pdfLabels.of} ${this.formatPdfInteger(totalPages)}`;
      this.applyPdfText(doc, label, 9);
      doc.setTextColor(...this.pdfMutedColor);
      doc.text(this.getPdfText(doc, label), pageWidth - this.pdfMargin, pageHeight - 5, {
        align: 'right'
      });
    }
  }

  private ensurePdfSpace(
    doc: jsPDF,
    startY: number,
    requiredHeight: number,
    pageTitle: string,
    sectionTitle?: string
  ): number {
    if (startY + requiredHeight <= doc.internal.pageSize.getHeight() - this.pdfMargin) {
      return startY;
    }

    doc.addPage();
    const nextStartY = this.startPdfPage(doc, pageTitle);
    return sectionTitle ? this.drawSectionHeading(doc, nextStartY, sectionTitle) : nextStartY;
  }

  private splitPdfText(doc: jsPDF, text: string, maxWidth: number, fontSize: number): string[] {
    const safeText = this.getSafePdfValue(text);
    this.applyPdfText(doc, safeText, fontSize);
    const lines = doc.splitTextToSize(this.getPdfText(doc, safeText), maxWidth);
    return Array.isArray(lines) ? lines : [String(lines)];
  }

  private applyPdfText(doc: jsPDF, text: string, fontSize: number): void {
    const usesArabic = this.usesArabicScript(text);
    doc.setFont(usesArabic ? this.pdfArabicFontFamily : 'helvetica', 'normal');
    doc.setFontSize(fontSize);
  }

  private getPdfText(doc: jsPDF, text: string): string {
    const safeText = this.getSafePdfValue(text);
    return this.usesArabicScript(safeText) ? doc.processArabic(safeText) : safeText;
  }

  private getPdfTextAlign(
    text: string,
    fallback: 'left' | 'center' | 'right' = 'right'
  ): 'left' | 'center' | 'right' {
    if (fallback === 'center') {
      return 'center';
    }

    return this.usesArabicScript(text) ? 'right' : 'left';
  }

  private getPdfValueX(x: number, width: number, text: string): number {
    return this.getPdfTextAlign(text, 'right') === 'left' ? x + 4 : x + width - 4;
  }

  private usesArabicScript(value: string): boolean {
    return /[\u0600-\u06FF]/.test(value);
  }

  private getSafePdfValue(value: string | null | undefined): string {
    if (typeof value !== 'string') {
      return '-';
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : '-';
  }

  private formatInteger(value: number | null | undefined): string {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return '-';
    }

    return this.numberFormatter.format(value);
  }

  private formatPdfMetricValue(metric: SummaryMetric): string {
    if (metric.value === null || metric.value === undefined || metric.value === '') {
      return '-';
    }

    if (metric.type === 'currency') {
      const num = this.coerceNumber(metric.value);
      return num !== null ? this.pdfCurrencyFormatter.format(num) : String(metric.value);
    }

    if (metric.type === 'number') {
      const num = this.coerceNumber(metric.value);
      if (num !== null) {
        const formatted = this.pdfNumberFormatter.format(num);
        return metric.suffix ? `${formatted} ${metric.suffix}` : formatted;
      }
      return String(metric.value);
    }

    if (metric.type === 'percentage') {
      const num = this.coerceNumber(metric.value);
      if (num !== null) {
        const percent = Math.abs(num) <= 1 ? num * 100 : num;
        return `${this.pdfPercentFormatter.format(percent)}%`;
      }
      return String(metric.value);
    }

    return String(metric.value);
  }

  private formatPdfMonth(): string {
    const month =
      this.readString(this.invoice, ['month']) ??
      this.readString(this.detailSummary, ['month']);
    if (!month) {
      return '-';
    }

    const parsed = new Date(month);
    if (Number.isNaN(parsed.getTime())) {
      return month;
    }

    return new Intl.DateTimeFormat(this.pdfDateLocale, { month: 'long', year: 'numeric' }).format(parsed);
  }

  private formatPdfSalary(): string {
    const amount =
      this.readNumber(this.invoice, ['salary']) ??
      this.readNumber(this.invoice, ['salaryAmount', 'totalSalary']) ??
      this.readNumber(this.detailSummary, ['totalSalary', 'salaryTotal', 'netSalary', 'takeHomePay']);
    return amount === null ? '-' : this.pdfCurrencyFormatter.format(amount);
  }

  private formatPdfPaidAt(): string {
    const value = this.readString(this.invoice, ['payedAt']);
    if (!value) {
      return '-';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return this.formatPdfDateTime(parsed);
  }

  private formatPdfInteger(value: number | null | undefined): string {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return '-';
    }

    return this.pdfNumberFormatter.format(value);
  }

  /*
  private async exportSectionAsPdf(
    element: HTMLElement,
    fileName: string,
    type: 'summary' | 'detailed'
  ): Promise<void> {
    this.setPdfLoading(type, true);

    try {
      await this.waitForNextPaint();

      const scale =
        typeof window !== 'undefined'
          ? Math.min(window.devicePixelRatio || 1, 1.5)
          : 1.5;
      const canvas = await html2canvas(element, {
        scale,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        removeContainer: true
      });

      const imgData = canvas.toDataURL('image/png');
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 8;
      const printableWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * printableWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = margin;

      doc.addImage(imgData, 'PNG', margin, position, printableWidth, imgHeight);
      heightLeft -= pageHeight - margin * 2;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + margin;
        doc.addPage();
        doc.addImage(imgData, 'PNG', margin, position, printableWidth, imgHeight);
        heightLeft -= pageHeight - margin * 2;
      }

      doc.save(fileName);
    } catch {
      this.toastService.error('حدث خطأ أثناء تصدير ملف PDF.');
    } finally {
      this.setPdfLoading(type, false);
    }
  }

  */

  private buildPdfFileName(type: 'summary' | 'detailed'): string {
    const teacherName = this.getPdfTeacherName();
    const monthLabel = this.getFileMonthLabel();
    const reportType = type === 'summary' ? 'اجمالي' : 'تفصيلي';
    return this.sanitizeFileName(`${teacherName}-${monthLabel}-${reportType}.pdf`);
  }

  private getFileMonthLabel(): string {
    const rawMonth = this.readString(this.invoice, ['month']) ?? this.readString(this.detailSummary, ['month']);
    if (!rawMonth) {
      return 'بدون-شهر';
    }

    const parsed = new Date(rawMonth);
    if (Number.isNaN(parsed.getTime())) {
      return rawMonth;
    }

    return new Intl.DateTimeFormat('ar-EG', { month: 'long', year: 'numeric' }).format(parsed);
  }

  private sanitizeFileName(fileName: string): string {
    return fileName.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim();
  }

  private setPdfLoading(type: 'summary' | 'detailed', isLoading: boolean): void {
    if (type === 'summary') {
      this.summaryPdfLoading = isLoading;
      return;
    }

    this.detailedPdfLoading = isLoading;
  }

  private async waitForNextPaint(): Promise<void> {
    await new Promise<void>((resolve) => {
      if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(() => resolve());
        return;
      }

      setTimeout(() => resolve(), 0);
    });
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
    return this.formatDisplayDateTime(parsed);
  }

  private formatDisplayDateTime(value: Date): string {
    const datePart = this.displayDateFormatter.format(value);
    const timePart = this.displayTimeFormatter.format(value);
    return `${datePart} - ${timePart}`;
  }

  private formatPdfRecordSalary(value: number | null | undefined): string {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return '-';
    }

    return this.pdfCurrencyFormatter.format(value);
  }

  private formatPdfRecordDate(value: string | null | undefined): string {
    if (!value) {
      return '-';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return this.formatPdfDateTime(parsed);
  }

  private formatPdfDateTime(value: Date): string {
    const datePart = this.pdfCompactDateFormatter.format(value);
    const timePart = this.pdfCompactTimeFormatter.format(value);
    return `${datePart} - ${timePart}`;
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

    const normalizedEntries = Object.entries(record).map(([key, value]) => ({
      key,
      normalized: this.normalizeKey(key),
      value
    }));

    for (const key of keys) {
      if (record[key] !== undefined && record[key] !== null) {
        return record[key];
      }

      const normalizedKey = this.normalizeKey(key);
      const matched = normalizedEntries.find((entry) => entry.normalized === normalizedKey);
      if (matched && matched.value !== undefined && matched.value !== null) {
        return matched.value;
      }
    }

    return null;
  }

  private normalizeKey(key: string): string {
    return key.replace(/[_\-\s]/g, '').toLowerCase();
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
