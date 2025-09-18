import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, effect, inject } from '@angular/core';
import { NgApexchartsModule, ApexOptions } from 'ng-apexcharts';
import { Subject, takeUntil } from 'rxjs';

import { DARK, LIGHT } from 'src/app/@theme/const';
import { ThemeLayoutService } from 'src/app/@theme/services/theme-layout.service';
import {
  DashboardService,
  SubscriberDistributionSliceDto,
  SubscriberTypeAnalyticsDto,
  SubscriberTypeBreakdownDto
} from 'src/app/core/services/dashboard.service';
import { SharedModule } from 'src/app/demo/shared/shared.module';

@Component({
  selector: 'app-apex-charts',
  imports: [CommonModule, SharedModule, NgApexchartsModule],
  templateUrl: './apex-charts.component.html',
  styleUrls: ['./apex-charts.component.scss']
})
export class ApexChartsComponent implements OnInit, OnDestroy {
  private readonly themeService: ThemeLayoutService = inject(ThemeLayoutService);
  private readonly dashboardService: DashboardService = inject(DashboardService);
  private readonly destroy$ = new Subject<void>();

  public barChart: Partial<ApexOptions> = {
    chart: {
      type: 'bar',
      height: 360,
      toolbar: {
        show: false
      }
    },
    plotOptions: {
      bar: {
        borderRadius: 6,
        columnWidth: '40%'
      }
    },
    dataLabels: {
      enabled: false
    },
    xaxis: {
      categories: []
    },
    grid: {
      strokeDashArray: 4
    },
    series: []
  };

  public pieChart: Partial<ApexOptions> = {
    chart: {
      type: 'pie',
      height: 320
    },
    dataLabels: {
      enabled: false
    },
    labels: [],
    legend: {
      position: 'bottom'
    },
    series: []
  };

  public donutChart: Partial<ApexOptions> = {
    chart: {
      type: 'donut',
      height: 320
    },
    dataLabels: {
      enabled: false
    },
    labels: [],
    legend: {
      position: 'bottom'
    },
    series: []
  };

  public preset: string[] = [];
  public pie_color: string[] = [];

  public distributionSlices: SubscriberDistributionSliceDto[] = [];
  public breakdown: SubscriberTypeBreakdownDto[] = [];
  public breakdownColumns: string[] = [];
  public totalsList: { key: string; label: string; value: number }[] = [];

  public totalSubscribers = 0;
  public uniqueSubscribers = 0;
  public newSubscribers = 0;
  public returningSubscribers = 0;

  public startDate?: string;
  public endDate?: string;

  constructor() {
    effect(() => {
      this.isDarkTheme(this.themeService.isDarkMode());
    });
  }

  ngOnInit(): void {
    this.resetColorPalette();
    this.loadAnalytics();
  }

  public getDisplayValue(item: SubscriberTypeBreakdownDto, key: string): string {
    const value = item[key];

    if (typeof value === 'number') {
      return new Intl.NumberFormat().format(value);
    }

    if (typeof value === 'string') {
      return value;
    }

    if (value == null) {
      return '-';
    }

    return String(value);
  }

  public trackByKey(_: number, item: { key: string }): string {
    return item.key;
  }

  public trackBySlice(_: number, item: SubscriberDistributionSliceDto): string {
    return item.label;
  }

  public trackByBreakdown(_: number, item: SubscriberTypeBreakdownDto): string {
    return `${item.label ?? item.type ?? item.name ?? ''}`;
  }

