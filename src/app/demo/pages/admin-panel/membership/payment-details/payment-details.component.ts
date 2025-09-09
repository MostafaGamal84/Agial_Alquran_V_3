import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { ViewStudentSubscribeReDto } from 'src/app/@theme/services/student-subscribe.service';

@Component({
  selector: 'app-payment-details',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  templateUrl: './payment-details.component.html',
  styleUrl: './payment-details.component.scss'
})
export class PaymentDetailsComponent {
  data = inject<ViewStudentSubscribeReDto>(MAT_DIALOG_DATA);
}
