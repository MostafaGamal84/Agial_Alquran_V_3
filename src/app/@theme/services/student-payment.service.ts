import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse, PagedResultDto } from './lookup.service';

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
    month?: Date
  ): Observable<PaymentDashboardDto> {
    let params = new HttpParams();
    if (studentId !== undefined) {
      params = params.set('studentId', studentId.toString());
    }
    if (currencyId !== undefined) {
      params = params.set('currencyId', currencyId.toString());
    }
    if (month) {
      params = params.set('month', month.toISOString());
    }
    return this.http.get<PaymentDashboardDto>(
      `${environment.apiUrl}/api/StudentPayment/Dashboard`,
      { params }
    );
  }
}
