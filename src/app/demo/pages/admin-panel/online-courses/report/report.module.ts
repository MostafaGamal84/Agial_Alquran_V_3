import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { ReportRoutingModule } from './report-routing.module';

@NgModule({
  imports: [CommonModule, MatTableModule, ReportRoutingModule]
})
export class ReportModule {}
