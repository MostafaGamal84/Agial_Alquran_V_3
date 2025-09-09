import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { SharedModule } from 'src/app/demo/shared/shared.module';
import {
  SubscribeService,
  CreateSubscribeTypeDto,
  UpdateSubscribeTypeDto,
  SubscribeTypeDto
} from 'src/app/@theme/services/subscribe.service';
import { ToastService } from 'src/app/@theme/services/toast.service';

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
    id: [0],
    name: ['', Validators.required],
    forignPricePerHour: [],
    arabPricePerHour: []
  });

  isEdit = false;

  ngOnInit() {
    const data = history.state?.item as SubscribeTypeDto | undefined;
    if (data) {
      this.isEdit = true;
      this.form.patchValue(data as Partial<SubscribeTypeDto>);
    }
  }

  submit() {
    const model = this.form.value as CreateSubscribeTypeDto | UpdateSubscribeTypeDto;
    if (this.isEdit) {
      this.service.updateType(model as UpdateSubscribeTypeDto).subscribe({
        next: () => {
          this.toast.success('Subscribe type saved successfully');
          this.router.navigate(['/online-course/setting/subscribe-type/list']);
        },
        error: () => this.toast.error('Error saving subscribe type')
      });
    } else {
      this.service.createType(model as CreateSubscribeTypeDto).subscribe({
        next: () => {
          this.toast.success('Subscribe type saved successfully');
          this.router.navigate(['/online-course/setting/subscribe-type/list']);
        },
        error: () => this.toast.error('Error saving subscribe type')
      });
    }
  }
}
