import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  ApiResponse,
  FilteredResultRequestDto,
  LookUpUserDto,
  PagedResultDto
} from './lookup.service';
import { DaysEnum } from '../types/DaysEnum';

export interface CircleDto {
  id: number;
  name: string;
  teacherId?: number;
  teacher?: LookUpUserDto;
  managers?: CircleManagerDto[];

  students?: CircleStudentDto[];
  day?: DaysEnum | null;
  time?: number | null;
}

export interface CircleManagerDto {
  managerId: number;
  manager?: LookUpUserDto;
  circleId?: number;

}

export interface CircleStudentDto {
  id?: number;
  studentId?: number;
  student?: LookUpUserDto;
  fullName?: string;
  [key: string]: unknown;
}

export interface CreateCircleDto {
  name?: string;
  teacherId?: number;
  managers?: number[];
  studentsIds?: number[];
  day?: DaysEnum | null;
  time?: number | null;
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
    filter: FilteredResultRequestDto,
    managerId?: number,
    teacherId?: number
  ): Observable<ApiResponse<PagedResultDto<CircleDto>>> {
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
    if (managerId !== undefined) {
      params = params.set('managerId', managerId.toString());
    }
    if (teacherId !== undefined) {
      params = params.set('teacherId', teacherId.toString());
    }
    return this.http.get<ApiResponse<PagedResultDto<CircleDto>>>(
      `${environment.apiUrl}/api/Circle/GetResultsByFilter`,
      { params }
    );
  }
}

