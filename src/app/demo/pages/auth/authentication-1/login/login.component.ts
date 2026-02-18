import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { first } from 'rxjs/operators';

// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';
import { AuthenticationService } from 'src/app/@theme/services/authentication.service';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { LoadingOverlayComponent } from 'src/app/@theme/components/loading-overlay/loading-overlay.component';
import { DASHBOARD_PATH } from 'src/app/app-config';

// لو عندك LanguageService زي اللي بتستخدمه في interceptor
import { LanguageService } from 'src/app/@theme/services/language.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    LoadingOverlayComponent
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss', '../authentication-1.scss', '../../authentication.scss']
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);
  private auth = inject(AuthenticationService);
  private lang = inject(LanguageService);

  hide = true;
  loginForm!: FormGroup;

  loading = false;
  submitted = false;
  returnUrl!: string;

  get dir(): 'rtl' | 'ltr' {
    return  'ltr';
  }

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', Validators.required],
      password: ['', Validators.required]
    });

    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || DASHBOARD_PATH;

    if (this.auth.isLoggedIn()) {
      const targetUrl = this.returnUrl.startsWith('/login') ? DASHBOARD_PATH : this.returnUrl;
      this.router.navigateByUrl(targetUrl, { replaceUrl: true });
      return;
    }
  }

  get formValues() {
    return this.loginForm.controls;
  }

  get emailHasError(): boolean {
    return !!(this.submitted && this.formValues?.['email']?.errors);
  }

  get passwordHasError(): boolean {
    return !!(this.submitted && this.formValues?.['password']?.errors);
  }

  onSubmit(): void {
    this.submitted = true;

    if (this.loginForm.invalid) return;

    this.loading = true;

    const email = this.formValues['email'].value;
    const password = this.formValues['password'].value;

    this.auth
      .login(email, password)
      .pipe(first())
      .subscribe({
        next: (res) => {
          this.loading = false;

          if (res?.isSuccess && res?.data) {
            this.toast.success('تم تسجيل الدخول بنجاح');
            this.router.navigateByUrl(this.returnUrl);
            return;
          }

          if (res?.errors?.length && res.errors[0]?.message) {
            this.toast.error(res.errors[0].message);
            return;
          }

          this.toast.error('فشل تسجيل الدخول. حاول مرة أخرى.');
        },
        error: () => {
          this.loading = false;
          this.toast.error('فشل تسجيل الدخول. حاول مرة أخرى.');
        }
      });
  }
}
