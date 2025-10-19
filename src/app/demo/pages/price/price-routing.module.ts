// angular import
import { NgModule } from '@angular/core';
import { HashLocationStrategy, LocationStrategy } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

// Type
import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';

const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'price-1',
        loadComponent: () => import('./pricing/pricing.component').then((c) => c.PricingComponent),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager] }
      },
      {
        path: 'price-2',
        loadComponent: () => import('./price-two/price-two.component').then((c) => c.PriceTwoComponent),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager] }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
  providers: [{ provide: LocationStrategy, useClass: HashLocationStrategy }]
})
export class PriceRoutingModule {}
