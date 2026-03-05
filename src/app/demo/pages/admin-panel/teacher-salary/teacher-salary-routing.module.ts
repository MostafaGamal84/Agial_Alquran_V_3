import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';
import { TeacherSalaryComponent } from './teacher-salary.component';
import { TeacherSalaryDetailsComponent } from './teacher-salary-details.component';

const routes: Routes = [
  {
    path: '',
    component: TeacherSalaryComponent,
    data: {
      roles: [UserTypesEnum.Admin, UserTypesEnum.Manager, UserTypesEnum.Teacher]
    }
  },
  {
    path: 'details/:invoiceId',
    component: TeacherSalaryDetailsComponent,
    data: {
      roles: [UserTypesEnum.Admin, UserTypesEnum.Manager, UserTypesEnum.Teacher]
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TeacherSalaryRoutingModule {}
