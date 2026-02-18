import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
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
import { AccessibilityService } from 'src/app/core/services/accessibility.service';
import { AnnouncerService } from 'src/app/core/services/announcer.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, SharedModule, LoadingOverlayComponent],
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
  private accessibilityService = inject(AccessibilityService);
  private announcerService = inject(AnnouncerService);

  @ViewChild('loginFormElement') loginFormElement!: ElementRef<HTMLFormElement>;

  hide = true;
  loginForm!: FormGroup;

  loading = false;
  submitted = false;
  returnUrl!: string;
  errorSummary = '';

  get dir(): 'rtl' | 'ltr' {
    return 'ltr';
  }

  get screenReaderModeEnabled(): boolean {
    return this.accessibilityService.isEnabled();
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

  toggleScreenReaderMode(): void {
    const enabled = this.accessibilityService.toggle();
    const confirmationMessage = enabled
      ? 'تم تفعيل وضع المكفوفين / Screen Reader Mode enabled'
      : 'تم تعطيل وضع المكفوفين / Screen Reader Mode disabled';

    this.toast.success(confirmationMessage);
    this.announcerService.announceAssertive(confirmationMessage);
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorSummary = '';

    if (this.loginForm.invalid) {
      this.errorSummary = 'الرجاء تصحيح الحقول المطلوبة قبل المتابعة. / Please correct the highlighted fields.';
      this.announcerService.announceAssertive(this.errorSummary);
      this.focusFirstInvalidField();
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
            this.announcerService.announceAssertive(res.errors[0].message);
            return;
          }

          this.toast.error('فشل تسجيل الدخول. حاول مرة أخرى.');
          this.announcerService.announceAssertive('فشل تسجيل الدخول. حاول مرة أخرى.');
        },
        error: () => {
          this.loading = false;
          this.toast.error('فشل تسجيل الدخول. حاول مرة أخرى.');
          this.announcerService.announceAssertive('فشل تسجيل الدخول. حاول مرة أخرى.');
        }
      });
  }

  private focusFirstInvalidField(): void {
    const firstInvalidControl = this.loginFormElement?.nativeElement.querySelector(
      'input.ng-invalid, textarea.ng-invalid, select.ng-invalid'
    ) as HTMLElement | null;

    if (firstInvalidControl) {
      firstInvalidControl.focus();
    }
  }
}
