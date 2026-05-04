import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { ApiResponse, FilteredResultRequestDto, PagedResultDto, normalizePagedResult } from './lookup.service';

export interface AcademicSubjectDto {
  id: number;
  name?: string | null;
  displayOrder?: number | null;
  reportsCount: number;
  isUsed: boolean;
  createdAt?: string | null;
}

export interface CreateAcademicSubjectDto {
  name?: string | null;
  displayOrder?: number | null;
}

export interface UpdateAcademicSubjectDto extends CreateAcademicSubjectDto {
  id: number;
}

@Injectable({ providedIn: 'root' })
export class AcademicSubjectService {
  private http = inject(HttpClient);

  create(model: CreateAcademicSubjectDto): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${environment.apiUrl}/api/AcademicSubject/Create`, model);
  }

  update(model: UpdateAcademicSubjectDto): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${environment.apiUrl}/api/AcademicSubject/Update`, model);
  }

  delete(id: number): Observable<ApiResponse<boolean>> {
    const params = new HttpParams().set('id', id.toString());
    return this.http.post<ApiResponse<boolean>>(`${environment.apiUrl}/api/AcademicSubject/Delete`, null, { params });
  }

  get(id: number): Observable<ApiResponse<AcademicSubjectDto>> {
    const params = new HttpParams().set('id', id.toString());
    return this.http.get<ApiResponse<AcademicSubjectDto>>(`${environment.apiUrl}/api/AcademicSubject/Get`, { params });
  }

  getAll(filter: FilteredResultRequestDto): Observable<ApiResponse<PagedResultDto<AcademicSubjectDto>>> {
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

    return this.http
      .get<ApiResponse<PagedResultDto<AcademicSubjectDto>>>(`${environment.apiUrl}/api/AcademicSubject/GetResultsByFilter`, { params })
      .pipe(map((response) => normalizePagedResult(response, { skipCount: filter.skipCount })));
  }
}
