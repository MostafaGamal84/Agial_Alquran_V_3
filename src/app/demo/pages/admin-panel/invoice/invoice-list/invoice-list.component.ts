// angular import
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';

// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';
import { InvoiceListChartComponent } from './invoice-list-chart/invoice-list-chart.component';
import { InvoiceListTableComponent } from './invoice-list-table/invoice-list-table.component';
import {
  StudentPaymentService,
  PaymentDashboardDto
} from 'src/app/@theme/services/student-payment.service';
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
  styleUrl: './invoice-list.component.scss'
})
export class InvoiceListComponent implements OnInit {
  private studentPaymentService = inject(StudentPaymentService);
  selectedMonth = this.getCurrentMonth();
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

  ngOnInit(): void {
    this.loadDashboard();
  }

  getCurrentMonth(): string {
    const now = new Date();
    return now.toISOString().slice(0, 7);
  }

  onMonthChange(value: string): void {
    this.selectedMonth = value;
    this.tabCounts = { all: 0, paid: 0, unpaid: 0, overdue: 0, cancelled: 0 };
    this.loadDashboard();
  }

  onTableCount(tab: 'all' | 'paid' | 'unpaid' | 'overdue' | 'cancelled', count: number): void {
    this.tabCounts[tab] = count;
  }

  loadDashboard(): void {
    const monthDate = new Date(this.selectedMonth + '-01');
    this.studentPaymentService
      .getDashboard(undefined, undefined, monthDate)
      .subscribe((data: PaymentDashboardDto) => {
        this.widgetCards = [
          {
            title: 'Paid',
            isLoss: false,
            value: `$${data.totalPaid}`,
            percentage: data.totalPaidMoMPercentage,
            color: 'text-success-500',
            invoice: data.totalPaidCount,
            data: data.paidChart ?? [],
            colors: ['#2ca87f']
          },
          {
            title: 'Unpaid',
            isLoss: true,
            value: `$${data.totalUnPaid}`,
            percentage: data.totalUnPaidMoMPercentage,
            color: 'text-warning-500',
            invoice: data.totalUnPaidCount,
            data: data.unpaidChart ?? [],
            colors: ['#e58a00']
          },
          {
            title: 'Overdue',
            isLoss: true,
            value: `$${data.totalOverdue}`,
            percentage: data.totalOverdueMoMPercentage,
            color: 'text-warn-500',
            invoice: data.totalOverdueCount,
            data: data.overdueChart ?? [],
            colors: ['#dc2626']
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
}
