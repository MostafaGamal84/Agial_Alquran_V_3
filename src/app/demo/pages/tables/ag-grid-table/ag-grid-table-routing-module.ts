import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';

const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'basic',
        loadComponent: () => import('./basic-table/basic-table').then((c) => c.BasicTable),
        data: {
          roles: [UserTypesEnum.Admin, UserTypesEnum.Manager]
        }
      },
      {
        path: 'column-moving',
        loadComponent: () => import('./column-moving/column-moving').then((c) => c.ColumnMoving),
        data: {
          roles: [UserTypesEnum.Admin, UserTypesEnum.Manager]
        }
      },
      {
        path: 'row-pagination',
        loadComponent: () => import('./row-pagination/row-pagination').then((c) => c.RowPagination),
        data: {
          roles: [UserTypesEnum.Admin, UserTypesEnum.Manager]
        }
      },
      {
        path: 'highlight-change',
        loadComponent: () => import('./highlighting-change/highlighting-change').then((c) => c.HighlightingChange),
        data: {
          roles: [UserTypesEnum.Admin, UserTypesEnum.Manager]
        }
      },
      {
        path: 'column-filter',
        loadComponent: () => import('./column-filter/column-filter').then((c) => c.ColumnFilter),
        data: {
          roles: [UserTypesEnum.Admin, UserTypesEnum.Manager]
        }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AgGridTableRoutingModule {}
