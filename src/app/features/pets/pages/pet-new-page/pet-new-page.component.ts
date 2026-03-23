import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import { BreedsService } from '@/app/features/breeds/services/breeds.service';
import type { CreatePetRequest } from '@/app/features/pets/models/pet-create.model';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { SpeciesService } from '@/app/features/species/services/species.service';
import { petBirthDateValidator, petWeightStrValidator } from '@/app/features/pets/utils/pet-create-form.validators';
import {
    type PetCreateFieldErrors,
    type PetCreateFormFieldKey,
    parsePetCreateHttpError
} from '@/app/features/pets/utils/pet-create-validation-parse.utils';
import { PET_GENDER_FORM_OPTIONS, PET_STATUS_FORM_OPTIONS } from '@/app/features/pets/utils/pet-status.utils';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { clientOptionsFromList, type SelectOption } from '@/app/shared/forms/client-pet-selection.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

@Component({
    selector: 'app-pet-new-page',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterLink,
        ButtonModule,
        InputTextModule,
        SelectModule,
        AppPageHeaderComponent
    ],
    template: `
        <a routerLink="/panel/pets" class="text-primary font-medium no-underline inline-block mb-4">← Hayvan listesine dön</a>

        <app-page-header title="Yeni Hayvan" subtitle="Hasta yönetimi" description="Hayvan kaydı oluşturun." />

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
                        <label for="color" class="block text-sm font-medium text-muted-color mb-2">Renk</label>
                        <input id="color" pInputText class="w-full" formControlName="color" />
                        @if (apiFieldErrors().color) {
                            <small class="text-red-500">{{ apiFieldErrors().color }}</small>
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
                    <div class="col-span-12 md:col-span-6">
                        <label for="status" class="block text-sm font-medium text-muted-color mb-2">Durum *</label>
                        <p-select
                            inputId="status"
                            formControlName="status"
                            [options]="statusOptions"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Durum seçin"
                            styleClass="w-full"
                        />
                        @if (apiFieldErrors().status) {
                            <small class="text-red-500">{{ apiFieldErrors().status }}</small>
                        } @else if (form.controls.status.invalid && form.controls.status.touched) {
                            <small class="text-red-500">Durum seçimi zorunludur.</small>
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
                        [disabled]="form.invalid || submitting() || loadingClients() || loadingSpecies() || loadingBreeds()"
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
    `
})
export class PetNewPageComponent implements OnInit {
    readonly copy = PANEL_COPY;

    private readonly fb = inject(FormBuilder);
    private readonly petsService = inject(PetsService);
    private readonly clientsService = inject(ClientsService);
    private readonly breedsService = inject(BreedsService);
    private readonly speciesService = inject(SpeciesService);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);

    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);
    readonly selectionError = signal<string | null>(null);
    readonly loadingClients = signal(false);
    readonly loadingSpecies = signal(false);
    readonly loadingBreeds = signal(false);
    readonly clientOptions = signal<SelectOption[]>([]);
    readonly speciesOptions = signal<SelectOption[]>([]);
    readonly breedOptions = signal<SelectOption[]>([]);
    readonly apiFieldErrors = signal<PetCreateFieldErrors>({});

    readonly statusOptions = [...PET_STATUS_FORM_OPTIONS];
    readonly genderOptions = [...PET_GENDER_FORM_OPTIONS];

    readonly form = this.fb.nonNullable.group({
        clientId: ['', Validators.required],
        name: ['', Validators.required],
        speciesId: ['', Validators.required],
        breedId: [''],
        gender: [''],
        birthDate: ['', petBirthDateValidator()],
        color: [''],
        weightStr: ['', petWeightStrValidator()],
        status: ['active', Validators.required],
        notes: ['']
    });

    constructor() {
        const fields: PetCreateFormFieldKey[] = [
            'clientId',
            'name',
            'speciesId',
            'breedId',
            'gender',
            'birthDate',
            'color',
            'weightStr',
            'status',
            'notes'
        ];
        for (const f of fields) {
            this.form.controls[f].valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
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
        this.loadClients();
        this.loadSpecies();
        this.form.controls.speciesId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((speciesId) => {
            // Tür değiştiğinde yanlış eşleşmeyi önlemek için seçili ırk temizlenir.
            this.form.controls.breedId.setValue('');
            this.breedOptions.set([]);
            const sid = speciesId?.trim();
            if (!sid) {
                return;
            }
            this.loadBreedsForSpecies(sid);
        });
    }

    goList(): void {
        void this.router.navigate(['/panel/pets']);
    }

    onSubmit(): void {
        this.submitError.set(null);
        this.apiFieldErrors.set({});
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const v = this.form.getRawValue();
        const wRaw = v.weightStr.trim();
        const wNum = wRaw === '' ? null : Number(wRaw.replace(',', '.'));
        const selectedBreed = this.breedOptions().find((x) => x.value === v.breedId);
        const payload: CreatePetRequest = {
            clientId: v.clientId.trim(),
            name: v.name.trim(),
            speciesId: v.speciesId.trim(),
            breedId: v.breedId.trim() || undefined,
            breed: selectedBreed?.label?.trim() || undefined,
            gender: v.gender.trim() || undefined,
            birthDateInput: v.birthDate.trim() || undefined,
            color: v.color.trim() || undefined,
            weight: wNum != null && !Number.isNaN(wNum) ? wNum : null,
            status: v.status.trim(),
            notes: v.notes.trim() || undefined
        };

        this.submitting.set(true);
        this.petsService.createPet(payload).subscribe({
            next: ({ id }) => {
                this.submitting.set(false);
                void this.router.navigate(['/panel/pets', id], { queryParams: { saved: '1' } });
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

    private loadSpecies(): void {
        this.loadingSpecies.set(true);
        this.selectionError.set(null);
        this.speciesService.getSpeciesList({ activeOnly: true }).subscribe({
            next: (items) => {
                this.speciesOptions.set(
                    items.map((x) => ({
                        value: x.id,
                        label: x.name
                    }))
                );
                this.loadingSpecies.set(false);
            },
            error: (e: unknown) => {
                this.selectionError.set(this.mapLoadError(e, 'Tür listesi yüklenemedi.'));
                this.loadingSpecies.set(false);
            }
        });
    }

    private loadBreedsForSpecies(speciesId: string): void {
        this.loadingBreeds.set(true);
        this.selectionError.set(null);
        this.breedsService.getBreedList({ activeOnly: true, speciesId }).subscribe({
            next: (items) => {
                this.breedOptions.set(
                    items.map((x) => ({
                        value: x.id,
                        label: x.name
                    }))
                );
                this.loadingBreeds.set(false);
            },
            error: (e: unknown) => {
                this.selectionError.set(this.mapLoadError(e, 'Irk listesi yüklenemedi.'));
                this.loadingBreeds.set(false);
            }
        });
    }

    private mapLoadError(e: unknown, fallback: string): string {
        if (e instanceof HttpErrorResponse) {
            return messageFromHttpError(e, fallback);
        }
        return e instanceof Error ? e.message : fallback;
    }
}
