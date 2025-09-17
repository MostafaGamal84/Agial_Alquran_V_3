// angular import
import { Component, OnInit, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';
import { ChartDB } from 'src/app/fake-data/chartDB';
import { ThemeLayoutService } from 'src/app/@theme/services/theme-layout.service';
import { DashboardService, DashboardMetricDto } from 'src/app/@theme/services/dashboard.service';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { ApiError } from 'src/app/@theme/services/lookup.service';
import { EarningChartComponent } from '../../apex-chart/earning-chart/earning-chart.component';
import { NewOrderChartComponent } from '../../apex-chart/new-order-chart/new-order-chart.component';
import { NewUserChartComponent } from '../../apex-chart/new-user-chart/new-user-chart.component';
import { VisitorsChartComponent } from '../../apex-chart/visitors-chart/visitors-chart.component';
import { MonthlyOverviewChartComponent } from '../../apex-chart/monthly-overview-chart/monthly-overview-chart.component';
import { IncomeChartComponent } from '../../apex-chart/income-chart/income-chart.component';
import { LanguagesSupportChartComponent } from '../../apex-chart/languages-support-chart/languages-support-chart.component';
import { ProjectOverviewChartComponent } from '../../apex-chart/project-overview-chart/project-overview-chart.component';
import { OverviewProductChartComponent } from '../../apex-chart/overview-product-chart/overview-product-chart.component';
import { TotalIncomeChartComponent } from '../../apex-chart/total-income-chart/total-income-chart.component';
import { TotalEarningChartComponent } from '../../apex-chart/total-earning-chart/total-earning-chart.component';

// const
import { DARK, LIGHT } from 'src/app/@theme/const';

// third party
import { NgApexchartsModule, ApexOptions } from 'ng-apexcharts';

interface SummaryCardViewModel {
  key: string;
  headerTitle: string;
  iconImage: string;
  background: string;
  textColor: string;
  color: string;
  earningValue: string;
  percentageValue: string;
  data: number[];
  trendColor?: string;
  trendIcon?: string;
}

@Component({
  selector: 'app-chart',
  imports: [
    CommonModule,
    SharedModule,
    NgApexchartsModule,
    LanguagesSupportChartComponent,
    EarningChartComponent,
    NewOrderChartComponent,
    IncomeChartComponent,
    NewUserChartComponent,
    VisitorsChartComponent,
    MonthlyOverviewChartComponent,
    ProjectOverviewChartComponent,
    OverviewProductChartComponent,
    TotalIncomeChartComponent,
    TotalEarningChartComponent
  ],
  templateUrl: './chart.component.html',
  styleUrls: ['./chart.component.scss']
})
export class WidgetChartComponent implements OnInit {
  private dashboardService = inject(DashboardService);
  private toast = inject(ToastService);
  themeService = inject(ThemeLayoutService);

  // public props
  customerRateChart: Partial<ApexOptions>;
  monthlyReportChart: Partial<ApexOptions>;
  salesReportChart: Partial<ApexOptions>;
  acquisitionChart: Partial<ApexOptions>;

  summaryCards: SummaryCardViewModel[] = [
    {
      key: 'earnings',
      headerTitle: 'All Earnings',
      iconImage: '#wallet-2',
      background: 'bg-primary-50',
      textColor: 'text-primary-500',
      color: 'var(--primary-500)',
      earningValue: '—',
      percentageValue: '—',
      data: []
    },
    {
      key: 'newStudents',
      headerTitle: 'New Students',
      iconImage: '#book',
      background: 'bg-warning-50',
      textColor: 'text-warning-500',
      color: 'var(--warning-500)',
      earningValue: '—',
      percentageValue: '—',
      data: []
    },
    {
      key: 'circleReports',
      headerTitle: 'Circle Reports',
      iconImage: '#calendar',
      background: 'bg-success-50',
      textColor: 'text-success-500',
      color: 'var(--success-500)',
      earningValue: '—',
      percentageValue: '—',
      data: []
    },
    {
      key: 'netIncome',
      headerTitle: 'Net Income',
      iconImage: '#coludChange',
      background: 'bg-warn-50',
      textColor: 'text-warn-500',
      color: 'var(--warn-500)',
      earningValue: '—',
      percentageValue: '—',
      data: []
    }
  ];

  preset = ['var(--primary-500)'];
  salesReportColor = ['#E58A00', 'var(--primary-500)'];
  // eslint-disable-next-line
  chartDB: any;

  // constructor
  constructor() {
    this.chartDB = ChartDB;
    const { customerRateChart, monthlyReportChart, salesReportChart, acquisitionChart } = this.chartDB;
    this.customerRateChart = customerRateChart;
    this.monthlyReportChart = monthlyReportChart;
    this.salesReportChart = salesReportChart;
    this.acquisitionChart = acquisitionChart;
    effect(() => {
      this.isDarkTheme(this.themeService.isDarkMode());
    });
  }

  ngOnInit(): void {
    this.loadSummary();
  }

  private isDarkTheme(isDarkMode: string) {
    const tooltip = {
      ...this.customerRateChart.tooltip,
      ...this.monthlyReportChart.tooltip,
      ...this.salesReportChart.tooltip,
      ...this.acquisitionChart.tooltip
    };
    tooltip.theme = isDarkMode === DARK ? DARK : LIGHT;
    this.customerRateChart = { ...this.customerRateChart, tooltip };
    this.monthlyReportChart = { ...this.monthlyReportChart, tooltip };
    this.salesReportChart = { ...this.salesReportChart, tooltip };
    this.acquisitionChart = { ...this.acquisitionChart, tooltip };
  }

  private loadSummary(): void {
    this.dashboardService.getSummary().subscribe({
      next: (response) => {
        if (response.isSuccess && response.data?.metrics) {
          const metrics = this.toMetricMap(response.data.metrics);
          this.summaryCards = this.summaryCards.map((card) => {
            const metric = metrics.get(card.key);
            if (!metric) {
              return {
                ...card,
                earningValue: '—',
                percentageValue: '—',
                data: [],
                trendColor: card.textColor,
                trendIcon: 'ti ti-arrow-up-right'
              };
            }

            const percent = this.formatPercent(metric.percentChange);
            const isPositive = (metric.percentChange ?? 0) >= 0;
            return {
              ...card,
              earningValue: this.formatValue(metric.value, metric.valueType, metric.currencyCode),
              percentageValue: percent,
              data: this.resolveTrend(metric),
              trendColor: isPositive ? 'text-success-500' : 'text-warn-500',
              trendIcon: isPositive ? 'ti ti-arrow-up-right' : 'ti ti-arrow-down-right'
            };
          });
        } else {
          this.handleError(response.errors, 'Failed to load dashboard summary.');
        }
      },
      error: () => this.handleError(undefined, 'Failed to load dashboard summary.')
    });
  }

  private toMetricMap(
    metrics: DashboardMetricDto[] | Record<string, DashboardMetricDto>
  ): Map<string, DashboardMetricDto> {
    if (Array.isArray(metrics)) {
      return new Map(metrics.filter((metric) => !!metric?.key).map((metric) => [metric.key, metric]));
    }
    return new Map(Object.entries(metrics ?? {}));
  }

  private resolveTrend(metric: DashboardMetricDto | undefined): number[] {
    if (!metric) {
      return [];
    }
    if (Array.isArray(metric.trend) && metric.trend.length > 0) {
      return metric.trend;
    }
    const previous = metric.previousValue ?? 0;
    const current = metric.value ?? 0;
    return [previous, current];
  }

  private formatValue(value?: number, valueType?: string, currencyCode?: string): string {
    if (value === undefined || value === null) {
      return '—';
    }
    if (valueType && valueType.toLowerCase() === 'currency') {
      const code = currencyCode ?? 'USD';
      try {
        return new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency: code,
          maximumFractionDigits: 0
        }).format(value);
      } catch {
        return `${code} ${this.formatNumber(value)}`;
      }
    }
    return this.formatNumber(value);
  }

  private formatNumber(value: number): string {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
  }

  private formatPercent(value?: number): string {
    if (value === undefined || value === null) {
      return '—';
    }
    const formatter = new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
    const sign = value > 0 ? '+' : value < 0 ? '−' : '';
    return `${sign}${formatter.format(Math.abs(value))}%`;
  }

  private handleError(errors: ApiError[] | undefined, fallback: string): void {
    const message = errors && errors.length > 0 ? errors.map((err) => err.message).join('\n') : fallback;
    this.toast.error(message);
  }

  // public method
  acquisition = [
    {
      title: 'Top Channels',
      icon: 'ti ti-device-analytics',
      time: 'Today, 2:00 AM',
      background: 'bg-accent-200'
    },
    {
      title: 'Top pages',
      icon: 'ti ti-file-text',
      time: 'Today 6:00 AM',
      background: 'bg-primary-50 text-primary-500'
    }
  ];
}
