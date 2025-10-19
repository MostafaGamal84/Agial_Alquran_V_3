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
        path: 'statistics',
        loadComponent: () => import('./statistics/statistics.component').then((c) => c.StatisticsComponent),
        data: { roles: [UserTypesEnum.Admin, ] }
      },
      {
        path: 'data',
        loadComponent: () => import('./widget-data/widget-data.component').then((c) => c.WidgetDataComponent),
        data: { roles: [UserTypesEnum.Admin, ] }
      },
      {
        path: 'chart',
        loadComponent: () => import('./chart/chart.component').then((c) => c.WidgetChartComponent),
        data: { roles: [UserTypesEnum.Admin, ] }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class WidgetRoutingModule {}
