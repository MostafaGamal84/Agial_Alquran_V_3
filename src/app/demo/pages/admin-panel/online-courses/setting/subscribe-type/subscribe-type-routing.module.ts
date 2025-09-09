import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';

const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'list',
        loadComponent: () => import('./subscribe-type.component').then(c => c.SubscribeTypeComponent),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager, UserTypesEnum.BranchLeader, UserTypesEnum.Student, UserTypesEnum.Teacher] }
      },
      {
        path: 'add',
        loadComponent: () => import('./subscribe-type-form/subscribe-type-form.component').then(c => c.SubscribeTypeFormComponent),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager, UserTypesEnum.BranchLeader, UserTypesEnum.Student, UserTypesEnum.Teacher] }
      },
      {
        path: 'edit/:id',
        loadComponent: () => import('./subscribe-type-form/subscribe-type-form.component').then(c => c.SubscribeTypeFormComponent),
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
export class SubscribeTypeRoutingModule {}
