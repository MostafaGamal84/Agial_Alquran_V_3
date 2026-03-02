import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl } from '@angular/forms';
import { ValidationService } from '../validation.service';

@Component({
  selector: 'app-field-error',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './field-error.component.html',
  styleUrl: './field-error.component.scss'
})
export class FieldErrorComponent {
  @Input() control: AbstractControl | null = null;
  @Input() label?: string;
  @Input() customMessages?: Record<string, string>;

  readonly validationService = inject(ValidationService);
}
