import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { ApiResponse, FilteredResultRequestDto, PagedResultDto, normalizePagedResult } from './lookup.service';

export interface AcademicReportAddDto {
  id?: number | null;
  academicCircleId?: number | null;
  studentId?: number | null;
  teacherId?: number | null;
  subjectId?: number | null;
  reportDate: string | Date;
  stageId?: number | null;
  lessonTitle?: string | null;
  studentPerformanceId?: number | null;
  previousHomeworkStatusId?: number | null;
  homeworkScore?: number | null;
  nextHomework?: string | null;
  teacherNotes?: string | null;
  sessionDurationMinutes?: number | null;
}

export interface AcademicReportDto {
  id: number;
  academicCircleId?: number | null;
  academicCircleName?: string | null;
  studentId?: number | null;
  studentName?: string | null;
  teacherId?: number | null;
  teacherName?: string | null;
  subjectId?: number | null;
  subjectName?: string | null;
  reportDate: string | Date;
  stageId?: number | null;
  lessonTitle?: string | null;
  studentPerformanceId?: number | null;
  previousHomeworkStatusId?: number | null;
  homeworkScore?: number | null;
  nextHomework?: string | null;
  teacherNotes?: string | null;
  sessionDurationMinutes?: number | null;
}

@Injectable({ providedIn: 'root' })
export class AcademicReportService {
  private http = inject(HttpClient);

  create(model: AcademicReportAddDto): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${environment.apiUrl}/api/AcademicReport/Create`, model);
  }

  update(model: AcademicReportAddDto): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${environment.apiUrl}/api/AcademicReport/Update`, model);
  }

  delete(id: number): Observable<ApiResponse<boolean>> {
    const params = new HttpParams().set('id', id.toString());
    return this.http.post<ApiResponse<boolean>>(`${environment.apiUrl}/api/AcademicReport/Delete`, null, { params });
  }

  get(id: number): Observable<ApiResponse<AcademicReportDto>> {
    const params = new HttpParams().set('id', id.toString());
    return this.http.get<ApiResponse<AcademicReportDto>>(`${environment.apiUrl}/api/AcademicReport/Get`, { params });
  }

  getAll(
    filter: FilteredResultRequestDto,
    options?: {
      circleId?: number | null;
      studentId?: number | null;
      teacherId?: number | null;
      subjectId?: number | null;
      fromDate?: string | null;
      toDate?: string | null;
    }
  ): Observable<ApiResponse<PagedResultDto<AcademicReportDto>>> {
    let params = new HttpParams();

    if (filter.skipCount !== undefined) {
      params = params.set('SkipCount', filter.skipCount.toString());
    }
    if (filter.maxResultCount !== undefined) {
      params = params.set('MaxResultCount', filter.maxResultCount.toString());
    }
    const searchWord = filter.searchWord ?? filter.searchTerm;
    if (filter.searchTerm) {
      params = params.set('SearchTerm', filter.searchTerm);
    }
    if (searchWord) {
      params = params.set('SearchWord', searchWord);
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

    if (options?.circleId && options.circleId > 0) {
      params = params.set('circleId', options.circleId.toString());
    }
    if (options?.studentId && options.studentId > 0) {
      params = params.set('studentId', options.studentId.toString());
    }
    if (options?.teacherId && options.teacherId > 0) {
      params = params.set('teacherId', options.teacherId.toString());
    }
    if (options?.subjectId && options.subjectId > 0) {
      params = params.set('subjectId', options.subjectId.toString());
    }
    if (options?.fromDate) {
      params = params.set('fromDate', options.fromDate);
    }
    if (options?.toDate) {
      params = params.set('toDate', options.toDate);
    }

    return this.http
      .get<ApiResponse<PagedResultDto<AcademicReportDto>>>(`${environment.apiUrl}/api/AcademicReport/GetResultsByFilter`, { params })
      .pipe(map((response) => normalizePagedResult(response, { skipCount: filter.skipCount })));
  }
}
