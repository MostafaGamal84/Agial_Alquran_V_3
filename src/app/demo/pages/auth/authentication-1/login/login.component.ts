// angular import
import { Component, OnInit, inject } from '@angular/core';
import { first } from 'rxjs/operators';

// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';
import { AuthenticationService } from 'src/app/@theme/services/authentication.service';
import { FormBuilder, FormGroup, FormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { LoadingOverlayComponent } from 'src/app/@theme/components/loading-overlay/loading-overlay.component';
import { DASHBOARD_PATH } from 'src/app/app-config';

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

  // convenience getter for easy access to form fields
  get formValues() {
    return this.loginForm.controls;
  }

  get emailHasError(): boolean {
    return !!(this.submitted && this.formValues?.['email'].errors);
  }

  get passwordHasError(): boolean {
    return !!(this.submitted && this.formValues?.['password'].errors);
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
            const fallbackMessage = 'فشل تسجيل الدخول. حاول مرة أخرى.';
            this.toast.error(fallbackMessage);
          }
        },
        error: () => {
          this.loading = false;
          this.toast.error('فشل تسجيل الدخول. حاول مرة أخرى.');
        }
      });
  }
}
