// angular import
import { Component, OnInit, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';

// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';
import {
  DashboardService,
  SubscribeTypeBreakdownDto,
  SubscribeTypeDistributionSliceDto,
  SubscribeTypeStatisticsDto
} from 'src/app/@theme/services/dashboard.service';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { ApiError } from 'src/app/@theme/services/lookup.service';

// third party
import { NgApexchartsModule, ApexOptions } from 'ng-apexcharts';

@Component({
  selector: 'app-overview-product-chart',
  imports: [SharedModule, NgApexchartsModule, DecimalPipe],
  templateUrl: './overview-product-chart.component.html',
  styleUrl: './overview-product-chart.component.scss'
})
export class OverviewProductChartComponent implements OnInit {
  private dashboardService = inject(DashboardService);
  private toast = inject(ToastService);

  chartOptions: Partial<ApexOptions> = this.createBaseOptions();
  breakdown: SubscribeTypeBreakdownDto[] = [];
  totalSubscribers = 0;
  uniqueSubscribers = 0;
  totalSubscriptionTypes = 0;

  readonly chartColors = ['var(--primary-500)', '#F97316', '#10B981', '#6366F1', '#F59E0B', '#EF4444'];

  ngOnInit(): void {
    this.loadSubscribeTypeStatistics();
  }

  getSliceColor(index: number): string {
    const colors = (this.chartOptions.colors as string[] | undefined) ?? this.chartColors;
    if (!colors || colors.length === 0) {
      return this.chartColors[index % this.chartColors.length];
    }
    return colors[index % colors.length];
  }

  private loadSubscribeTypeStatistics(): void {
    this.dashboardService.getSubscribeTypeStatistics().subscribe({
      next: (response) => {
        if (response.isSuccess && response.data) {
          this.applyStatistics(response.data);
        } else {
          this.handleError(response.errors, 'Failed to load subscriber type statistics.');
        }
      },
      error: () => this.handleError(undefined, 'Failed to load subscriber type statistics.')
    });
  }

  private applyStatistics(data: SubscribeTypeStatisticsDto): void {
    const slices = data.distribution?.slices ?? [];
    const series = slices.map((slice) => slice.value ?? 0);
    const labels = slices.map((slice, index) => this.resolveLabel(slice, index));

    this.chartOptions = {
      ...this.chartOptions,
      series,
      labels,
      colors: this.resolveColors(labels.length)
    };

    this.breakdown = this.combineBreakdown(data.breakdown, slices, data.totalSubscribers ?? data.distribution?.totalValue);
    this.totalSubscribers = data.totalSubscribers ?? data.distribution?.totalValue ?? 0;
    this.uniqueSubscribers = data.uniqueSubscribers ?? 0;
    this.totalSubscriptionTypes = data.totalSubscriptionTypes ?? labels.length;
  }

  private combineBreakdown(
    breakdown: SubscribeTypeBreakdownDto[] | undefined,
    slices: SubscribeTypeDistributionSliceDto[],
    total?: number
  ): SubscribeTypeBreakdownDto[] {
    if (slices.length === 0) {
      return breakdown ?? [];
    }

    const map = new Map<string, SubscribeTypeBreakdownDto>();
    (breakdown ?? []).forEach((item) => {
      const key = (item.typeName ?? '').toLowerCase();
      if (key) {
        map.set(key, item);
      }
    });

    const usedKeys = new Set<string>();
    const combined = slices.map((slice, index) => {
      const label = this.resolveLabel(slice, index);
      const key = label.toLowerCase();
      const matched = map.get(key);
      usedKeys.add(key);
      return {
        subscribeTypeId: matched?.subscribeTypeId,
        typeName: matched?.typeName ?? label,
        subscriberCount: matched?.subscriberCount ?? slice.value ?? 0,
        percentage: matched?.percentage ?? slice.percentage ?? this.calculatePercentage(slice.value ?? 0, total)
      } satisfies SubscribeTypeBreakdownDto;
    });

    (breakdown ?? []).forEach((item) => {
      const key = (item.typeName ?? '').toLowerCase();
      if (!key || usedKeys.has(key)) {
        return;
      }
      combined.push({
        subscribeTypeId: item.subscribeTypeId,
        typeName: item.typeName ?? this.toFallbackLabel(combined.length),
        subscriberCount: item.subscriberCount ?? 0,
        percentage: item.percentage ?? this.calculatePercentage(item.subscriberCount ?? 0, total)
      });
    });

    return combined;
  }

  private resolveLabel(slice: SubscribeTypeDistributionSliceDto, index: number): string {
    return slice.label && slice.label.trim().length > 0 ? slice.label : this.toFallbackLabel(index);
  }

  private toFallbackLabel(index: number): string {
    return `Type ${index + 1}`;
  }

  private calculatePercentage(value: number, total?: number): number {
    if (!total || total <= 0) {
      return 0;
    }
    return (value / total) * 100;
  }

  private resolveColors(length: number): string[] {
    if (length <= this.chartColors.length) {
      return this.chartColors.slice(0, length);
    }
    const colors: string[] = [];
    for (let index = 0; index < length; index += 1) {
      colors.push(this.chartColors[index % this.chartColors.length]);
    }
    return colors;
  }

  private createBaseOptions(): Partial<ApexOptions> {
    return {
      chart: {
        height: 350,
        type: 'pie'
      },
      labels: [],
      series: [],
      colors: this.chartColors,
      fill: {
        opacity: [1, 1, 0.8, 0.7, 0.6, 0.5]
      },
      legend: {
        show: false
      },
      dataLabels: {
        enabled: true,
        dropShadow: {
          enabled: false
        }
      },
      responsive: [
        {
          breakpoint: 575,
          options: {
            chart: {
              height: 250
            },
            dataLabels: {
              enabled: false
            }
          }
        }
      ]
    };
  }

  private handleError(errors: ApiError[] | undefined, fallback: string): void {
    const message = errors && errors.length > 0 ? errors.map((error) => error.message).join('\n') : fallback;
    this.toast.error(message);
  }
}
