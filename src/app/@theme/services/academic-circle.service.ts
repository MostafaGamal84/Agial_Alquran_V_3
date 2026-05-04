import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { ApiResponse, FilteredResultRequestDto, PagedResultDto, normalizePagedResult } from './lookup.service';

export interface AcademicCircleDto {
  id: number;
  name?: string | null;
  teacherId?: number | null;
  teacherName?: string | null;
  branchId?: number | null;
  managerIds: number[];
  managerNames: string[];
  studentIds: number[];
  studentNames: string[];
  studentCount: number;
}

export interface CreateAcademicCircleDto {
  name?: string | null;
  teacherId?: number | null;
  managerIds?: number[] | null;
  studentIds?: number[] | null;
  branchId?: number | null;
}

export interface UpdateAcademicCircleDto extends CreateAcademicCircleDto {
  id: number;
}

@Injectable({ providedIn: 'root' })
export class AcademicCircleService {
  private http = inject(HttpClient);

  create(model: CreateAcademicCircleDto): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${environment.apiUrl}/api/AcademicCircle/Create`, model);
  }

  update(model: UpdateAcademicCircleDto): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${environment.apiUrl}/api/AcademicCircle/Update`, model);
  }

  delete(id: number): Observable<ApiResponse<boolean>> {
    const params = new HttpParams().set('id', id.toString());
    return this.http.post<ApiResponse<boolean>>(`${environment.apiUrl}/api/AcademicCircle/Delete`, null, { params });
  }

  get(id: number): Observable<ApiResponse<AcademicCircleDto>> {
    const params = new HttpParams().set('id', id.toString());
    return this.http.get<ApiResponse<AcademicCircleDto>>(`${environment.apiUrl}/api/AcademicCircle/Get`, { params });
  }

  getAll(
    filter: FilteredResultRequestDto,
    options?: { managerId?: number | null; teacherId?: number | null }
  ): Observable<ApiResponse<PagedResultDto<AcademicCircleDto>>> {
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
    if (options?.managerId && options.managerId > 0) {
      params = params.set('managerId', options.managerId.toString());
    }
    if (options?.teacherId && options.teacherId > 0) {
      params = params.set('teacherId', options.teacherId.toString());
    }

    return this.http
      .get<ApiResponse<PagedResultDto<AcademicCircleDto>>>(`${environment.apiUrl}/api/AcademicCircle/GetResultsByFilter`, { params })
      .pipe(map((response) => normalizePagedResult(response, { skipCount: filter.skipCount })));
  }
}
