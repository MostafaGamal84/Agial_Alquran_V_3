// angular import
import { Component, inject, ViewChildren, ElementRef, QueryList, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

// material import
import { ToastService } from 'src/app/@theme/services/toast.service';

// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';
import { AuthenticationService } from 'src/app/@theme/services/authentication.service';
import { DASHBOARD_PATH } from 'src/app/app-config';

@Component({
  selector: 'app-code-verification',
  imports: [CommonModule, SharedModule],
  templateUrl: './code-verification.component.html',
  styleUrls: ['./code-verification.component.scss', '../authentication-1.scss', '../../authentication.scss']
})
export class CodeVerificationComponent implements OnInit, AfterViewInit {
  private authService = inject(AuthenticationService);
  private router = inject(Router);
  private toast = inject(ToastService);

  codeDigits: string[] = Array(6).fill('');
  @ViewChildren('codeInput') codeInputs!: QueryList<ElementRef<HTMLInputElement>>;

  ngOnInit() {
    if (this.authService.pendingCode) {
      const digits = this.authService.pendingCode.split('');
      this.codeDigits = this.codeDigits.map((_, i) => digits[i] || '');
    }
  }

  ngAfterViewInit() {
    const index = this.codeDigits.findIndex((d) => !d);
    const focusIndex = index === -1 ? this.codeDigits.length - 1 : index;
    const input = this.codeInputs.toArray()[focusIndex];
    if (input) {
      input.nativeElement.focus();
    }
  }

  onInput(event: Event, index: number) {
    const inputEl = event.target as HTMLInputElement;
    const value = inputEl.value.replace(/\D/g, '');
    this.codeDigits[index] = value;
    inputEl.value = value;
    if (value && index < this.codeDigits.length - 1) {
      this.codeInputs.toArray()[index + 1].nativeElement.focus();
    }
  }

  onKeyDown(event: KeyboardEvent, index: number) {
    if (event.key === 'Backspace' && !this.codeDigits[index] && index > 0) {
      this.codeInputs.toArray()[index - 1].nativeElement.focus();
    }
  }

  onPaste(event: ClipboardEvent) {
    const data = event.clipboardData?.getData('text') ?? '';
    const digits = data.replace(/\D/g, '').split('');
    if (digits.length) {
      event.preventDefault();
      this.codeDigits = this.codeDigits.map((_, i) => digits[i] || '');
      const inputs = this.codeInputs.toArray();
      inputs.forEach((input, i) => (input.nativeElement.value = this.codeDigits[i] || ''));
      const index = this.codeDigits.findIndex((d) => !d);
      const focusIndex = index === -1 ? this.codeDigits.length - 1 : index;
      inputs[focusIndex].nativeElement.focus();
    }
  }

  verify() {
    const code = this.codeDigits.join('');
      this.authService
        .verifyCode(code, this.authService.pendingEmail ?? undefined)
        .subscribe({
          next: (res) => {
            if (res?.isSuccess) {
              this.toast.success('Verification successful');
              this.router.navigate([DASHBOARD_PATH]);
            } else if (res?.errors?.length) {
              this.toast.error(res.errors[0].message);
            } else {
              this.toast.error('Verification failed');
            }
          },
        error: () => {
          this.toast.error('Verification failed');
        }
      });
  }
}
