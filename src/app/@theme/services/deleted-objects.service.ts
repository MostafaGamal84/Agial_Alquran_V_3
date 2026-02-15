import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { ApiResponse, FilteredResultRequestDto, PagedResultDto, normalizePagedResult } from './lookup.service';

@Injectable({ providedIn: 'root' })
export class DeletedObjectsService {
  private http = inject(HttpClient);

  getDeletedStudents(filter: FilteredResultRequestDto): Observable<ApiResponse<PagedResultDto<unknown>>> {
    return this.getDeletedUsersByEndpoint('/api/UsersForGroups/DeletedStudents', filter);
  }

  getDeletedTeachers(filter: FilteredResultRequestDto): Observable<ApiResponse<PagedResultDto<unknown>>> {
    return this.getDeletedUsersByEndpoint('/api/UsersForGroups/DeletedTeachers', filter);
  }

  getDeletedManagers(filter: FilteredResultRequestDto): Observable<ApiResponse<PagedResultDto<unknown>>> {
    return this.getDeletedUsersByEndpoint('/api/UsersForGroups/DeletedManagers', filter);
  }

  getDeletedBranchLeaders(filter: FilteredResultRequestDto): Observable<ApiResponse<PagedResultDto<unknown>>> {
    return this.getDeletedUsersByEndpoint('/api/UsersForGroups/DeletedBranchLeaders', filter);
  }

  getDeletedCircles(filter: FilteredResultRequestDto): Observable<ApiResponse<PagedResultDto<unknown>>> {
    return this.getPaged('/api/Circle/Deleted', filter);
  }

  getDeletedCircleReports(filter: FilteredResultRequestDto): Observable<ApiResponse<PagedResultDto<unknown>>> {
    return this.getPaged('/api/CircleReport/Deleted', filter);
  }

  private getDeletedUsersByEndpoint(endpoint: string, filter: FilteredResultRequestDto): Observable<ApiResponse<PagedResultDto<unknown>>> {
    return this.getPaged(endpoint, filter);
  }

  private getPaged(endpoint: string, filter: FilteredResultRequestDto): Observable<ApiResponse<PagedResultDto<unknown>>> {
    const params = this.buildQueryParams(filter);

    return this.http
      .get<ApiResponse<PagedResultDto<unknown>>>(`${environment.apiUrl}${endpoint}`, { params })
      .pipe(map((response) => normalizePagedResult(response, { skipCount: filter.skipCount })));
  }

  private buildQueryParams(filter: FilteredResultRequestDto): HttpParams {
    let params = new HttpParams();

    if (filter.skipCount !== undefined) {
      params = params.set('skipCount', filter.skipCount.toString());
    }

    if (filter.maxResultCount !== undefined) {
      params = params.set('maxResultCount', filter.maxResultCount.toString());
    }

    if (filter.searchTerm) {
      params = params.set('searchTerm', filter.searchTerm);
    }

    if (filter.sortBy) {
      params = params.set('sortBy', filter.sortBy);
    }

    if (filter.filter) {
      params = params.set('filter', filter.filter);
    }

    if (filter.residentGroup && filter.residentGroup !== 'all') {
      params = params.set('residentGroup', filter.residentGroup);
    }

    return params;
  }
}
