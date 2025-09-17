// angular import
import { Component, OnInit, effect, inject } from '@angular/core';

// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';
import { ThemeLayoutService } from 'src/app/@theme/services/theme-layout.service';

// third party
import { NgApexchartsModule, ApexAxisChartSeries, ApexOptions } from 'ng-apexcharts';

// const
import { DARK, LIGHT } from 'src/app/@theme/const';
import { ChartSeriesDto, DashboardService, MonthlyRevenueDto, MonthlyRevenueTotalsDto } from 'src/app/@theme/services/dashboard.service';

import { ToastService } from 'src/app/@theme/services/toast.service';
import { ApiError } from 'src/app/@theme/services/lookup.service';

@Component({
  selector: 'app-revenue-chart',
  imports: [SharedModule, NgApexchartsModule],
  templateUrl: './revenue-chart.component.html',
  styleUrl: './revenue-chart.component.scss'
})
export class RevenueChartComponent implements OnInit {
  private themeService = inject(ThemeLayoutService);
  private dashboardService = inject(DashboardService);
  private toast = inject(ToastService);

  chartOptions: Partial<ApexOptions>;
  totals: MonthlyRevenueTotalsDto = {};
  readonly defaultColors = ['var(--primary-500)', '#6366F1', '#F97316', '#059669'];
  private readonly months = 6;

  constructor() {
    effect(() => {
      this.applyTheme(this.themeService.isDarkMode());
    });
  }

  ngOnInit() {
    this.chartOptions = this.createBaseOptions();
    this.loadMonthlyRevenue();
  }

  formatTotal(value?: number): string {
    return this.formatCurrency(value, this.totals.currencyCode);
  }

  private loadMonthlyRevenue(): void {
    this.dashboardService.getMonthlyRevenue(this.months).subscribe({
      next: (response) => {
        if (response.isSuccess && response.data) {
          this.updateChart(response.data);
        } else {
          this.handleError(response.errors, 'Failed to load monthly revenue.');
        }
      },
      error: () => this.handleError(undefined, 'Failed to load monthly revenue.')
    });
  }

  private updateChart(data: MonthlyRevenueDto): void {
    const categories = data.chart?.categories ?? [];
    const series = this.toApexSeries(data.chart?.series);
    const colors = this.resolveColors(series);
    this.chartOptions = {
      ...this.chartOptions,
      series,

      colors,
      xaxis: {
        ...(this.chartOptions.xaxis ?? {}),
        categories,
        axisBorder: { show: false },
        axisTicks: { show: false }
      }
    };
    this.totals = data.totals ?? {};
  }

  private createBaseOptions(): Partial<ApexOptions> {
    return {
      chart: {
        fontFamily: 'Cairo, sans-serif',
        type: 'line',
        height: 320,
        background: 'transparent',
        toolbar: {
          show: false
        }
      },
      stroke: { curve: 'smooth', width: 3 },
      dataLabels: { enabled: false },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          type: 'vertical',
          inverseColors: false,
          opacityFrom: 0.2,
          opacityTo: 0
        }
      },
      plotOptions: {
        bar: {
          columnWidth: '45%',
          borderRadius: 4
        }
      },
      grid: {
        show: true,
        borderColor: '#F3F5F7',
        strokeDashArray: 2
      },
      series: [],
      colors: this.defaultColors,
      xaxis: {
        categories: [],
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      theme: {
        mode: LIGHT
      }
    };
  }

  private applyTheme(isDark: string) {
    if (!this.chartOptions?.theme) {
      return;
    }
    const theme = { ...this.chartOptions.theme };
    theme.mode = isDark === DARK ? DARK : LIGHT;
    this.chartOptions = { ...this.chartOptions, theme };
  }

  private resolveColors(series: ApexAxisChartSeries): string[] {

    if (!series || series.length === 0) {
      return this.defaultColors;
    }
    return series.map((_, index) => this.defaultColors[index] ?? this.defaultColors[0]);
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


  private formatCurrency(value?: number, currencyCode?: string): string {
    if (value === undefined || value === null) {
      return '—';
    }
    const code = currencyCode ?? 'USD';
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: code,
        maximumFractionDigits: 0
      }).format(value);
    } catch {
      return `${code} ${new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value)}`;
    }
  }

  private handleError(errors: ApiError[] | undefined, fallback: string): void {
    const message = errors && errors.length > 0 ? errors.map((err) => err.message).join('\n') : fallback;
    this.toast.error(message);
  }
}
