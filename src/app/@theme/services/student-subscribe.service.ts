import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse, FilteredResultRequestDto, PagedResultDto } from './lookup.service';

export interface ViewStudentSubscribeReDto {
  id: number;
  studentId: number;
  studentName?: string | null;
  studentMobile?: string | null;
  payStatus?: boolean | null;
  isCancelled?: boolean | null;
  plan?: string | null;
  remainingMinutes?: number | null;
  startDate?: string | null;
  studentPaymentId?: number | null;
}

export interface AddStudentSubscribeDto {
  studentId?: number;
  studentSubscribeId?: number;
}

@Injectable({ providedIn: 'root' })
export class StudentSubscribeService {
  private http = inject(HttpClient);

  getStudents(
    filter: FilteredResultRequestDto,
    studentId?: number
  ): Observable<ApiResponse<PagedResultDto<ViewStudentSubscribeReDto>>> {
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
    if (filter.filter) {
      params = params.set('Filter', filter.filter);
    }
    if (filter.lang) {
      params = params.set('Lang', filter.lang);
    }
    if (filter.sortingDirection) {
      params = params.set('SortingDirection', filter.sortingDirection);
    }
    if (filter.sortBy) {
      params = params.set('SortBy', filter.sortBy);
    }
    if (studentId !== undefined) {
      params = params.set('studentId', studentId.toString());
    }
    return this.http.get<ApiResponse<PagedResultDto<ViewStudentSubscribeReDto>>>(
      `${environment.apiUrl}/api/StudentSubscrib/GetStudents`,
      { params }
    );
  }

  getStudentSubscribesWithPayment(
    filter: FilteredResultRequestDto,
    studentId: number
  ): Observable<ApiResponse<PagedResultDto<ViewStudentSubscribeReDto>>> {
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
    if (filter.filter) {
      params = params.set('Filter', filter.filter);
    }
    if (filter.lang) {
      params = params.set('Lang', filter.lang);
    }
    if (filter.sortingDirection) {
      params = params.set('SortingDirection', filter.sortingDirection);
    }
    if (filter.sortBy) {
      params = params.set('SortBy', filter.sortBy);
    }
    params = params.set('studentId', studentId.toString());
    return this.http.get<ApiResponse<PagedResultDto<ViewStudentSubscribeReDto>>>(
      `${environment.apiUrl}/api/StudentSubscrib/GetStudentSubscribesWithPayment`,
      { params }
    );
  }

  create(model: AddStudentSubscribeDto): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(
      `${environment.apiUrl}/api/StudentSubscrib/Create`,
      model
    );
  }
}

