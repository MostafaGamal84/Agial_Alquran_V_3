// angular import
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';

// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';
import { AuthenticationService } from 'src/app/@theme/services/authentication.service';

@Component({
  selector: 'app-register',
  imports: [CommonModule, SharedModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss', '../authentication-1.scss', '../../authentication.scss']
})
export class RegisterComponent {
  // public props
  hide = true;
  coHide = true;
  email = new FormControl('', [Validators.required, Validators.email]);

  authenticationService = inject(AuthenticationService);

  // public method
  getErrorMessage() {
    if (this.email.hasError('required')) {
      return 'You must enter an email';
    }

    return this.email.hasError('email') ? 'Not a valid email' : '';
  }
}
