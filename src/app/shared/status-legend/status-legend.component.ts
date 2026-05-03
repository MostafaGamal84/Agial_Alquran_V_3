import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export interface StatusLegendItem {
  color: string;
  label: string;
  description: string;
}

@Component({
  selector: 'app-status-legend',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './status-legend.component.html',
  styleUrl: './status-legend.component.scss'
})
export class StatusLegendComponent {
  @Input() title = '';
  @Input() description = '';
  @Input() footer = '';
  @Input() items: StatusLegendItem[] = [];
}
