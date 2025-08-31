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
        path: 'dashboard',
        loadComponent: () => import('./invoice-dashboard/invoice-dashboard.component').then((c) => c.InvoiceDashboardComponent),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager,UserTypesEnum.BranchLeader,UserTypesEnum.Student,UserTypesEnum.Teacher] }
      },
      {
        path: 'create',
        loadComponent: () => import('./invoice-create/invoice-create.component').then((c) => c.InvoiceCreateComponent),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager,UserTypesEnum.BranchLeader,UserTypesEnum.Student,UserTypesEnum.Teacher] }
      },
      {
        path: 'details',
        loadComponent: () => import('./invoice-details/invoice-details.component').then((c) => c.InvoiceDetailsComponent),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager,UserTypesEnum.BranchLeader,UserTypesEnum.Student,UserTypesEnum.Teacher] }
      },
      {
        path: 'list',
        loadComponent: () => import('./invoice-list/invoice-list.component').then((c) => c.InvoiceListComponent),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager,UserTypesEnum.BranchLeader,UserTypesEnum.Student,UserTypesEnum.Teacher] }
      },
      {
        path: 'edit',
        loadComponent: () => import('./invoice-edit/invoice-edit.component').then((c) => c.InvoiceEditComponent),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager,UserTypesEnum.BranchLeader,UserTypesEnum.Student,UserTypesEnum.Teacher] }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class InvoiceRoutingModule {}
