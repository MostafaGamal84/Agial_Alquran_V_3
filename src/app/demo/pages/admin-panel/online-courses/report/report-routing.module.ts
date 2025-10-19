import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';

const sharedReportRoles = [
  UserTypesEnum.Admin,
  UserTypesEnum.Manager,
  UserTypesEnum.BranchLeader,
  UserTypesEnum.Student,
  UserTypesEnum.Teacher
];

const manageReportRoles = [
  UserTypesEnum.Admin,
  UserTypesEnum.Manager,
  UserTypesEnum.BranchLeader,
  UserTypesEnum.Teacher
];

const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'view'
      },
      {
        path: 'view',
        loadComponent: () => import('./report-list/report-list.component').then((c) => c.ReportListComponent),
        data: {
          roles: sharedReportRoles
        }
      },
      {
        path: 'list',
        pathMatch: 'full',
        redirectTo: 'view'
      },
      {
        path: 'details/:id',
        loadComponent: () => import('./report-details/report-details.component').then((c) => c.ReportDetailsComponent),
        data: {
          roles: sharedReportRoles

        }
      },
      {
        path: 'add',
        loadComponent: () => import('./report-add/report-add.component').then((c) => c.ReportAddComponent),
        data: {
          roles: manageReportRoles,

          mode: 'add'
        }
      },
      {
        path: 'edit/:id',
        loadComponent: () => import('./report-add/report-add.component').then((c) => c.ReportAddComponent),
        data: {
          roles: manageReportRoles,

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
