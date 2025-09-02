import { HttpClient } from '@angular/common/http';
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
    return this.http.get<ApiResponse<PagedResultDto<LookUpUserDto>>>(`${environment.apiUrl}/api/LookUp/GetUsersByUserType`, {
      params: {
        UserTypeId: userTypeId,
        SkipCount: filter.skipCount,
        MaxResultCount: filter.maxResultCount,
        SearchTerm: filter.searchTerm,
        Filter: filter.filter,
        Lang: filter.lang,
        SortingDirection: filter.sortingDirection,
        SortBy: filter.sortBy
      }
    });
  }
}
