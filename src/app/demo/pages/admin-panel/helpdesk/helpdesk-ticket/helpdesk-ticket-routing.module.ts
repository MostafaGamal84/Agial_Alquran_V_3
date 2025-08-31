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
        path: 'create',
        loadComponent: () => import('./ticket-create/ticket-create.component').then((c) => c.TicketCreateComponent),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager,UserTypesEnum.BranchLeader,UserTypesEnum.Student,UserTypesEnum.Teacher] }
      },
      {
        path: 'list',
        loadComponent: () => import('./ticket-list/ticket-list.component').then((c) => c.TicketListComponent),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager,UserTypesEnum.BranchLeader,UserTypesEnum.Student,UserTypesEnum.Teacher] }
      },
      {
        path: 'details',
        loadComponent: () => import('./ticket-details/ticket-details.component').then((c) => c.TicketDetailsComponent),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager,UserTypesEnum.BranchLeader,UserTypesEnum.Student,UserTypesEnum.Teacher] }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HelpdeskTicketRoutingModule {}
