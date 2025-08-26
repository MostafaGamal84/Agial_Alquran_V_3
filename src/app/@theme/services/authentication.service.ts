// angular import
import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

// project import
import { environment } from 'src/environments/environment';
import { User } from '../types/user';

// Import the 'map' operator from 'rxjs/operators'
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthenticationService {
  private router = inject(Router);
  private http = inject(HttpClient);

  private currentUserSignal = signal<User | null>(null);
  isLogin: boolean = false;

  constructor() {
    // Initialize the signal with the current user from localStorage
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      this.currentUserSignal.set(JSON.parse(storedUser) as User);
      this.isLogin = true;
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

  login(email: string, password: string) {
    return this.http.post<User>(`${environment.apiUrl}/api/account/login`, { email, password }).pipe(
      map((user: User) => {
        // Explicitly define the type for 'user'
        // Store user details and JWT token in local storage
        localStorage.setItem('currentUser', JSON.stringify(user));
        this.isLogin = true;
        // Update the signal with the new user
        this.currentUserSignal.set(user);
        return user;
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
