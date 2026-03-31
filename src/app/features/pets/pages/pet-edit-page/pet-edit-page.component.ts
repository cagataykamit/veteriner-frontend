import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import { BreedsService } from '@/app/features/breeds/services/breeds.service';
import { createPetUpsertFormGroup, getPetUpsertFormValue, type PetUpsertFormGroup } from '@/app/features/pets/forms/pet-upsert-form.factory';
import { mapPetUpsertFormToCreateRequest } from '@/app/features/pets/data/pet.mapper';
import type { PetEditVm } from '@/app/features/pets/models/pet-vm.model';
import { PetColorsService } from '@/app/features/pets/services/pet-colors.service';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { SpeciesService } from '@/app/features/species/services/species.service';
import {
    type PetCreateFieldErrors,
    type PetCreateFormFieldKey,
    parsePetCreateHttpError
} from '@/app/features/pets/utils/pet-create-validation-parse.utils';
import { PET_GENDER_FORM_OPTIONS } from '@/app/features/pets/utils/pet-status.utils';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { clientOptionsFromList, type SelectOption } from '@/app/shared/forms/client-pet-selection.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';

@Component({
    selector: 'app-pet-edit-page',
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
        <a routerLink="/panel/pets" class="text-primary font-medium no-underline inline-block mb-4">← Hayvan listesine dön</a>

        @if (loading()) {
            <app-loading-state message="Hayvan düzenleme bilgileri yükleniyor…" />
        } @else if (loadError()) {
            <div class="card">
                <app-error-state [detail]="loadError()!" [showRetry]="petLoadRetryEnabled()" (retry)="reload()" />
            </div>
        } @else {
            <app-page-header title="Hayvanı Düzenle" subtitle="Hasta yönetimi" description="Hayvan kaydını güncelleyin." />

            <div class="card">
                @if (selectionError()) {
                    <p class="text-red-500 mt-0 mb-4" role="alert">{{ selectionError() }}</p>
                }
                <form [formGroup]="form" (ngSubmit)="onSubmit()">
                    <div class="grid grid-cols-12 gap-4">
                        <div class="col-span-12 md:col-span-6">
                            <label for="clientId" class="block text-sm font-medium text-muted-color mb-2">Müşteri *</label>
                            <p-select
                                inputId="clientId"
                                formControlName="clientId"
                                [options]="clientOptions()"
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Müşteri seçin"
                                [filter]="true"
                                filterBy="label"
                                [showClear]="true"
                                styleClass="w-full"
                                [loading]="loadingClients()"
                            />
                            @if (apiFieldErrors().clientId) {
                                <small class="text-red-500">{{ apiFieldErrors().clientId }}</small>
                            } @else if (form.controls.clientId.invalid && form.controls.clientId.touched) {
                                <small class="text-red-500">Müşteri seçimi zorunludur.</small>
                            }
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label for="name" class="block text-sm font-medium text-muted-color mb-2">Hayvan adı *</label>
                            <input id="name" pInputText class="w-full" formControlName="name" />
                            @if (apiFieldErrors().name) {
                                <small class="text-red-500">{{ apiFieldErrors().name }}</small>
                            } @else if (form.controls.name.invalid && form.controls.name.touched) {
                                <small class="text-red-500">Hayvan adı zorunludur.</small>
                            }
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label for="speciesId" class="block text-sm font-medium text-muted-color mb-2">Tür *</label>
                            <p-select
                                inputId="speciesId"
                                formControlName="speciesId"
                                [options]="speciesOptions()"
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Tür seçin"
                                styleClass="w-full"
                                [loading]="loadingSpecies()"
                            />
                            @if (apiFieldErrors().speciesId) {
                                <small class="text-red-500">{{ apiFieldErrors().speciesId }}</small>
                            } @else if (form.controls.speciesId.invalid && form.controls.speciesId.touched) {
                                <small class="text-red-500">Tür seçimi zorunludur.</small>
                            }
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label for="breedId" class="block text-sm font-medium text-muted-color mb-2">Irk</label>
                            <p-select
                                inputId="breedId"
                                formControlName="breedId"
                                [options]="breedOptions()"
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Irk seçin"
                                styleClass="w-full"
                                [loading]="loadingBreeds()"
                                [disabled]="!form.controls.speciesId.value || loadingBreeds()"
                                [showClear]="true"
                            />
                            @if (apiFieldErrors().breedId) {
                                <small class="text-red-500">{{ apiFieldErrors().breedId }}</small>
                            }
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label for="gender" class="block text-sm font-medium text-muted-color mb-2">Cinsiyet</label>
                            <p-select
                                inputId="gender"
                                formControlName="gender"
                                [options]="genderOptions"
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Seçin"
                                [showClear]="true"
                                styleClass="w-full"
                            />
                            @if (apiFieldErrors().gender) {
                                <small class="text-red-500">{{ apiFieldErrors().gender }}</small>
                            }
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label for="birthDate" class="block text-sm font-medium text-muted-color mb-2">Doğum tarihi</label>
                            <input id="birthDate" type="date" class="w-full p-inputtext p-component" formControlName="birthDate" />
                            @if (apiFieldErrors().birthDate) {
                                <small class="text-red-500">{{ apiFieldErrors().birthDate }}</small>
                            } @else if (form.controls.birthDate.invalid && form.controls.birthDate.touched) {
                                @if (form.controls.birthDate.hasError('birthDateInvalid')) {
                                    <small class="text-red-500">Doğum tarihi geçerli değil.</small>
                                }
                            }
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label for="colorId" class="block text-sm font-medium text-muted-color mb-2">Renk</label>
                            <p-select
                                inputId="colorId"
                                formControlName="colorId"
                                [options]="colorOptions()"
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Renk seçin"
                                styleClass="w-full"
                                [loading]="loadingColors()"
                                [showClear]="true"
                            />
                            @if (apiFieldErrors().colorId) {
                                <small class="text-red-500">{{ apiFieldErrors().colorId }}</small>
                            }
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label for="weight" class="block text-sm font-medium text-muted-color mb-2">Kilo (kg)</label>
                            <input id="weight" type="number" step="0.01" min="0" class="w-full p-inputtext p-component" formControlName="weightStr" />
                            @if (apiFieldErrors().weightStr) {
                                <small class="text-red-500">{{ apiFieldErrors().weightStr }}</small>
                            } @else if (form.controls.weightStr.invalid && form.controls.weightStr.touched) {
                                @if (form.controls.weightStr.hasError('weightInvalid')) {
                                    <small class="text-red-500">Kilo geçerli bir sayı olmalıdır (0–9999 arası).</small>
                                }
                            }
                        </div>
                        <div class="col-span-12">
                            <label for="notes" class="block text-sm font-medium text-muted-color mb-2">Notlar</label>
                            <textarea id="notes" rows="3" class="w-full p-inputtext p-component" formControlName="notes"></textarea>
                            @if (apiFieldErrors().notes) {
                                <small class="text-red-500">{{ apiFieldErrors().notes }}</small>
                            }
                        </div>
                    </div>

                    @if (submitError()) {
                        <p class="text-red-500 mt-4 mb-0" role="alert">{{ submitError() }}</p>
                    }

                    <div class="flex flex-wrap gap-2 mt-4">
                        <p-button
                            type="submit"
                            [label]="copy.buttonSave"
                            icon="pi pi-check"
                            [loading]="submitting()"
                            [disabled]="form.invalid || submitting() || loadingClients() || loadingSpecies() || loadingBreeds() || loadingColors()"
                        />
                        <p-button
                            type="button"
                            [label]="copy.buttonCancel"
                            icon="pi pi-times"
                            severity="secondary"
                            (onClick)="goDetail()"
                            [disabled]="submitting()"
                        />
                    </div>
                </form>
            </div>
        }
    `
})
export class PetEditPageComponent implements OnInit {
    readonly copy = PANEL_COPY;

    private readonly fb = inject(FormBuilder);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly petsService = inject(PetsService);
    private readonly petColorsService = inject(PetColorsService);
    private readonly clientsService = inject(ClientsService);
    private readonly breedsService = inject(BreedsService);
    private readonly speciesService = inject(SpeciesService);
    private readonly destroyRef = inject(DestroyRef);

    readonly loading = signal(true);
    readonly loadError = signal<string | null>(null);
    /** Geçersiz rota kimliğinde tekrar dene anlamsız olur. */
    readonly petLoadRetryEnabled = signal(false);
    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);
    readonly selectionError = signal<string | null>(null);
    readonly loadingClients = signal(false);
    readonly loadingSpecies = signal(false);
    readonly loadingBreeds = signal(false);
    readonly loadingColors = signal(false);
    readonly clientOptions = signal<SelectOption[]>([]);
    readonly speciesOptions = signal<SelectOption[]>([]);
    readonly breedOptions = signal<SelectOption[]>([]);
    readonly colorOptions = signal<SelectOption[]>([]);
    readonly apiFieldErrors = signal<PetCreateFieldErrors>({});

    readonly genderOptions = [...PET_GENDER_FORM_OPTIONS];

    private petId = '';
    private isInitializingSpecies = false;
    private editVmCache: PetEditVm | null = null;

    readonly form: PetUpsertFormGroup = createPetUpsertFormGroup(this.fb);

    constructor() {
        const fields: PetCreateFormFieldKey[] = [
            'clientId',
            'name',
            'speciesId',
            'breedId',
            'gender',
            'birthDate',
            'colorId',
            'weightStr',
            'notes'
        ];
        for (const f of fields) {
            const control = this.form.controls[f] as AbstractControl;
            control.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
                const cur = this.apiFieldErrors();
                if (cur[f]) {
                    const next = { ...cur };
                    delete next[f];
                    this.apiFieldErrors.set(next);
                }
            });
        }
    }

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id')?.trim() ?? '';
        if (!id) {
            this.loadError.set('Geçersiz hayvan kaydı.');
            this.loading.set(false);
            this.petLoadRetryEnabled.set(false);
            return;
        }
        this.petId = id;
        this.petLoadRetryEnabled.set(true);

        this.form.controls.speciesId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((speciesId: string) => {
            const sid = speciesId?.trim() ?? '';
            if (!sid) {
                this.form.controls.breedId.setValue('');
                this.breedOptions.set([]);
                return;
            }
            if (!this.isInitializingSpecies) {
                this.form.controls.breedId.setValue('');
            }
            this.loadBreedsForSpecies(sid);
        });

        this.loadClients();
        this.loadSpecies();
        this.loadPetColors();
        this.reload();
    }

    reload(): void {
        this.loading.set(true);
        this.loadError.set(null);
        this.petsService.getPetForEditById(this.petId).subscribe({
            next: (pet) => {
                this.editVmCache = pet;
                this.isInitializingSpecies = true;
                this.form.patchValue(
                    {
                        clientId: pet.clientId,
                        name: pet.name,
                        speciesId: pet.speciesId,
                        breedId: '',
                        gender: pet.gender,
                        birthDate: pet.birthDateInput,
                        colorId: pet.colorId,
                        weightStr: pet.weightStr,
                        notes: pet.notes
                    },
                    { emitEvent: false }
                );
                this.mergeColorOptionFromCache();

                if (pet.speciesId) {
                    this.loadBreedsForSpecies(pet.speciesId, pet.breedId);
                } else {
                    this.isInitializingSpecies = false;
                }

                this.loading.set(false);
            },
            error: (e: unknown) => {
                this.loadError.set(panelHttpFailureMessage(e, 'Hayvan bilgileri yüklenemedi.'));
                this.loading.set(false);
            }
        });
    }

    goDetail(): void {
        void this.router.navigate(['/panel/pets', this.petId]);
    }

    onSubmit(): void {
        this.submitError.set(null);
        this.apiFieldErrors.set({});
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const payload = mapPetUpsertFormToCreateRequest(getPetUpsertFormValue(this.form), this.breedOptions());

        this.submitting.set(true);
        this.petsService.updatePet(this.petId, payload).subscribe({
            next: () => {
                this.submitting.set(false);
                void this.router.navigate(['/panel/pets', this.petId], { queryParams: { saved: '1' } });
            },
            error: (e: unknown) => {
                this.submitting.set(false);
                if (e instanceof HttpErrorResponse) {
                    const parsed = parsePetCreateHttpError(e);
                    this.apiFieldErrors.set(parsed.fieldErrors);
                    this.submitError.set(parsed.summaryMessage);
                    return;
                }
                this.submitError.set(e instanceof Error ? e.message : 'Kayıt sırasında hata oluştu.');
            }
        });
    }

    private loadClients(): void {
        this.loadingClients.set(true);
        this.selectionError.set(null);
        this.clientsService.getClients({ page: 1, pageSize: 300 }).subscribe({
            next: (r) => {
                this.clientOptions.set(clientOptionsFromList(r.items));
                this.loadingClients.set(false);
            },
            error: (e: unknown) => {
                this.selectionError.set(this.mapLoadError(e, 'Müşteri listesi yüklenemedi.'));
                this.loadingClients.set(false);
            }
        });
    }

    private loadPetColors(): void {
        this.loadingColors.set(true);
        this.selectionError.set(null);
        this.petColorsService.getPetColors().subscribe({
            next: (items) => {
                this.colorOptions.set(items);
                this.mergeColorOptionFromCache();
                this.loadingColors.set(false);
            },
            error: (e: unknown) => {
                this.selectionError.set(this.mapLoadError(e, 'Renk listesi yüklenemedi.'));
                this.loadingColors.set(false);
            }
        });
    }

    private loadSpecies(): void {
        this.loadingSpecies.set(true);
        this.selectionError.set(null);
        this.speciesService.getSpeciesList({ activeOnly: true }).subscribe({
            next: (items) => {
                this.speciesOptions.set(items.map((x) => ({ value: x.id, label: x.name })));
                this.loadingSpecies.set(false);
            },
            error: (e: unknown) => {
                this.selectionError.set(this.mapLoadError(e, 'Tür listesi yüklenemedi.'));
                this.loadingSpecies.set(false);
            }
        });
    }

    private loadBreedsForSpecies(speciesId: string, selectedBreedId = ''): void {
        this.loadingBreeds.set(true);
        this.selectionError.set(null);
        this.breedsService.getBreedList({ activeOnly: true, speciesId }).subscribe({
            next: (items) => {
                this.breedOptions.set(items.map((x) => ({ value: x.id, label: x.name })));
                this.mergeBreedOptionFromCache();
                if (selectedBreedId) {
                    const exists = items.some((x) => x.id === selectedBreedId);
                    const allowFromDetail =
                        !!this.editVmCache?.breedName?.trim() &&
                        (this.editVmCache?.breedId ?? '').trim() === selectedBreedId;
                    this.form.controls.breedId.setValue(exists || allowFromDetail ? selectedBreedId : '');
                }
                this.loadingBreeds.set(false);
                this.isInitializingSpecies = false;
            },
            error: (e: unknown) => {
                this.selectionError.set(this.mapLoadError(e, 'Irk listesi yüklenemedi.'));
                this.loadingBreeds.set(false);
                this.isInitializingSpecies = false;
            }
        });
    }

    /** API’deki renk katalogda yoksa detaydan gelen etiketle seçenek ekle. */
    private mergeColorOptionFromCache(): void {
        const vm = this.editVmCache;
        const cid = vm?.colorId?.trim();
        if (!cid) {
            return;
        }
        const label = vm?.colorName?.trim() || cid;
        const opts = this.colorOptions();
        if (opts.some((o) => o.value === cid)) {
            return;
        }
        this.colorOptions.set([{ value: cid, label }, ...opts]);
    }

    /** API’deki ırk, tür listesinde yoksa detaydan gelen etiketle seçenek ekle. */
    private mergeBreedOptionFromCache(): void {
        const vm = this.editVmCache;
        const bid = vm?.breedId?.trim();
        const label = vm?.breedName?.trim();
        if (!bid || !label) {
            return;
        }
        const opts = this.breedOptions();
        if (opts.some((o) => o.value === bid)) {
            return;
        }
        this.breedOptions.set([{ value: bid, label }, ...opts]);
    }

    private mapLoadError(e: unknown, fallback: string): string {
        return panelHttpFailureMessage(e, fallback);
    }
}
