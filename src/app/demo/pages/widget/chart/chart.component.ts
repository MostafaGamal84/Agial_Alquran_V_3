// angular import
import { Component, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';
import { ChartDB } from 'src/app/fake-data/chartDB';
import { ThemeLayoutService } from 'src/app/@theme/services/theme-layout.service';
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
export class WidgetChartComponent {
  themeService = inject(ThemeLayoutService);

  // public props
  customerRateChart: Partial<ApexOptions>;
  monthlyReportChart: Partial<ApexOptions>;
  salesReportChart: Partial<ApexOptions>;
  acquisitionChart: Partial<ApexOptions>;

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
