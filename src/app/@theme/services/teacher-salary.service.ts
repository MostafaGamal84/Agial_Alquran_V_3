import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ApiError {
  fieldName?: string;
  code?: string;
  message?: string;
  fieldLang?: string | null;
}

export interface ApiResponse<T> {
  isSuccess: boolean;
  data: T;
  errors: ApiError[];
}

export interface TeacherSalaryInvoice {
  id: number;
  teacherId?: number;
  teacherName?: string;
  month?: string;
  salaryAmount?: number;
  totalSalary?: number;
  isPayed?: boolean;
  payedAt?: string | null;
  receiptUrl?: string | null;
  receiptId?: number | null;
  status?: string | null;
  [key: string]: unknown;
}

export interface TeacherMonthlySummary {
  month?: string;
  teacherId?: number;
  teacherName?: string;
  attendanceCount?: number;
  totalAttendance?: number;
  attendedSessions?: number;
  absenceCount?: number;
  totalAbsence?: number;
  missedSessions?: number;
  teachingMinutes?: number;
  totalMinutes?: number;
  overtimeMinutes?: number;
  sessionCount?: number;
  lessonsCount?: number;
  salaryTotal?: number;
  totalSalary?: number;
  baseSalary?: number;
  bonusTotal?: number;
  bonuses?: number;
  totalBonus?: number;
  deductionTotal?: number;
  deductions?: number;
  totalDeduction?: number;
  netSalary?: number;
  takeHomePay?: number;
  hourlyRate?: number;
  attendanceRate?: number;
  invoice?: TeacherSalaryInvoice | null;
  [key: string]: unknown;
}

export interface TeacherSalaryInvoiceDetails {
  invoice: TeacherSalaryInvoice | null;
  monthlySummary?: TeacherMonthlySummary | null;
  [key: string]: unknown;
}

export interface UpdateTeacherPaymentDto {
  id: number;
  amount?: number | null;
  payStatue?: boolean | null;
  isCancelled?: boolean | null;
}

export interface ReceiptUpload {
  file: Blob;
  fileName: string;
}

export interface GenerateMonthlyResponse {
  createdCount?: number;
  updatedCount?: number;
  skippedCount?: number;
  [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class TeacherSalaryService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin/teacher-salary`;

  getInvoices(
    month?: string | null,
    teacherId?: number | null
  ): Observable<ApiResponse<TeacherSalaryInvoice[]>> {
    let params = new HttpParams();
    if (month) {
      params = params.set('month', month);
    }
    if (teacherId) {
      params = params.set('teacherId', teacherId.toString());
    }

    return this.http.get<ApiResponse<TeacherSalaryInvoice[]>>(
      `${this.baseUrl}/invoices`,
      { params }
    );
  }

  getInvoiceDetails(
    invoiceId: number
  ): Observable<ApiResponse<TeacherSalaryInvoiceDetails>> {
    return this.http.get<ApiResponse<TeacherSalaryInvoiceDetails>>(
      `${this.baseUrl}/invoices/${invoiceId}/details`
    );
  }

  updatePayment(
    model: UpdateTeacherPaymentDto
  ): Observable<
    ApiResponse<TeacherSalaryInvoice | TeacherSalaryInvoiceDetails | boolean | null>
  > {
    const createFormData = () => {
      const formData = new FormData();
      Object.entries(model).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });
      return formData;
    };

    const endpoint = `${this.baseUrl}/invoices/${model.id}/payment`;

    return this.http.post<
      ApiResponse<TeacherSalaryInvoice | TeacherSalaryInvoiceDetails | boolean | null>
    >(endpoint, createFormData());
  }

  uploadInvoiceReceipt(
    invoiceId: number,
    receipt: ReceiptUpload,
    additionalFields?: Partial<UpdateTeacherPaymentDto>
  ): Observable<ApiResponse<TeacherSalaryInvoice | null>> {
    const formData = new FormData();
    formData.append('invoiceId', invoiceId.toString());
    formData.append('receipt', receipt.file, receipt.fileName);

    if (additionalFields) {
      Object.entries(additionalFields).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });
    }

    return this.http.post<ApiResponse<TeacherSalaryInvoice | null>>(
      `${this.baseUrl}/invoices/${invoiceId}/receipt`,
      formData
    );
  }

  getMonthlySummary(
    month?: string | null,
    teacherId?: number | null
  ): Observable<ApiResponse<TeacherMonthlySummary | null>> {
    let params = new HttpParams();
    if (month) {
      params = params.set('month', month);
    }
    if (teacherId) {
      params = params.set('teacherId', teacherId.toString());
    }

    return this.http.get<ApiResponse<TeacherMonthlySummary | null>>(
      `${this.baseUrl}/monthly-summary`,
      { params }
    );
  }

  generateMonthly(
    month?: string | null
  ): Observable<ApiResponse<GenerateMonthlyResponse | null>> {
    let params = new HttpParams();
    if (month) {
      params = params.set('month', month);
    }

    return this.http.post<ApiResponse<GenerateMonthlyResponse | null>>(
      `${this.baseUrl}/generate`,
      {},
      { params }
    );
  }
}
