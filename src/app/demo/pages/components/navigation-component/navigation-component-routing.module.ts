import { NgModule } from '@angular/core';
import { HashLocationStrategy, LocationStrategy } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'paginator',
        loadChildren: () => import('./paginator/paginator.module').then((e) => e.PaginatorModule)
      },
      {
        path: 'tabs',
        loadComponent: () => import('./tabs/tabs.component').then((c) => c.TabsComponent)
      },
      {
        path: 'stepper',
        loadComponent: () => import('./stepper/stepper.component').then((c) => c.StepperComponent)
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
  providers: [{ provide: LocationStrategy, useClass: HashLocationStrategy }]
})
export class NavigationComponentRoutingModule {}
