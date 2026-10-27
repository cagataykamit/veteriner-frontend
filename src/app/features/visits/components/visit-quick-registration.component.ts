import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, input, OnInit, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { mapQuickRegisterFormsToRequest } from '@/app/features/clients/data/client.mapper';
import { createClientUpsertFormGroup } from '@/app/features/clients/forms/client-upsert-form.factory';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import { parseClientCreateHttpError, type ClientCreateFieldErrors } from '@/app/features/clients/utils/client-create-validation-parse.utils';
import { clientUpsertFieldErrorMessage } from '@/app/features/clients/utils/client-upsert.validation.utils';
import { mapPetUpsertFormToCreateRequest } from '@/app/features/pets/data/pet.mapper';
import { createPetUpsertFormGroup, getPetUpsertFormValue } from '@/app/features/pets/forms/pet-upsert-form.factory';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { parsePetCreateHttpError } from '@/app/features/pets/utils/pet-create-validation-parse.utils';
import { SpeciesService } from '@/app/features/species/services/species.service';
import type { PetSuggestion } from '@/app/features/visits/models/visit-vm.model';
import { splitSearchTermForRegistration } from '@/app/features/visits/utils/visit-registration.utils';
import type { SelectOption } from '@/app/shared/forms/client-pet-selection.utils';
import { panelHttpFailureMessage, problemCodeFromHttpError } from '@/app/shared/utils/api-error.utils';

export interface RegistrationOwner {
    id: string;
    name: string;
}

const DUPLICATE_CLIENT_CODE = 'Clients.DuplicateClient';
const DUPLICATE_CLIENT_MESSAGE = 'Bu ad ve telefonla kayıtlı müşteri var. Aramada müşteriyi bulup seçin.';

/**
 * Randevusuz gelişte kayıtsız hasta kaydı (Visit'i üst diyalog açar).
 * Yeni müşteri: tek işlemli `POST /clients/quick-register` (yarım kayıt oluşmaz). Kayıtlı sahibe hayvan: `POST /pets`.
 * Form doğrulamaları mevcut müşteri/hayvan upsert factory'lerinden gelir; burada yalnızca telefon zorunlu eklenir.
 */
