// angular import
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { ApexAxisChartSeries } from 'ng-apexcharts';

// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';
import { StatisticsChartComponent } from '../../../apex-chart/statistics-chart/statistics-chart.component';
import { CircleService, CircleDayDto, UpcomingCircleDto } from 'src/app/@theme/services/circle.service';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { formatDayValue } from 'src/app/@theme/types/DaysEnum';
import { formatTimeValue } from 'src/app/@theme/utils/time';
import { TranslateService } from '@ngx-translate/core';
import { LoadingOverlayComponent } from 'src/app/@theme/components/loading-overlay/loading-overlay.component';
import {
  DashboardOverviewDto,
  DashboardOverviewMetricsDto,
  DashboardOverviewMonthlyRevenuePointDto,
  DashboardOverviewService,
  DashboardOverviewTransactionDto
} from 'src/app/@theme/services/dashboard-overview.service';

interface DashboardSummaryCard {
  key: string;
  icon: string;
  background: string;
  title: string;
  value: string;
  percentage?: string | null;
  percentageClass?: string;
}

interface DashboardTransactionView {
  key: string;
  student: string;
  amount: string;
  date: string;
  status: string;
  statusClass: string;
}

@Component({
  selector: 'app-online-dashboard',
  imports: [
    SharedModule,
    CommonModule,
    StatisticsChartComponent,
    LoadingOverlayComponent
  ],
  templateUrl: './online-dashboard.component.html',
  styleUrl: './online-dashboard.component.scss'
})
export class OnlineDashboardComponent implements OnInit {
  // public props
  selected: Date | null;

