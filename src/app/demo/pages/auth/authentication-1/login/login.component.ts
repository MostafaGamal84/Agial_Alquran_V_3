// angular import
import { Component, OnInit, inject } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { ActivatedRoute, Router, RouterModule } from '@angular/router';
// import { FormBuilder, FormGroup, FormsModule, Validators } from '@angular/forms';
import { first } from 'rxjs/operators';

// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';
import { AuthenticationService } from 'src/app/@theme/services/authentication.service';
import { FormBuilder, FormGroup, FormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { TranslateService } from '@ngx-translate/core';
import { LoadingOverlayComponent } from 'src/app/@theme/components/loading-overlay/loading-overlay.component';
import { DASHBOARD_PATH } from 'src/app/app-config';
import { AccessibilityModeService } from 'src/app/@theme/services/accessibility-mode.service';

interface Roles {
  name: string;
  email: string;
  password: string;
  role: string;
}

@Component({
  selector: 'app-login',
  imports: [CommonModule, SharedModule, RouterModule, FormsModule, LoadingOverlayComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss', '../authentication-1.scss', '../../authentication.scss']
})
export class LoginComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  authenticationService = inject(AuthenticationService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);
  private accessibilityModeService = inject(AccessibilityModeService);

  // public props
  hide = true;
  loginForm: FormGroup;
  loading = false;
  submitted = false;
  returnUrl: string;

  ngOnInit() {
    this.loginForm = this.formBuilder.group({
      email: ['', Validators.required],
      password: ['', Validators.required]
    });

    // get return url from route parameters or fall back to dashboard
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || DASHBOARD_PATH;

    if (this.authenticationService.isLoggedIn()) {
      const targetUrl = this.returnUrl.startsWith('/login') ? DASHBOARD_PATH : this.returnUrl;
      this.router.navigateByUrl(targetUrl, { replaceUrl: true });
      return;
    }
  }


  get isBlindModeEnabled(): boolean {
    return this.accessibilityModeService.isEnabled();
  }

  toggleBlindMode(): void {
    const isEnabled = this.accessibilityModeService.toggle();
    this.toast.success(
      isEnabled ? this.translate.instant('AUTH.LOGIN.BlindModeEnabled') : this.translate.instant('AUTH.LOGIN.BlindModeDisabled')
    );
  }

  // convenience getter for easy access to form fields
  get formValues() {
    return this.loginForm.controls;
  }

  onSubmit() {
    this.submitted = true;

    // stop here if form is invalid
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    this.authenticationService
      .login(this.formValues['email'].value, this.formValues['password'].value)
      .pipe(first())
      .subscribe({
        next: (res) => {
          this.loading = false;
          if (res?.isSuccess && res?.data) {
            this.toast.success('تم تسجيل الدخول بنجاح');
            this.router.navigateByUrl(this.returnUrl);
          } else if (res?.errors?.length && res.errors[0].message) {
            this.toast.error(res.errors[0].message);
          } else {
            this.toast.error('فشل تسجيل الدخول. حاول مرة أخرى.');
          }
        },
        error: () => {
          this.loading = false;
          this.toast.error('فشل تسجيل الدخول. حاول مرة أخرى.');
        }
      });
  }

  roles: Roles[] = [
    {
      name: 'Admin',
      email: 'admin@gmail.com',
      password: 'Admin@123',
      role: 'Admin'
    },
    {
      name: 'User',
      email: 'user@gmail.com',
      password: 'User@123',
      role: 'User'
    }
  ];

  // Default to the first role
  selectedRole = this.roles[0];

  onSelectRole(role: Roles) {
    this.selectedRole = role;
  }
}
