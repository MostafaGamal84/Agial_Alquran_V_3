import { Injectable } from '@angular/core';
import { AbstractControl, FormArray, FormGroup } from '@angular/forms';

@Injectable({ providedIn: 'root' })
export class ValidationService {
  shouldShowError(control: AbstractControl | null | undefined): boolean {
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  getErrorMessage(
    control: AbstractControl | null | undefined,
    label?: string,
    customMessages?: Partial<Record<string, string>>
  ): string | null {
    if (!control?.errors) {
      return null;
    }

    const fieldLabel = label || 'هذا الحقل';
    const errors = control.errors;
    const firstKey = Object.keys(errors)[0];

    if (!firstKey) {
      return null;
    }

    if (customMessages?.[firstKey]) {
      return customMessages[firstKey] || null;
    }

    switch (firstKey) {
      case 'required':
        return `${fieldLabel} مطلوب.`;
      case 'requiredTrue':
        return `يجب الموافقة على ${fieldLabel}.`;
      case 'minlength':
        return `${fieldLabel} يجب ألا يقل عن ${errors['minlength']?.requiredLength} أحرف.`;
      case 'maxlength':
        return `${fieldLabel} يجب ألا يزيد عن ${errors['maxlength']?.requiredLength} حرف.`;
      case 'email':
        return `${fieldLabel} يجب أن يكون بريدًا إلكترونيًا صحيحًا.`;
      case 'pattern':
        return `${fieldLabel} غير صالح.`;
      case 'min':
        return `${fieldLabel} يجب أن يكون أكبر من أو يساوي ${errors['min']?.min}.`;
      case 'max':
        return `${fieldLabel} يجب أن يكون أقل من أو يساوي ${errors['max']?.max}.`;
      case 'dateRange':
        return 'المدى الزمني غير صحيح.';
      case 'matchFields':
        return 'القيم غير متطابقة.';
      case 'numericRange':
        return 'النطاق الرقمي غير صحيح.';
      case 'notSelected':
        return `يجب اختيار ${fieldLabel}.`;
      case 'invalidDate':
        return `تاريخ ${fieldLabel} غير صالح.`;
      default:
        return customMessages?.[firstKey] || `${fieldLabel} غير صالح.`;
    }
  }

  markAllAsTouched(control: AbstractControl): void {
    if (control instanceof FormGroup) {
      Object.values(control.controls).forEach((c) => this.markAllAsTouched(c));
      control.markAsTouched();
      return;
    }

    if (control instanceof FormArray) {
      control.controls.forEach((c) => this.markAllAsTouched(c));
      control.markAsTouched();
      return;
    }

    control.markAsTouched();
  }
}
