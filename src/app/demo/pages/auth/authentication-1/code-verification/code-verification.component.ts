// angular import
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

// material import
import { MatSnackBar } from '@angular/material/snack-bar';

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
  private snackBar = inject(MatSnackBar);

  codeDigits: string[] = ['', '', '', ''];

  verify() {
    const code = this.codeDigits.join('');
    this.authService.verifyCode(code).subscribe({
      next: (res) => {
        if (res?.isSuccess && res?.data?.passwordIsCorrect) {
          this.snackBar.open('Verification successful', 'Close', {
            duration: 3000
          });
          this.router.navigate([DASHBOARD_PATH]);
        } else {
          this.snackBar.open('Verification failed', 'Close', {
            duration: 3000
          });
        }
      },
      error: () => {
        this.snackBar.open('Verification failed', 'Close', {
          duration: 3000
        });
      }
    });
  }
}
