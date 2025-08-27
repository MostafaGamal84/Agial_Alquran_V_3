// angular import
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';
import { UserService, CreateUserDto } from 'src/app/@theme/services/user.service';

@Component({
  selector: 'app-teacher-add',
  imports: [SharedModule],
  templateUrl: './teacher-add.component.html',
  styleUrl: './teacher-add.component.scss'
})
export class TeacherAddComponent implements OnInit {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);

  basicInfoForm!: FormGroup;

  ngOnInit(): void {
    this.basicInfoForm = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      mobile: ['', Validators.required],
      secondMobile: [''],
      passwordHash: ['', [Validators.required, Validators.minLength(6)]],
      userTypeId: [null, Validators.required],
      nationalityId: [null, Validators.required],
      governorateId: [null, Validators.required],
      branchId: [null, Validators.required]
    });
  }

  onSubmit() {
    if (this.basicInfoForm.valid) {
      const model: CreateUserDto = this.basicInfoForm.value;
      this.userService.createUser(model).subscribe({
        next: (res) => console.log('User created', res),
        error: (err) => console.error('Error creating user', err)
      });
    } else {
      this.basicInfoForm.markAllAsTouched();
    }
  }
}
