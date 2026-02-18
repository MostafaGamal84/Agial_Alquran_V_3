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
import { AccessibilityService } from 'src/app/@theme/services/accessibility.service';
import { AnnouncerService } from 'src/app/@theme/services/announcer.service';

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
  private accessibilityService = inject(AccessibilityService);
  private announcerService = inject(AnnouncerService);
  private auth = inject(AuthenticationService);
  private lang = inject(LanguageService);

  hide = true;
  loginForm!: FormGroup;

  loading = false;
  submitted = false;
  returnUrl: string;
  formErrorSummary = '';

  get screenReaderModeEnabled(): boolean {
    return this.accessibilityService.isEnabled();
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
    this.formErrorSummary = '';

    // stop here if form is invalid
    if (this.loginForm.invalid) {
      this.handleInvalidSubmit();
      return;
    }

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

  toggleScreenReaderMode(): void {
    const isEnabled = this.accessibilityService.toggle();
    const message = isEnabled
      ? 'تم تفعيل وضع المكفوفين. Screen Reader Mode enabled.'
      : 'تم إيقاف وضع المكفوفين. Screen Reader Mode disabled.';

    this.toast.success(message, 'OK', 2500);
    this.announcerService.announceAssertive(message);
  }

  private handleInvalidSubmit(): void {
    this.formErrorSummary = 'يرجى استكمال الحقول المطلوبة. Please complete all required fields.';
    this.announcerService.announceAssertive(this.formErrorSummary);

    const firstInvalidControl = this.loginForm.invalid
      ? (document.querySelector('form .ng-invalid[formControlName]') as HTMLElement | null)
      : null;

    firstInvalidControl?.focus();
  }
}
