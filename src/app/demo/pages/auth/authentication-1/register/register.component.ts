// angular import
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';

// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';
import { AuthenticationService } from 'src/app/@theme/services/authentication.service';
import { UserService, CreateUserDto } from 'src/app/@theme/services/user.service';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';

@Component({
  selector: 'app-register',
  imports: [CommonModule, SharedModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss', '../authentication-1.scss', '../../authentication.scss']
})
export class RegisterComponent implements OnInit {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private toast = inject(ToastService);
  authenticationService = inject(AuthenticationService);

  // public props
  hide = true;
  coHide = true;
  registerForm!: FormGroup;

  userTypes = [
    { id: UserTypesEnum.Admin, label: 'Admin' },
    { id: UserTypesEnum.Manager, label: 'Manager' },
    { id: UserTypesEnum.BranchLeader, label: 'Branch Leader' },
    { id: UserTypesEnum.Teacher, label: 'Teacher' },
    { id: UserTypesEnum.Student, label: 'Student' }
  ];

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      mobile: ['', Validators.required],
      secondMobile: [''],
      passwordHash: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
      userTypeId: [null, Validators.required],
      nationalityId: [null, Validators.required],
      governorateId: [null, Validators.required],
      branchId: [null, Validators.required]
    });
  }

  get form() {
    return this.registerForm.controls;
  }

  // public method
  getErrorMessage() {
    if (this.form['email'].hasError('required')) {
      return 'You must enter an email';
    }

    return this.form['email'].hasError('email') ? 'Not a valid email' : '';
  }

  onSubmit() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    if (this.form['passwordHash'].value !== this.form['confirmPassword'].value) {
      this.toast.error('Passwords do not match');
      return;
    }

    const formValue = this.registerForm.value;
    const model: CreateUserDto = {
      fullName: formValue.fullName,
      email: formValue.email,
      mobile: formValue.mobile,
      secondMobile: formValue.secondMobile,
      passwordHash: formValue.passwordHash,
      userTypeId: Number(formValue.userTypeId),
      nationalityId: formValue.nationalityId,
      governorateId: formValue.governorateId,
      branchId: formValue.branchId
    };

    this.userService.createUser(model).subscribe({
      next: (res) => {
        if (res.isSuccess) {
          this.toast.success(res.message || 'User created successfully');
          this.registerForm.reset();
        } else if (res.errors?.length) {
          res.errors.forEach((e) => this.toast.error(e.message));
        } else {
          this.toast.error('Error creating user');
        }
      },
      error: () => this.toast.error('Error creating user')
    });
  }
}
