import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { ApexAxisChartSeries, ApexChart, ApexNonAxisChartSeries, ApexXAxis } from 'ng-apexcharts';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface SubscriberTypeSeriesDto {
  name: string;
  data: number[];
  type?: string;
}

export interface SubscriberByTypeChartDto {
  chart?: ApexChart;
  xaxis?: ApexXAxis;
  categories?: string[];
  series?: ApexAxisChartSeries | ApexNonAxisChartSeries;
}

export interface SubscriberDistributionSliceDto {
  label: string;
  value: number;
  percentage?: number;
  color?: string;
}

export interface SubscriberDistributionDto {
  slices: SubscriberDistributionSliceDto[];
}

export interface SubscriberTypeBreakdownDto {
  label?: string;
  type?: string;
  name?: string;
  totalSubscribers?: number;
  uniqueSubscribers?: number;
  newSubscribers?: number;
  returningSubscribers?: number;
  percentage?: number;
  [key: string]: string | number | undefined;
}

export interface SubscriberTypeAnalyticsDto {
  subscribersByType: SubscriberByTypeChartDto;
  distribution: SubscriberDistributionDto;
  breakdown?: SubscriberTypeBreakdownDto[];
  totalSubscribers?: number;
  uniqueSubscribers?: number;
  newSubscribers?: number;
  returningSubscribers?: number;
  activeSubscribers?: number;
  inactiveSubscribers?: number;
  churnedSubscribers?: number;
  totals?: Record<string, number>;
  startDate?: string;
  endDate?: string;
  [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);

  getSubscribersByType(startDate?: string, endDate?: string): Observable<SubscriberTypeAnalyticsDto> {
    let params = new HttpParams();

    if (startDate) {
      params = params.set('startDate', startDate);
    }

    if (endDate) {
      params = params.set('endDate', endDate);
    }

    const options = params.keys().length ? { params } : {};

    return this.http.get<SubscriberTypeAnalyticsDto>(
      `${environment.apiUrl}/api/dashboard/subscribers/by-type`,
      options
    );
  }
}
