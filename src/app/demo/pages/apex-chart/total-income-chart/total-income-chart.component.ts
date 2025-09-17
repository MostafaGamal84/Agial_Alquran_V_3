// angular import
import { Component, OnInit, inject } from '@angular/core';

// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';
import { DashboardService, RevenueByCurrencyDto, RevenueByCurrencySliceDto } from 'src/app/@theme/services/dashboard.service';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { ApiError } from 'src/app/@theme/services/lookup.service';

// third party
import { NgApexchartsModule, ApexOptions } from 'ng-apexcharts';

@Component({
  selector: 'app-total-income-chart',
  imports: [SharedModule, NgApexchartsModule],
  templateUrl: './total-income-chart.component.html',
  styleUrl: './total-income-chart.component.scss'
})
export class TotalIncomeChartComponent implements OnInit {
  private dashboardService = inject(DashboardService);
  private toast = inject(ToastService);

  chartOptions: Partial<ApexOptions>;
  slices: RevenueByCurrencySliceDto[] = [];
  readonly incomeColors = ['var(--primary-500)', '#F97316', '#059669', '#6366F1'];

  ngOnInit(): void {
    this.chartOptions = this.createBaseOptions();
    const { start, end } = this.getDefaultRange();
    this.loadRevenueByCurrency(start, end);
  }

  formatValue(slice: RevenueByCurrencySliceDto): string {
    return this.formatCurrency(slice.value, slice.currencyCode ?? slice.label);
  }

  formatPercentage(value: number): string {
    return `${new Intl.NumberFormat(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value)}%`;
  }

  private loadRevenueByCurrency(startDate: string, endDate: string): void {
    this.dashboardService.getRevenueByCurrency(startDate, endDate).subscribe({
      next: (response) => {
        if (response.isSuccess && response.data) {
          this.applySlices(response.data);
        } else {
          this.handleError(response.errors, 'Failed to load revenue by currency.');
        }
      },
      error: () => this.handleError(undefined, 'Failed to load revenue by currency.')
    });
  }

  private applySlices(data: RevenueByCurrencyDto): void {
    this.slices = data.slices ?? [];
    const series = this.slices.map((slice) => slice.value);
    const labels = this.slices.map((slice) => slice.label);
    this.chartOptions = {
      ...this.chartOptions,
      series,
      labels,
      colors: this.resolveColors(labels.length)
    };
  }

  private createBaseOptions(): Partial<ApexOptions> {
    return {
      chart: {
        height: 320,
        type: 'donut'
      },
      series: [],
      labels: [],
      colors: this.incomeColors,
      fill: {
        opacity: [1, 1, 1, 0.3]
      },
      legend: {
        show: false
      },
      plotOptions: {
        pie: {
          donut: {
            size: '65%',
            labels: {
              show: true,
              name: {
                show: true
              },
              value: {
                show: true,
                formatter: (value: string) => {
                  const numericValue = Number(value);
                  if (Number.isNaN(numericValue)) {
                    return value;
                  }
                  return new Intl.NumberFormat(undefined, {
                    maximumFractionDigits: 0
                  }).format(numericValue);
                }
              }
            }
          }
        }
      },
      dataLabels: {
        enabled: false
      },
      responsive: [
        {
          breakpoint: 575,
          options: {
            chart: {
              height: 250
            },
            plotOptions: {
              pie: {
                donut: {
                  size: '65%',
                  labels: {
                    show: false
                  }
                }
              }
            }
          }
        }
      ]
    };
  }

  private resolveColors(length: number): string[] {
    if (length <= this.incomeColors.length) {
      return this.incomeColors.slice(0, length);
    }
    const colors: string[] = [];
    for (let i = 0; i < length; i += 1) {
      colors.push(this.incomeColors[i % this.incomeColors.length]);
    }
    return colors;
  }

  private getDefaultRange(): { start: string; end: string } {
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth(), 1);
    return {
      start: this.formatDate(start),
      end: this.formatDate(end)
    };
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatCurrency(value: number, currencyCode: string): string {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currencyCode,
        maximumFractionDigits: 0
      }).format(value);
    } catch {
      return `${currencyCode} ${new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value)}`;
    }
  }

  getSliceColor(index: number): string {
    const colors = (this.chartOptions.colors as string[] | undefined) ?? this.incomeColors;
    if (!colors || colors.length === 0) {
      return this.incomeColors[index % this.incomeColors.length];
    }
    return colors[index % colors.length];
  }

  private handleError(errors: ApiError[] | undefined, fallback: string): void {
    const message = errors && errors.length > 0 ? errors.map((err) => err.message).join('\n') : fallback;
    this.toast.error(message);
  }
}
