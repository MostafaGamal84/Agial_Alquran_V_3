import { Directive, HostListener, inject } from '@angular/core';
import { MatSelect } from '@angular/material/select';

@Directive({
  selector: 'mat-select[appOpenSelectOnType]',
  standalone: true
})
export class OpenSelectOnTypeDirective {
  private matSelect = inject(MatSelect);

  @HostListener('keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    if (
      this.matSelect.focused &&
      !this.matSelect.panelOpen &&
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.metaKey
    ) {
      this.matSelect.open();
    }
  }
}
