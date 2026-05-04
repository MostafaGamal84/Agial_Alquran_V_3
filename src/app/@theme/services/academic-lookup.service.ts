import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse, LookupDto } from './lookup.service';

@Injectable({ providedIn: 'root' })
export class AcademicLookupService {
  private http = inject(HttpClient);

  getSubjects(): Observable<ApiResponse<LookupDto[]>> {
    return this.http.get<ApiResponse<LookupDto[]>>(`${environment.apiUrl}/api/AcademicLookup/Subjects`);
  }

  getManagers(): Observable<ApiResponse<LookupDto[]>> {
    return this.http.get<ApiResponse<LookupDto[]>>(`${environment.apiUrl}/api/AcademicLookup/Managers`);
  }

  getTeachers(managerId?: number | null): Observable<ApiResponse<LookupDto[]>> {
    let params = new HttpParams();
    if (managerId && managerId > 0) {
      params = params.set('managerId', managerId.toString());
    }

    return this.http.get<ApiResponse<LookupDto[]>>(`${environment.apiUrl}/api/AcademicLookup/Teachers`, { params });
  }

  getTeachersForAssignment(): Observable<ApiResponse<LookupDto[]>> {
    return this.http.get<ApiResponse<LookupDto[]>>(`${environment.apiUrl}/api/AcademicLookup/TeachersForAssignment`);
  }

  getCircles(managerId?: number | null, teacherId?: number | null): Observable<ApiResponse<LookupDto[]>> {
    let params = new HttpParams();
    if (managerId && managerId > 0) {
      params = params.set('managerId', managerId.toString());
    }
    if (teacherId && teacherId > 0) {
      params = params.set('teacherId', teacherId.toString());
    }

    return this.http.get<ApiResponse<LookupDto[]>>(`${environment.apiUrl}/api/AcademicLookup/Circles`, { params });
  }

  getStudents(circleId?: number | null): Observable<ApiResponse<LookupDto[]>> {
    let params = new HttpParams();
    if (circleId && circleId > 0) {
      params = params.set('circleId', circleId.toString());
    }

    return this.http.get<ApiResponse<LookupDto[]>>(`${environment.apiUrl}/api/AcademicLookup/Students`, { params });
  }

  getStudentsForAssignment(): Observable<ApiResponse<LookupDto[]>> {
    return this.http.get<ApiResponse<LookupDto[]>>(`${environment.apiUrl}/api/AcademicLookup/StudentsForAssignment`);
  }
}
