import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from './lookup.service';

export interface CircleReportAddDto {
  id?: number;
  minutes?: number;
  newId?: number;
  newFrom?: string;
  newTo?: string;
  newRate?: string;
  recentPast?: string;
  recentPastRate?: string;
  distantPast?: string;
  distantPastRate?: string;
  farthestPast?: string;
  farthestPastRate?: string;
  theWordsQuranStranger?: string;
  intonation?: string;
  other?: string;
  creationTime: Date;
  circleId?: number;
  studentId?: number;
  teacherId?: number;
  attendStatueId?: number;
}

@Injectable({ providedIn: 'root' })
export class CircleReportService {
  private http = inject(HttpClient);

  create(model: CircleReportAddDto): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(
      `${environment.apiUrl}/api/CircleReport/Create`,
      model
    );
  }

  update(model: CircleReportAddDto): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(
      `${environment.apiUrl}/api/CircleReport/Update`,
      model
    );
  }

  get(id: number): Observable<ApiResponse<CircleReportAddDto>> {
    const params = new HttpParams().set('id', id.toString());
    return this.http.get<ApiResponse<CircleReportAddDto>>(
      `${environment.apiUrl}/api/CircleReport/Get`,
      { params }
    );
  }
}

