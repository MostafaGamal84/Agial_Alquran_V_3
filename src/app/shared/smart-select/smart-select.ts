import {
  Component,
  EventEmitter,
  Input,
  Output,
  HostListener,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type AnyItem = Record<string, any>;
@Component({
 selector: 'app-smart-select',
  standalone: true,
  imports: [CommonModule,FormsModule],
  templateUrl: './smart-select.html',
  styleUrl: './smart-select.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SmartSelectComponent {
  @Input() label = '';
  @Input() placeholder = 'اختر...';
  @Input() disabled = false;
  @Input() loading = false;

  // items + mapping
  @Input() items: AnyItem[] = [];
  @Input() valueKey: string = 'id';
  @Input() labelKey: string = 'name';

  // value as number|null
  @Input() value: number | null = null;
  @Output() valueChange = new EventEmitter<number | null>();

  open = false;
  query = '';

  get filtered(): AnyItem[] {
    const q = (this.query || '').trim().toLowerCase();
    if (!q) return this.items;
    return this.items.filter((x) =>
      String(x?.[this.labelKey] ?? '').toLowerCase().includes(q)
    );
  }

  get selectedLabel(): string {
    if (this.value == null) return this.placeholder;
    const found = this.items.find((x) => Number(x?.[this.valueKey]) === Number(this.value));
    return String(found?.[this.labelKey] ?? this.placeholder);
  }

  toggle(): void {
    if (this.disabled) return;
    this.open = !this.open;
    if (this.open) this.query = '';
  }

  close(): void {
    this.open = false;
    this.query = '';
  }

  select(v: any): void {
    const n = this.toNumber(v);
    this.value = n;
    this.valueChange.emit(n);
    this.close();
  }

  clear(): void {
    this.value = null;
    this.valueChange.emit(null);
    this.close();
  }

  private toNumber(v: any): number | null {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent) {
    if (!this.open) return;
    const target = ev.target as HTMLElement;
    const host = target.closest('.smart-select');
    if (!host) this.close();
  }
}
