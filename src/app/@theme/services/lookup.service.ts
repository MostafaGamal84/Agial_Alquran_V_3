import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { AuthenticationService } from './authentication.service';
import { UserTypesEnum } from '../types/UserTypesEnum';
import { ResidencyGroupFilter, hasActiveResidencyGroup } from '../types/residency-group';

export interface LookUpUserDto {
  id: number;
  fullName: string;
  email: string;
  mobile: string;
  secondMobile: string;
  nationality: string;
  nationalityId: number;
  resident?: string;
  residentId?: number;
  governorate: string;
  governorateId: number;
  branchId: number;
  inactive?: boolean;
  managerId?: number;
  managerName?: string;
  teacherId?: number;
  teacherName?: string;
  circleId?: number;
  circleName?: string;
  students?: Array<{ id?: number; fullName?: string }>;
  teachers?: Array<{ id?: number; fullName?: string }>;
  managerCircles?: Array<{ circleId?: number; circle?: string }>;
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
  searchWord?: string;
  filter?: string;
  lookupOnly?: boolean;
  lookup?: boolean;
  idsOnly?: boolean;
  lang?: string;
  sortingDirection?: string;
  sortBy?: string;
  maxResultCount?: number;
  studentId?: number;
  nationalityId?: number;
  residentId?: number;
  residentGroup?: ResidencyGroupFilter | null;
}

export interface PagedResultDto<T> {
  totalCount: number;
  items: T[];
}

export interface NormalizePagedResultOptions {
  skipCount?: number | null;
}