  private loadAnalytics(): void {
    this.dashboardService
      .getSubscribersByType(this.startDate, this.endDate)
      .pipe(takeUntil(this.destroy$))
      .subscribe((response) => {
        this.applyAnalytics(response);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  private applyAnalytics(data: SubscriberTypeAnalyticsDto): void {
    const subscribersByType = data?.subscribersByType ?? {};
    const distributionSlices = data?.distribution?.slices ?? [];
    const breakdown = data?.breakdown ?? [];

    this.barChart = {
      ...this.barChart,
      chart: subscribersByType.chart ?? this.barChart.chart,
      xaxis: subscribersByType.xaxis ?? this.barChart.xaxis,
      series: subscribersByType.series ?? []
    };

    this.distributionSlices = distributionSlices;

    const pieLabels = distributionSlices.map((slice) => slice.label);
    const pieSeries = distributionSlices.map((slice) => slice.value);
    const pieColors = distributionSlices.map((slice, index) =>
      slice.color ?? this.getDefaultPieColor(index)
    );

    this.pieChart = {
      ...this.pieChart,
      labels: pieLabels,
      series: pieSeries
    };

    this.donutChart = {
      ...this.donutChart,
      labels: pieLabels,
      series: pieSeries
    };

    this.pie_color = pieColors.length ? pieColors : [...this.pie_color];

    this.breakdown = breakdown;
    this.updateBreakdownColumns(breakdown);
    this.updateTotals(data);
  }

  private updateBreakdownColumns(breakdown: SubscriberTypeBreakdownDto[]): void {
    if (!breakdown?.length) {
      this.breakdownColumns = [];
      return;
    }

    const uniqueKeys = new Set<string>();
    breakdown.forEach((item) => {
      Object.keys(item ?? {}).forEach((key) => uniqueKeys.add(key));
    });

    const ordered: string[] = [];
    const labelKey = ['label', 'type', 'name'].find((key) => uniqueKeys.has(key));

    if (labelKey) {
      ordered.push(labelKey);
      uniqueKeys.delete(labelKey);
    }

    const remaining = Array.from(uniqueKeys).sort((a, b) => a.localeCompare(b));

    this.breakdownColumns = [...ordered, ...remaining];
  }

  private updateTotals(data: SubscriberTypeAnalyticsDto): void {
    const totals: Record<string, number> = {};
    const predefinedTotals: Record<string, unknown> = {
      ...data?.totals,
      totalSubscribers: data?.totalSubscribers,
      uniqueSubscribers: data?.uniqueSubscribers,
      newSubscribers: data?.newSubscribers,
      returningSubscribers: data?.returningSubscribers,
      activeSubscribers: data?.activeSubscribers,
      inactiveSubscribers: data?.inactiveSubscribers,
      churnedSubscribers: data?.churnedSubscribers
    };

    Object.entries(predefinedTotals).forEach(([key, value]) => {
      if (typeof value === 'number' && !Number.isNaN(value)) {
        totals[key] = value;
      }
    });

    this.totalsList = Object.entries(totals).map(([key, value]) => ({
      key,
      label: this.toDisplayLabel(key),
      value
    }));

    this.totalSubscribers = totals['totalSubscribers'] ?? 0;
    this.uniqueSubscribers = totals['uniqueSubscribers'] ?? 0;
    this.newSubscribers = totals['newSubscribers'] ?? 0;
    this.returningSubscribers = totals['returningSubscribers'] ?? 0;
  }

  private resetColorPalette(): void {
    const defaultPalette = ['#0050B3', 'var(--primary-500)', '#52C41A', '#FF4D4F', '#FAAD14'];
    this.preset = ['#0050B3', 'var(--primary-500)', '#52C41A'];
    this.pie_color = [...defaultPalette];
  }

  private getDefaultPieColor(index: number): string {
    const palette = ['#0050B3', 'var(--primary-500)', '#52C41A', '#FF4D4F', '#FAAD14'];
    return palette[index % palette.length];
  }

  protected toDisplayLabel(key: string): string {
    if (!key) {
      return key;
    }

    const spaced = key
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/_/g, ' ')
      .trim();

    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
  }

  private isDarkTheme(isDark: string): void {
    const tooltipTheme = isDark === DARK ? DARK : LIGHT;
    const tooltip = { theme: tooltipTheme };

    this.barChart = { ...this.barChart, tooltip };
    this.pieChart = { ...this.pieChart, tooltip };
    this.donutChart = { ...this.donutChart, tooltip };
  }
}
