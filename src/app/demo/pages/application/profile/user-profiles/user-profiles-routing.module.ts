// angular import
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// project import
import { UserProfilesComponent } from './user-profiles.component';

// type
import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';

const routes: Routes = [
  {
    path: '',
    component: UserProfilesComponent,
    children: [
      {
        path: '',
        redirectTo: '/application/profile/user/personal',
        pathMatch: 'full'
      },
      {
        path: 'personal',
        loadComponent: () => import('./us-personal/us-personal.component').then((c) => c.UsPersonalComponent),
        data: { roles: [UserTypesEnum.Admin,] }
      },
      {
        path: 'payment',
        loadComponent: () => import('./us-payment/us-payment.component').then((c) => c.UsPaymentComponent),
        data: { roles: [UserTypesEnum.Admin,] }
      },
      {
        path: 'password',
        loadComponent: () => import('./us-password/us-password.component').then((c) => c.UsPasswordComponent),
        data: { roles: [UserTypesEnum.Admin] }
      },
      {
        path: 'setting',
        loadComponent: () => import('./us-setting/us-setting.component').then((c) => c.UsSettingComponent),
        data: { roles: [UserTypesEnum.Admin, ] }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class UserProfilesRoutingModule {}
