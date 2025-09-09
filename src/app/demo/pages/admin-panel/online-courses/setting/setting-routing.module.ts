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
        path: 'payment',
        loadComponent: () => import('./payment/payment.component').then((c) => c.PaymentComponent),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager,UserTypesEnum.BranchLeader,UserTypesEnum.Student,UserTypesEnum.Teacher] }
      },
      {
        path: 'price',
        loadComponent: () => import('./pricing/pricing.component').then((c) => c.PricingComponent),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager,UserTypesEnum.BranchLeader,UserTypesEnum.Student,UserTypesEnum.Teacher] }
      },
      {
        path: 'notification',
        loadComponent: () => import('./notification/notification.component').then((c) => c.NotificationComponent),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager,UserTypesEnum.BranchLeader,UserTypesEnum.Student,UserTypesEnum.Teacher] }
      },
      {
        path: 'subscribe',
        loadChildren: () => import('./subscribe/subscribe.module').then((m) => m.SubscribeModule),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager,UserTypesEnum.BranchLeader,UserTypesEnum.Student,UserTypesEnum.Teacher] }
      },
      {
        path: 'subscribe-type',
        loadChildren: () => import('./subscribe-type/subscribe-type.module').then((m) => m.SubscribeTypeModule),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager,UserTypesEnum.BranchLeader,UserTypesEnum.Student,UserTypesEnum.Teacher] }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SettingRoutingModule {}
