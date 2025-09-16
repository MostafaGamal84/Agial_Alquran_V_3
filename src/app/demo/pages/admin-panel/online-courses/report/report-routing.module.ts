import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';

const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'list'
      },
      {
        path: 'list',
        loadComponent: () => import('./report-list/report-list.component').then((c) => c.ReportListComponent),
        data: {
          roles: [
            UserTypesEnum.Admin,
            UserTypesEnum.Manager,
            UserTypesEnum.BranchLeader,
            UserTypesEnum.Student,
            UserTypesEnum.Teacher
          ]
        }
      },
      {
        path: 'details/:id',
        loadComponent: () => import('./report-details/report-details.component').then((c) => c.ReportDetailsComponent),
        data: {
          roles: [
            UserTypesEnum.Admin,
            UserTypesEnum.Manager,
            UserTypesEnum.BranchLeader,
            UserTypesEnum.Student,
            UserTypesEnum.Teacher
          ]
        }
      },
      {
        path: 'add',
        loadComponent: () => import('./report-add/report-add.component').then((c) => c.ReportAddComponent),
        data: {
          roles: [UserTypesEnum.Admin, UserTypesEnum.Manager, UserTypesEnum.BranchLeader, UserTypesEnum.Teacher],
          mode: 'add'
        }
      },
      {
        path: 'edit/:id',
        loadComponent: () => import('./report-add/report-add.component').then((c) => c.ReportAddComponent),
        data: {
          roles: [UserTypesEnum.Admin, UserTypesEnum.Manager, UserTypesEnum.BranchLeader, UserTypesEnum.Teacher],
          mode: 'update'
        }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ReportRoutingModule {}
