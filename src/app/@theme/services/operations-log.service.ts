import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { ApiResponse, PagedResultDto, normalizePagedResult } from './lookup.service';

export interface AuditLogChangeDto {
  propertyName: string;
  propertyLabel: string;
  oldValue?: string | null;
  newValue?: string | null;
}

export interface AuditLogParticipantDto {
  participantType?: string | null;
  participantId?: number | null;
  participantLabel?: string | null;
  displayName?: string | null;
}

export interface AuditLogListItemDto {
  id: number;
  actionType?: string | null;
  entityType?: string | null;
  entityId?: number | null;
  entityLabel?: string | null;
  entityDisplayName?: string | null;
  summary?: string | null;
  actorUserId?: number | null;
  actorName?: string | null;
  actorRoleId?: number | null;
  sourceScreen?: string | null;
  sourceRoute?: string | null;
  requestPath?: string | null;
  httpMethod?: string | null;
  createdAt?: string | null;
  changes: AuditLogChangeDto[];
  participants: AuditLogParticipantDto[];
}

export interface AuditLogFilterDto {
  skipCount?: number;
  maxResultCount?: number;
  searchTerm?: string;
  actionType?: string | null;
  entityType?: string | null;
  actorUserId?: number | null;
  studentId?: number | null;
  managerId?: number | null;
  teacherId?: number | null;
  subscribeId?: number | null;
  subscribeTypeId?: number | null;
  circleId?: number | null;
  studentPaymentId?: number | null;
  circleReportId?: number | null;
  fromDate?: Date | string | null;
  toDate?: Date | string | null;
  sortBy?: string;
  sortingDirection?: string;
}

export interface AuditLogFilterOptionDto {
  value: string;
  label: string;
}

export interface AuditLogFilterOptionsDto {
  actionTypes: AuditLogFilterOptionDto[];
  entityTypes: AuditLogFilterOptionDto[];
}

@Injectable({ providedIn: 'root' })
export class OperationsLogService {
  private http = inject(HttpClient);

  getLogs(filter: AuditLogFilterDto): Observable<ApiResponse<PagedResultDto<AuditLogListItemDto>>> {
    const params = this.buildQueryParams(filter);

    return this.http
      .get<ApiResponse<PagedResultDto<AuditLogListItemDto>>>(
        `${environment.apiUrl}/api/AuditLog/GetResultsByFilter`,
        { params }
      )
      .pipe(map((response) => normalizePagedResult(response, { skipCount: filter.skipCount })));
  }

  getFilterOptions(): Observable<ApiResponse<AuditLogFilterOptionsDto>> {
    return this.http.get<ApiResponse<AuditLogFilterOptionsDto>>(
      `${environment.apiUrl}/api/AuditLog/GetFilterOptions`
    );
  }

  private buildQueryParams(filter: AuditLogFilterDto): HttpParams {
    let params = new HttpParams();

    const appendValue = (key: string, value: string | number | null | undefined) => {
      if (value !== undefined && value !== null && `${value}`.trim() !== '') {
        params = params.set(key, `${value}`);
      }
    };

    appendValue('skipCount', filter.skipCount);
    appendValue('maxResultCount', filter.maxResultCount);
    appendValue('searchTerm', filter.searchTerm);
    appendValue('actionType', filter.actionType);
    appendValue('entityType', filter.entityType);
    appendValue('actorUserId', filter.actorUserId);
    appendValue('studentId', filter.studentId);
    appendValue('managerId', filter.managerId);
    appendValue('teacherId', filter.teacherId);
    appendValue('subscribeId', filter.subscribeId);
    appendValue('subscribeTypeId', filter.subscribeTypeId);
    appendValue('circleId', filter.circleId);
    appendValue('studentPaymentId', filter.studentPaymentId);
    appendValue('circleReportId', filter.circleReportId);
    appendValue('sortBy', filter.sortBy);
    appendValue('sortingDirection', filter.sortingDirection);

    appendValue('fromDate', this.serializeDate(filter.fromDate));
    appendValue('toDate', this.serializeDate(filter.toDate));

    return params;
  }

  private serializeDate(value: Date | string | null | undefined): string | undefined {
    if (!value) {
      return undefined;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    const parsedDate = new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? undefined : parsedDate.toISOString();
  }
}
