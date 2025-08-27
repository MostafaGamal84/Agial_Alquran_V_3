// angular import
import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';

// project import
import { environment } from 'src/environments/environment';
import { User } from '../types/user';
import { Role } from '../types/role';

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
  role: number | null;
}

interface VerifyCodeResponse {
  isSuccess: boolean;
  errors: ApiError[];
  data: VerifyCodeData | null;
}

@Injectable({ providedIn: 'root' })
export class AuthenticationService {
  private router = inject(Router);
  private http = inject(HttpClient);

  private currentUserSignal = signal<User | null>(null);
  isLogin: boolean = false;
  pendingEmail: string | null = null;

  constructor() {
    // Initialize the signal with the current user from localStorage
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        this.currentUserSignal.set(JSON.parse(storedUser) as User);
        this.isLogin = true;
      } catch (err) {
        // If stored data is corrupted, remove it and keep the user logged out
        console.error('Failed to parse stored user', err);
        localStorage.removeItem('currentUser');
      }
    }
  }

  public get currentUserValue(): User | null {
    // Access the current user value from the signal
    return this.currentUserSignal();
  }

  public get currentUserName(): string | null {
    const currentUser = this.currentUserValue;
    return currentUser ? currentUser.user.name : null;
  }

  public getRole(): Role | null {
    try {
      const currentUser = this.currentUserValue;
      return currentUser?.user?.role ?? null;
    } catch (err) {
      console.error('Error retrieving user role', err);
      return null;
    }
  }

  login(email: string, password: string) {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/api/Account/Login`, { email, password });
  }

  verifyCode(code: string, email?: string) {
    return this.http
      .post<VerifyCodeResponse>(`${environment.apiUrl}/api/Account/VerifyCode`, { email, code })
      .pipe(
        tap((res) => {
          if (res.isSuccess && res.data) {
            const user: User = {
              serviceToken: res.data.token,
              refreshToken: res.data.refreshToken,
              user: {
                id: '',
                email: email ?? '',
                password: '',
                name: res.data.username,
                role: res.data.role === 1 ? Role.Admin : Role.User
              }
            };
            localStorage.setItem('currentUser', JSON.stringify(user));
            this.currentUserSignal.set(user);
            this.isLogin = true;
            this.pendingEmail = null;
          }
        })
      );
  }

  isLoggedIn() {
    return this.isLogin;
  }

  logout() {
    // Remove user from local storage to log user out
    localStorage.removeItem('currentUser');
    this.isLogin = false;
    // Update the signal to null
    this.currentUserSignal.set(null);
    this.router.navigate(['/login']);
  }
}
