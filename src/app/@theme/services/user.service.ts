import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface CreateUserDto {
  fullName?: string;
  email?: string;
  mobile?: string;
  secondMobile?: string;
  passwordHash?: string;
  userTypeId?: number;
  nationalityId?: number;
  governorateId?: number;
  branchId?: number;
}

export interface UpdateUserDto {
  id: number;
  fullName?: string;
  email?: string;
  mobile?: string;
  secondMobile?: string;
  nationalityId?: number;
  governorateId?: number;
  branchId?: number;
  managerId?: number;
  teacherId?: number;
  teacherIds?: number[];
  studentIds?: number[];
  circleIds?: number[];
  circleId?: number;
}

// Generic API response interfaces
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
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);

  createUser(model: CreateUserDto): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${environment.apiUrl}/api/User/Create`, model);
  }

  updateUser(model: UpdateUserDto): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${environment.apiUrl}/api/User/Update`, model);

  }

  disableUser(id: number, statue: boolean): Observable<ApiResponse<boolean>> {
    const params = new HttpParams()
      .set('id', id.toString())
      .set('statue', statue.toString());
    return this.http.get<ApiResponse<boolean>>(
      `${environment.apiUrl}/api/User/DisableUser`,
      { params }
    );
  }
}
