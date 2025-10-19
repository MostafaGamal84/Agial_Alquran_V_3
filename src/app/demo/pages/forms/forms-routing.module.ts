// angular import
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Type
import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';

const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'layout',
        loadChildren: () => import('./frm-layouts/frm-layouts.module').then((m) => m.FrmLayoutsModule),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager] }
      },
      {
        path: 'plugins',
        loadChildren: () => import('./frm-plugins/frm-plugins.module').then((m) => m.FrmPluginsModule),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager] }
      },
      {
        path: 'validation',
        loadComponent: () => import('./forms-validation/forms-validation.component').then((c) => c.FormsValidationComponent),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager] }
      },
      {
        path: 'wizard',
        loadComponent: () => import('./forms-wizard/forms-wizard.component').then((c) => c.FormsWizardComponent),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager] }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FormsRoutingModule {}
