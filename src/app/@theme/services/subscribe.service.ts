import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  ApiResponse,
  FilteredResultRequestDto,
  PagedResultDto
} from './lookup.service';

export interface SubscribeDto {
  id: number;
  name?: string;
  leprice?: number;
  sarprice?: number;
  usdprice?: number;
  minutes?: number;
  subscribeTypeId?: number;
  subscribeType?: SubscribeTypeDto;
}

export interface CreateSubscribeDto {
  name?: string;
  leprice?: number;
  sarprice?: number;
  usdprice?: number;
  minutes?: number;
  subscribeTypeId?: number;
}

export interface UpdateSubscribeDto extends CreateSubscribeDto {
  id: number;
}

export interface SubscribeTypeDto {
  id: number;
  name?: string;
  forignPricePerHour?: number;
  arabPricePerHour?: number;
}

export interface CreateSubscribeTypeDto {
  name?: string;
  forignPricePerHour?: number;
  arabPricePerHour?: number;
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

  get(id: number): Observable<ApiResponse<SubscribeDto>> {
    const params = new HttpParams().set('id', id.toString());
    return this.http.get<ApiResponse<SubscribeDto>>(
      `${environment.apiUrl}/api/Subscribe/GetSubscribeById`,
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
    return this.http.get<ApiResponse<PagedResultDto<SubscribeDto>>>(
      `${environment.apiUrl}/api/Subscribe/GetResultsByFilter`,
      { params }
    );
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

  getType(id: number): Observable<ApiResponse<SubscribeTypeDto>> {
    const params = new HttpParams().set('id', id.toString());
    return this.http.get<ApiResponse<SubscribeTypeDto>>(
      `${environment.apiUrl}/api/Subscribe/GetSubscribeTypeById`,
      { params }
    );
  }

  getAllTypes(
    filter: FilteredResultRequestDto
  ): Observable<ApiResponse<PagedResultDto<SubscribeTypeDto>>> {
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
    return this.http.get<ApiResponse<PagedResultDto<SubscribeTypeDto>>>(
      `${environment.apiUrl}/api/Subscribe/GetTypeResultsByFilter`,
      { params }
    );
  }
}

