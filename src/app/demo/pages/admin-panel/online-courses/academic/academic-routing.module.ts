import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';

const sharedRoles = [
  UserTypesEnum.Admin,
  UserTypesEnum.Manager,
  UserTypesEnum.BranchLeader,
  UserTypesEnum.Student,
  UserTypesEnum.Teacher
];

const manageRoles = [
  UserTypesEnum.Admin,
  UserTypesEnum.Manager,
  UserTypesEnum.BranchLeader
];

const reportManageRoles = [
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
        redirectTo: 'subjects'
      },
      {
        path: 'subjects',
        loadComponent: () => import('./subject-list/academic-subject-list.component').then((c) => c.AcademicSubjectListComponent),
        data: { roles: manageRoles }
      },
      {
        path: 'subjects/add',
        loadComponent: () => import('./subject-add/academic-subject-add.component').then((c) => c.AcademicSubjectAddComponent),
        data: { roles: manageRoles, mode: 'add' }
      },
      {
        path: 'subjects/edit/:id',
        loadComponent: () => import('./subject-add/academic-subject-add.component').then((c) => c.AcademicSubjectAddComponent),
        data: { roles: manageRoles, mode: 'edit' }
      },
      {
        path: 'circles',
        loadComponent: () => import('./circle-list/academic-circle-list.component').then((c) => c.AcademicCircleListComponent),
        data: { roles: sharedRoles }
      },
      {
        path: 'circles/add',
        loadComponent: () => import('./circle-add/academic-circle-add.component').then((c) => c.AcademicCircleAddComponent),
        data: { roles: manageRoles, mode: 'add' }
      },
      {
        path: 'circles/edit/:id',
        loadComponent: () => import('./circle-add/academic-circle-add.component').then((c) => c.AcademicCircleAddComponent),
        data: { roles: manageRoles, mode: 'edit' }
      },
      {
        path: 'reports',
        loadComponent: () => import('./report-list/academic-report-list.component').then((c) => c.AcademicReportListComponent),
        data: { roles: sharedRoles }
      },
      {
        path: 'reports/add',
        loadComponent: () => import('./report-add/academic-report-add.component').then((c) => c.AcademicReportAddComponent),
        data: { roles: reportManageRoles, mode: 'add' }
      },
      {
        path: 'reports/edit/:id',
        loadComponent: () => import('./report-add/academic-report-add.component').then((c) => c.AcademicReportAddComponent),
        data: { roles: reportManageRoles, mode: 'edit' }
      },
      {
        path: 'reports/details/:id',
        loadComponent: () => import('./report-details/academic-report-details.component').then((c) => c.AcademicReportDetailsComponent),
        data: { roles: sharedRoles }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AcademicRoutingModule {}
