// angular import
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';

// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';
import { AuthenticationService } from 'src/app/@theme/services/authentication.service';

@Component({
  selector: 'app-forgot-password',
  imports: [CommonModule, SharedModule, RouterModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss', '../authentication-1.scss', '../../authentication.scss']
})
export class ForgotPasswordComponent {
  // public props
  email = new FormControl('', [Validators.required, Validators.email]);

  authenticationService = inject(AuthenticationService);

  // public method
  getErrorMessage() {
    if (this.email.hasError('required')) {
      return 'You must enter a Email';
    }

    return this.email.hasError('email') ? 'Not a valid email' : '';
  }
}
