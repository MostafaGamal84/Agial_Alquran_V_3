import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from './lookup.service';

export type DashboardOverviewRole = 'Admin' | 'BranchManager' | 'Supervisor' | 'Teacher' | string;

export interface DashboardOverviewMetricsDto {
  currencyCode?: string | null;
  earnings?: number | null;
  earningsCurrencyCode?: string | null;
  earningsPercentChange?: number | null;
  newStudents?: number | null;
  newStudentsPercentChange?: number | null;
  circleReports?: number | null;
  circleReportsPercentChange?: number | null;
  netIncome?: number | null;
  netIncomeCurrencyCode?: string | null;
  netIncomePercentChange?: number | null;
  outgoing?: number | null;
  outgoingCurrencyCode?: string | null;
  incomingEgp?: number | null;
  incomingEgpCurrencyCode?: string | null;
  incomingSar?: number | null;
  incomingSarCurrencyCode?: string | null;
  incomingUsd?: number | null;
  incomingUsdCurrencyCode?: string | null;
  netProfit?: number | null;
  netProfitCurrencyCode?: string | null;
  branchManagersCount?: number | null;
  supervisorsCount?: number | null;
  teachersCount?: number | null;
  studentsCount?: number | null;
  circlesCount?: number | null;
  reportsCount?: number | null;
  [key: string]: number | string | null | undefined;
}

export interface DashboardOverviewMonthlyRevenuePointDto {
  month?: string | null;
  earnings?: number | null;
  teacherPayout?: number | null;
  managerPayout?: number | null;
  netIncome?: number | null;
}

export interface DashboardOverviewProjectOverviewDto {
  totalCircles?: number | null;
  activeCircles?: number | null;
  teachers?: number | null;
  students?: number | null;
  reports?: number | null;
  [key: string]: number | null | undefined;
}

export interface DashboardOverviewTransactionDto {
  id?: number | string | null;
  student?: string | null;
  amount?: number | null;
  currency?: string | null;
  date?: string | null;
  status?: string | null;
  [key: string]: number | string | null | undefined;
}

export interface DashboardOverviewChartsDto {
  monthlyRevenue?: DashboardOverviewMonthlyRevenuePointDto[] | null;
  projectOverview?: DashboardOverviewProjectOverviewDto | null;
  transactions?: DashboardOverviewTransactionDto[] | null;
  [key: string]: unknown;
}

export interface DashboardOverviewDto {
  role?: DashboardOverviewRole | null;
  rangeStart?: string | null;
  rangeEnd?: string | null;
  rangeLabel?: string | null;
  metrics?: DashboardOverviewMetricsDto | null;
  charts?: DashboardOverviewChartsDto | null;
  [key: string]: unknown;
}

export interface DashboardOverviewParams {
  startDate?: string;
  endDate?: string;
  range?: string;
}

@Injectable({ providedIn: 'root' })
export class DashboardOverviewService {
  private http = inject(HttpClient);

  getOverview(params?: DashboardOverviewParams): Observable<ApiResponse<DashboardOverviewDto>> {
    let httpParams = new HttpParams();

    if (params?.startDate) {
      httpParams = httpParams.set('startDate', params.startDate);
    }

    if (params?.endDate) {
      httpParams = httpParams.set('endDate', params.endDate);
    }

    if (params?.range) {
      httpParams = httpParams.set('range', params.range);
    }

    const options = httpParams.keys().length ? { params: httpParams } : {};

    return this.http.get<ApiResponse<DashboardOverviewDto>>(
      `${environment.apiUrl}/api/Dashboard/overview`,
      options
    );
  }
}
