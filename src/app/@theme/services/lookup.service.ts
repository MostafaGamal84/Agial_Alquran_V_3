import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

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

@Injectable({ providedIn: 'root' })
export class LookupService {
  private http = inject(HttpClient);

  getUsersByUserType(userTypeId: number): Observable<ApiResponse<LookUpUserDto[]>> {
    return this.http.get<ApiResponse<LookUpUserDto[]>>(
      `${environment.apiUrl}/api/LookUp/GetUsersByUserType`,
      { params: { UserTypeId: userTypeId } }
    );
  }
}

