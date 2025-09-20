import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SharedModule } from 'src/app/demo/shared/shared.module';
import { TeacherSalaryRoutingModule } from './teacher-salary-routing.module';
import { TeacherSalaryComponent } from './teacher-salary.component';

@NgModule({
  imports: [CommonModule, SharedModule, TeacherSalaryComponent, TeacherSalaryRoutingModule]
})
export class TeacherSalaryModule {}
