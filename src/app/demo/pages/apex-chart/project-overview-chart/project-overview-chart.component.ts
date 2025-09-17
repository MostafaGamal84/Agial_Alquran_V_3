// angular import
import { Component, OnInit, effect, inject } from '@angular/core';

// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';
import { ThemeLayoutService } from 'src/app/@theme/services/theme-layout.service';

// third party
import { NgApexchartsModule, ApexAxisChartSeries, ApexOptions } from 'ng-apexcharts';

// const
import { DARK, LIGHT } from 'src/app/@theme/const';
import { ChartSeriesDto, DashboardService, RepeatCustomersDto } from 'src/app/@theme/services/dashboard.service';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { ApiError } from 'src/app/@theme/services/lookup.service';

@Component({
  selector: 'app-project-overview-chart',
  imports: [SharedModule, NgApexchartsModule],
  templateUrl: './project-overview-chart.component.html',
  styleUrl: './project-overview-chart.component.scss'
})
export class ProjectOverviewChartComponent implements OnInit {
  private themeService = inject(ThemeLayoutService);
  private dashboardService = inject(DashboardService);
  private toast = inject(ToastService);

  chartOptions: Partial<ApexOptions>;
  currentRate = 0;
  previousRate = 0;
  percentChange = 0;
  readonly months = 6;

  constructor() {
    effect(() => {
      this.applyTheme(this.themeService.isDarkMode());
    });
  }

  ngOnInit(): void {
    this.chartOptions = this.createBaseOptions();
    this.loadRepeatCustomers();
  }

  get changeBadgeClass(): string {
    return this.percentChange >= 0 ? 'user-status bg-success-500 text-white' : 'user-status bg-warn-500 text-white';
  }

  get changeText(): string {
    const formatter = new Intl.NumberFormat(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    const sign = this.percentChange > 0 ? '+' : this.percentChange < 0 ? '−' : '';
    return `${sign}${formatter.format(Math.abs(this.percentChange))}%`;
  }

  get currentRateText(): string {
    return this.formatPercent(this.currentRate);
  }

  get previousRateText(): string {
    return this.formatPercent(this.previousRate);
  }

  private loadRepeatCustomers(): void {
    this.dashboardService.getRepeatCustomers(this.months).subscribe({
      next: (response) => {
        if (response.isSuccess && response.data) {
          this.applyRepeatCustomerData(response.data);
        } else {
          this.handleError(response.errors, 'Failed to load repeat customer data.');
        }
      },
      error: () => this.handleError(undefined, 'Failed to load repeat customer data.')
    });
  }

  private applyRepeatCustomerData(data: RepeatCustomersDto): void {
    const categories = data.chart?.categories ?? [];
    const series = this.toApexSeries(data.chart?.series);
    this.chartOptions = {
      ...this.chartOptions,
      series,
      xaxis: {
        ...(this.chartOptions.xaxis ?? {}),
        categories,
        axisBorder: { show: false },
        axisTicks: { show: false }
      }
    };
    this.currentRate = data.currentRate ?? 0;
    this.previousRate = data.previousRate ?? 0;
    this.percentChange = data.percentChange ?? 0;
  }

  private toApexSeries(series: ChartSeriesDto[] | undefined): ApexAxisChartSeries {
    if (!series) {
      return [];
    }
    return series.map((item) => ({
      name: item.name,
      type: item.type,
      data: item.data ?? []
    }));
  }
  private createBaseOptions(): Partial<ApexOptions> {
    return {
      chart: {
        type: 'line',
        height: 320,
        background: 'transparent',
        toolbar: { show: false }
      },
      stroke: { curve: 'smooth', width: 3 },
      dataLabels: { enabled: false },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          type: 'vertical',
          opacityFrom: 0.15,
          opacityTo: 0,
          inverseColors: false
        }
      },
      series: [],
      colors: ['var(--primary-500)'],
      grid: {
        show: true,
        borderColor: '#F3F5F7',
        strokeDashArray: 2
      },
      xaxis: {
        categories: [],
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        labels: {
          formatter(value: number) {
            return `${value}%`;
          }
        }
      },
      tooltip: {
        theme: LIGHT,
        y: {
          formatter(value: number) {
            return `${value}%`;
          }
        }
      },
      theme: {
        mode: LIGHT
      }
    };
  }

  private applyTheme(isDark: string) {
    if (!this.chartOptions) {
      return;
    }
    const theme = { ...this.chartOptions.theme };
    const tooltip = { ...this.chartOptions.tooltip };
    const mode = isDark === DARK ? DARK : LIGHT;
    if (theme) {
      theme.mode = mode;
    }
    if (tooltip) {
      tooltip.theme = mode;
    }
    this.chartOptions = { ...this.chartOptions, theme, tooltip };
  }

  private formatPercent(value: number): string {
    const formatter = new Intl.NumberFormat(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    return `${formatter.format(value)}%`;
  }

  private handleError(errors: ApiError[] | undefined, fallback: string): void {
    const message = errors && errors.length > 0 ? errors.map((err) => err.message).join('\n') : fallback;
    this.toast.error(message);
  }
}
