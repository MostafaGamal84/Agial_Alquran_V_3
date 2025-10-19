import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';

const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'list',
        loadComponent: () => import('./subscribe.component').then(c => c.SubscribeComponent),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager, UserTypesEnum.BranchLeader, UserTypesEnum.Student, UserTypesEnum.Teacher] }
      },
      {
        path: 'add',
        loadComponent: () => import('./subscribe-form/subscribe-form.component').then(c => c.SubscribeFormComponent),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager, UserTypesEnum.BranchLeader, UserTypesEnum.Student, UserTypesEnum.Teacher] }
      },
      {
        path: 'edit/:id',
        loadComponent: () => import('./subscribe-form/subscribe-form.component').then(c => c.SubscribeFormComponent),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager, UserTypesEnum.BranchLeader, UserTypesEnum.Student, UserTypesEnum.Teacher] }
      },
      { path: '', pathMatch: 'full', redirectTo: 'list' }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SubscribeRoutingModule {}