  private circleService = inject(CircleService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  private dashboardOverview = inject(DashboardOverviewService);
  private readonly roleTranslations: Record<string, string> = {
    admin: 'مسؤول',
    manager: 'مدير',
    branchleader: 'قائد فرع',
    branch_leader: 'قائد فرع',
    student: 'طالب',
    teacher: 'معلم'
  };

  overviewLoading = false;
  overviewLoaded = false;
  overviewError: string | null = null;
  overviewRoleLabel: string | null = null;
  overviewRangeDescription: string | null = null;

  summaryCards: DashboardSummaryCard[] = [];
  roleMetricCards: DashboardSummaryCard[] = [];
  financialMetricCards: DashboardSummaryCard[] = [];
  transactionsView: DashboardTransactionView[] = [];

  monthlyRevenueSeries?: ApexAxisChartSeries;
  monthlyRevenueCategories?: string[];
  monthlyRevenueHasData = false;

  financialChartSeries?: ApexAxisChartSeries;
  financialChartCategories?: string[];
  financialChartHasData = false;

  upcomingCircles: UpcomingCircleDto[] = [];
  upcomingLoading = false;

  get pageLoading(): boolean {
    return this.overviewLoading || this.upcomingLoading;
  }
  ngOnInit(): void {
    this.loadDashboardOverview();
    this.loadUpcomingCircles();
  }

  loadDashboardOverview(): void {
    this.overviewLoading = true;
    this.overviewError = null;

    this.dashboardOverview.getOverview().subscribe({
      next: (response) => {
        this.overviewLoading = false;

        if (!response?.isSuccess) {
          this.overviewLoaded = false;
          this.resetOverviewData();
          const message =
            this.extractFirstError(response?.errors) || this.translate.instant('تعذر تحميل نظرة عامة لوحة التحكم');
          this.overviewError = message;
          if (message) {
            this.toast.error(message);
          }
          return;
        }

        this.overviewLoaded = true;
        this.applyOverviewData(response.data);
      },
      error: () => {
        this.overviewLoading = false;
        this.overviewLoaded = false;
        this.resetOverviewData();
        const message = this.translate.instant('تعذر تحميل نظرة عامة لوحة التحكم');
        this.overviewError = message;
        this.toast.error(message);
      }
    });
  }

  private resetOverviewData(): void {
    this.summaryCards = [];
    this.roleMetricCards = [];
    this.financialMetricCards = [];
    this.transactionsView = [];
    this.monthlyRevenueSeries = undefined;
    this.monthlyRevenueCategories = undefined;
    this.monthlyRevenueHasData = false;
    this.financialChartSeries = undefined;
    this.financialChartCategories = undefined;
    this.financialChartHasData = false;
    this.overviewRoleLabel = null;
    this.overviewRangeDescription = null;
  }

  private applyOverviewData(data?: DashboardOverviewDto | null): void {
    if (!data) {
      this.resetOverviewData();
      return;
    }

    this.overviewRoleLabel = this.formatRole(data.role);
    this.overviewRangeDescription = this.buildRangeDescription(data.rangeStart, data.rangeEnd, data.rangeLabel);

    this.summaryCards = this.buildSummaryCards(data.metrics);
    this.roleMetricCards = this.buildRoleMetricCards(data.metrics);
    this.financialMetricCards = this.buildFinancialMetricCards(data.metrics);

    const charts = data.charts;
    this.transactionsView = this.buildTransactionsView(charts?.transactions);
    this.buildMonthlyRevenueChart(charts?.monthlyRevenue);
    this.buildFinancialChart(data.metrics);
  }

  private buildSummaryCards(metrics?: DashboardOverviewMetricsDto | null): DashboardSummaryCard[] {
    const definitions = [
      {
        key: 'earnings',
        title: 'كل الأرباح',
        icon: '#custom-card',
        background: 'bg-warn-50 text-warn-500',
        defaultTrendClass: 'text-success-500',
        valueType: 'currency' as const,
        percentKey: 'earningsPercentChange',
        currencyKeys: ['earningsCurrencyCode', 'currencyCode']
      },
      {
        key: 'newStudents',
        title: 'الطلاب الجدد',
        icon: '#custom-profile-2user-outline',
        background: 'bg-primary-50 text-primary-500',
        defaultTrendClass: 'text-success-500',
        valueType: 'number' as const,
        percentKey: 'newStudentsPercentChange'
      },
      {
        key: 'circleReports',
        title: 'تقارير الحلقات',
        icon: '#custom-eye',
        background: 'bg-success-50 text-success-500',
        defaultTrendClass: 'text-success-500',
        valueType: 'number' as const,
        percentKey: 'circleReportsPercentChange'
      },
      {
        key: 'netIncome',
        title: 'صافي الدخل',
        icon: '#book',
        background: 'bg-warning-50 text-warning-500',
        defaultTrendClass: 'text-success-500',
        valueType: 'currency' as const,
        percentKey: 'netIncomePercentChange',
        currencyKeys: ['netIncomeCurrencyCode', 'currencyCode']
      }
    ];

    return definitions.map((definition) => {
      const rawValue = metrics ? metrics[definition.key] : undefined;
      const currencyCode = this.pickCurrencyCode(metrics, definition.currencyKeys);
      const value = this.formatMetricValue(rawValue, definition.valueType, currencyCode);
      const percentKey = definition.percentKey;
      const percentSource = percentKey ? metrics?.[percentKey as keyof DashboardOverviewMetricsDto] : undefined;
      const percentValue = this.extractPercentageValue(percentSource);
      const percentageClass = percentValue
        ? this.resolvePercentageClass(percentSource, definition.defaultTrendClass)
        : undefined;

      return {
        key: definition.key,
        icon: definition.icon,
        background: definition.background,
        title: definition.title,
        value,
        percentage: percentValue,
        percentageClass
      } satisfies DashboardSummaryCard;
    });
  }

  private buildRoleMetricCards(metrics?: DashboardOverviewMetricsDto | null): DashboardSummaryCard[] {
    const definitions = [
      {
        key: 'branchManagersCount',
        label: 'مديرو الفروع',
        icon: '#custom-layer',
        background: 'bg-primary-100 text-primary-600'
      },
      { key: 'supervisorsCount', label: 'المشرفون', icon: '#custom-user-tick', background: 'bg-success-100 text-success-600' },
      { key: 'teachersCount', label: 'المعلمون', icon: '#custom-teacher', background: 'bg-warning-100 text-warning-700' },
      { key: 'studentsCount', label: 'الطلاب', icon: '#custom-profile-2user-outline', background: 'bg-info-100 text-info-700' },
      { key: 'circlesCount', label: 'الحلقات', icon: '#custom-status-up', background: 'bg-secondary-100 text-secondary-700' },
      { key: 'reportsCount', label: 'التقارير', icon: '#custom-document-text', background: 'bg-warn-100 text-warn-700' }
    ];

    return definitions
      .map((definition) => {
        const numericValue = this.coerceNumber(metrics ? metrics[definition.key] : undefined);
        if (numericValue === null) {
          return null;
        }

        return {
          key: definition.key,
          title: definition.label,
          icon: definition.icon,
          background: definition.background,
          value: this.formatNumber(numericValue)
        } satisfies DashboardSummaryCard;
      })
      .filter((entry): entry is DashboardSummaryCard => !!entry);
  }

  private buildFinancialMetricCards(metrics?: DashboardOverviewMetricsDto | null): DashboardSummaryCard[] {
    const definitions = [
      {
        key: 'outgoing',
        label: 'الصادر',
        icon: '#custom-wallet-2',
        background: 'bg-secondary-100 text-secondary-700',
        currencyKeys: ['outgoingCurrencyCode', 'currencyCode']
      },
      {
        key: 'incomingEgp',
        label: 'الوارد (الجنيه)',
        icon: '#custom-dollar-square',
        background: 'bg-primary-50 text-primary-600',
        currencyKeys: ['incomingEgpCurrencyCode'],
        fallbackCurrency: 'EGP'
      },
      {
        key: 'incomingSar',
        label: 'الوارد (الريال)',
        icon: '#custom-global',
        background: 'bg-success-50 text-success-600',
        currencyKeys: ['incomingSarCurrencyCode'],
        fallbackCurrency: 'SAR'
      },
      {
        key: 'incomingUsd',
        label: 'الوارد (الدولار)',
        icon: '#custom-dollar-circle',
        background: 'bg-warning-50 text-warning-600',
        currencyKeys: ['incomingUsdCurrencyCode'],
        fallbackCurrency: 'USD'
      },
      {
        key: 'netProfit',
        label: 'صافي الأرباح',
        icon: '#custom-status-up',
        background: 'bg-info-50 text-info-700',
        currencyKeys: ['netProfitCurrencyCode', 'netIncomeCurrencyCode', 'currencyCode']
      },
      {
        key: 'netProfitEgp',
        label: 'صافي الأرباح (الجنيه)',
        icon: '#custom-dollar-square',
        background: 'bg-primary-50 text-primary-600',
        currencyKeys: ['netProfitEgpCurrencyCode'],
        fallbackCurrency: 'EGP'
      },
      {
        key: 'netProfitSar',
        label: 'صافي الأرباح (الريال)',
        icon: '#custom-global',
        background: 'bg-success-50 text-success-600',
        currencyKeys: ['netProfitSarCurrencyCode'],
        fallbackCurrency: 'SAR'
      },
      {
        key: 'netProfitUsd',
        label: 'صافي الأرباح (الدولار)',
        icon: '#custom-dollar-circle',
        background: 'bg-warning-50 text-warning-600',
        currencyKeys: ['netProfitUsdCurrencyCode'],
        fallbackCurrency: 'USD'
      }
    ];

    return definitions.map((definition) => {
      const currencyCode = this.pickCurrencyCode(metrics, definition.currencyKeys, definition.fallbackCurrency);
      const rawValue = metrics ? metrics[definition.key] : undefined;
      return {
        key: definition.key,
        title: definition.label,
        icon: definition.icon,
        background: definition.background,
        value: this.formatMetricValue(rawValue, 'currency', currencyCode)
      } satisfies DashboardSummaryCard;
    });
  }

  private buildTransactionsView(transactions?: DashboardOverviewTransactionDto[] | null): DashboardTransactionView[] {
    if (!Array.isArray(transactions)) {
      return [];
    }

    return transactions.map((transaction, index) => {
      const keySource = transaction?.id ?? index;
      const key = typeof keySource === 'string' ? keySource : String(keySource ?? index);
      const amountValue = this.coerceNumber(transaction?.amount);
      const currencyCode = typeof transaction?.currency === 'string' ? transaction.currency : undefined;
      const amount = this.formatCurrency(amountValue, currencyCode ?? undefined);
      const date = this.formatTransactionDate(transaction?.date);
      const statusCode = typeof transaction?.status === 'string' ? transaction.status : undefined;
      const status = this.formatTransactionStatus(statusCode);

      return {
        key,
        student: this.formatTransactionStudent(transaction?.student, transaction?.id, index),
        amount,
        date,
        status,
        statusClass: this.getStatusClass(statusCode)
      } satisfies DashboardTransactionView;
    });
  }

  private buildMonthlyRevenueChart(monthlyRevenue?: DashboardOverviewMonthlyRevenuePointDto[] | null): void {
    const points = Array.isArray(monthlyRevenue) ? monthlyRevenue : [];
    const categories = points.map((point) => {
      const month = point?.month;
      return typeof month === 'string' ? month.trim() : '';
    });

    const seriesDefinitions = [
      { key: 'earnings', nameKey: 'الأرباح' },
      { key: 'teacherPayout', nameKey: 'مدفوعات المعلمين' },
      { key: 'managerPayout', nameKey: 'مدفوعات المديرين' },
      { key: 'netIncome', nameKey: 'صافي الدخل' }
    ] as const;

    const series: ApexAxisChartSeries = [];

    for (const definition of seriesDefinitions) {
      const hasValue = points.some((point) => this.coerceNumber(point?.[definition.key]) !== null);
      if (!hasValue) {
        continue;
      }

      const data = points.map((point) => this.coerceNumber(point?.[definition.key]) ?? 0);

      series.push({
        name: this.translate.instant(definition.nameKey),
        data
      });
    }

    this.monthlyRevenueSeries = series.length ? series : undefined;
    this.monthlyRevenueCategories = categories.some((category) => !!category) ? categories : undefined;
    this.monthlyRevenueHasData = series.length > 0;
  }

  private buildFinancialChart(metrics?: DashboardOverviewMetricsDto | null): void {
    const definitions = [
      { key: 'outgoing', label: 'الصادر', currencyKeys: ['outgoingCurrencyCode', 'currencyCode'], fallback: 'EGP' },
      { key: 'incomingEgp', label: 'الوارد (الجنيه)', currencyKeys: ['incomingEgpCurrencyCode'], fallback: 'EGP' },
      { key: 'incomingSar', label: 'الوارد (الريال)', currencyKeys: ['incomingSarCurrencyCode'], fallback: 'SAR' },
      { key: 'incomingUsd', label: 'الوارد (الدولار)', currencyKeys: ['incomingUsdCurrencyCode'], fallback: 'USD' },
      { key: 'netProfit', label: 'صافي الأرباح', currencyKeys: ['netProfitCurrencyCode', 'netIncomeCurrencyCode', 'currencyCode'] },
      { key: 'netProfitEgp', label: 'صافي الأرباح (الجنيه)', currencyKeys: ['netProfitEgpCurrencyCode'], fallback: 'EGP' },
      { key: 'netProfitSar', label: 'صافي الأرباح (الريال)', currencyKeys: ['netProfitSarCurrencyCode'], fallback: 'SAR' },
      { key: 'netProfitUsd', label: 'صافي الأرباح (الدولار)', currencyKeys: ['netProfitUsdCurrencyCode'], fallback: 'USD' }
    ];

    const data: number[] = [];
    const categories: string[] = [];
    let hasData = false;

    for (const definition of definitions) {
      const numericValue = this.coerceNumber(metrics ? metrics[definition.key] : undefined);
      const currencyCode = this.pickCurrencyCode(metrics, definition.currencyKeys, definition.fallback);
      const label = currencyCode ? `${definition.label} (${currencyCode})` : definition.label;

      categories.push(label);
      data.push(numericValue ?? 0);
      if (numericValue !== null) {
        hasData = true;
      }
    }

    this.financialChartHasData = hasData;
    this.financialChartCategories = hasData ? categories : undefined;
    this.financialChartSeries = hasData ? [{ name: 'القيمة', data }] : undefined;
  }

  private extractFirstError(errors: unknown): string | null {
    if (!Array.isArray(errors)) {
      return null;
    }

    for (const error of errors) {
      if (error && typeof error === 'object' && 'message' in error) {
        const message = (error as { message?: unknown }).message;
        if (typeof message === 'string' && message.trim()) {
          return message.trim();
        }
      }
    }

    return null;
  }

  private pickCurrencyCode(
    metrics?: DashboardOverviewMetricsDto | null,
    candidateKeys: (keyof DashboardOverviewMetricsDto | string)[] = [],
    fallbackCurrency?: string
  ): string | undefined {
    if (!metrics) {
      return fallbackCurrency;
    }

    for (const key of candidateKeys) {
      const value = metrics[key as keyof DashboardOverviewMetricsDto];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    const fallback = metrics.currencyCode;
    if (typeof fallback === 'string' && fallback.trim()) {
      return fallback.trim();
    }

    return fallbackCurrency;
  }

  private formatMetricValue(
    value: unknown,
    valueType: 'currency' | 'number',
    currencyCode?: string | null
  ): string {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    const numericValue = this.coerceNumber(value);

    if (numericValue === null) {
      return '—';
    }

    return valueType === 'currency'
      ? this.formatCurrency(numericValue, currencyCode ?? undefined)
      : this.formatNumber(numericValue);
  }

  private extractPercentageValue(value: unknown): string | null {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed ? trimmed : null;
    }

    const numericValue = this.coerceNumber(value);
    if (numericValue === null) {
      return null;
    }

    const sign = numericValue > 0 ? '+' : numericValue < 0 ? '-' : '';
    const absolute = Math.abs(numericValue);
    const fixed = absolute >= 100 ? absolute.toFixed(0) : absolute.toFixed(1);
    return `${sign}${fixed}%`;
  }

  private resolvePercentageClass(value: unknown, defaultClass: string): string {
    if (typeof value === 'number') {
      if (value > 0) {
        return 'text-success-500';
      }
      if (value < 0) {
        return 'text-warn-500';
      }
      return 'text-muted';
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return defaultClass;
      }
      if (/^-/.test(trimmed)) {
        return 'text-warn-500';
      }
      if (/^[+-]?0+(?:\.0+)?%?$/.test(trimmed)) {
        return 'text-muted';
      }
      return 'text-success-500';
    }

    return defaultClass;
  }

