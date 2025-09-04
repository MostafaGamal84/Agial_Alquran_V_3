import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  ApiResponse,
  FilteredResultRequestDto,
  LookUpUserDto,
  PagedResultDto,
} from './lookup.service';

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

@Injectable({ providedIn: 'root' })
export class CircleReportService {
  private http = inject(HttpClient);

  create(model: CircleReportAddDto): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(
      `${environment.apiUrl}/api/CircleReport/Create`,
      model
    );
  }

  getUsersForGroup(
    filter: FilteredResultRequestDto,
    userTypeId: number,
    teacherId: number
  ): Observable<ApiResponse<PagedResultDto<LookUpUserDto>>> {
    let params = new HttpParams()
      .set('UserTypeId', userTypeId.toString())
      .set('teacherId', teacherId.toString());

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

    return this.http.get<ApiResponse<PagedResultDto<LookUpUserDto>>>(
      `${environment.apiUrl}/api/UsersForGroups/ManagerRequestTeacherAndStudent`,
      { params }
    );
  }
}

