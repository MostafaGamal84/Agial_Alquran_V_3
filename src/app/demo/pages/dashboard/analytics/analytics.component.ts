// angular import
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';
import { NewOrderChartComponent } from '../../apex-chart/new-order-chart/new-order-chart.component';
import { NewUserChartComponent } from '../../apex-chart/new-user-chart/new-user-chart.component';
import { VisitorsChartComponent } from '../../apex-chart/visitors-chart/visitors-chart.component';
import { MonthlyOverviewChartComponent } from '../../apex-chart/monthly-overview-chart/monthly-overview-chart.component';
import { IncomeChartComponent } from '../../apex-chart/income-chart/income-chart.component';
import { LanguagesSupportChartComponent } from '../../apex-chart/languages-support-chart/languages-support-chart.component';
import { OverviewProductChartComponent } from '../../apex-chart/overview-product-chart/overview-product-chart.component';
import { TotalEarningChartComponent } from '../../apex-chart/total-earning-chart/total-earning-chart.component';

@Component({
  selector: 'app-analytics',
  imports: [
    CommonModule,
    SharedModule,
    NewOrderChartComponent,
    NewUserChartComponent,
    LanguagesSupportChartComponent,
    VisitorsChartComponent,
    MonthlyOverviewChartComponent,
    IncomeChartComponent,
    OverviewProductChartComponent,
    TotalEarningChartComponent
  ],
  templateUrl: './analytics.component.html',
  styleUrls: ['../dashboard.scss', './analytics.component.scss']
})
export class AnalyticsComponent {
  // public method
  payment = [
    {
      img: 'assets/images/widget/img-paypal.png',
      payment_name: 'Paypal',
      amount: '+210,000',
      color: 'text-success-500',
      percentage: '+ 30.6%'
    },
    {
      img: 'assets/images/widget/img-gpay.png',
      payment_name: 'Gpay',
      amount: '-$2,000',
      color: 'text-warn-500',
      percentage: '- 30.6%'
    },
    {
      img: 'assets/images/widget/img-phonepay.png',
      payment_name: 'Phone Pay',
      amount: '-$2,000',
      color: 'text-warn-500',
      percentage: '- 30.6%'
    }
  ];
}
