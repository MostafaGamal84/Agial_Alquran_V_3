import { NgModule } from '@angular/core';
import { HashLocationStrategy, LocationStrategy } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';
import { TeacherSalaryComponent } from './teacher-salary.component';

const routes: Routes = [
  {
    path: '',
    component: TeacherSalaryComponent,
    data: {
      roles: [UserTypesEnum.Admin, UserTypesEnum.Manager, UserTypesEnum.Teacher]
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
  providers: [{ provide: LocationStrategy, useClass: HashLocationStrategy }]
})
export class TeacherSalaryRoutingModule {}
