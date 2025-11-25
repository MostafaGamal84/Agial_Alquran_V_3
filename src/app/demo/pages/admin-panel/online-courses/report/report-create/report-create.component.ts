import { Component } from '@angular/core';

import { ReportAddComponent } from '../report-add/report-add.component';

@Component({
  selector: 'app-report-create',
  standalone: true,
  imports: [ReportAddComponent],
  template: '<app-report-add></app-report-add>'
})
export class ReportCreateComponent {}
