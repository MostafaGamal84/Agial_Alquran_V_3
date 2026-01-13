import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { StudentPaymentDto, getCurrencyLabel } from 'src/app/@theme/services/student-payment.service';

interface PaymentDetailsDialogData {
  payment?: StudentPaymentDto | null;
  isLoading?: boolean;
}

@Component({
  selector: 'app-payment-details',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './payment-details.component.html',
  styleUrl: './payment-details.component.scss'
})
export class PaymentDetailsComponent {
  private dialogData = inject<PaymentDetailsDialogData | null>(MAT_DIALOG_DATA);
  private router = inject(Router);
  private dialogRef = inject(MatDialogRef<PaymentDetailsComponent>);

  isLoading = this.dialogData?.isLoading ?? false;
  payment: StudentPaymentDto | null = this.dialogData?.payment ?? null;

  viewInvoice(): void {
    if (!this.payment) {
      return;
    }
    this.dialogRef.close();
    this.router.navigate(['/invoice/list'], {
      queryParams: { search: this.payment.invoiceId }
    });
  }

  get currencyLabel(): string {
    return getCurrencyLabel(this.payment?.currencyId ?? this.payment?.currency ?? null);
  }

  updatePayment(payment: StudentPaymentDto | null): void {
    this.payment = payment;
    this.isLoading = false;
  }
}
