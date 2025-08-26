// angular import
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';

@Component({
  selector: 'app-reset-password',
  imports: [CommonModule, SharedModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['../authentication-1.scss', '../../authentication.scss', './reset-password.component.scss']
})
export class ResetPasswordComponent {
  // public props
  hide = true;
  coHide = true;
}
