import { NgModule } from '@angular/core';
import { TeacherSalaryRoutingModule } from './teacher-salary-routing.module';
import { TeacherSalaryComponent } from './teacher-salary.component';

@NgModule({
  imports: [TeacherSalaryComponent, TeacherSalaryRoutingModule]
})
export class TeacherSalaryModule {}
