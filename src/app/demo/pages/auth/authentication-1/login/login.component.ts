// angular import
import { Component, OnInit, inject } from '@angular/core';
import { first } from 'rxjs/operators';

// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';
import { AuthenticationService } from 'src/app/@theme/services/authentication.service';
import { FormBuilder, FormGroup, FormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { TranslateService } from '@ngx-translate/core';
import { LoadingOverlayComponent } from 'src/app/@theme/components/loading-overlay/loading-overlay.component';
import { DASHBOARD_PATH } from 'src/app/app-config';
import { AccessibilityService } from 'src/app/core/services/accessibility.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, SharedModule, RouterModule, FormsModule, LoadingOverlayComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss', '../authentication-1.scss', '../../authentication.scss']
})
export class LoginComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  authenticationService = inject(AuthenticationService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  private accessibilityService = inject(AccessibilityService);

  // public props
  hide = true;
  loginForm: FormGroup;
  loading = false;
  submitted = false;
  returnUrl: string;
  ariaLiveMessage = '';
  accessibilityModeEnabled = false;

  get accessibilityModeStatusText(): string {
    return this.accessibilityModeEnabled ? 'ON' : 'OFF';
  }

  get accessibilityToggleAriaLabel(): string {
    return this.accessibilityModeEnabled
      ? 'Accessibility mode is on. Activate to switch to normal mode.'
      : 'Accessibility mode is off. Activate to switch on accessibility mode.';
  }

  ngOnInit() {
    this.loginForm = this.formBuilder.group({
      email: ['', Validators.required],
      password: ['', Validators.required]
    });

    this.accessibilityModeEnabled = this.accessibilityService.isAccessibilityModeEnabled();

    // get return url from route parameters or fall back to dashboard
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || DASHBOARD_PATH;

    if (this.authenticationService.isLoggedIn()) {
      const targetUrl = this.returnUrl.startsWith('/login') ? DASHBOARD_PATH : this.returnUrl;
      this.router.navigateByUrl(targetUrl, { replaceUrl: true });
      return;
    }
  }

  // convenience getter for easy access to form fields
  get formValues() {
    return this.loginForm.controls;
  }

  get emailHasError(): boolean {
    return !!(this.submitted && this.formValues?.['email'].errors);
  }

  get passwordHasError(): boolean {
    return !!(this.submitted && this.formValues?.['password'].errors);
  }

  get hasErrors(): boolean {
    return this.emailHasError || this.passwordHasError;
  }

  toggleAccessibilityMode(): void {
    this.accessibilityService.toggleMode();
    this.accessibilityModeEnabled = this.accessibilityService.isAccessibilityModeEnabled();

    this.announceToScreenReaders(
      this.accessibilityModeEnabled
        ? 'Accessibility mode enabled. Screen reader optimizations are now active.'
        : 'Accessibility mode disabled. Normal mode is now active.'
    );
  }

  private announceToScreenReaders(message: string): void {
    this.ariaLiveMessage = '';
    setTimeout(() => {
      this.ariaLiveMessage = message;
    });
  }

  onSubmit() {
    this.submitted = true;

    // stop here if form is invalid
    if (this.loginForm.invalid) {
      const messages: string[] = [];

      if (this.formValues['email'].errors) {
        messages.push(this.translate.instant('AUTH.COMMON.Validation.EmailRequired'));
      }

      if (this.formValues['password'].errors) {
        messages.push(this.translate.instant('AUTH.COMMON.Validation.PasswordRequired'));
      }

      this.ariaLiveMessage = messages.join(' ');
      return;
    }

    this.loading = true;
    this.ariaLiveMessage = '';
    this.authenticationService
      .login(this.formValues['email'].value, this.formValues['password'].value)
      .pipe(first())
      .subscribe({
        next: (res) => {
          this.loading = false;
          if (res?.isSuccess && res?.data) {
            this.toast.success('تم تسجيل الدخول بنجاح');
            this.router.navigateByUrl(this.returnUrl);
          } else if (res?.errors?.length && res.errors[0].message) {
            this.ariaLiveMessage = res.errors[0].message;
            this.toast.error(res.errors[0].message);
          } else {
            const fallbackMessage = 'فشل تسجيل الدخول. حاول مرة أخرى.';
            this.ariaLiveMessage = fallbackMessage;
            this.toast.error(fallbackMessage);
          }
        },
        error: () => {
          this.loading = false;
          this.ariaLiveMessage = 'فشل تسجيل الدخول. حاول مرة أخرى.';
          this.toast.error('فشل تسجيل الدخول. حاول مرة أخرى.');
        }
      });
  }
}
