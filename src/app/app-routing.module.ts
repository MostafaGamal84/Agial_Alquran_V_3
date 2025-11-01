// angular import
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// project import
import { AdminComponent } from './demo/layout/admin';
import { EmptyComponent } from './demo/layout/empty/empty.component';
import { GuestComponent } from './demo/layout/front/guest.component';
import { AuthGuardChild } from './@theme/helpers/auth.guard';

//Type
import { UserTypesEnum } from './@theme/types/UserTypesEnum';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: '',
    component: EmptyComponent,
    children: [
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
      },
      {
        path: 'login',
        loadComponent: () => import('./demo/pages/auth/authentication-1/login/login.component').then((c) => c.LoginComponent)
      },
      {
        path: 'register',
        loadComponent: () => import('./demo/pages/auth/authentication-1/register/register.component').then((c) => c.RegisterComponent)
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./demo/pages/auth/authentication-1/forgot-password/forgot-password.component').then((c) => c.ForgotPasswordComponent)
      },
      {
        path: 'reset-password',
        loadComponent: () =>
          import('./demo/pages/auth/authentication-1/reset-password/reset-password.component').then((c) => c.ResetPasswordComponent)
      },
      {
        path: 'authentication-1',
        loadChildren: () => import('./demo/pages/auth/authentication-1/authentication-1.module').then((e) => e.Authentication1Module),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager] }
      },
      {
        path: 'authentication-2',
        canActivateChild: [AuthGuardChild],
        loadChildren: () => import('./demo/pages/auth/authentication-2/authentication-2.module').then((e) => e.Authentication2Module),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager] }
      },
      {
        path: 'authentication-3',
        canActivateChild: [AuthGuardChild],
        loadComponent: () =>
          import('./demo/pages/auth/authentication-3/authentication-three.component').then((c) => c.AuthenticationThreeComponent),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager] }
      },
      {
        path: 'maintenance',
        loadChildren: () => import('./demo/pages/maintenance/maintenance.module').then((m) => m.MaintenanceModule)
      },
      {
        path: 'unauthorized',
        loadComponent: () => import('./demo/pages/maintenance/error-401/error-401.component').then((c) => c.Error401Component)
      }
    ]
  },
  {
    path: '',
    component: GuestComponent,
    children: [
      {
        path: '',
        loadChildren: () => import('./demo/pages/admin-panel/online-courses/online-courses.module').then((m) => m.OnlineCoursesModule),
      },
      {
        path: 'landing',
        loadComponent: () => import('./demo/pages/landing/landing.component').then((c) => c.LandingComponent)
      },
      {
        path: 'contact-us',
        loadComponent: () => import('./demo/pages/contact-us/contact-us.component').then((c) => c.ContactUsComponent)
      },
      {
        path: 'components',
        loadChildren: () => import('src/app/demo/layout/component/component.module').then((m) => m.ComponentModule)
      }
    ]
  },
  {
    path: '',
    component: AdminComponent,
    canActivateChild: [AuthGuardChild],
    children: [
      {
        path: '',
        loadChildren: () => import('./demo/pages/dashboard/dashboard.module').then((m) => m.DashboardModule),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager] }
      },
      {
        path: 'dashboard',
        loadChildren: () => import('./demo/pages/dashboard/dashboard.module').then((m) => m.DashboardModule),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager] }
      },
      {
        path: 'widget',
        loadChildren: () => import('./demo/pages/widget/widget.module').then((m) => m.WidgetModule),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager] }
      },
      {
        path: 'online-course',
        loadChildren: () => import('./demo/pages/admin-panel/online-courses/online-courses.module').then((m) => m.OnlineCoursesModule),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager] }
      },
      {
        path: 'membership',
        loadChildren: () => import('./demo/pages/admin-panel/membership/membership.module').then((m) => m.MembershipModule),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager] }
      },
      {
        path: 'helpdesk',
        loadChildren: () => import('./demo/pages/admin-panel/helpdesk/helpdesk.module').then((m) => m.HelpdeskModule),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager] }
      },
      {
        path: 'invoice',
        loadChildren: () => import('./demo/pages/admin-panel/invoice/invoice.module').then((m) => m.InvoiceModule),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager] }
      },
      {
        path: 'teacher-salary',
        loadChildren: () =>
          import('./demo/pages/admin-panel/teacher-salary/teacher-salary.module').then(
            (m) => m.TeacherSalaryModule
          ),
        data: {
          roles: [UserTypesEnum.Admin, UserTypesEnum.Manager, UserTypesEnum.Teacher]
        }
      },
      {
        path: 'application',
        loadChildren: () => import('./demo/pages/application/application.module').then((m) => m.ApplicationModule),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager] }
      },
      {
        path: 'apex-chart',
        loadComponent: () => import('./demo/pages/chart/apex-charts/apex-charts.component').then((c) => c.ApexChartsComponent),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager] }
      },
      {
        path: 'material-table',
        loadComponent: () => import('./demo/pages/tables/material-table/material-table.component').then((c) => c.MaterialTableComponent),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager] }
      },
      {
        path: 'ag-grid-table',
        loadChildren: () => import('./demo/pages/tables/ag-grid-table/ag-grid-table-module').then((m) => m.AgGridTableModule),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager] }
      },
      {
        path: 'forms',
        loadChildren: () => import('./demo/pages/forms/forms.module').then((m) => m.FormsModule),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager] }
      },
      {
        path: 'price',
        loadChildren: () => import('./demo/pages/price/price-routing.module').then((m) => m.PriceRoutingModule),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager] }
      },
      {
        path: 'sample-page',
        loadComponent: () => import('./demo/pages/other/sample-page/sample-page.component').then((c) => c.SamplePageComponent),
        data: { roles: [UserTypesEnum.Admin, UserTypesEnum.Manager] }
      }
    ]
  },
  {
    path: '**',
    loadComponent: () => import('./demo/pages/maintenance/error/error.component').then((c) => c.ErrorComponent)
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
