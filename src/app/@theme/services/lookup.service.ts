import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthenticationService } from './authentication.service';
import { UserTypesEnum } from '../types/UserTypesEnum';

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
  managerId?: number;
  managerName?: string;
  circleId?: number;
  circleName?: string;
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

export interface NationalityDto {
  id: number;
  name: string;
  telCode: number;
}

export interface GovernorateDto {
  id: number;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class LookupService {
  private http = inject(HttpClient);
  private auth = inject(AuthenticationService);

  getUsersForSelects(
    filter: FilteredResultRequestDto,
    userTypeId: number,
    managerId = 0,
    teacherId = 0,
    branchId = 0
  ): Observable<ApiResponse<PagedResultDto<LookUpUserDto>>> {
    const role = this.auth.getRole();
    const effectiveBranchId = role === UserTypesEnum.Admin ? 0 : branchId;
    let params = new HttpParams()
      .set('UserTypeId', userTypeId.toString())
      .set('managerId', managerId.toString())
      .set('teacherId', teacherId.toString())
      .set('branchId', effectiveBranchId.toString());
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

    return this.http.get<ApiResponse<PagedResultDto<LookUpUserDto>>>(`${environment.apiUrl}/api/UsersForGroups/GetUsersForSelects`, {
      params
    });
  }

  getAllNationalities(): Observable<ApiResponse<NationalityDto[]>> {
    return this.http.get<ApiResponse<NationalityDto[]>>(`${environment.apiUrl}/api/LookUp/GetAllNationality`);
  }

  getAllGovernorates(): Observable<ApiResponse<GovernorateDto[]>> {
    return this.http.get<ApiResponse<GovernorateDto[]>>(`${environment.apiUrl}/api/LookUp/GetAllGovernorate`);
  }
}
