import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { ReportRoutingModule } from './report-routing.module';
import { PaginatorModule } from 'primeng/paginator';

@NgModule({
  imports: [CommonModule, MatTableModule, PaginatorModule, ReportRoutingModule]
})
export class ReportModule {}
