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
interface ApiError {
  fieldName: string;
  code: string;
  message: string;
  fieldLang: string | null;
}

interface LoginData {
  email: string;
  code: string;
  passwordIsCorrect: boolean;
}

interface LoginResponse {
  isSuccess: boolean;
  errors: ApiError[];
  data: LoginData | null;
}

interface VerifyCodeData {
  token: string;
  refreshToken: string;
  username: string;
  role: number | string | null; // can come as number or string from backend
}

interface VerifyCodeResponse {
  isSuccess: boolean;
  errors: ApiError[];
  data: VerifyCodeData | null;
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

  // ------- Role mapping helpers -------
  // backend numeric id -> enum (string ids in your enum)
  private readonly roleIdToEnum: Record<number, UserTypesEnum> = {
    1: UserTypesEnum.Admin,
    2: UserTypesEnum.BranchLeader,
    3: UserTypesEnum.Manager,
    4: UserTypesEnum.Teacher,
    5: UserTypesEnum.Student,
  };

  private mapRoleToEnum(role: number | string | null | undefined): UserTypesEnum {
    // normalize to number first (enum stores string IDs)
    const n = typeof role === 'string' ? parseInt(role, 10) : (role ?? NaN as number);
    return this.roleIdToEnum[n] ?? UserTypesEnum.Manager; // sensible fallback
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
          }
        })
      );
  }

  // ------- Session ops -------
  logout(): void {
    localStorage.removeItem(this.storageKey);
    this.isLogin = false;
    this.pendingEmail = null;
    this.currentUserSignal.set(null);
    this.router.navigate(['/login']);
  }
}
