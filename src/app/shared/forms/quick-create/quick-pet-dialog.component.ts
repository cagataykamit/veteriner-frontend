import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, input, output, signal, model } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { mapPetUpsertFormToCreateRequest } from '@/app/features/pets/data/pet.mapper';
import {
    createPetUpsertFormGroup,
    getPetUpsertFormValue,
    type PetUpsertFormGroup
} from '@/app/features/pets/forms/pet-upsert-form.factory';
import { BreedsService } from '@/app/features/breeds/services/breeds.service';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { SpeciesService } from '@/app/features/species/services/species.service';
import {
    type PetCreateFieldErrors,
    type PetCreateFormFieldKey,
    parsePetCreateHttpError
} from '@/app/features/pets/utils/pet-create-validation-parse.utils';
import { PET_GENDER_FORM_OPTIONS } from '@/app/features/pets/utils/pet-status.utils';
import { trimClientIdControlValue, type SelectOption } from '@/app/shared/forms/client-pet-selection.utils';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { QuickBreedDialogComponent } from '@/app/shared/forms/quick-create/quick-breed-dialog.component';

/**
 * Seçili müşteri için tam sayfa ayrılmadan hayvan oluşturma (`mapPetUpsertFormToCreateRequest` ile aynı write hattı).
 */
@Component({
    selector: 'app-quick-pet-dialog',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        DialogModule,
        ButtonModule,
        InputTextModule,
        SelectModule,
        QuickBreedDialogComponent
    ],
    template: `
        <p-dialog
            header="Yeni hayvan"
            [modal]="true"
            [dismissableMask]="true"
            [style]="{ width: 'min(560px, 95vw)' }"
            [contentStyle]="{ overflow: 'visible' }"
            [(visible)]="visible"
            (onShow)="onDialogShow()"
        >
            @if (selectionError()) {
                <p class="text-red-500 mt-0 mb-3" role="alert">{{ selectionError() }}</p>
            }
            <form [formGroup]="form" (ngSubmit)="onSubmit()" id="quick-pet-form">
                <div class="grid grid-cols-12 gap-4">
                    <div class="col-span-12 md:col-span-6">
                        <label for="qp-name" class="block text-sm font-medium text-muted-color mb-2">Hayvan adı *</label>
                        <input id="qp-name" pInputText class="w-full" formControlName="name" />
                        @if (apiFieldErrors().name) {
                            <small class="text-red-500">{{ apiFieldErrors().name }}</small>
                        } @else if (form.controls.name.invalid && form.controls.name.touched) {
                            <small class="text-red-500">Hayvan adı zorunludur.</small>
                        }
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="qp-speciesId" class="block text-sm font-medium text-muted-color mb-2">Tür *</label>
                        <p-select
                            inputId="qp-speciesId"
                            formControlName="speciesId"
                            [options]="speciesOptions()"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Tür seçin"
                            styleClass="w-full"
                            [loading]="loadingSpecies()"
                            [showClear]="true"
                            appendTo="body"
                        />
                        @if (apiFieldErrors().speciesId) {
                            <small class="text-red-500">{{ apiFieldErrors().speciesId }}</small>
                        } @else if (form.controls.speciesId.invalid && form.controls.speciesId.touched) {
                            <small class="text-red-500">Tür seçimi zorunludur.</small>
                        }
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="qp-breedId" class="block text-sm font-medium text-muted-color mb-2">Irk</label>
                        <p-select
                            inputId="qp-breedId"
                            formControlName="breedId"
                            [options]="breedOptions()"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Irk seçin"
                            styleClass="w-full"
                            [loading]="loadingBreeds()"
                            [disabled]="!form.controls.speciesId.value || loadingBreeds()"
                            [showClear]="true"
                            appendTo="body"
                        />
                        @if (apiFieldErrors().breedId) {
                            <small class="text-red-500">{{ apiFieldErrors().breedId }}</small>
                        }
                        @if (hasSpeciesForQuickBreed()) {
                            <div class="mt-2">
                                <p-button
                                    type="button"
                                    label="Bu tür için yeni ırk"
                                    icon="pi pi-plus"
                                    [text]="true"
                                    styleClass="p-0"
                                    (onClick)="quickBreedOpen.set(true)"
                                />
                            </div>
                        }
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="qp-gender" class="block text-sm font-medium text-muted-color mb-2">Cinsiyet</label>
                        <p-select
                            inputId="qp-gender"
                            formControlName="gender"
                            [options]="genderOptions"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Seçin"
                            styleClass="w-full"
                            [showClear]="true"
                            appendTo="body"
                        />
                        @if (apiFieldErrors().gender) {
                            <small class="text-red-500">{{ apiFieldErrors().gender }}</small>
                        }
                    </div>
                </div>
                @if (submitError()) {
                    <p class="text-red-500 mt-3 mb-0" role="alert">{{ submitError() }}</p>
                }
            </form>
            <ng-template pTemplate="footer">
                <p-button type="button" label="İptal" icon="pi pi-times" severity="secondary" (onClick)="close()" [disabled]="submitting()" />
                <p-button
                    type="button"
                    label="Kaydet"
                    icon="pi pi-check"
                    [loading]="submitting()"
                    [disabled]="form.invalid || submitting() || !ownerClientIdTrimmed()"
                    (onClick)="onSubmit()"
                />
            </ng-template>
        </p-dialog>

        <app-quick-breed-dialog
            [(visible)]="quickBreedOpen"
            [speciesId]="quickBreedSpeciesId()"
            [speciesLabel]="quickBreedSpeciesLabelForDialog()"
            (breedCreated)="onQuickBreedCreated($event)"
        />
    `
})
export class QuickPetDialogComponent {
    /** Dialog açıldığında seçili müşteri kimliği (boşsa kayıt engellenir). */
    readonly ownerClientId = input<string>('');

