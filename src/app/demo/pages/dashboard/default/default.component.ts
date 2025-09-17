// angular import
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';
import { EarningChartComponent } from '../../apex-chart/earning-chart/earning-chart.component';
import { RevenueChartComponent } from '../../apex-chart/revenue-chart/revenue-chart.component';
import { ProjectOverviewChartComponent } from '../../apex-chart/project-overview-chart/project-overview-chart.component';
import { TotalIncomeChartComponent } from '../../apex-chart/total-income-chart/total-income-chart.component';

// service
import { BuyNowLinkService } from 'src/app/@theme/services/buy-now-link.service';
import { DashboardService, DashboardMetricDto } from 'src/app/@theme/services/dashboard.service';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { ApiError } from 'src/app/@theme/services/lookup.service';

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
  selector: 'app-default',
  imports: [
    CommonModule,
    SharedModule,
    TotalIncomeChartComponent,
    ProjectOverviewChartComponent,
    EarningChartComponent,
    RevenueChartComponent
  ],
  templateUrl: './default.component.html',
  styleUrls: ['../dashboard.scss', './default.component.scss']
})
export class DefaultComponent implements OnInit {
  private dashboardService = inject(DashboardService);
  private toast = inject(ToastService);
  buyNowLinkService = inject(BuyNowLinkService);

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

  project = [
    {
      title: 'Invoice Generator'
    },
    {
      title: 'Package Upgrades'
    },
    {
      title: 'Figma Auto Layout'
    },
    {
      title: 'Package Upgrades'
    }
  ];

  List_transaction = [
    {
      icon: 'AI',
      name: 'Apple Inc.',
      time: '#ABLE-PRO-T00232',
      amount: '$210,000',
      amount_position: 'ti ti-arrow-down-left',
      percentage: '10.6%',
      amount_type: 'text-warn-500'
    },
    {
      icon: 'SM',
      tooltip: '10,000 Tracks',
      name: 'Spotify Music',
      time: '#ABLE-PRO-T10232',
      amount: '- 10,000',
      amount_position: 'ti ti-arrow-up-right',
      percentage: '30.6%',
      amount_type: 'text-success-500'
    },
    {
      icon: 'MD',
      bg: 'text-primary-500 bg-primary-50',
      tooltip: '143 Posts',
      name: 'Medium',
      time: '06:30 pm',
      amount: '-26',
      amount_position: 'ti ti-arrows-left-right',
      percentage: '5%',
      amount_type: 'text-warning-500'
    },
    {
      icon: 'U',
      tooltip: '143 Posts',
      name: 'Uber',
      time: '08:40 pm',
      amount: '+210,000',
      amount_position: 'ti ti-arrow-up-right',
      percentage: '10.6%',
      amount_type: 'text-success-500'
    },
    {
      icon: 'OC',
      bg: 'text-warning-500 bg-warning-50',
      tooltip: '143 Posts',
      name: 'Ola Cabs',
      time: '07:40 pm',
      amount: '+210,000',
      amount_position: 'ti ti-arrow-up-right',
      percentage: '10.6%',
      amount_type: 'text-success-500'
    }
  ];

  ngOnInit(): void {
    this.loadSummary();
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
}
