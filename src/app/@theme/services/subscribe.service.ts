import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {
  ApiResponse,
  FilteredResultRequestDto,
  PagedResultDto,
  normalizePagedResult
} from './lookup.service';
import { SubscribeAudience } from './subscribe-audience';

export enum SubscribeTypeCategory {
  Unknown = 0,
  Foreign = 1,
  Arab = 2,
  Egyptian = 3
}

export function getSubscribeTypeCategoryTranslationKey(
  type: SubscribeTypeCategory | null | undefined
): string {
  const category = type ?? SubscribeTypeCategory.Unknown;
  switch (category) {
    case SubscribeTypeCategory.Foreign:
      return 'Foreign';
    case SubscribeTypeCategory.Arab:
      return 'Arab';
    case SubscribeTypeCategory.Egyptian:
      return 'Egyptian';
    default:
      return 'Unknown';
  }
}

export interface SubscribeDto {
  id: number;
  name?: string;
  leprice?: number;
  sarprice?: number;
  usdprice?: number;
  minutes?: number;
  subscribeTypeId?: number;
  subscribeType?: SubscribeTypeDto;
  subscribeFor?: SubscribeAudience | null;
}

export interface CreateSubscribeDto {
  name?: string;
  leprice?: number;
  sarprice?: number;
  usdprice?: number;
  minutes?: number;
  subscribeTypeId?: number;
  subscribeFor?: SubscribeAudience | null;
}

export interface UpdateSubscribeDto extends CreateSubscribeDto {
  id: number;
}

export interface SubscribeTypeDto {
  id: number;
  name?: string;
  forignPricePerHour?: number;
  arabPricePerHour?: number;
  egyptPricePerHour?: number;
  type?: SubscribeTypeCategory | null;
}

export interface CreateSubscribeTypeDto {
  name?: string;
  forignPricePerHour?: number;
  arabPricePerHour?: number;
  egyptPricePerHour?: number;
  type?: SubscribeTypeCategory | null;
}

export interface UpdateSubscribeTypeDto extends CreateSubscribeTypeDto {
  id: number;
}

@Injectable({ providedIn: 'root' })
export class SubscribeService {
  private http = inject(HttpClient);

  // subscribe crud
  create(model: CreateSubscribeDto): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(
      `${environment.apiUrl}/api/Subscribe/CreateSubscribe`,
      model
    );
  }

  update(model: UpdateSubscribeDto): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(
      `${environment.apiUrl}/api/Subscribe/Update`,
      model
    );
  }

  delete(id: number): Observable<ApiResponse<boolean>> {
    const params = new HttpParams().set('id', id.toString());
    return this.http.get<ApiResponse<boolean>>(
      `${environment.apiUrl}/api/Subscribe/Delete`,
      { params }
    );
  }

  getAll(
    filter: FilteredResultRequestDto
  ): Observable<ApiResponse<PagedResultDto<SubscribeDto>>> {
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
      .get<ApiResponse<PagedResultDto<SubscribeDto>>>(
        `${environment.apiUrl}/api/Subscribe/GetResultsByFilter`,
        { params }
      )
      .pipe(map((response) => normalizePagedResult(response, { skipCount: filter.skipCount })));
  }

  // subscribe type crud
  createType(model: CreateSubscribeTypeDto): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(
      `${environment.apiUrl}/api/Subscribe/CreateSubscribeType`,
      model
    );
  }

  updateType(model: UpdateSubscribeTypeDto): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(
      `${environment.apiUrl}/api/Subscribe/UpdateType`,
      model
    );
  }

  deleteType(id: number): Observable<ApiResponse<boolean>> {
    const params = new HttpParams().set('id', id.toString());
    return this.http.get<ApiResponse<boolean>>(
      `${environment.apiUrl}/api/Subscribe/DeleteType`,
      { params }
    );
  }

  getAllTypes(
    filter: FilteredResultRequestDto
  ): Observable<ApiResponse<PagedResultDto<SubscribeTypeDto>>> {
    const payload: Record<string, unknown> = {};

    const assignValue = <T>(key: string, value: T | undefined | null) => {
      if (value !== undefined && value !== null) {
        payload[key] = value;
      }
    };

    assignValue('skipCount', filter.skipCount);
    assignValue('maxResultCount', filter.maxResultCount);
    assignValue('searchTerm', filter.searchTerm);
    assignValue('searchWord', filter.searchWord ?? filter.searchTerm);
    assignValue('filter', filter.filter);
    assignValue('lang', filter.lang);
    assignValue('sortingDirection', filter.sortingDirection);
    assignValue('sortBy', filter.sortBy);
    assignValue('studentId', filter.studentId);
    assignValue('nationalityId', filter.nationalityId);

    return this.http
      .post<ApiResponse<PagedResultDto<SubscribeTypeDto>>>(
        `${environment.apiUrl}/api/Subscribe/GetTypeResultsByFilter`,
        payload
      )
      .pipe(map((response) => normalizePagedResult(response, { skipCount: filter.skipCount })));
  }
}

