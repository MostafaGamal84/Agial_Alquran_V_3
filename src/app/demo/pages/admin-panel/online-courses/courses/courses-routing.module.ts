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
        data: {
          roles: [UserTypesEnum.Admin, UserTypesEnum.Manager, UserTypesEnum.BranchLeader, UserTypesEnum.Student, UserTypesEnum.Teacher]
        }
      },
      {
        path: 'details/:id',
        loadComponent: () => import('./courses-details/courses-details.component').then((c) => c.CoursesDetailsComponent),
        data: {
          roles: [UserTypesEnum.Admin, UserTypesEnum.Manager, UserTypesEnum.BranchLeader, UserTypesEnum.Student, UserTypesEnum.Teacher]
        }
      },
      {
        path: 'add',
        loadComponent: () => import('./courses-add/courses-add.component').then((c) => c.CoursesAddComponent),
        data: {
          roles: [UserTypesEnum.Admin, UserTypesEnum.Manager, UserTypesEnum.BranchLeader, UserTypesEnum.Student, UserTypesEnum.Teacher]
        }
      },
      {
        path: 'edit/:id',
        loadComponent: () => import('./courses-update/courses-update.component').then((c) => c.CoursesUpdateComponent),
        data: {
          roles: [UserTypesEnum.Admin, UserTypesEnum.Manager, UserTypesEnum.BranchLeader ]
        }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CoursesRoutingModule {}
