// angular import
import { NgModule } from '@angular/core';
import { HashLocationStrategy, LocationStrategy } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

//type
import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';

const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'list',
        loadComponent: () => import('./branch-manager-list/branch-manager-list.component').then((c) => c.BranchManagerListComponent),
        data: {
          roles: [UserTypesEnum.Admin, UserTypesEnum.Manager, UserTypesEnum.BranchLeader, UserTypesEnum.Student, UserTypesEnum.Teacher]
        }
      },
      {
        path: 'add',
        loadComponent: () => import('./branch-manager-add/branch-manager-add.component').then((c) => c.BranchManagerAddComponent),
        data: {
          roles: [UserTypesEnum.Admin, UserTypesEnum.Manager, UserTypesEnum.BranchLeader, UserTypesEnum.Student, UserTypesEnum.Teacher]
        }
      },
      {
        path: 'edit/:id',
        loadComponent: () => import('../user-edit/user-edit.component').then((c) => c.UserEditComponent),
        data: {
          roles: [UserTypesEnum.Admin, UserTypesEnum.Manager, UserTypesEnum.BranchLeader, UserTypesEnum.Student, UserTypesEnum.Teacher]
        }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
  providers: [{ provide: LocationStrategy, useClass: HashLocationStrategy }]
})
export class BranchManagerRoutingModule {}
