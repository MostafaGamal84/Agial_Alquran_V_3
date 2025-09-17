// angular import
import { Component, OnInit, effect, inject, input } from '@angular/core';

// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';
import { ThemeLayoutService } from 'src/app/@theme/services/theme-layout.service';

// third party
import { NgApexchartsModule, ApexOptions } from 'ng-apexcharts';

// const
import { DARK, LIGHT } from 'src/app/@theme/const';

@Component({
  selector: 'app-earning-chart',
  imports: [SharedModule, NgApexchartsModule],
  templateUrl: './earning-chart.component.html',
  styleUrl: './earning-chart.component.scss'
})
export class EarningChartComponent implements OnInit {
  private themeService = inject(ThemeLayoutService);

  // public props
  chartOptions: Partial<ApexOptions>;
  readonly styleInput = input<string>();
  readonly iconImage = input<string>();
  readonly headerTitle = input<string>();
  readonly earningValue = input<string>();
  readonly background = input<string>();
  readonly textColor = input<string>();
  readonly percentageValue = input<string>();
  readonly data = input<number[] | undefined>();
  readonly color = input<string | string[] | undefined>();
  readonly trendColor = input<string>();
  readonly trendIcon = input<string>();

  // constructor
  constructor() {
    effect(() => {
      this.isDarkTheme(this.themeService.isDarkMode());
    });
    effect(() => {
      const chartData = this.normalizeData(this.data());
      const colors = this.normalizeColors(this.color());
      if (!this.chartOptions) {
        this.chartOptions = this.createChartOptions(chartData, colors);
        return;
      }
      this.chartOptions = {
        ...this.chartOptions,
        series: [
          {
            data: chartData
          }
        ],
        colors
      };
    });
  }

  // life cycle
  ngOnInit() {
    const chartData = this.normalizeData(this.data());
    const colors = this.normalizeColors(this.color());
    this.chartOptions = this.createChartOptions(chartData, colors);
  }

  // private methods
  private isDarkTheme(isDark: string) {
    if (!this.chartOptions?.tooltip) {
      return;
    }
    const tooltip = { ...this.chartOptions.tooltip };
    tooltip.theme = isDark === DARK ? DARK : LIGHT;
    this.chartOptions = { ...this.chartOptions, tooltip };
  }

  private createChartOptions(data: number[], colors: string[]): Partial<ApexOptions> {
    return {
      chart: { type: 'bar', background: 'transparent', height: 50, sparkline: { enabled: true } },
      plotOptions: { bar: { columnWidth: '80%' } },
      series: [
        {
          data
        }
      ],
      xaxis: { crosshairs: { width: 1 } },
      tooltip: {
        fixed: { enabled: false },
        x: { show: false },
        y: {
          title: {
            formatter: function () {
              return '';
            }
          }
        },
        marker: { show: false },
        theme: LIGHT
      },
      colors,
      theme: {
        mode: LIGHT
      }
    };
  }

  private normalizeData(value: number[] | undefined): number[] {
    if (!value || value.length === 0) {
      return [0];
    }
    return value;
  }

  private normalizeColors(color: string | string[] | undefined): string[] {
    if (!color) {
      return ['var(--primary-500)'];
    }
    return Array.isArray(color) ? color : [color];
  }
}
