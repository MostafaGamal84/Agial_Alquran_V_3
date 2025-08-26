// angular import
import { Component, OnInit, inject } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { ActivatedRoute, Router, RouterModule } from '@angular/router';
// import { FormBuilder, FormGroup, FormsModule, Validators } from '@angular/forms';
import { first } from 'rxjs/operators';

// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';
import { AuthenticationService } from 'src/app/@theme/services/authentication.service';
import { DASHBOARD_PATH } from 'src/app/app-config';
import { FormBuilder, FormGroup, FormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

interface Roles {
  name: string;
  email: string;
  password: string;
  role: string;
}

@Component({
  selector: 'app-login',
  imports: [CommonModule, SharedModule, RouterModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss', '../authentication-1.scss', '../../authentication.scss']
})
export class LoginComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  authenticationService = inject(AuthenticationService);

  // public props
  hide = true;
  loginForm: FormGroup;
  loading = false;
  submitted = false;
  returnUrl: string;
  error = '';

  ngOnInit() {
    this.loginForm = this.formBuilder.group({
      email: ['', Validators.required],
      password: ['', Validators.required]
    });

    if (window.location.pathname !== '/authentication-1/login') {
      if (this.authenticationService.currentUserValue) {
        this.router.navigate([DASHBOARD_PATH]);
      }
    }

    // get return url from route parameters or default to '/'
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'];
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
      .subscribe(
        () => {
          this.router.navigate([DASHBOARD_PATH]);
        },
        (error) => {
          this.error = error;
          this.loading = false;
        }
      );
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
