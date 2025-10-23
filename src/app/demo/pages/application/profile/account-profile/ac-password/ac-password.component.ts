// angular import
import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { take } from 'rxjs/operators';

// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';
import {
  ApiError,
  AuthenticationService,
  ChangePasswordPayload
} from 'src/app/@theme/services/authentication.service';
import { ToastService } from 'src/app/@theme/services/toast.service';

type PasswordStrength = 'Weak' | 'Medium' | 'Strong' | '';

@Component({
  selector: 'app-ac-password',
  imports: [CommonModule, SharedModule],
  templateUrl: './ac-password.component.html',
  styleUrls: ['../account-profile.scss', './ac-password.component.scss']
})
export class AcPasswordComponent {
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);
  private authenticationService = inject(AuthenticationService);
  private toast = inject(ToastService);

  hide = true;
  newHide = true;
  conHide = true;
  loading = false;

  passwordStrength: PasswordStrength = '';

  readonly passwordRequirements = [
    {
      title: 'At least 8 characters'
    },
    {
      title: 'At least 1 lowercase letter (a-z)'
    },
    {
      title: 'At least 1 uppercase letter (A-Z)'
    },
    {
      title: 'At least 1 number (0-9)'
    },
    {
      title: 'At least 1 special character'
    }
  ];

  private readonly passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  private readonly genericErrorMessage = 'Unable to change password. Please try again.';

  readonly changePasswordForm = this.fb.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8), Validators.pattern(this.passwordPattern)]],
    confirmPassword: ['', [Validators.required]]
  });

  constructor() {
    this.confirmPasswordControl.addValidators(this.matchOtherValidator('newPassword'));
    this.confirmPasswordControl.updateValueAndValidity({ emitEvent: false });

    this.currentPasswordControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.clearServerError(this.currentPasswordControl));

    this.newPasswordControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.clearServerError(this.newPasswordControl);
        this.updatePasswordStrength((value ?? '').toString());
        this.confirmPasswordControl.updateValueAndValidity({ onlySelf: true });
      });

    this.confirmPasswordControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.clearServerError(this.confirmPasswordControl));
  }

  get currentPasswordControl(): AbstractControl {
    return this.changePasswordForm.get('currentPassword')!;
  }

  get newPasswordControl(): AbstractControl {
    return this.changePasswordForm.get('newPassword')!;
  }

  get confirmPasswordControl(): AbstractControl {
    return this.changePasswordForm.get('confirmPassword')!;
  }

  getCurrentPasswordError(): string {
    if (this.currentPasswordControl.hasError('server')) {
      return this.currentPasswordControl.getError('server');
    }
    if (this.currentPasswordControl.hasError('required')) {
      return 'Current password is required.';
    }
    return '';
  }

  getNewPasswordError(): string {
    if (this.newPasswordControl.hasError('server')) {
      return this.newPasswordControl.getError('server');
    }
    if (this.newPasswordControl.hasError('required')) {
      return 'New password is required.';
    }
    if (this.newPasswordControl.hasError('minlength')) {
      return 'New password must be at least 8 characters.';
    }
    if (this.newPasswordControl.hasError('pattern')) {
      return 'New password must include uppercase, lowercase, number, and special character.';
    }
    return '';
  }

  getConfirmPasswordError(): string {
    if (this.confirmPasswordControl.hasError('server')) {
      return this.confirmPasswordControl.getError('server');
    }
    if (this.confirmPasswordControl.hasError('required')) {
      return 'Confirm password is required.';
    }
    if (this.confirmPasswordControl.hasError('mismatch')) {
      return 'Passwords do not match.';
    }
    return '';
  }

  onSubmit(): void {
    if (this.loading) {
      return;
    }

    if (this.changePasswordForm.invalid) {
      this.changePasswordForm.markAllAsTouched();
      return;
    }

    const payload: ChangePasswordPayload = {
      currentPassword: ((this.currentPasswordControl.value as string) ?? '').trim(),
      newPassword: ((this.newPasswordControl.value as string) ?? '').trim(),
      confirmPassword: ((this.confirmPasswordControl.value as string) ?? '').trim()
    };

    this.loading = true;
    this.authenticationService
      .changePassword(payload)
      .pipe(take(1))
      .subscribe({
        next: (res) => {
          this.loading = false;
          if (res?.isSuccess) {
            const message = res.data ?? 'Password changed successfully.';
            this.toast.success(message);
            this.resetForm();
          } else if (res?.errors?.length) {
            this.handleErrors(res.errors);
          } else {
            this.toast.error(this.genericErrorMessage);
          }
        },
        error: () => {
          this.loading = false;
          this.toast.error(this.genericErrorMessage);
        }
      });
  }

  private handleErrors(errors: ApiError[]): void {
    if (!errors?.length) {
      this.toast.error(this.genericErrorMessage);
      return;
    }

    let displayedGeneralError = false;

    errors.forEach((error) => {
      const controlName = this.mapFieldName(error.fieldName);
      if (controlName) {
        const control = this.changePasswordForm.get(controlName);
        if (control) {
          const existingErrors = control.errors ?? {};
          control.setErrors({ ...existingErrors, server: error.message || this.genericErrorMessage });
          control.markAsTouched();
        } else if (error.message && !displayedGeneralError) {
          this.toast.error(error.message);
          displayedGeneralError = true;
        }
      } else if (error.message && !displayedGeneralError) {
        this.toast.error(error.message);
        displayedGeneralError = true;
      }
    });

    if (!displayedGeneralError && !errors.some((err) => err.fieldName)) {
      this.toast.error(this.genericErrorMessage);
    }
  }

  private matchOtherValidator(otherControlName: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.parent) {
        return null;
      }

      const otherControl = control.parent.get(otherControlName);
      if (!otherControl) {
        return null;
      }

      const otherValue = otherControl.value;
      if (otherValue !== control.value) {
        return { mismatch: true };
      }

      return null;
    };
  }

  private clearServerError(control: AbstractControl): void {
    if (control.hasError('server')) {
      const errors = { ...(control.errors ?? {}) };
      delete errors['server'];
      control.setErrors(Object.keys(errors).length ? errors : null);
    }
  }

  private mapFieldName(fieldName?: string | null): string | null {
    if (!fieldName) {
      return null;
    }

    const normalized = fieldName.replace(/\s+/g, '').toLowerCase();

    switch (normalized) {
      case 'currentpassword':
      case 'current_password':
        return 'currentPassword';
      case 'newpassword':
      case 'new_password':
        return 'newPassword';
      case 'confirmpassword':
      case 'confirm_password':
        return 'confirmPassword';
      default:
        return null;
    }
  }

  private updatePasswordStrength(password: string): void {
    if (!password) {
      this.passwordStrength = '';
      return;
    }

    if (this.passwordPattern.test(password)) {
      this.passwordStrength = 'Strong';
    } else if (password.length >= 8) {
      this.passwordStrength = 'Medium';
    } else {
      this.passwordStrength = 'Weak';
    }
  }

  private resetForm(): void {
    this.changePasswordForm.reset();
    this.hide = true;
    this.newHide = true;
    this.conHide = true;
    this.passwordStrength = '';
  }
}
