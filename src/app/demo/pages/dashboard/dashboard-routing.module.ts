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
        path: 'default',
        loadComponent: () => import('./default/default.component').then((c) => c.DefaultComponent),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager] }
      },
      {
        path: 'analytics',
        loadComponent: () => import('./analytics/analytics.component').then((c) => c.AnalyticsComponent),
        data: { roles: [UserTypesEnum.Admin] }
      },
      {
        path: 'finance',
        loadComponent: () => import('./finance/finance.component').then((c) => c.FinanceComponent),
        data: { roles: [UserTypesEnum.Admin] }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DashboardRoutingModule {}
