import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { SharedModule } from 'src/app/demo/shared/shared.module';
import {
  SubscribeService,
  CreateSubscribeDto,
  UpdateSubscribeDto,
  SubscribeTypeDto,
  SubscribeDto,
  getSubscribeTypeCategoryTranslationKey
} from 'src/app/@theme/services/subscribe.service';
import {
  SUBSCRIBE_AUDIENCE_OPTIONS,
  SubscribeAudience,
  SubscribeAudienceOption,
  getSubscribeAudienceTranslationKey
} from 'src/app/@theme/services/subscribe-audience';
import { FilteredResultRequestDto } from 'src/app/@theme/services/lookup.service';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-subscribe-form',
  imports: [CommonModule, SharedModule, RouterModule],
  templateUrl: './subscribe-form.component.html',
  styleUrl: './subscribe-form.component.scss'
})
export class SubscribeFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(SubscribeService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);

  form = this.fb.group({
    id: [0 as number | null],
    name: ['', Validators.required],
    leprice: [null as number | null],
    sarprice: [null as number | null],
    usdprice: [null as number | null],
    minutes: [null as number | null],
    subscribeTypeId: [null as number | null],
    subscribeFor: [null as SubscribeAudience | null, Validators.required]
  });

  isEdit = false;
  types: SubscribeTypeDto[] = [];
  audienceOptions: readonly SubscribeAudienceOption[] = SUBSCRIBE_AUDIENCE_OPTIONS;

  ngOnInit() {
    const data = history.state?.item as SubscribeDto | undefined;
    if (data) {
      this.isEdit = true;
      this.form.patchValue({
        id: data.id,
        name: data.name ?? '',
        leprice: data.leprice ?? null,
        sarprice: data.sarprice ?? null,
        usdprice: data.usdprice ?? null,
        minutes: data.minutes ?? null,
        subscribeTypeId: data.subscribeTypeId ?? data.subscribeType?.id ?? null,
        subscribeFor: data.subscribeFor ?? null,
      });

    }
    const filter: FilteredResultRequestDto = { skipCount: 0, maxResultCount: 100 };
    this.service.getAllTypes(filter).subscribe({
      next: (res) => {
        if (res.isSuccess && res.data?.items) {
          this.types = res.data.items;
        } else {
          this.types = [];
        }
      },
      error: () => this.toast.error('Error loading subscribe types')
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

  resolveCategoryLabel(type: SubscribeTypeDto['type']): string {
    return this.translate.instant(getSubscribeTypeCategoryTranslationKey(type));
  }

  resolveAudienceLabel(audience: SubscribeAudience | null): string {
    return this.translate.instant(getSubscribeAudienceTranslationKey(audience));
  }
}
