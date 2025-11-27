// angular imports
import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';

// project imports
import { environment } from 'src/environments/environment';
import { User } from '../types/user';
import { UserTypesEnum } from '../types/UserTypesEnum';

// ------------ API DTOs ------------
export interface ApiError {
  fieldName: string;
  code: string;
  message: string;
  fieldLang: string | null;
}

export interface ApiResponse<T> {
  isSuccess: boolean;
  errors: ApiError[];
  data: T | null;
  message?: string | null;
}

interface LoginData {
  email: string;
  code: string;
  passwordIsCorrect: boolean;
}

type LoginResponse = ApiResponse<LoginData>;

interface VerifyCodeData {
  token: string;
  refreshToken: string;
  username: string;
  role: number | string | null; // can come as number or string from backend
}

type VerifyCodeResponse = ApiResponse<VerifyCodeData>;

interface ResetPasswordPayload {
  email: string;
  newPassword: string;
  code: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

@Injectable({ providedIn: 'root' })
export class AuthenticationService {
  // DI
  private router = inject(Router);
  private http = inject(HttpClient);

  // localStorage key
  private readonly storageKey = 'currentUser';

  // app state
  private currentUserSignal = signal<User | null>(null);
  isLogin: boolean = false;
  pendingEmail: string | null = null;
  pendingCode: string | null = null;

  // ------- Role mapping helpers -------
  // backend numeric id -> enum
  private readonly roleIdToEnum: Record<number, UserTypesEnum> = {
    1: UserTypesEnum.Admin,
    2: UserTypesEnum.BranchLeader,
    3: UserTypesEnum.Manager,
    4: UserTypesEnum.Teacher,
    5: UserTypesEnum.Student,
  };

  private mapRoleToEnum(role: number | string | null | undefined): UserTypesEnum {
    const normalizedRole = typeof role === 'string' ? Number(role) : role;
    const resolvedRole = normalizedRole ?? NaN;
    return this.roleIdToEnum[resolvedRole] ?? UserTypesEnum.Manager; // sensible fallback
  }

  constructor() {
    // Initialize from localStorage
    const storedUser = localStorage.getItem(this.storageKey);
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser) as User;
        this.currentUserSignal.set(parsed);
        this.isLogin = true;
      } catch (err) {
        console.error('Failed to parse stored user', err);
        localStorage.removeItem(this.storageKey);
        this.currentUserSignal.set(null);
        this.isLogin = false;
      }
    }
  }

  // ------- Getters -------
  public get currentUserValue(): User | null {
    return this.currentUserSignal();
  }

  public get currentUserName(): string | null {
    const u = this.currentUserSignal();
    return u?.user?.name ?? null;
  }

  public getRole(): UserTypesEnum | null {
    try {
      const u = this.currentUserSignal();
      return u?.user?.role ?? null;
    } catch (err) {
      console.error('Error retrieving user role', err);
      return null;
    }
  }

  public getAccessToken(): string | null {
    return this.currentUserSignal()?.serviceToken ?? null;
  }

  public getRefreshToken(): string | null {
    return this.currentUserSignal()?.refreshToken ?? null;
  }

  public isLoggedIn(): boolean {
    return this.isLogin;
  }

  // ------- Auth calls -------
  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/api/Account/Login`, { email, password })
      .pipe(
        tap((res) => {
          // If backend uses 2FA/verification, keep email to use in verify step
          if (res.isSuccess && res.data) {
            this.pendingEmail = email;
          }
        })
      );
  }

  verifyCode(code: string, email?: string): Observable<VerifyCodeResponse> {
    const body = { email: email ?? this.pendingEmail, code };
    return this.http
      .post<VerifyCodeResponse>(`${environment.apiUrl}/api/Account/VerifyCode`, body)
      .pipe(
        tap((res) => {
          if (res.isSuccess && res.data) {
            const user: User = {
              serviceToken: res.data.token,
              refreshToken: res.data.refreshToken,
              user: {
                id: '',                 // set if your API returns it elsewhere
                email: body.email ?? '',// we keep the email we verified
                password: '',           // never store real password
                name: res.data.username,
                role: this.mapRoleToEnum(res.data.role)
              }
            };
            // persist
            localStorage.setItem(this.storageKey, JSON.stringify(user));
            this.currentUserSignal.set(user);
            this.isLogin = true;
            this.pendingEmail = null;
            this.pendingCode = null;
          }
        })
      );
  }

  forgetPassword(email: string): Observable<ApiResponse<string>> {
    return this.http
      .post<ApiResponse<string>>(`${environment.apiUrl}/api/Account/ForgetPassword`, { email })
      .pipe(
        tap((res) => {
          if (res.isSuccess) {
            this.pendingEmail = email;
          }
        })
      );
  }

  resetPassword(payload: ResetPasswordPayload): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${environment.apiUrl}/api/Account/ResetPassword`, payload);
  }

  changePassword(payload: ChangePasswordPayload): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${environment.apiUrl}/api/Account/ChangePassword`, payload);
  }

  // ------- Session ops -------
  logout(): void {
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem('ajyal-email');
    localStorage.removeItem('ajyal-id');
    localStorage.removeItem('ajyal-token');
    localStorage.removeItem('showCurrency');
    localStorage.removeItem('user');
    localStorage.removeItem('userType');
    this.isLogin = false;
    this.pendingEmail = null;
    this.pendingCode = null;
    // Update the signal to null
    this.currentUserSignal.set(null);
    this.router.navigate(['/login']);
  }
}
