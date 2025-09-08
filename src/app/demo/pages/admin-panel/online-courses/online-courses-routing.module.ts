import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

//type
import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';

const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./online-dashboard/online-dashboard.component').then((c) => c.OnlineDashboardComponent),
        data: {
          roles: [UserTypesEnum.Admin, UserTypesEnum.Manager, UserTypesEnum.BranchLeader, UserTypesEnum.Student, UserTypesEnum.Teacher]
        }
      },
      {
        path: 'manager',
        loadChildren: () => import('./manager/manager.module').then((m) => m.ManagerModule),
        data: {
          roles: [UserTypesEnum.Admin, UserTypesEnum.Manager, UserTypesEnum.BranchLeader, UserTypesEnum.Student, UserTypesEnum.Teacher]
        }
      },
      {
        path: 'branch-manager',
        loadChildren: () => import('./branch-manager/branch-manager.module').then((m) => m.BranchManagerModule),
        data: {
          roles: [UserTypesEnum.Admin, UserTypesEnum.Manager, UserTypesEnum.BranchLeader, UserTypesEnum.Student, UserTypesEnum.Teacher]
        }
      },
      {
        path: 'teacher',
        loadChildren: () => import('./teacher/teacher.module').then((m) => m.TeacherModule),
        data: {
          roles: [UserTypesEnum.Admin, UserTypesEnum.Manager, UserTypesEnum.BranchLeader, UserTypesEnum.Student, UserTypesEnum.Teacher]
        }
      },
      {
        path: 'student',
        loadChildren: () => import('./student/student.module').then((m) => m.StudentModule),
        data: {
          roles: [UserTypesEnum.Admin, UserTypesEnum.Manager, UserTypesEnum.BranchLeader, UserTypesEnum.Student, UserTypesEnum.Teacher]
        }
      },
      {
        path: 'courses',
        loadChildren: () => import('./courses/courses.module').then((m) => m.CoursesModule),
        data: {
          roles: [UserTypesEnum.Admin, UserTypesEnum.Manager, UserTypesEnum.BranchLeader, UserTypesEnum.Student, UserTypesEnum.Teacher]
        }
      },
      {
        path: 'pricing',
        loadComponent: () => import('./online-course-price/online-course-price.component').then((c) => c.OnlineCoursePriceComponent),
        data: {
          roles: [UserTypesEnum.Admin, UserTypesEnum.Manager, UserTypesEnum.BranchLeader, UserTypesEnum.Student, UserTypesEnum.Teacher]
        }
      },
      {
        path: 'site',
        loadComponent: () => import('./online-site/online-site.component').then((c) => c.OnlineSiteComponent),
        data: {
          roles: [UserTypesEnum.Admin, UserTypesEnum.Manager, UserTypesEnum.BranchLeader, UserTypesEnum.Student, UserTypesEnum.Teacher]
        }
      },
      {
        path: 'setting',
        loadChildren: () => import('./setting/setting.module').then((m) => m.SettingModule),
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
export class OnlineCoursesRoutingModule {}
