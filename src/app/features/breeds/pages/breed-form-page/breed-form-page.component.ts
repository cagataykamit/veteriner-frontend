import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import type { BreedUpsertRequest } from '@/app/features/breeds/models/breed-upsert.model';
import { BreedsService } from '@/app/features/breeds/services/breeds.service';
import {
    type BreedUpsertFieldErrors,
    type BreedUpsertFormFieldKey,
    parseBreedUpsertHttpError
} from '@/app/features/breeds/utils/breed-upsert-validation-parse.utils';
import { SpeciesService } from '@/app/features/species/services/species.service';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';

@Component({
    selector: 'app-breed-form-page',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterLink,
        ButtonModule,
        InputTextModule,
        SelectModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent
    ],
    template: `
        <a routerLink="/panel/breeds" class="text-primary font-medium no-underline inline-block mb-4">← Irk listesine dön</a>

        @if (editing() && loading()) {
            <app-loading-state message="Irk bilgileri yükleniyor…" />
        } @else if (editing() && loadError()) {
            <div class="card">
                <app-error-state [detail]="loadError()!" [showRetry]="!!currentId()" (retry)="reloadBreedRecord()" />
            </div>
        } @else {
            <app-page-header
                [title]="editing() ? 'Irk Düzenle' : 'Yeni Irk'"
                subtitle="Referans yönetimi"
                [description]="editing() ? 'Irk kaydını güncelleyin.' : 'Yeni ırk kaydı oluşturun.'"
            />

            <div class="card">
            @if (ro.mutationBlocked()) {
                <p class="text-amber-700 dark:text-amber-300 text-sm mt-0 mb-4" role="status">
                    İşletme salt okunur moddadır; ırk kaydı güncellenemez veya oluşturulamaz.
                </p>
            }
            <form [formGroup]="form" (ngSubmit)="onSubmit()">
                <div class="grid grid-cols-12 gap-4">
                    <div class="col-span-12 md:col-span-6">
                        <label for="speciesId" class="block text-sm font-medium text-muted-color mb-2">Tür *</label>
                        <p-select
                            inputId="speciesId"
                            formControlName="speciesId"
                            [options]="speciesOptions()"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Tür seçin"
                            [loading]="loadingSpecies()"
                            styleClass="w-full"
                        />
                        @if (apiFieldErrors().speciesId) {
                            <small class="text-red-500">{{ apiFieldErrors().speciesId }}</small>
                        } @else if (form.controls.speciesId.invalid && form.controls.speciesId.touched) {
                            <small class="text-red-500">Tür seçimi zorunludur.</small>
                        }
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="name" class="block text-sm font-medium text-muted-color mb-2">Ad *</label>
                        <input id="name" pInputText class="w-full" formControlName="name" />
                        @if (apiFieldErrors().name) {
                            <small class="text-red-500">{{ apiFieldErrors().name }}</small>
                        } @else if (form.controls.name.invalid && form.controls.name.touched) {
                            @if (form.controls.name.hasError('required')) {
                                <small class="text-red-500">Ad zorunludur.</small>
                            } @else if (form.controls.name.hasError('maxlength')) {
                                <small class="text-red-500">Ad en fazla 128 karakter olabilir.</small>
                            }
                        }
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="isActive" class="block text-sm font-medium text-muted-color mb-2">Durum *</label>
                        <p-select
                            inputId="isActive"
                            formControlName="isActive"
                            [options]="activeOptions"
                            optionLabel="label"
                            optionValue="value"
                            styleClass="w-full"
                        />
                        @if (apiFieldErrors().isActive) {
                            <small class="text-red-500">{{ apiFieldErrors().isActive }}</small>
                        }
                    </div>
                </div>

                @if (submitError()) {
                    <p class="text-red-500 mt-4 mb-0" role="alert">{{ submitError() }}</p>
                }

                <div class="flex flex-wrap gap-2 mt-4">
                    <p-button
                        type="submit"
                        [label]="editing() ? 'Güncelle' : copy.buttonSave"
                        icon="pi pi-check"
                        [loading]="submitting() || loading()"
                        [disabled]="form.invalid || submitting() || loading() || loadingSpecies() || ro.mutationBlocked()"
                    />
                    <p-button
                        type="button"
                        [label]="copy.buttonCancel"
                        icon="pi pi-times"
                        severity="secondary"
                        (onClick)="goList()"
                        [disabled]="submitting()"
                    />
                </div>
            </form>
        </div>
        }
    `
})
export class BreedFormPageComponent implements OnInit {
    readonly copy = PANEL_COPY;
    private readonly fb = inject(FormBuilder);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly breedsService = inject(BreedsService);
    private readonly speciesService = inject(SpeciesService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly editing = signal(false);
    readonly loading = signal(false);
    readonly loadError = signal<string | null>(null);
    readonly loadingSpecies = signal(false);
    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);
    readonly apiFieldErrors = signal<BreedUpsertFieldErrors>({});
    readonly currentId = signal<string | null>(null);
    readonly speciesOptions = signal<{ label: string; value: string }[]>([]);

