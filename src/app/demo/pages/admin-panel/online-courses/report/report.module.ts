import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { ReportRoutingModule } from './report-routing.module';

@NgModule({
  imports: [CommonModule, MatPaginatorModule, MatTableModule, ReportRoutingModule]
})
export class ReportModule {}