@Component({
    selector: 'app-visit-quick-registration',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, ButtonModule, InputTextModule, SelectModule],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <section class="rounded-lg border border-surface-200 dark:border-surface-700 p-4" aria-label="Hızlı kayıt">
            <h3 class="text-base font-semibold mt-0 mb-3">{{ owner() ? 'Bu sahibe yeni hasta ekle' : 'Yeni müşteri ve hasta ekle' }}</h3>
            <div class="grid grid-cols-12 gap-3">
                @if (owner(); as o) {
                    <div class="col-span-12">
                        <span class="text-sm text-muted-color">Sahip:</span> <span class="font-medium">{{ o.name }}</span>
                    </div>
                } @else {
                    <div class="col-span-12 md:col-span-6">
                        <label for="vr-fullName" class="block text-sm font-medium text-muted-color mb-2">Sahip adı soyadı *</label>
                        <input id="vr-fullName" pInputText class="w-full" [formControl]="clientForm.controls.fullName" autocomplete="off" />
                        @if (clientMessage('fullName'); as msg) {
                            <small class="text-red-500">{{ msg }}</small>
                        }
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="vr-phone" class="block text-sm font-medium text-muted-color mb-2">Telefon *</label>
                        <input id="vr-phone" pInputText class="w-full" inputmode="tel" autocomplete="off" [formControl]="clientForm.controls.phone" />
                        @if (clientMessage('phone'); as msg) {
                            <small class="text-red-500">{{ msg }}</small>
                        }
                    </div>
                }
                <div class="col-span-12 md:col-span-6">
                    <label for="vr-petName" class="block text-sm font-medium text-muted-color mb-2">Hasta adı *</label>
                    <input id="vr-petName" pInputText class="w-full" autocomplete="off" [formControl]="petForm.controls.name" />
                    @if (petForm.controls.name.invalid && petForm.controls.name.touched) {
                        <small class="text-red-500">Bu alan zorunludur.</small>
                    }
                </div>
                <div class="col-span-12 md:col-span-6">
                    <label for="vr-species" class="block text-sm font-medium text-muted-color mb-2">Tür *</label>
                    <p-select
                        inputId="vr-species"
                        [formControl]="petForm.controls.speciesId"
                        [options]="speciesOptions()"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Tür seçin"
                        [filter]="true"
                        filterPlaceholder="Ara…"
                        filterBy="label"
                        class="w-full"
                        [loading]="loadingSpecies()"
                        appendTo="body"
                    />
                    @if (petForm.controls.speciesId.invalid && petForm.controls.speciesId.touched) {
                        <small class="text-red-500">Tür seçimi zorunludur.</small>
                    }
                </div>
                <div class="col-span-12 md:col-span-6">
                    <label for="vr-microchip" class="block text-sm font-medium text-muted-color mb-2">Mikroçip (opsiyonel)</label>
                    <input id="vr-microchip" pInputText class="w-full" autocomplete="off" [formControl]="petForm.controls.microchipNumber" />
                    @if (petForm.controls.microchipNumber.invalid) {
                        <small class="text-red-500">En fazla 50 karakter olabilir.</small>
                    }
                </div>
            </div>
            @if (stepError()) {
                <p class="text-red-500 mt-3 mb-0" role="alert">{{ stepError() }}</p>
            }
            <div class="flex flex-wrap gap-2 mt-4">
                <button pButton type="button" [disabled]="submitting() || !canSubmit()" (click)="submit()"><i class="p-button-icon" [class]="submitting() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>{{ owner() ? 'Hastayı kaydet ve geliş için seç' : 'Müşteri ve hastayı kaydet' }}</button>
                <button pButton type="button" severity="secondary" [disabled]="submitting()" (click)="cancelled.emit()"><i class="p-button-icon" [class]="duplicateClient() ? 'pi pi-search' : 'pi pi-times'"></i>{{ duplicateClient() ? 'Aramaya dön' : 'Vazgeç' }}</button>
            </div>
        </section>
    `
})
export class VisitQuickRegistrationComponent implements OnInit {
    /** Aranan metin; telefon biçimindeyse telefona, aksi halde sahip adına yazılır. */
    readonly searchTerm = input('');
    /** Doluysa kayıtlı sahibe yalnızca hayvan eklenir. */
    readonly existingOwner = input<RegistrationOwner | null>(null);
    /** Hayvan (ve gerekirse müşteri) oluştu; üst diyalog Visit'i açar. */
    readonly registered = output<PetSuggestion>();
    readonly cancelled = output<void>();

    private readonly fb = inject(FormBuilder);
    private readonly clientsService = inject(ClientsService);
    private readonly petsService = inject(PetsService);
    private readonly speciesService = inject(SpeciesService);

    readonly clientForm = createClientUpsertFormGroup(this.fb);
    readonly petForm = createPetUpsertFormGroup(this.fb);

    readonly owner = signal<RegistrationOwner | null>(null);
    readonly submitting = signal(false);
    readonly stepError = signal<string | null>(null);
    /** `409 Clients.DuplicateClient`: aynı ad ve telefonla müşteri var; kullanıcı aramadan seçmeli. */
    readonly duplicateClient = signal(false);
    readonly apiClientErrors = signal<ClientCreateFieldErrors>({});
    readonly speciesOptions = signal<SelectOption[]>([]);
    readonly loadingSpecies = signal(false);

    constructor() {
        // Bu akışta telefon zorunlu (mevcut müşteri formunda opsiyonel; kural yalnızca burada eklenir).
        this.clientForm.controls.phone.addValidators(Validators.required);
        this.clientForm.controls.phone.updateValueAndValidity({ emitEvent: false });
    }

    ngOnInit(): void {
        this.owner.set(this.existingOwner());
        const { fullName, phone } = splitSearchTermForRegistration(this.searchTerm());

        this.clientForm.patchValue({ fullName, phone });
        this.loadSpecies();
    }

    clientMessage(field: 'fullName' | 'phone'): string | null {
        const api = this.apiClientErrors()[field];

        if (api) {
            return api;
        }

        const control = this.clientForm.controls[field];

        return control.invalid && control.touched ? clientUpsertFieldErrorMessage(field, control.errors) : null;
    }

    canSubmit(): boolean {
        const petOk = this.petForm.controls.name.valid && this.petForm.controls.speciesId.valid && this.petForm.controls.microchipNumber.valid;

        return petOk && (!!this.owner() || (this.clientForm.controls.fullName.valid && this.clientForm.controls.phone.valid));
    }

    submit(): void {
        if (this.submitting()) {
            return;
        }

        if (!this.canSubmit()) {
            this.clientForm.markAllAsTouched();
            this.petForm.markAllAsTouched();

            return;
        }

        this.stepError.set(null);
        this.duplicateClient.set(false);
        this.apiClientErrors.set({});
        this.submitting.set(true);
        const owner = this.owner();

        if (owner) {
            this.addPetToOwner(owner);
        } else {
            this.registerNewClient();
        }
    }

    private registerNewClient(): void {
        const client = this.clientForm.getRawValue();
        const pet = getPetUpsertFormValue(this.petForm);

        this.clientsService.quickRegister(mapQuickRegisterFormsToRequest(client, pet)).subscribe({
            next: ({ clientId, petId }) => this.finish(petId, pet.name, pet.speciesId, { id: clientId, name: client.fullName.trim() }),
            error: (e: unknown) => this.failQuickRegister(e)
        });
    }

    private addPetToOwner(owner: RegistrationOwner): void {
        this.petForm.controls.clientId.setValue(owner.id);
        const payload = mapPetUpsertFormToCreateRequest(getPetUpsertFormValue(this.petForm), []);

        this.petsService.createPet(payload).subscribe({
            next: ({ id }) => this.finish(id, payload.name, payload.speciesId, owner),
            error: (e: unknown) => this.failPet(e)
        });
    }

    private finish(petId: string, petName: string, speciesId: string, owner: RegistrationOwner): void {
        this.submitting.set(false);
        const species = this.speciesOptions().find((o) => o.value === speciesId.trim())?.label ?? '—';

        this.registered.emit({
            id: petId,
            label: `${petName.trim()} — ${species} · Sahip: ${owner.name}`,
            clientId: owner.id,
            clientName: owner.name
        });
    }

    private failQuickRegister(e: unknown): void {
        this.submitting.set(false);

        if (!(e instanceof HttpErrorResponse)) {
            this.stepError.set(panelHttpFailureMessage(e, 'Kayıt oluşturulamadı.'));

            return;
        }

        if (problemCodeFromHttpError(e) === DUPLICATE_CLIENT_CODE) {
            this.duplicateClient.set(true);
            this.stepError.set(DUPLICATE_CLIENT_MESSAGE);

            return;
        }

        const parsed = parseClientCreateHttpError(e);

        this.apiClientErrors.set(parsed.fieldErrors);
        this.stepError.set(parsed.summaryMessage ?? 'Kayıt oluşturulamadı. Bilgileri kontrol edin.');
    }

    private failPet(e: unknown): void {
        this.submitting.set(false);
        this.stepError.set(e instanceof HttpErrorResponse ? (parsePetCreateHttpError(e).summaryMessage ?? 'Hasta kaydedilemedi. Bilgileri kontrol edin.') : panelHttpFailureMessage(e, 'Hasta kaydedilemedi.'));
    }

    private loadSpecies(): void {
        this.loadingSpecies.set(true);
        this.speciesService.getSpeciesList({ activeOnly: true }).subscribe({
            next: (items) => {
                this.speciesOptions.set(items.map((x) => ({ value: x.id, label: x.name })));
                this.loadingSpecies.set(false);
            },
            error: (e: unknown) => {
                this.stepError.set(panelHttpFailureMessage(e, 'Tür listesi yüklenemedi.'));
                this.loadingSpecies.set(false);
            }
        });
    }
}
