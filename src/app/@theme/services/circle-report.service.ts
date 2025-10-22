import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { ApiResponse, FilteredResultRequestDto, PagedResultDto, normalizePagedResult } from './lookup.service';

export interface CircleReportAddDto {
  id?: number;
  minutes?: number;
  newId?: number;
  newFrom?: string;
  newTo?: string;
  newRate?: string;
  recentPast?: string;
  recentPastRate?: string;
  distantPast?: string;
  distantPastRate?: string;
  farthestPast?: string;
  farthestPastRate?: string;
  theWordsQuranStranger?: string;
  intonation?: string;
  other?: string;
  creationTime: Date;
  circleId?: number;
  studentId?: number;
  teacherId?: number;
  attendStatueId?: number;
}

export interface CircleReportListDto {
  id: number;
  creationTime?: Date | string;
  circleId?: number;
  circleName?: string;
  studentId?: number;
  studentName?: string;
  teacherId?: number;
  teacherName?: string;
  attendStatueId?: number;
  minutes?: number;
  [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class CircleReportService {
  private http = inject(HttpClient);

  create(model: CircleReportAddDto): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(
      `${environment.apiUrl}/api/CircleReport/Create`,
      model
    );
  }

  update(model: CircleReportAddDto): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(
      `${environment.apiUrl}/api/CircleReport/Update`,
      model
    );
  }

  get(id: number): Observable<ApiResponse<CircleReportAddDto>> {
    const params = new HttpParams().set('id', id.toString());
    return this.http.get<ApiResponse<CircleReportAddDto>>(
      `${environment.apiUrl}/api/CircleReport/Get`,
      { params }
    );
  }

  getAll(
    filter: FilteredResultRequestDto,
    options?: { circleId?: number | null; studentId?: number | null; teacherId?: number | null }
  ): Observable<ApiResponse<PagedResultDto<CircleReportListDto>>> {
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

    if (options?.circleId !== undefined && options?.circleId !== null) {
      params = params.set('circleId', options.circleId.toString());
    }
    if (options?.studentId !== undefined && options?.studentId !== null) {
      params = params.set('studentId', options.studentId.toString());
    }
    if (options?.teacherId !== undefined && options?.teacherId !== null) {
      params = params.set('teacherId', options.teacherId.toString());
    }

    return this.http
      .get<ApiResponse<PagedResultDto<CircleReportListDto>>>(
        `${environment.apiUrl}/api/CircleReport/GetResultsByFilter`,
        { params }
      )
      .pipe(map((response) => normalizePagedResult(response, { skipCount: filter.skipCount })));
  }
}

