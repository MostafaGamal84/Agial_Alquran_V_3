import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { AuthenticationService } from './authentication.service';
import { UserTypesEnum } from '../types/UserTypesEnum';
import { SubscribeAudience } from './subscribe-audience';

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
  inactive?: boolean;
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
  searchWord?: string;
  filter?: string;
  lang?: string;
  sortingDirection?: string;
  sortBy?: string;
  maxResultCount?: number;
  studentId?: number;
  nationalityId?: number;
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
  const rawData = response.data ?? ({ totalCount: 0, items: [] } as PagedResultDto<T>);
  const rawItems = rawData.items;
  const items = Array.isArray(rawItems) ? rawItems : [];

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

  const parsedTotal = parseNumeric((rawData as Partial<{ totalCount: number | string }>).totalCount);
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
  subscribeFor?: SubscribeAudience | null;
  leprice?: number | null;
  sarprice?: number | null;
  usdprice?: number | null;
  allowedNationalities?: string[] | null;
  durationMonths?: number | null;
  price?: number | null;
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
    nationalityId?: number | null
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

    if (nationalityId && nationalityId > 0) {
      params = params.set('nationalityId', nationalityId.toString());
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
