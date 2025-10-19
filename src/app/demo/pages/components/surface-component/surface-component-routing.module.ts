import { NgModule } from '@angular/core';
import { HashLocationStrategy, LocationStrategy } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'card',
        loadComponent: () => import('./cards-basic/cards-basic.component').then((c) => c.CardsBasicComponent)
      },
      {
        path: 'accordion',
        loadComponent: () => import('./accordion/accordion.component').then((c) => c.AccordionComponent)
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
  providers: [{ provide: LocationStrategy, useClass: HashLocationStrategy }]
})
export class SurfaceComponentRoutingModule {}
