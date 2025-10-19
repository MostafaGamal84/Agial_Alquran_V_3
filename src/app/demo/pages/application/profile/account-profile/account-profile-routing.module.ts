// angular import
import { NgModule } from '@angular/core';
import { HashLocationStrategy, LocationStrategy } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

// project import
import { AccountProfileComponent } from './account-profile.component';

// type
import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';

const routes: Routes = [
  {
    path: '',
    component: AccountProfileComponent,
    children: [
      {
        path: '',
        redirectTo: '/application/profile/account/profile',
        pathMatch: 'full'
      },
      {
        path: 'profile',
        loadComponent: () => import('./ac-profile/ac-profile.component').then((c) => c.AcProfileComponent),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager,UserTypesEnum.BranchLeader,UserTypesEnum.Student,UserTypesEnum.Teacher] }
      },
      {
        path: 'personal',
        loadComponent: () => import('./ac-personal/ac-personal.component').then((c) => c.AcPersonalComponent),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager,UserTypesEnum.BranchLeader,UserTypesEnum.Student,UserTypesEnum.Teacher] }
      },
      {
        path: 'account',
        loadComponent: () => import('./ac-account/ac-account.component').then((c) => c.AcAccountComponent),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager,UserTypesEnum.BranchLeader,UserTypesEnum.Student,UserTypesEnum.Teacher] }
      },
      {
        path: 'password',
        loadComponent: () => import('./ac-password/ac-password.component').then((c) => c.AcPasswordComponent),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager,UserTypesEnum.BranchLeader,UserTypesEnum.Student,UserTypesEnum.Teacher] }
      },
      {
        path: 'role',
        loadComponent: () => import('./ac-role/ac-role.component').then((c) => c.AcRoleComponent),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager,UserTypesEnum.BranchLeader,UserTypesEnum.Student,UserTypesEnum.Teacher] }
      },
      {
        path: 'settings',
        loadComponent: () => import('./ac-setting/ac-setting.component').then((c) => c.AcSettingComponent),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager,UserTypesEnum.BranchLeader,UserTypesEnum.Student,UserTypesEnum.Teacher] }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
  providers: [{ provide: LocationStrategy, useClass: HashLocationStrategy }]
})
export class AccountProfileRoutingModule {}
