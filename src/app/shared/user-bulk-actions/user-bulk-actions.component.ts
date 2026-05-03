import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-user-bulk-actions',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  template: `
    <div class="bulk-actions-bar" *ngIf="selectedCount > 0">
      <div class="bulk-actions-bar__summary">
        <span class="bulk-actions-bar__count">{{ selectedCount }}</span>
        <div>
          <div class="bulk-actions-bar__title">{{ selectionLabel }}</div>
          <div class="bulk-actions-bar__hint" *ngIf="hint">{{ hint }}</div>
        </div>
      </div>

      <div class="bulk-actions-bar__buttons">
        <button mat-stroked-button type="button" (click)="clear.emit()" [disabled]="busy">
          إلغاء التحديد
        </button>
        <button mat-flat-button color="warn" type="button" (click)="action.emit()" [disabled]="busy">
          {{ actionLabel }}
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .bulk-actions-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        margin: 0 15px 16px;
        padding: 14px 16px;
        border: 1px solid rgba(148, 163, 184, 0.28);
        border-radius: 16px;
        background: linear-gradient(135deg, rgba(239, 246, 255, 0.9), rgba(248, 250, 252, 0.95));
      }

      .bulk-actions-bar__summary {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .bulk-actions-bar__count {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 38px;
        height: 38px;
        padding: 0 10px;
        border-radius: 999px;
        background: rgba(220, 38, 38, 0.12);
        color: #b91c1c;
        font-weight: 700;
      }

      .bulk-actions-bar__title {
        color: #0f172a;
        font-size: 14px;
        font-weight: 700;
      }

      .bulk-actions-bar__hint {
        margin-top: 2px;
        color: #64748b;
        font-size: 12px;
      }

      .bulk-actions-bar__buttons {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      @media (max-width: 767px) {
        .bulk-actions-bar {
          flex-direction: column;
          align-items: stretch;
        }

        .bulk-actions-bar__buttons {
          width: 100%;
          flex-direction: column-reverse;
        }

        .bulk-actions-bar__buttons .mdc-button {
          width: 100%;
        }
      }
    `
  ]
})
export class UserBulkActionsComponent {
  @Input() selectedCount = 0;
  @Input() entityLabel = 'مستخدم';
  @Input() actionLabel = 'إيقاف المحددين';
  @Input() hint = 'سيتم تنفيذ الإجراء على العناصر المحددة فقط.';
  @Input() busy = false;

  @Output() action = new EventEmitter<void>();
  @Output() clear = new EventEmitter<void>();

  get selectionLabel(): string {
    return `${this.selectedCount} ${this.entityLabel} محدد`;
  }
}
