import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private snackBar = inject(MatSnackBar);

  success(message: string, action: string = 'Close', duration: number = 3000) {
    this.snackBar.open(message, action, {
      duration,
      panelClass: ['toast-success']
    });
  }

  error(message: string, action: string = 'Close', duration: number = 3000) {
    this.snackBar.open(message, action, {
      duration,
      panelClass: ['toast-error']
    });
  }
}