    readonly activeOptions = [
        { label: 'Aktif', value: true },
        { label: 'Pasif', value: false }
    ];

    readonly form = this.fb.nonNullable.group({
        speciesId: ['', Validators.required],
        name: ['', [Validators.required, Validators.maxLength(128)]],
        isActive: [true, Validators.required]
    });

    ngOnInit(): void {
        this.loadSpeciesOptions();
        const id = this.route.snapshot.paramMap.get('id');
        if (!id) {
            return;
        }
        this.editing.set(true);
        this.currentId.set(id);
        this.reloadBreedRecord();
    }

    reloadBreedRecord(): void {
        const id = this.currentId();
        if (!id) {
            return;
        }
        this.loading.set(true);
        this.loadError.set(null);
        this.breedsService.getBreedById(id).subscribe({
            next: (item) => {
                this.form.patchValue({
                    speciesId: item.speciesId ?? '',
                    name: item.name === '—' ? '' : item.name,
                    isActive: item.isActive
                });
                this.loading.set(false);
            },
            error: (e: unknown) => {
                this.loadError.set(panelHttpFailureMessage(e, 'Irk bilgileri yüklenemedi.'));
                this.loading.set(false);
            }
        });
    }

    onSubmit(): void {
        if (this.ro.mutationBlocked()) {
            return;
        }
        this.submitError.set(null);
        this.apiFieldErrors.set({});
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        const v = this.form.getRawValue();
        const payload: BreedUpsertRequest = {
            speciesId: v.speciesId.trim(),
            name: v.name.trim(),
            isActive: !!v.isActive
        };

        this.submitting.set(true);
        if (this.editing() && this.currentId()) {
            this.breedsService.updateBreed(this.currentId()!, payload).subscribe({
                next: () => {
                    this.submitting.set(false);
                    void this.router.navigate(['/panel/breeds']);
                },
                error: (e: unknown) => this.onSubmitError(e)
            });
            return;
        }

        this.breedsService.createBreed(payload).subscribe({
            next: ({ id }) => {
                this.submitting.set(false);
                void this.router.navigate(['/panel/breeds', id, 'edit'], { queryParams: { saved: '1' } });
            },
            error: (e: unknown) => this.onSubmitError(e)
        });
    }

    goList(): void {
        void this.router.navigate(['/panel/breeds']);
    }

    private loadSpeciesOptions(): void {
        this.loadingSpecies.set(true);
        this.speciesService.getSpeciesList({ activeOnly: true }).subscribe({
            next: (items) => {
                this.speciesOptions.set(
                    items.map((x) => ({
                        label: x.name || '-',
                        value: x.id
                    }))
                );
                this.loadingSpecies.set(false);
            },
            error: (e: unknown) => {
                this.submitError.set(panelHttpFailureMessage(e, 'Tür listesi yüklenemedi.'));
                this.loadingSpecies.set(false);
            }
        });
    }

    private onSubmitError(e: unknown): void {
        this.submitting.set(false);
        if (e instanceof HttpErrorResponse) {
            const parsed = parseBreedUpsertHttpError(e);
            this.apiFieldErrors.set(parsed.fieldErrors);
            this.submitError.set(parsed.summaryMessage);
            return;
        }
        this.submitError.set(panelHttpFailureMessage(e, 'Kayıt sırasında hata oluştu.'));
    }
}
