// angular import
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

//type
import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';

const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'list',
        loadComponent: () => import('./student-list/student-list.component').then((c) => c.StudentListComponent),
        data: {
          roles: [UserTypesEnum.Admin, UserTypesEnum.Manager, UserTypesEnum.BranchLeader, UserTypesEnum.Student, UserTypesEnum.Teacher]
        }
      },
      {
        path: 'add',
        loadComponent: () => import('./student-add/student-add.component').then((c) => c.StudentAddComponent),
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
      },
      {
        path: 'apply',
        loadComponent: () => import('./student-apply/student-apply.component').then((c) => c.StudentApplyComponent),
        data: {
          roles: [UserTypesEnum.Admin, UserTypesEnum.Manager, UserTypesEnum.BranchLeader, UserTypesEnum.Student, UserTypesEnum.Teacher]
        }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class StudentRoutingModule {}
