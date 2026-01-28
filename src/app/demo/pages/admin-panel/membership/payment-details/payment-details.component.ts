import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import {
  StudentPaymentDto,
  StudentPaymentService,
  UpdatePaymentDto,
  getCurrencyLabel
} from 'src/app/@theme/services/student-payment.service';

@Component({
  selector: 'app-payment-details',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  templateUrl: './payment-details.component.html',
  styleUrl: './payment-details.component.scss'
})
export class PaymentDetailsComponent {
  data = inject<StudentPaymentDto>(MAT_DIALOG_DATA);
  private router = inject(Router);
  private dialogRef = inject(MatDialogRef<PaymentDetailsComponent>);
  private paymentService = inject(StudentPaymentService);
  isUpdating = false;

  viewInvoice(): void {
    this.dialogRef.close();
    this.router.navigate(['/invoice/list'], {
      queryParams: { search: this.data.invoiceId }
    });
  }

  revertPayment(): void {
    if (this.isUpdating) {
      return;
    }

    this.isUpdating = true;
    const dto: UpdatePaymentDto = {
      id: this.data.invoiceId,
      payStatue: false,
      isCancelled: false
    };

    this.paymentService.updatePayment(dto).subscribe({
      next: () => this.dialogRef.close(true),
      error: (error) => {
        this.isUpdating = false;
        console.error('Failed to revert payment status.', error);
      }
    });
  }

  get currencyLabel(): string {
    return getCurrencyLabel(this.data.currencyId ?? this.data.currency ?? null);
  }

  get canRevertPayment(): boolean {
   
    const status = (this.data.statusText ?? '').toLowerCase();
  return status === 'paid' || status === 'مدفوع';
  }
}
  