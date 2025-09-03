import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  ApiResponse,
  FilteredResultRequestDto,
  PagedResultDto
} from './lookup.service';

export interface CircleDto {
  id: number;
  name: string;
  teacherId?: number;
  teacherName?: string;
  managers?: number[];
  studentsIds?: number[];
  students?: CircleStudentDto[];
}

export interface CircleStudentDto {
  id: number;
  fullName: string;
  [key: string]: unknown;
}

export interface CreateCircleDto {
  name?: string;
  teacherId?: number;
  managers?: number[];
  studentsIds?: number[];
}

export interface UpdateCircleDto extends CreateCircleDto {
  id: number;
}

@Injectable({ providedIn: 'root' })
export class CircleService {
  private http = inject(HttpClient);

  create(model: CreateCircleDto): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(
      `${environment.apiUrl}/api/Circle/Create`,
      model
    );
  }

  update(model: UpdateCircleDto): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(
      `${environment.apiUrl}/api/Circle/Update`,
      model
    );
  }

  delete(id: number): Observable<ApiResponse<boolean>> {
    const params = new HttpParams().set('id', id.toString());
    return this.http.post<ApiResponse<boolean>>(
      `${environment.apiUrl}/api/Circle/Delete`,
      null,
      { params }
    );
  }

  get(id: number): Observable<ApiResponse<CircleDto>> {
    const params = new HttpParams().set('id', id.toString());
    return this.http.get<ApiResponse<CircleDto>>(
      `${environment.apiUrl}/api/Circle/Get`,
      { params }
    );
  }

  getAll(
    filter: FilteredResultRequestDto
  ): Observable<ApiResponse<PagedResultDto<CircleDto>>> {
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
    return this.http.get<ApiResponse<PagedResultDto<CircleDto>>>(
      `${environment.apiUrl}/api/Circle/GetResultsByFilter`,
      { params }
    );
  }
}

