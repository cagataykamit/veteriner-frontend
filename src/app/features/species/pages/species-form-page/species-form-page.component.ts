import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import type { SpeciesUpsertRequest } from '@/app/entities/species/models/species-upsert.model';
import { SpeciesService } from '@/app/entities/species/services/species.service';
import { type SpeciesUpsertFieldErrors, parseSpeciesUpsertHttpError } from '@/app/entities/species/utils/species-upsert-validation-parse.utils';
import { AuthService } from '@/app/core/auth/auth.service';
import { SPECIES_ROUTE } from '@/app/core/routing/panel-navigation';
import { SPECIES_CREATE_CLAIM, SPECIES_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';

@Component({
    selector: 'app-species-form-page',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, ButtonModule, InputTextModule, SelectModule, AppPageHeaderComponent, AppLoadingStateComponent, AppErrorStateComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (showSavedBanner()) {
            <p class="mb-4 m-0 text-sm font-medium" role="status">Tür kaydı oluşturuldu.</p>
        }

        @if (editing() && loading()) {
            <app-loading-state message="Tür bilgileri yükleniyor…" />
        } @else if (editing() && loadError()) {
            <div class="card">
                <app-error-state [detail]="loadError()!" [showRetry]="!!currentId()" (retry)="reloadSpeciesRecord()" />
            </div>
        } @else {
            <app-page-header [categoryLink]="speciesRoute" categoryLinkLabel="Tür listesine dön" [title]="editing() ? 'Tür Düzenle' : 'Yeni Tür'" [description]="editing() ? 'Tür kaydını güncelleyin.' : 'Yeni tür kaydı oluşturun.'" />

            <div class="card">
                @if (ro.mutationBlocked()) {
                    <p class="text-amber-700 dark:text-amber-300 text-sm mt-0 mb-4" role="status">İşletme salt okunur moddadır; tür kaydı güncellenemez veya oluşturulamaz.</p>
                }
                <form [formGroup]="form" (ngSubmit)="onSubmit()">
                    <div class="grid grid-cols-12 gap-4">
                        <div class="col-span-12 md:col-span-6">
                            <label for="code" class="block text-sm font-medium text-muted-color mb-2">Kod *</label>
                            <input id="code" pInputText class="w-full" formControlName="code" />
                            @if (apiFieldErrors().code) {
                                <small class="text-red-500">{{ apiFieldErrors().code }}</small>
                            } @else if (form.controls.code.invalid && form.controls.code.touched) {
                                @if (form.controls.code.hasError('required')) {
                                    <small class="text-red-500">Kod zorunludur.</small>
                                } @else if (form.controls.code.hasError('maxlength')) {
                                    <small class="text-red-500">Kod en fazla 32 karakter olabilir.</small>
                                }
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
                            <p-select inputId="isActive" formControlName="isActive" [options]="activeOptions" optionLabel="label" optionValue="value" class="w-full" />
                            @if (apiFieldErrors().isActive) {
                                <small class="text-red-500">{{ apiFieldErrors().isActive }}</small>
                            }
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label for="displayOrder" class="block text-sm font-medium text-muted-color mb-2">Sıra *</label>
                            <input id="displayOrder" type="number" min="0" class="w-full p-inputtext p-component" formControlName="displayOrder" />
                            @if (apiFieldErrors().displayOrder) {
                                <small class="text-red-500">{{ apiFieldErrors().displayOrder }}</small>
                            } @else if (form.controls.displayOrder.invalid && form.controls.displayOrder.touched) {
                                @if (form.controls.displayOrder.hasError('required')) {
                                    <small class="text-red-500">Sıra zorunludur.</small>
                                } @else if (form.controls.displayOrder.hasError('min')) {
                                    <small class="text-red-500">Sıra 0 veya daha büyük olmalıdır.</small>
                                }
                            }
                        </div>
                    </div>

                    @if (submitError()) {
                        <p class="text-red-500 mt-4 mb-0" role="alert">{{ submitError() }}</p>
                    }

                    <div class="flex flex-wrap gap-2 mt-4">
                        <button pButton type="submit" [disabled]="form.invalid || submitting() || loading() || ro.mutationBlocked() || submitting() || loading()"><i class="p-button-icon" [class]="submitting() || loading() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>{{ editing() ? 'Güncelle' : copy.buttonSave }}</button>
                        <button pButton type="button" severity="secondary" (click)="goList()" [disabled]="submitting()"><i class="p-button-icon pi pi-times"></i>{{ copy.buttonCancel }}</button>
                    </div>
                </form>
            </div>
        }
    `
})
export class SpeciesFormPageComponent implements OnInit {
    readonly copy = PANEL_COPY;
    readonly speciesRoute = SPECIES_ROUTE;
    private readonly fb = inject(FormBuilder);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly speciesService = inject(SpeciesService);
    private readonly auth = inject(AuthService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly editing = signal(false);
    readonly showSavedBanner = signal(false);
    readonly loading = signal(false);
    readonly loadError = signal<string | null>(null);
    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);
    readonly apiFieldErrors = signal<SpeciesUpsertFieldErrors>({});
    readonly currentId = signal<string | null>(null);

    readonly activeOptions = [
        { label: 'Aktif', value: true },
        { label: 'Pasif', value: false }
    ];

    readonly form = this.fb.nonNullable.group({
        code: ['', [Validators.required, Validators.maxLength(32)]],
        name: ['', [Validators.required, Validators.maxLength(128)]],
        isActive: [true, Validators.required],
        displayOrder: [0, [Validators.required, Validators.min(0)]]
    });

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');

        if (!id) {
            return;
        }

        this.editing.set(true);
        this.currentId.set(id);
        this.showSavedBanner.set(this.route.snapshot.queryParamMap.get('saved') === '1');
        this.reloadSpeciesRecord();
    }

    reloadSpeciesRecord(): void {
        const id = this.currentId();

        if (!id) {
            return;
        }

        this.loading.set(true);
        this.loadError.set(null);
        this.speciesService.getSpeciesById(id).subscribe({
            next: (item) => {
                this.form.patchValue({
                    code: item.code === '—' ? '' : item.code,
                    name: item.name === '—' ? '' : item.name,
                    isActive: item.isActive,
                    displayOrder: item.displayOrder
                });
                this.loading.set(false);
            },
            error: (e: unknown) => {
                this.loadError.set(panelHttpFailureMessage(e, 'Tür bilgileri yüklenemedi.'));
                this.loading.set(false);
            }
        });
    }

    onSubmit(): void {
        if (this.ro.mutationBlocked()) {
            return;
        }

        if (this.editing() && !this.auth.hasOperationClaim(SPECIES_UPDATE_CLAIM)) {
            return;
        }

        if (!this.editing() && !this.auth.hasOperationClaim(SPECIES_CREATE_CLAIM)) {
            return;
        }

        this.submitError.set(null);
        this.apiFieldErrors.set({});

        if (this.form.invalid) {
            this.form.markAllAsTouched();

            return;
        }

        const v = this.form.getRawValue();
        const payload: SpeciesUpsertRequest = {
            code: v.code.trim(),
            name: v.name.trim(),
            isActive: !!v.isActive,
            displayOrder: Number(v.displayOrder)
        };

        this.submitting.set(true);

        if (this.editing() && this.currentId()) {
            this.speciesService.updateSpecies(this.currentId()!, payload).subscribe({
                next: () => {
                    this.submitting.set(false);
                    void this.router.navigate([SPECIES_ROUTE]);
                },
                error: (e: unknown) => this.onSubmitError(e)
            });

            return;
        }

        this.speciesService.createSpecies(payload).subscribe({
            next: ({ id }) => {
                this.submitting.set(false);
                void this.router.navigate([SPECIES_ROUTE, id, 'edit'], { queryParams: { saved: '1' } });
            },
            error: (e: unknown) => this.onSubmitError(e)
        });
    }

    goList(): void {
        void this.router.navigate([SPECIES_ROUTE]);
    }

    private onSubmitError(e: unknown): void {
        this.submitting.set(false);

        if (e instanceof HttpErrorResponse) {
            const parsed = parseSpeciesUpsertHttpError(e);

            this.apiFieldErrors.set(parsed.fieldErrors);
            this.submitError.set(parsed.summaryMessage);

            return;
        }

        this.submitError.set(panelHttpFailureMessage(e, 'Kayıt sırasında hata oluştu.'));
    }
}
