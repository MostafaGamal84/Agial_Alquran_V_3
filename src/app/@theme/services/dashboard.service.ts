import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from './lookup.service';

export type DashboardValueType = string | undefined;

export interface DashboardMetricDto {
  key: string;
  name?: string;
  value?: number;
  previousValue?: number;
  percentChange?: number;
  cumulativeTotal?: number;
  valueType?: DashboardValueType;
  currencyCode?: string;
  trend?: number[];
}

export interface DashboardSummaryDto {
  month?: string;
  metrics?: DashboardMetricDto[] | Record<string, DashboardMetricDto>;
}

export interface ChartSeriesDto {
  name: string;
  data: number[];
  type?: string;
}

export interface ChartDto {
  categories: string[];
  series: ChartSeriesDto[];
}

export interface RepeatCustomersDto {
  currentRate?: number;
  previousRate?: number;
  percentChange?: number;
  chart: ChartDto;
}

export interface MonthlyRevenueTotalsDto {
  revenue?: number;
  payouts?: number;
  netIncome?: number;
  currencyCode?: string;
}

export interface MonthlyRevenueDto {
  chart: ChartDto;
  totals?: MonthlyRevenueTotalsDto;
}

export interface RevenueByCurrencySliceDto {
  label: string;
  value: number;
  percentage: number;
  currencyCode?: string;
}

export interface RevenueByCurrencyDto {
  slices: RevenueByCurrencySliceDto[];
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);

  getSummary(): Observable<ApiResponse<DashboardSummaryDto>> {
    return this.http.get<ApiResponse<DashboardSummaryDto>>(`${environment.apiUrl}/api/dashboard/summary`);
  }

  getRepeatCustomers(months: number): Observable<ApiResponse<RepeatCustomersDto>> {
    const params = new HttpParams().set('months', months.toString());
    return this.http.get<ApiResponse<RepeatCustomersDto>>(
      `${environment.apiUrl}/api/dashboard/repeat-customers`,
      { params }
    );
  }

  getMonthlyRevenue(months: number): Observable<ApiResponse<MonthlyRevenueDto>> {
    const params = new HttpParams().set('months', months.toString());
    return this.http.get<ApiResponse<MonthlyRevenueDto>>(
      `${environment.apiUrl}/api/dashboard/monthly-revenue`,
      { params }
    );
  }

  getRevenueByCurrency(startDate: string, endDate: string): Observable<ApiResponse<RevenueByCurrencyDto>> {
    const params = new HttpParams().set('startDate', startDate).set('endDate', endDate);
    return this.http.get<ApiResponse<RevenueByCurrencyDto>>(
      `${environment.apiUrl}/api/dashboard/revenue-by-currency`,
      { params }
    );
  }
}
