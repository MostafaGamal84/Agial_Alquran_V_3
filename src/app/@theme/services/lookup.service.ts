import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface LookUpUserDto {
  id: number;
  fullName: string;
  email: string;
  mobile: string;
  secondMobile: string;
  nationality: string;
  nationalityId: number;
  governorate: string;
  governorateId: number;
  branchId: number;
}

export interface ApiError {
  fieldName: string;
  code: string;
  message: string;
  fieldLang: string | null;
}

export interface ApiResponse<T> {
  isSuccess: boolean;
  errors: ApiError[];
  data: T;
}

export interface FilteredResultRequestDto {
  skipCount?: number;
  searchTerm?: string;
  filter?: string;
  lang?: string;
  sortingDirection?: string;
  sortBy?: string;
  maxResultCount?: number;
}

export interface PagedResultDto<T> {
  totalCount: number;
  items: T[];
}

@Injectable({ providedIn: 'root' })
export class LookupService {
  private http = inject(HttpClient);
  getUsersByUserType(filter: FilteredResultRequestDto, userTypeId: number): Observable<ApiResponse<PagedResultDto<LookUpUserDto>>> {
    let params = new HttpParams().set('UserTypeId', userTypeId.toString());
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
      `${environment.apiUrl}/api/LookUp/GetUsersByUserType`,
      { params }
    );
  }
}
