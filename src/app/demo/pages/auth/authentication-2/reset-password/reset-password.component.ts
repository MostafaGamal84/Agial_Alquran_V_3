// angular import
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';

@Component({
  selector: 'app-reset-password',
  imports: [CommonModule, SharedModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss', '../authentication-2.scss', '../../authentication.scss']
})
export class ResetPasswordComponent {
  // public props
  hide = true;
  coHide = true;
}
