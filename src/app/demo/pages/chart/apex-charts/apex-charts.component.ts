// angular import
import { Component, OnInit, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';
import { ChartDB } from 'src/app/fake-data/chartDB';
import { ThemeLayoutService } from 'src/app/@theme/services/theme-layout.service';

// const
import { DARK, LIGHT } from 'src/app/@theme/const';

// third party
import { NgApexchartsModule, ApexOptions } from 'ng-apexcharts';

@Component({
  selector: 'app-apex-charts',
  imports: [CommonModule, SharedModule, NgApexchartsModule],
  templateUrl: './apex-charts.component.html',
  styleUrls: ['./apex-charts.component.scss']
})
export class ApexChartsComponent implements OnInit {
  private themeService = inject(ThemeLayoutService);

  // public props
  barChart: Partial<ApexOptions>;
  barStackedChart: Partial<ApexOptions>;
  barHorizontalChart: Partial<ApexOptions>;
  barHStackChart: Partial<ApexOptions>;
  pieChart: Partial<ApexOptions>;
  donutChart: Partial<ApexOptions>;
  radialChart: Partial<ApexOptions>;
  customsAngleChart: Partial<ApexOptions>;
  lineChart: Partial<ApexOptions>;
  realTimeChart: Partial<ApexOptions>;
  areaChart: Partial<ApexOptions>;
  dateTimeChart: Partial<ApexOptions>;
  mixedChart: Partial<ApexOptions>;
  lineAreaChart: Partial<ApexOptions>;
  candlestickChart: Partial<ApexOptions>;
  bubbleChart: Partial<ApexOptions>;
  bubble3DChart: Partial<ApexOptions>;
  scatterChart: Partial<ApexOptions>;
  scatterDateTimeChart: Partial<ApexOptions>;
  heatmapChart: Partial<ApexOptions>;
  heatmapRoundedChart: Partial<ApexOptions>;
  // eslint-disable-next-line
  chartDB: any;

  // color change while theme color change
  preset = ['#0050B3', 'var(--primary-500)', '#52C41A'];
  barChartColor = ['var(--primary-500)', '#52c41a', '#faad14', '#13c2c2'];
  bHorizontalColor = ['var(--primary-500)', '#52c41a'];
  pie_color = ['#0050B3', 'var(--primary-500)', '#52C41A', '#FF4D4F', '#FAAD14'];
  radialColor = ['var(--primary-500)'];
  customs_color = ['#0050B3', 'var(--primary-500)', '#52C41A', '#FF4D4F'];

  // constructor
  constructor() {
    effect(() => {
      this.isDarkTheme(this.themeService.isDarkMode());
    });
    this.chartDB = ChartDB;
    const {
      barChart,
      bubbleChart,
      bubble3DChart,
      scatterChart,
      scatterDateTimeChart,
      heatmapChart,
      heatmapRoundedChart,
      lineAreaChart,
      candlestickChart,
      barStackedChart,
      barHorizontalChart,
      barHStackChart,
      pieChart,
      donutChart,
      radialChart,
      customsAngleChart,
      lineChart,
      realTimeChart,
      areaChart,
      dateTimeChart,
      mixedChart
    } = this.chartDB;

    // eslint-disable-next-line
    ((this.barChart = barChart),
      (this.barStackedChart = barStackedChart),
      (this.barHorizontalChart = barHorizontalChart),
      (this.barHStackChart = barHStackChart),
      (this.pieChart = pieChart),
      (this.donutChart = donutChart),
      (this.radialChart = radialChart),
      (this.customsAngleChart = customsAngleChart),
      (this.lineChart = lineChart),
      (this.realTimeChart = realTimeChart),
      (this.areaChart = areaChart),
      (this.dateTimeChart = dateTimeChart),
      (this.mixedChart = mixedChart),
      (this.lineAreaChart = lineAreaChart),
      (this.candlestickChart = candlestickChart),
      (this.bubbleChart = bubbleChart),
      (this.bubble3DChart = bubble3DChart),
      (this.scatterChart = scatterChart),
      (this.scatterDateTimeChart = scatterDateTimeChart),
      (this.heatmapChart = heatmapChart),
      (this.heatmapRoundedChart = heatmapRoundedChart));
  }

  // lifecycle hooks
  ngOnInit(): void {
    this.resetColorPalette();
    this.loadAnalytics();
  }

  getDisplayValue(item: SubscriberTypeBreakdownDto, key: string): string {
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

  trackByKey(_: number, item: { key: string }): string {
    return item.key;
  }

  trackBySlice(_: number, item: SubscriberDistributionSliceDto): string {
    return item.label;
  }

  trackByBreakdown(_: number, item: SubscriberTypeBreakdownDto): string {
    return `${item.label ?? item.type ?? item.name ?? ''}`;
  }

  private loadAnalytics(): void {
    this.dashboardService
      .getSubscribersByType(this.startDate, this.endDate)
      .pipe(takeUntilDestroyed())
      .subscribe((response) => {
        this.applyAnalytics(response);
      });
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
    this.barChartColor = ['var(--primary-500)', '#52c41a', '#faad14', '#13c2c2'];
    this.bHorizontalColor = ['var(--primary-500)', '#52c41a'];
    this.pie_color = ['#0050B3', 'var(--primary-500)', '#52C41A', '#FF4D4F', '#FAAD14'];
    this.radialColor = ['var(--primary-500)'];
    this.customs_color = ['#0050B3', 'var(--primary-500)', '#52C41A', '#FF4D4F'];
  }

  // private methods
  private isDarkTheme(isDark: string) {
    const tooltipTheme = isDark === DARK ? DARK : LIGHT;
    const tooltip = { theme: tooltipTheme };

    this.barChart = { ...this.barChart, tooltip };
    this.barStackedChart = { ...this.barStackedChart, tooltip };
    this.barHorizontalChart = { ...this.barHorizontalChart, tooltip };
    this.barHStackChart = { ...this.barHStackChart, tooltip };
    this.lineChart = { ...this.lineChart, tooltip };
    this.realTimeChart = { ...this.realTimeChart, tooltip };
    this.areaChart = { ...this.areaChart, tooltip };
    this.dateTimeChart = { ...this.dateTimeChart, tooltip };
    this.mixedChart = { ...this.mixedChart, tooltip };
    this.lineAreaChart = { ...this.lineAreaChart, tooltip };
    this.candlestickChart = { ...this.candlestickChart, tooltip };
    this.bubbleChart = { ...this.bubbleChart, tooltip };
    this.bubble3DChart = { ...this.bubble3DChart, tooltip };
    this.scatterChart = { ...this.scatterChart, tooltip };
    this.scatterDateTimeChart = { ...this.scatterDateTimeChart, tooltip };
    this.heatmapChart = { ...this.heatmapChart, tooltip };
    this.heatmapRoundedChart = { ...this.heatmapRoundedChart, tooltip };
  }
}
