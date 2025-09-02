import { Directive, ElementRef, HostListener, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { MatSelect } from '@angular/material/select';

@Directive({
  selector: 'mat-select[appOpenSelectOnType]',
  standalone: true
})
export class OpenSelectOnTypeDirective {
  private matSelect = inject(MatSelect);
  private document = inject(DOCUMENT);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  @HostListener('keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    const activeElement = this.document.activeElement;
    const hostElement = this.host.nativeElement;

    if (
      activeElement === hostElement &&

    
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
