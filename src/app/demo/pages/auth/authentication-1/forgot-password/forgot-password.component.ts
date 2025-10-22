// angular import
import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { AbstractControl, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { take } from 'rxjs/operators';

// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';
import { AuthenticationService, ApiError } from 'src/app/@theme/services/authentication.service';
import { ToastService } from 'src/app/@theme/services/toast.service';

const DEFAULT_CONFIRMATION_MESSAGE = 'تم ارسال الكود الى بريدك، الرجاء التحقق من رسائل البريد';

@Component({
  selector: 'app-forgot-password',
  imports: [CommonModule, SharedModule, RouterModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss', '../authentication-1.scss', '../../authentication.scss']
})
export class ForgotPasswordComponent implements OnInit {
  // DI
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);
  authenticationService = inject(AuthenticationService);

  // state
  loading = false;
  requestForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  private readonly errorMessages: Record<string, string> = {
    '7002': 'البريد الإلكتروني غير مسجل لدينا.',
    '7059': 'تعذر إرسال البريد الإلكتروني، يرجى المحاولة مرة أخرى.'
  };

  ngOnInit(): void {
    this.emailControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.clearServerError(this.emailControl);
    });
  }

  get emailControl(): AbstractControl {
    return this.requestForm.get('email')!;
  }

  getEmailError(): string {
    if (this.emailControl.hasError('server')) {
      return this.emailControl.getError('server');
    }
    if (this.emailControl.hasError('required')) {
      return 'البريد الإلكتروني مطلوب';
    }
    if (this.emailControl.hasError('email')) {
      return 'الرجاء إدخال بريد إلكتروني صالح';
    }
    return '';
  }

  onSubmit(): void {
    if (this.loading) {
      return;
    }

    if (this.requestForm.invalid) {
      this.requestForm.markAllAsTouched();
      return;
    }

    const email = (this.emailControl.value as string).trim();
    if (!email) {
      this.setServerError(this.emailControl, 'البريد الإلكتروني مطلوب');
      return;
    }

    this.loading = true;
    this.authenticationService
      .forgetPassword(email)
      .pipe(take(1))
      .subscribe({
        next: (res) => {
          this.loading = false;
          if (res?.isSuccess) {
            const { message, code } = this.normalizeResponse(res.data);
            this.authenticationService.pendingCode = code ?? null;
            this.toast.success(message);
            this.router.navigate(['/reset-password'], {
              queryParams: { email },
              state: { message, code }
            });
          } else if (res?.errors?.length) {
            this.handleErrors(res.errors);
          } else {
            this.toast.error('تعذر معالجة الطلب. حاول مرة أخرى لاحقًا.');
          }
        },
        error: () => {
          this.loading = false;
          this.toast.error('تعذر معالجة الطلب. حاول مرة أخرى لاحقًا.');
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

    if (first.fieldName?.toLowerCase().includes('email')) {
      this.setServerError(this.emailControl, message);
    }

    this.toast.error(message);
  }

  private normalizeResponse(data: string | null): { message: string; code: string | null } {
    const trimmed = data?.toString().trim() ?? '';
    if (trimmed && /^\d{4}$/.test(trimmed)) {
      return { message: DEFAULT_CONFIRMATION_MESSAGE, code: trimmed };
    }

    return { message: trimmed || DEFAULT_CONFIRMATION_MESSAGE, code: null };
  }

  private clearServerError(control: AbstractControl): void {
    const errors = control.errors;
    if (!errors?.['server']) {
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
