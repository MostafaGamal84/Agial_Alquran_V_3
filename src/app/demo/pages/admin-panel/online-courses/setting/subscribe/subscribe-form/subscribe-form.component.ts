import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { SharedModule } from 'src/app/demo/shared/shared.module';
import {
  SubscribeService,
  CreateSubscribeDto,
  UpdateSubscribeDto,
  SubscribeTypeDto,
  SubscribeDto
} from 'src/app/@theme/services/subscribe.service';
import { FilteredResultRequestDto } from 'src/app/@theme/services/lookup.service';
import { ToastService } from 'src/app/@theme/services/toast.service';

@Component({
  selector: 'app-subscribe-form',
  imports: [SharedModule, RouterModule],
  templateUrl: './subscribe-form.component.html',
  styleUrl: './subscribe-form.component.scss'
})
export class SubscribeFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(SubscribeService);
  private router = inject(Router);
  private toast = inject(ToastService);

  form = this.fb.group({
    id: [0],
    name: ['', Validators.required],
    leprice: [],
    sarprice: [],
    usdprice: [],
    minutes: [],
    subscribeTypeId: []
  });

  isEdit = false;
  types: SubscribeTypeDto[] = [];

  ngOnInit() {
    const data = history.state?.item as SubscribeDto | undefined;
    if (data) {
      this.isEdit = true;
      this.form.patchValue({
        id: data.id,
        name: data.name ?? null,
        leprice: data.leprice ?? null,
        sarprice: data.sarprice ?? null,
        usdprice: data.usdprice ?? null,
        minutes: data.minutes ?? null,
        subscribeTypeId: data.subscribeTypeId ?? null,
      });

    }
    const filter: FilteredResultRequestDto = { skipCount: 0, maxResultCount: 100 };
    this.service.getAllTypes(filter).subscribe((res) => {
      if (res.isSuccess && res.data?.items) {
        this.types = res.data.items;
      }
    });
  }

  submit() {
    const model = this.form.value as CreateSubscribeDto | UpdateSubscribeDto;
    if (this.isEdit) {
      this.service.update(model as UpdateSubscribeDto).subscribe({
        next: () => {
          this.toast.success('Subscribe saved successfully');
          this.router.navigate(['/online-course/setting/subscribe/list']);
        },
        error: () => this.toast.error('Error saving subscribe')
      });
    } else {
      this.service.create(model as CreateSubscribeDto).subscribe({
        next: () => {
          this.toast.success('Subscribe saved successfully');
          this.router.navigate(['/online-course/setting/subscribe/list']);
        },
        error: () => this.toast.error('Error saving subscribe')
      });
    }
  }
}