    readonly visible = model(false);
    readonly petCreated = output<string>();

    private readonly fb = inject(FormBuilder);
    private readonly petsService = inject(PetsService);
    private readonly speciesService = inject(SpeciesService);
    private readonly breedsService = inject(BreedsService);
    private readonly destroyRef = inject(DestroyRef);

    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);
    readonly selectionError = signal<string | null>(null);
    readonly loadingSpecies = signal(false);
    readonly loadingBreeds = signal(false);
    readonly speciesOptions = signal<SelectOption[]>([]);
    readonly breedOptions = signal<SelectOption[]>([]);
    readonly apiFieldErrors = signal<PetCreateFieldErrors>({});

    readonly quickBreedOpen = signal(false);

    readonly genderOptions = [...PET_GENDER_FORM_OPTIONS];

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

        this.form.controls.speciesId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((speciesId) => {
            this.form.controls.breedId.setValue('');
            this.breedOptions.set([]);
            if (speciesId === null || speciesId === undefined) {
                this.form.controls.speciesId.setValue('', { emitEvent: false });
            }
            const sid = trimClientIdControlValue(this.form.controls.speciesId.value);
            if (!sid) {
                return;
            }
            this.loadBreedsForSpecies(sid);
        });
    }

    onDialogShow(): void {
        this.quickBreedOpen.set(false);
        this.submitError.set(null);
        this.selectionError.set(null);
        this.apiFieldErrors.set({});
        this.form.reset({
            clientId: this.ownerClientId().trim(),
            name: '',
            speciesId: '',
            breedId: '',
            gender: '',
            birthDate: '',
            colorId: '',
            weightStr: '',
            notes: ''
        });
        this.breedOptions.set([]);
        if (!this.speciesOptions().length) {
            this.loadSpecies();
        }
    }

    close(): void {
        this.visible.set(false);
    }

    ownerClientIdTrimmed(): string {
        return trimClientIdControlValue(this.ownerClientId());
    }

    hasSpeciesForQuickBreed(): boolean {
        return !!trimClientIdControlValue(this.form.controls.speciesId.value);
    }

    quickBreedSpeciesId(): string {
        return trimClientIdControlValue(this.form.controls.speciesId.value);
    }

    quickBreedSpeciesLabelForDialog(): string {
        const id = trimClientIdControlValue(this.form.controls.speciesId.value);
        if (!id) {
            return '';
        }
        const opt = this.speciesOptions().find((o) => o.value === id);
        return opt ? `Tür: ${opt.label}` : '';
    }

    onQuickBreedCreated(breedId: string): void {
        const sid = trimClientIdControlValue(this.form.controls.speciesId.value);
        const bid = breedId.trim();
        if (!sid || !bid) {
            return;
        }
        this.loadBreedsForSpecies(sid, bid);
    }

    onSubmit(): void {
        this.submitError.set(null);
        this.apiFieldErrors.set({});
        const cid = this.ownerClientIdTrimmed();
        if (!cid) {
            this.submitError.set('Önce müşteri seçin.');
            return;
        }
        this.form.controls.clientId.setValue(cid, { emitEvent: false });
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const payload = mapPetUpsertFormToCreateRequest(getPetUpsertFormValue(this.form), this.breedOptions());

        this.submitting.set(true);
        this.petsService.createPet(payload).subscribe({
            next: ({ id }) => {
                this.submitting.set(false);
                this.visible.set(false);
                this.petCreated.emit(id);
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

    private loadBreedsForSpecies(speciesId: string, selectBreedId?: string): void {
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
                const want = selectBreedId?.trim();
                if (want) {
                    const exists = items.some((x) => x.id === want);
                    if (exists) {
                        this.form.controls.breedId.setValue(want, { emitEvent: true });
                    }
                }
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
