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
  FilteredResultRequestDto,
  LookupService,
  NationalityDto
} from 'src/app/@theme/services/lookup.service';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs';

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
  private lookupService = inject(LookupService);

  form = this.fb.group({
    id: [0 as number | null],
    name: ['', Validators.required],
    price: [null as number | null, Validators.required],
    minutes: [null as number | null],
    subscribeTypeId: [null as number | null]
  });

  isEdit = false;
  isSubmitting = false;
  types: SubscribeTypeDto[] = [];
  nationalities: NationalityDto[] = [];
  selectedResidentId: number | null = null;
  isLoadingTypes = false;
  typeAvailabilityMessage: string | null = null;

  ngOnInit() {
    const data = history.state?.item as SubscribeDto | undefined;
    if (data) {
      this.isEdit = true;
      this.form.patchValue({
        id: data.id,
        name: data.name ?? '',
        price: data.price ?? null,
        minutes: data.minutes ?? null,
        subscribeTypeId: data.subscribeTypeId ?? data.subscribeType?.id ?? null
      });

    }
    this.loadNationalities();
    this.loadSubscribeTypes();
  }

  submit() {
    if (this.isSubmitting) {
      return;
    }

    const model = this.form.value as CreateSubscribeDto | UpdateSubscribeDto;
    this.isSubmitting = true;
    if (this.isEdit) {
      this.service
        .update(model as UpdateSubscribeDto)
        .pipe(finalize(() => (this.isSubmitting = false)))
        .subscribe({
        next: () => {
          this.toast.success('Subscribe saved successfully');
          this.router.navigate(['/online-course/setting/subscribe/list']);
        },
        error: () => this.toast.error('Error saving subscribe')
      });
    } else {
      this.service
        .create(model as CreateSubscribeDto)
        .pipe(finalize(() => (this.isSubmitting = false)))
        .subscribe({
        next: () => {
          this.toast.success('Subscribe saved successfully');
          this.router.navigate(['/online-course/setting/subscribe/list']);
        },
        error: () => this.toast.error('Error saving subscribe')
      });
    }
  }

  resolveCategoryLabel(group: SubscribeTypeDto['group']): string {
    return this.translate.instant(getSubscribeTypeCategoryTranslationKey(group));
  }

  onResidencyChange(residentId: number | null): void {
    this.selectedResidentId = residentId && residentId > 0 ? residentId : null;
    this.loadSubscribeTypes();
  }

  private loadNationalities(): void {
    this.lookupService.getAllNationalities().subscribe({
      next: (res) => {
        if (res.isSuccess && Array.isArray(res.data)) {
          this.nationalities = res.data;
        } else {
          this.nationalities = [];
        }
      },
      error: () => {
        this.nationalities = [];
      }
    });
  }

  private loadSubscribeTypes(): void {
    const filter: FilteredResultRequestDto = { skipCount: 0, maxResultCount: 100 };
    if (this.selectedResidentId) {
      filter.residentId = this.selectedResidentId;
    }

    this.isLoadingTypes = true;
    this.typeAvailabilityMessage = null;

    this.service.getAllTypes(filter).subscribe({
      next: (res) => {
        if (res.isSuccess && res.data?.items) {
          this.types = res.data.items;
        } else {
          this.types = [];
        }

        const selectedTypeId = this.form.get('subscribeTypeId')?.value;
        if (selectedTypeId && !this.types.some((type) => type.id === selectedTypeId)) {
          this.form.patchValue({ subscribeTypeId: null });
        }

        if (this.types.length === 0) {
          this.typeAvailabilityMessage = this.selectedResidentId
            ? this.translate.instant('No subscribe types are available for the selected residency.')
            : this.translate.instant('No subscribe types are currently available.');
        } else {
          this.typeAvailabilityMessage = null;
        }
      },
      error: () => {
        this.types = [];
        this.typeAvailabilityMessage = this.translate.instant('Unable to load subscribe types.');
        this.toast.error(this.translate.instant('Error loading subscribe types'));
        this.isLoadingTypes = false;
      },
      complete: () => {
        this.isLoadingTypes = false;
      }
    });
  }
}
