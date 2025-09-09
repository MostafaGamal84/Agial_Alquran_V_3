import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse, PagedResultDto } from './lookup.service';
import { ViewStudentSubscribeReDto } from './student-subscribe.service';

@Injectable({ providedIn: 'root' })
export class StudentPaymentService {
  private http = inject(HttpClient);

  getPayment(paymentId: number): Observable<ApiResponse<PagedResultDto<ViewStudentSubscribeReDto>>> {
    const params = new HttpParams().set('paymentId', paymentId.toString());
    return this.http.get<ApiResponse<PagedResultDto<ViewStudentSubscribeReDto>>>(
      `${environment.apiUrl}/api/StudentPayment/GetPayment`,
      { params }
    );
  }
}
