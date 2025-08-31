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
        path: 'view',
        loadComponent: () => import('./courses-view/courses-view.component').then((c) => c.CoursesViewComponent),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager,UserTypesEnum.BranchLeader,UserTypesEnum.Student,UserTypesEnum.Teacher] }
      },
      {
        path: 'add',
        loadComponent: () => import('./courses-add/courses-add.component').then((c) => c.CoursesAddComponent),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager,UserTypesEnum.BranchLeader,UserTypesEnum.Student,UserTypesEnum.Teacher] }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CoursesRoutingModule {}
