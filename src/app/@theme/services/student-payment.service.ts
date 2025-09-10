import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse, FilteredResultRequestDto, PagedResultDto } from './lookup.service';

export interface StudentPaymentDto {
  id: number;
  studentId: number;
  studentName?: string | null;
  studentSubscribeName?: string | null;
  amount?: number | null;
  currencyId?: number | null;
  paymentDate?: string | null;
  receiptPath?: string | null;
  payStatue?: boolean | null;
  createdBy?: number | null;
  createdAt?: string | null;
  modefiedBy?: number | null;
  modefiedAt?: string | null;
}

export interface PaymentDashboardDto {
  month: string;
  totalPaid: number;
  totalPaidCount: number;
  totalPaidMoMPercentage: number;
  totalUnPaid: number;
  totalUnPaidCount: number;
  totalUnPaidMoMPercentage: number;
  totalOverdue: number;
  totalOverdueCount: number;
  totalOverdueMoMPercentage: number;
  currentReceivables: number;
  overdueReceivables: number;
  totalReceivables: number;
  collectionRate: number;
}

export interface StudentInvoiceDto {
  id: number;
  studentName?: string | null;
  createdAt?: string | null;
  dueDate?: string | null;
  amount?: number | null;
  status?: string | null;
}

@Injectable({ providedIn: 'root' })
export class StudentPaymentService {
  private http = inject(HttpClient);

  getPayment(
    paymentId: number
  ): Observable<ApiResponse<PagedResultDto<StudentPaymentDto>>> {
    const params = new HttpParams().set('paymentId', paymentId.toString());
    return this.http.get<ApiResponse<PagedResultDto<StudentPaymentDto>>>(
      `${environment.apiUrl}/api/StudentPayment/GetPayment`,
      { params }
    );
  }

  getDashboard(
    studentId?: number,
    currencyId?: number,
    dataMonth?: Date,
    compareMonth?: Date
  ): Observable<PaymentDashboardDto> {
    let params = new HttpParams();
    if (studentId !== undefined) {
      params = params.set('studentId', studentId.toString());
    }
    if (currencyId !== undefined) {
      params = params.set('currencyId', currencyId.toString());
    }
    if (dataMonth) {
      params = params.set('dataMonth', dataMonth.toISOString());
    }
    if (compareMonth) {
      params = params.set('compareMonth', compareMonth.toISOString());
    }
    return this.http.get<PaymentDashboardDto>(
      `${environment.apiUrl}/api/StudentPayment/Dashboard`,
      { params }
    );
  }

  getInvoices(
    filter: FilteredResultRequestDto,
    tab?: string,
    studentId?: number,
    createdFrom?: Date,
    createdTo?: Date,
    dueFrom?: Date,
    dueTo?: Date,
    month?: Date
  ): Observable<ApiResponse<PagedResultDto<StudentInvoiceDto>>> {
    let params = new HttpParams();
    if (filter.skipCount !== undefined) {
      params = params.set('SkipCount', filter.skipCount.toString());
    }
    if (filter.maxResultCount !== undefined) {
      params = params.set('MaxResultCount', filter.maxResultCount.toString());
    }
    if (filter.searchTerm) {
      params = params.set('SearchTerm', filter.searchTerm);
    }
    if (tab) {
      params = params.set('tab', tab);
    }
    if (studentId) {
      params = params.set('studentId', studentId.toString());
    }
    if (createdFrom) {
      params = params.set('createdFrom', createdFrom.toISOString());
    }
    if (createdTo) {
      params = params.set('createdTo', createdTo.toISOString());
    }
    if (dueFrom) {
      params = params.set('dueFrom', dueFrom.toISOString());
    }
    if (dueTo) {
      params = params.set('dueTo', dueTo.toISOString());
    }
    if (month) {
      params = params.set('month', month.toISOString());
    }
    return this.http.get<ApiResponse<PagedResultDto<StudentInvoiceDto>>>(
      `${environment.apiUrl}/api/StudentPayment/Invoices`,
      { params }
    );
  }
}
