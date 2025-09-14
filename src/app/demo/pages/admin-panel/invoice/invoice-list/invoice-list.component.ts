// angular import
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDatepicker } from '@angular/material/datepicker';
import { MomentDateAdapter, MAT_MOMENT_DATE_ADAPTER_OPTIONS } from '@angular/material-moment-adapter';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import * as _moment from 'moment';
import { default as _rollupMoment, Moment } from 'moment';
import { ActivatedRoute } from '@angular/router';

// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';
import { InvoiceListChartComponent } from './invoice-list-chart/invoice-list-chart.component';
import { InvoiceListTableComponent } from './invoice-list-table/invoice-list-table.component';
import {
  StudentPaymentService,
  PaymentDashboardDto
} from 'src/app/@theme/services/student-payment.service';

const moment = _rollupMoment || _moment;

export const MONTH_FORMATS = {
  parse: { dateInput: 'MMMM YYYY' },
  display: {
    dateInput: 'MMMM YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY'
  }
};

interface WidgetCard {
  title: string;
  isLoss: boolean;
  value: string;
  percentage: number;
  color: string;
  invoice: number;
  data: number[];
  colors: string[];
}

@Component({
  selector: 'app-invoice-list',
  imports: [
    SharedModule,
    CommonModule,
    InvoiceListChartComponent,
    InvoiceListTableComponent
  ],
  templateUrl: './invoice-list.component.html',
  styleUrl: './invoice-list.component.scss',
  providers: [
    {
      provide: DateAdapter,
      useClass: MomentDateAdapter,
      deps: [MAT_DATE_LOCALE, MAT_MOMENT_DATE_ADAPTER_OPTIONS]
    },
    { provide: MAT_DATE_FORMATS, useValue: MONTH_FORMATS }
  ]
})
export class InvoiceListComponent implements OnInit {
  private studentPaymentService = inject(StudentPaymentService);
  private route = inject(ActivatedRoute);
  dataMonth = new FormControl<Moment>(moment());
  compareMonth = new FormControl<Moment | null>(null);
  widgetCards: WidgetCard[] = [];
  bigCard = {
    currentReceivables: 0,
    overdueReceivables: 0,
    totalReceivables: 0,
    collectionRate: 0
  };
  tabCounts = {
    all: 0,
    paid: 0,
    unpaid: 0,
    overdue: 0,
    cancelled: 0
  };
  searchTerm = '';

  ngOnInit(): void {
    this.searchTerm = this.route.snapshot.queryParamMap.get('search') ?? '';
    this.route.queryParamMap.subscribe((params) => {
      this.searchTerm = params.get('search') ?? '';
    });
    this.loadDashboard();
  }

  setDataMonthAndYear(normalizedMonthAndYear: Moment, datepicker: MatDatepicker<Moment>) {
    this.dataMonth.setValue(normalizedMonthAndYear);
    datepicker.close();
    this.tabCounts = { all: 0, paid: 0, unpaid: 0, overdue: 0, cancelled: 0 };

    this.loadDashboard();
  }

  setCompareMonthAndYear(normalizedMonthAndYear: Moment, datepicker: MatDatepicker<Moment>) {
    this.compareMonth.setValue(normalizedMonthAndYear);
    datepicker.close();
    this.loadDashboard();
  }

  onTableCount(tab: 'all' | 'paid' | 'unpaid' | 'overdue' | 'cancelled', count: number): void {
    this.tabCounts[tab] = count;
    if (tab !== 'all') {
      this.tabCounts.all =
        this.tabCounts.paid +
        this.tabCounts.unpaid +
        this.tabCounts.overdue +
        this.tabCounts.cancelled;
    }
  }

  loadDashboard(): void {
    const dataMonthDate = this.dataMonth.value?.toDate();
    const compareMonthDate = this.compareMonth.value?.toDate();
    this.studentPaymentService
      .getDashboard(undefined, undefined, dataMonthDate, compareMonthDate)

      .subscribe((data: PaymentDashboardDto) => {
        const paidTrend = this.getTrend(data.totalPaidMoMPercentage);
        const unpaidTrend = this.getTrend(data.totalUnPaidMoMPercentage);
        const overdueTrend = this.getTrend(data.totalOverdueMoMPercentage);

        this.widgetCards = [
          {
            title: 'Paid',
            value: `$${data.totalPaid}`,
            percentage: data.totalPaidMoMPercentage,
            invoice: data.totalPaidCount,
            data: data.paidChart ?? [],
            colors: ['#2ca87f'],
            ...paidTrend
          },
          {
            title: 'Unpaid',
            value: `$${data.totalUnPaid}`,
            percentage: data.totalUnPaidMoMPercentage,
            invoice: data.totalUnPaidCount,
            data: data.unpaidChart ?? [],
            colors: ['#e58a00'],
            ...unpaidTrend
          },
          {
            title: 'Overdue',
            value: `$${data.totalOverdue}`,
            percentage: data.totalOverdueMoMPercentage,
            invoice: data.totalOverdueCount,
            data: data.overdueChart ?? [],
            colors: ['#dc2626'],
            ...overdueTrend
          }
        ];
        this.bigCard = {
          currentReceivables: data.currentReceivables,
          overdueReceivables: data.overdueReceivables,
          totalReceivables: data.totalReceivables,
          collectionRate: data.collectionRate
        };
      });
  }

  private getTrend(value: number): { isLoss: boolean; color: string } {
    const isLoss = value < 0;
    return {
      isLoss,
      color: isLoss ? 'text-warn-500' : 'text-success-500'
    };
  }
}