  private coerceNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return null;
      }

      const parsed = Number(trimmed);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return null;
  }

  private formatCurrency(value: number | null, currencyCode?: string): string {
    if (value === null) {
      return '—';
    }

    if (currencyCode) {
      try {
        return new Intl.NumberFormat('ar', {
          style: 'currency',
          currency: currencyCode,
          maximumFractionDigits: 2,
          minimumFractionDigits: value % 1 === 0 ? 0 : 2
        }).format(value);
      } catch {
        // Fallback to decimal formatting if the currency code is invalid.
      }
    }

    const options: Intl.NumberFormatOptions = {
      minimumFractionDigits: value % 1 === 0 ? 0 : 2,
      maximumFractionDigits: value % 1 === 0 ? 0 : 2
    };

    return new Intl.NumberFormat('ar', options).format(value);
  }

  private formatNumber(value: number): string {
    const hasFraction = Math.abs(value % 1) > 0;
    const options: Intl.NumberFormatOptions = {
      maximumFractionDigits: hasFraction ? 2 : 0,
      minimumFractionDigits: hasFraction ? 0 : 0
    };

    return new Intl.NumberFormat('ar', options).format(value);
  }

  private buildRangeDescription(
    rangeStart?: string | null,
    rangeEnd?: string | null,
    rangeLabel?: string | null
  ): string | null {
    const parts: string[] = [];

    if (typeof rangeLabel === 'string' && rangeLabel.trim()) {
      parts.push(rangeLabel.trim());
    }

    const start = this.formatDateOnly(rangeStart);
    const end = this.formatDateOnly(rangeEnd);
    const rangeParts = [start, end].filter((part): part is string => !!part);

    if (rangeParts.length) {
      parts.push(rangeParts.join(' – '));
    }

    if (!parts.length) {
      return null;
    }

    return parts.join(' · ');
  }

  private formatDateOnly(value?: string | null): string | null {
    if (!value) {
      return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return new Intl.DateTimeFormat('ar', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    }).format(date);
  }

  private formatTransactionDate(value?: string | null): string {
    if (!value) {
      return '—';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return new Intl.DateTimeFormat('ar', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  private formatTransactionStatus(value?: string | null): string {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';

    switch (normalized) {
      case 'completed':
        return this.translate.instant('Paid');
      case 'pending':
        return this.translate.instant('Pending');
      case 'failed':
        return this.translate.instant('Failed');
      case 'cancelled':
      case 'canceled':
        return this.translate.instant('Cancelled');
      default:
        return this.translate.instant('Unknown Status');
    }
  }

  private formatTransactionStudent(value: unknown, id: unknown, index: number): string {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    if (typeof id === 'number' || typeof id === 'string') {
      return this.translate.instant('طالب رقم {{id}}', { id });
    }

    return this.translate.instant('طالب رقم {{id}}', { id: index + 1 });
  }

  private getStatusClass(status?: string | null): string {
    const normalized = typeof status === 'string' ? status.trim().toLowerCase() : '';

    if (normalized === 'paid') {
      return 'status-pill--success';
    }

    if (normalized === 'pending') {
      return 'status-pill--warning';
    }

    if (normalized === 'failed' || normalized === 'cancelled' || normalized === 'canceled') {
      return 'status-pill--danger';
    }

    return 'status-pill--muted';
  }

  private toTitleCase(value: string): string {
    return value
      .toLowerCase()
      .split(/\s+/)
      .filter((segment) => !!segment)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ');
  }

  private formatRole(role?: string | null): string | null {
    if (typeof role !== 'string') {
      return null;
    }

    const trimmed = role.trim();
    if (!trimmed) {
      return null;
    }

    const normalizedRole = trimmed.replace(/\s+|_/g, '').toLowerCase();
    if (normalizedRole in this.roleTranslations) {
      return this.roleTranslations[normalizedRole];
    }

    const spaced = trimmed
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return this.toTitleCase(spaced);
  }

  loadUpcomingCircles(take = 4): void {
    this.upcomingLoading = true;
    this.circleService.getUpcoming(undefined, undefined, take).subscribe({
      next: (res) => {
        this.upcomingLoading = false;
        if (res.isSuccess) {
          this.upcomingCircles = res.data ?? [];
        } else {
          this.upcomingCircles = [];
          if (res.errors?.length) {
            res.errors.forEach((error) => this.toast.error(error.message));
          }
        }
      },
      error: () => {
        this.upcomingLoading = false;
        this.upcomingCircles = [];
        this.toast.error(this.translate.instant('تعذر تحميل الدورات القادمة'));
      }
    });
  }

  getUpcomingScheduleLabel(circle: UpcomingCircleDto): string {
    const primaryDay = this.resolveUpcomingPrimaryDay(circle);

    const dayLabel =
      circle.nextDayName ??
      (circle.nextDayId !== undefined && circle.nextDayId !== null
        ? formatDayValue(circle.nextDayId)
        : primaryDay
          ? formatDayValue(primaryDay.dayId)
          : '');

    let dateLabel = '';
    if (circle.nextOccurrenceDate) {
      const date = new Date(circle.nextOccurrenceDate);
      if (!Number.isNaN(date.getTime())) {
        dateLabel = date.toLocaleDateString('ar');
      }
    }

    const timeLabel = formatTimeValue(circle.startTime ?? primaryDay?.time);

    const parts = [dayLabel, dateLabel, timeLabel]
      .map((part) => (typeof part === 'string' ? part.trim() : ''))
      .filter((part) => !!part);

    return parts.join(' • ');
  }

  getUpcomingTeacherName(circle: UpcomingCircleDto): string {
    const teacher = circle.teacher;

    if (teacher && typeof teacher === 'object') {
      const lookUp = teacher as { fullName?: string; name?: string };
      if (lookUp.fullName) {
        return lookUp.fullName;
      }
      if (lookUp.name) {
        return lookUp.name;
      }
    }

    if (circle.teacherName) {
      return circle.teacherName;
    }

    if (circle.teacherId !== undefined && circle.teacherId !== null) {
      return this.translate.instant('معلم رقم {{id}}', { id: circle.teacherId });
    }

    return '';
  }

  getCircleInitials(name?: string | null): string {
    if (!name) {
      return 'ح';
    }

    const segments = name
      .split(/\s+/)
      .filter((segment) => !!segment)
      .slice(0, 2);

    const initials = segments.map((segment) => segment.charAt(0)).join('').toUpperCase();

    return initials || name.charAt(0).toUpperCase() || 'ح';
  }

  getUpcomingManagersLabel(circle: UpcomingCircleDto): string {
    const managers = circle.managers;

    if (!managers || !managers.length) {
      return '';
    }

    const names = managers
      .map((manager) => {
        if (!manager) {
          return '';
        }

        const managerValue = manager.manager;

        if (typeof managerValue === 'string') {
          return managerValue;
        }

        if (managerValue && typeof managerValue === 'object') {
          const lookUp = managerValue as { fullName?: string; name?: string };
          if (lookUp.fullName) {
            return lookUp.fullName;
          }
          if (lookUp.name) {
            return lookUp.name;
          }
        }

        if (manager.managerName) {
          return manager.managerName;
        }

        if (manager.managerId !== undefined && manager.managerId !== null) {
          return `#${manager.managerId}`;
        }

        return '';
      })
      .filter((name) => !!name);

    return names.join('، ');
  }

  private resolveUpcomingPrimaryDay(circle?: UpcomingCircleDto | null): CircleDayDto | undefined {
    if (!circle || !Array.isArray(circle.days)) {
      return undefined;
    }

    return circle.days.find((day): day is CircleDayDto => Boolean(day)) ?? undefined;
  }
}
