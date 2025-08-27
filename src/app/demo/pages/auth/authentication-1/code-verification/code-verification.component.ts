// angular import
import { Component, inject } from '@angular/core';
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
export class CodeVerificationComponent {
  private authService = inject(AuthenticationService);
  private router = inject(Router);
  private toast = inject(ToastService);

  codeDigits: string[] = ['', '', '', ''];

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