export function normalizePagedResult<T>(
  response: ApiResponse<PagedResultDto<T>>,
  options: NormalizePagedResultOptions = {}
): ApiResponse<PagedResultDto<T>> {
  const responseData = response.data as unknown;
  const arrayPayload = Array.isArray(responseData) ? (responseData as T[]) : null;
  const rawData =
    responseData && !Array.isArray(responseData)
      ? (responseData as PagedResultDto<T>)
      : ({ totalCount: arrayPayload?.length ?? 0, items: arrayPayload ?? [] } as PagedResultDto<T>);
  const rawItems = (rawData as Partial<PagedResultDto<T>>).items;
  const items = Array.isArray(rawItems) ? rawItems : arrayPayload ?? [];

  const parseNumeric = (value: unknown): number | undefined => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const dataSkipCount = (rawData as Partial<{ skipCount: number | string }>).skipCount;
  const skipSources = [options.skipCount, dataSkipCount]
    .map(parseNumeric)
    .filter((value): value is number => value !== undefined);
  const skipCandidate = skipSources.length > 0 ? skipSources[0] : 0;
  const skipCount = Math.max(0, Math.trunc(skipCandidate));

  const fallbackTotal = skipCount + items.length;

  const totalCandidates: Array<number | string | undefined> = [
    (rawData as Partial<{ totalCount: number | string }>).totalCount,
    (rawData as Partial<{ total: number | string }>).total,
    (rawData as Partial<{ count: number | string }>).count,
    (rawData as Partial<{ totalItems: number | string }>).totalItems,
    (rawData as Partial<{ totalRecords: number | string }>).totalRecords,
    (response as Partial<{ totalCount: number | string }>).totalCount,
    (response as Partial<{ total: number | string }>).total,
    (response as Partial<{ count: number | string }>).count
  ];
  const parsedTotal = totalCandidates.map(parseNumeric).find((value) => value !== undefined);
  const normalizedTotal = parsedTotal !== undefined
    ? Math.max(Math.trunc(parsedTotal), fallbackTotal)
    : fallbackTotal;

  return {
    ...response,
    data: {
      ...rawData,
      items,
      totalCount: normalizedTotal
    }
  };
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

export interface LookupDto {
  id: number;
  name: string;
}

export interface SubscribeLookupDto extends LookupDto {
  allowedNationalities?: string[] | null;
  durationMonths?: number | null;
  price?: number | null;
  currencyId?: number | null;
  currencyCode?: string | null;
  isRecommended?: boolean | null;
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
    branchId = 0,
    residentId?: number | null,
    includeRelations = false
  ): Observable<ApiResponse<PagedResultDto<LookUpUserDto>>> {
    const role = this.auth.getRole();
    const effectiveBranchId = role === UserTypesEnum.Admin ? 0 : branchId;
    const lookupMode = this.resolveLookupMode(filter);
    const shouldPaginate = !lookupMode;
    let params = new HttpParams()
      .set('UserTypeId', userTypeId.toString())
      .set('managerId', managerId.toString())
      .set('teacherId', teacherId.toString())
      .set('branchId', effectiveBranchId.toString());
    if (shouldPaginate && filter.skipCount !== undefined) {
      params = params.set('SkipCount', filter.skipCount.toString());
    }
    if (shouldPaginate && filter.maxResultCount !== undefined) {
      params = params.set('MaxResultCount', filter.maxResultCount.toString());
    }
    const searchWord = filter.searchWord ?? filter.searchTerm;

    if (filter.searchTerm) {
      params = params.set('SearchTerm', filter.searchTerm);
    }
    if (searchWord) {
      params = params.set('SearchWord', searchWord);
    }
    const filterTokens: string[] = [];

    if (filter.filter) {
      filterTokens.push(filter.filter);
    }

    if (lookupMode) {
      filterTokens.push(`${lookupMode}=true`);
    }

    if (filterTokens.length) {
      params = params.set('Filter', filterTokens.join('&'));
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

    if (residentId && residentId > 0) {
      params = params.set('residentId', residentId.toString());
    }

    if (hasActiveResidencyGroup(filter.residentGroup)) {
      params = params.set('residentGroup', filter.residentGroup);
    }

    if (includeRelations) {
      params = params.set('includeRelations', 'true');
    }

    return this.http
      .get<ApiResponse<PagedResultDto<LookUpUserDto>>>(
        `${environment.apiUrl}/api/UsersForGroups/GetUsersForSelects`,
        {
          params
        }
      )
      .pipe(map((response) => normalizePagedResult(response, { skipCount: filter.skipCount })));
  }

  getUserDetails(id: number): Observable<ApiResponse<LookUpUserDto>> {
    const params = new HttpParams().set('id', id.toString());
    return this.http.get<ApiResponse<LookUpUserDto>>(
      `${environment.apiUrl}/api/UsersForGroups/GetUserDetails`,
      { params }
    );
  }

  private resolveLookupMode(filter: FilteredResultRequestDto): 'lookupOnly' | 'lookup' | 'idsOnly' | null {
    if (filter.lookupOnly) {
      return 'lookupOnly';
    }

    if (filter.lookup) {
      return 'lookup';
    }

    if (filter.idsOnly) {
      return 'idsOnly';
    }

    return null;
  }

  getAllNationalities(): Observable<ApiResponse<NationalityDto[]>> {
    return this.http.get<ApiResponse<NationalityDto[]>>(`${environment.apiUrl}/api/LookUp/GetAllNationality`);
  }

  getAllGovernorates(): Observable<ApiResponse<GovernorateDto[]>> {
    return this.http.get<ApiResponse<GovernorateDto[]>>(`${environment.apiUrl}/api/LookUp/GetAllGovernorate`);
  }

  getSubscribesByTypeId(
    id?: number | null,
    studentId?: number | null
  ): Observable<ApiResponse<SubscribeLookupDto[]>> {
    let params = new HttpParams();
    if (id !== undefined && id !== null) {
      params = params.set('id', id.toString());
    }
    if (studentId !== undefined && studentId !== null && studentId > 0) {
      params = params.set('studentId', studentId.toString());
    }
    return this.http.get<ApiResponse<SubscribeLookupDto[]>>(
      `${environment.apiUrl}/api/LookUp/GetAllSubscribesByTypeId`,
      { params }
    );
  }
}
