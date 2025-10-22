// angular import
import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnDestroy, OnInit, inject } from '@angular/core';
import { AbstractControl, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { take } from 'rxjs/operators';
import { Subscription, timer } from 'rxjs';

// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';
import {
  AuthenticationService,
  ApiError,
  ApiResponse,
} from 'src/app/@theme/services/authentication.service';
import { ToastService } from 'src/app/@theme/services/toast.service';

interface NavigationState {
  message?: string;
}

@Component({
  selector: 'app-reset-password',
  imports: [CommonModule, SharedModule, RouterModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['../authentication-1.scss', '../../authentication.scss', './reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
  // DI
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);
  authenticationService = inject(AuthenticationService);

  // state
  hidePassword = true;
  loading = false;
  resendLoading = false;
  canResend = false;
  confirmationMessage = '';
  email: string | null = null;

  private readonly countdownDuration = 5 * 60; // 5 minutes in seconds
  private countdownSub: Subscription | null = null;
  remainingSeconds = 0;
  countdownLabel = '05:00';

  resetForm = this.fb.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{4}$/)]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]]
  });

  private readonly errorMessages: Record<string, string> = {
    '7002': 'البريد الإلكتروني غير مسجل لدينا.',
    '7014': 'الكود المدخل لا يطابق الكود الذي تم إرساله.',
    '7062': 'انتهت صلاحية رمز التحقق، الرجاء طلب رمز جديد.',
    '7059': 'تعذر إرسال البريد الإلكتروني، يرجى المحاولة مرة أخرى.'
  };

  ngOnInit(): void {
    const navState = this.router.getCurrentNavigation()?.extras.state as NavigationState | undefined;
    const historyState = (history.state ?? {}) as NavigationState;
    const state = navState ?? historyState;

    if (state?.message) {
      this.confirmationMessage = state.message;
    }

    this.authenticationService.pendingCode = null;

    const queryEmail = this.route.snapshot.queryParamMap.get('email');
    this.email = queryEmail ?? this.authenticationService.pendingEmail ?? null;
    if (this.email) {
      this.authenticationService.pendingEmail = this.email;
    }

    if (!this.email) {
      this.toast.error('يرجى إدخال البريد الإلكتروني أولاً.');
      this.router.navigate(['/forgot-password']);
      return;
    }

    this.codeControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.clearServerError(this.codeControl);
    });
    this.newPasswordControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.clearServerError(this.newPasswordControl);
    });

    this.startCountdown();
  }

  ngOnDestroy(): void {
    this.stopCountdown();
  }

  get codeControl(): AbstractControl {
    return this.resetForm.get('code')!;
  }

  get newPasswordControl(): AbstractControl {
    return this.resetForm.get('newPassword')!;
  }

  getCodeError(): string {
    if (this.codeControl.hasError('server')) {
      return this.codeControl.getError('server');
    }
    if (this.codeControl.hasError('required')) {
      return 'رمز التحقق مطلوب';
    }
    if (this.codeControl.hasError('pattern')) {
      return 'يجب أن يتكون الرمز من أربعة أرقام';
    }
    return '';
  }

  getPasswordError(): string {
    if (this.newPasswordControl.hasError('server')) {
      return this.newPasswordControl.getError('server');
    }
    if (this.newPasswordControl.hasError('required')) {
      return 'كلمة المرور الجديدة مطلوبة';
    }
    if (this.newPasswordControl.hasError('minlength')) {
      return 'يجب أن تحتوي كلمة المرور على 8 أحرف على الأقل';
    }
    return '';
  }

  onSubmit(): void {
    if (this.loading) {
      return;
    }

    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    if (!this.email) {
      this.toast.error('انتهت صلاحية الجلسة، الرجاء طلب رمز جديد.');
      this.router.navigate(['/forgot-password']);
      return;
    }

    const payload = {
      email: this.email,
      code: (this.codeControl.value as string).trim(),
      newPassword: (this.newPasswordControl.value as string).trim()
    };

    this.loading = true;
    this.authenticationService
      .resetPassword(payload)
      .pipe(take(1))
      .subscribe({
        next: (res) => {
          this.loading = false;
          if (res?.isSuccess) {
            const message = this.extractConfirmationMessage(res);
            if (message) {
              this.toast.success(message);
              this.router.navigate(['/login'], { state: { message } });
            } else {
              this.router.navigate(['/login']);
            }
            this.authenticationService.pendingEmail = null;
            this.authenticationService.pendingCode = null;
          } else if (res?.errors?.length) {
            this.handleErrors(res.errors);
          } else {
            this.toast.error('تعذر إعادة تعيين كلمة المرور. حاول مرة أخرى لاحقًا.');
          }
        },
        error: () => {
          this.loading = false;
          this.toast.error('تعذر إعادة تعيين كلمة المرور. حاول مرة أخرى لاحقًا.');
        }
      });
  }

  resendCode(): void {
    if (!this.email || this.resendLoading || !this.canResend) {
      return;
    }

    this.resendLoading = true;
    this.authenticationService
      .forgetPassword(this.email)
      .pipe(take(1))
      .subscribe({
        next: (res) => {
          this.resendLoading = false;
          if (res?.isSuccess) {
            const message = this.extractConfirmationMessage(res);
            if (message) {
              this.confirmationMessage = message;
              this.toast.success(message);
            }
            this.authenticationService.pendingCode = null;
            this.resetForm.patchValue({ code: '' });
            this.codeControl.markAsPristine();
            this.codeControl.markAsUntouched();
            this.startCountdown();
          } else if (res?.errors?.length) {
            this.handleErrors(res.errors);
          } else {
            this.toast.error('تعذر إرسال الرمز. حاول مرة أخرى لاحقًا.');
          }
        },
        error: () => {
          this.resendLoading = false;
          this.toast.error('تعذر إرسال الرمز. حاول مرة أخرى لاحقًا.');
        }
      });
  }

  private handleErrors(errors: ApiError[]): void {
    if (!errors?.length) {
      this.toast.error('حدث خطأ غير متوقع.');
      return;
    }

    const first = errors[0];
    const message = this.errorMessages[first.code] ?? first.message ?? 'حدث خطأ غير متوقع.';
    const field = first.fieldName?.toLowerCase() ?? '';

    if (field.includes('code')) {
      this.setServerError(this.codeControl, message);
    } else if (field.includes('password')) {
      this.setServerError(this.newPasswordControl, message);
    }

    if (first.code === '7002') {
      this.toast.error(message);
      this.authenticationService.pendingEmail = null;
      this.router.navigate(['/forgot-password']);
      return;
    }

    if (first.code === '7062') {
      this.setServerError(this.codeControl, message);
      this.stopCountdown();
      this.canResend = true;
    }

    this.toast.error(message);
  }

  private startCountdown(): void {
    this.stopCountdown();
    this.remainingSeconds = this.countdownDuration;
    this.updateCountdownLabel();
    this.canResend = false;

    this.countdownSub = timer(0, 1000)
      .pipe(take(this.countdownDuration + 1))
      .subscribe({
        next: (elapsed) => {
          const remaining = this.countdownDuration - elapsed;
          this.remainingSeconds = remaining > 0 ? remaining : 0;
          this.updateCountdownLabel();
          if (this.remainingSeconds === 0) {
            this.canResend = true;
          }
        },
        complete: () => {
          this.countdownSub = null;
        }
      });
  }

  private stopCountdown(): void {
    if (this.countdownSub) {
      this.countdownSub.unsubscribe();
      this.countdownSub = null;
    }
  }

  private updateCountdownLabel(): void {
    const minutes = Math.floor(this.remainingSeconds / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (this.remainingSeconds % 60).toString().padStart(2, '0');
    this.countdownLabel = `${minutes}:${seconds}`;
  }

  private extractConfirmationMessage(response: ApiResponse<string>): string | null {
    const messageFromResponse = response.message?.toString().trim() ?? '';
    const data = response.data?.toString().trim() ?? '';

    if (data && !/^\d{4}$/.test(data)) {
      return data;
    }

    return messageFromResponse || null;
  }

  private clearServerError(control: AbstractControl): void {
    const errors = control.errors;
    if (!errors?.server) {
      return;
    }

    const rest = { ...errors } as Record<string, unknown>;
    delete rest['server'];
    control.setErrors(Object.keys(rest).length ? rest : null);
  }

  private setServerError(control: AbstractControl, message: string): void {
    const errors = control.errors ?? {};
    control.setErrors({ ...errors, server: message });
    control.markAsTouched();
  }
}
