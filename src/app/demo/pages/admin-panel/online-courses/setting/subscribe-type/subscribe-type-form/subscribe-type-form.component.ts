import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { SharedModule } from 'src/app/demo/shared/shared.module';
import {
  SubscribeService,
  CreateSubscribeTypeDto,
  UpdateSubscribeTypeDto,
  SubscribeTypeDto,
  SubscribeTypeCategory
} from 'src/app/@theme/services/subscribe.service';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-subscribe-type-form',
  imports: [SharedModule, RouterModule],
  templateUrl: './subscribe-type-form.component.html',
  styleUrl: './subscribe-type-form.component.scss'
})
export class SubscribeTypeFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(SubscribeService);
  private router = inject(Router);
  private toast = inject(ToastService);

  form = this.fb.group({
    id: [0 as number | null],
    name: ['', Validators.required],
    hourPrice: [null as number | null, [Validators.required, Validators.min(0)]],
    group: [null as SubscribeTypeCategory | null, Validators.required]
  });

  isEdit = false;
  isSubmitting = false;
  readonly groupOptions = [
    { value: SubscribeTypeCategory.Unknown, label: 'Unknown' },
    { value: SubscribeTypeCategory.Foreign, label: 'اجانب' },
    { value: SubscribeTypeCategory.Arab, label: 'عرب' },
    { value: SubscribeTypeCategory.Egyptian, label: 'مصريين' }
  ];

  ngOnInit() {
    const data = history.state?.item as SubscribeTypeDto | undefined;
    if (data) {
      this.isEdit = true;
      this.form.patchValue({
        id: data.id,
        name: data.name ?? '',

        hourPrice: data.hourPrice ?? null,
        group: data.group ?? null
      });

    }
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const model = this.form.value as CreateSubscribeTypeDto | UpdateSubscribeTypeDto;
    if (this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;

    if (this.isEdit) {
      this.service
        .updateType(model as UpdateSubscribeTypeDto)
        .pipe(finalize(() => (this.isSubmitting = false)))
        .subscribe({
        next: () => {
          this.toast.success('Subscribe type saved successfully');
          this.router.navigate(['/online-course/setting/subscribe-type/list']);
        },
        error: () => this.toast.error('Error saving subscribe type')
      });
    } else {
      this.service
        .createType(model as CreateSubscribeTypeDto)
        .pipe(finalize(() => (this.isSubmitting = false)))
        .subscribe({
        next: () => {
          this.toast.success('Subscribe type saved successfully');
          this.router.navigate(['/online-course/setting/subscribe-type/list']);
        },
        error: () => this.toast.error('Error saving subscribe type')
      });
    }
  }
}
