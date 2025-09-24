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
import { DayValue, DaysEnum } from '../types/DaysEnum';
import { TimeSpanDto } from '../utils/time';

export type CircleTimeValue = TimeSpanDto | number | string | null | undefined;

export interface CircleDayRequestDto {
  dayId: DaysEnum | number;
  time?: string | null;
}

export interface CircleDayDto {
  dayId: DaysEnum | number;
  time?: CircleTimeValue;
  dayName?: string | null;
}

export interface CircleManagerDto {
  managerId: number;
  manager?: LookUpUserDto | string | null;
  managerName?: string | null;
  circleId?: number;
}

export interface CircleStudentDto {
  id?: number;
  studentId?: number;
  student?: LookUpUserDto;
  fullName?: string;
  [key: string]: unknown;
}

export interface CircleDto {
  id: number;
  name?: string | null;
  teacherId?: number | null;
  teacher?: LookUpUserDto;
  teacherName?: string | null;
  managers?: CircleManagerDto[] | null;
  students?: CircleStudentDto[] | null;
  day?: DayValue;
  dayId?: DayValue;
  dayIds?: (DaysEnum | number)[] | null;
  dayName?: string | null;
  dayNames?: string[] | null;
  days?: CircleDayDto[] | null;
  time?: CircleTimeValue;
  startTime?: CircleTimeValue;
}

export interface CreateCircleDto {
  name?: string | null;
  teacherId?: number | null;
  days?: CircleDayRequestDto[] | null;
  managers?: number[] | null;
  studentsIds?: number[] | null;
}

export interface UpdateCircleDto extends CreateCircleDto {
  id: number;
}

export interface UpcomingCircleDto {
  id: number;
  name?: string | null;
  nextDayId?: DaysEnum | number | null;
  nextDayName?: string | null;
  nextOccurrenceDate?: string | null;
  startTime?: CircleTimeValue;
  teacherId?: number | null;
  teacher?: LookUpUserDto;
  teacherName?: string | null;
  managers?: CircleManagerDto[] | null;
  days?: CircleDayDto[] | null;
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
    managerId?: number | null,
    teacherId?: number | null
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

    if (managerId !== undefined && managerId !== null) {
      params = params.set('managerId', managerId.toString());
    }

    if (teacherId !== undefined && teacherId !== null) {
      params = params.set('teacherId', teacherId.toString());
    }

    return this.http.get<ApiResponse<PagedResultDto<CircleDto>>>(
      `${environment.apiUrl}/api/Circle/GetResultsByFilter`,
      { params }
    );
  }

  getUpcoming(
    managerId?: number | null,
    teacherId?: number | null,
    take?: number | null
  ): Observable<ApiResponse<UpcomingCircleDto[]>> {
    let params = new HttpParams();

    if (managerId !== undefined && managerId !== null) {
      params = params.set('managerId', managerId.toString());
    }

    if (teacherId !== undefined && teacherId !== null) {
      params = params.set('teacherId', teacherId.toString());
    }

    if (take !== undefined && take !== null) {
      params = params.set('take', take.toString());
    }

    return this.http.get<ApiResponse<UpcomingCircleDto[]>>(
      `${environment.apiUrl}/api/Circle/Upcoming`,
      { params }
    );
  }
}

