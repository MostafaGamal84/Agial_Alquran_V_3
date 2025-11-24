// angular import
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PendingEmailGuard } from 'src/app/@theme/helpers/pending-email.guard';

// type
import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';

const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'login',
        loadComponent: () => import('./login/login.component').then((c) => c.LoginComponent),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager,UserTypesEnum.BranchLeader,UserTypesEnum.Student,UserTypesEnum.Teacher] }
      },
      {
        path: 'check-mail',
        loadComponent: () => import('./check-mail/check-mail.component').then((c) => c.CheckMailComponent),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager,UserTypesEnum.BranchLeader,UserTypesEnum.Student,UserTypesEnum.Teacher] }
      },
      {
        path: 'code-verify',
        loadComponent: () => import('./code-verification/code-verification.component').then((c) => c.CodeVerificationComponent),
        canActivate: [PendingEmailGuard],
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager,UserTypesEnum.BranchLeader,UserTypesEnum.Student,UserTypesEnum.Teacher] }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class Authentication1RoutingModule {}
