import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, input, OnInit, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { catchError, debounceTime, distinctUntilChanged, map, Observable, of, switchMap, tap } from 'rxjs';
import { mapClientUpsertFormValueToCreateRequest } from '@/app/features/clients/data/client.mapper';
import { createClientUpsertFormGroup, getClientUpsertFormValue } from '@/app/features/clients/forms/client-upsert-form.factory';
import type { ClientListItemVm } from '@/app/features/clients/models/client-vm.model';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import { parseClientCreateHttpError, type ClientCreateFieldErrors } from '@/app/features/clients/utils/client-create-validation-parse.utils';
import { clientUpsertFieldErrorMessage } from '@/app/features/clients/utils/client-upsert.validation.utils';
import { mapPetUpsertFormToCreateRequest } from '@/app/features/pets/data/pet.mapper';
import { createPetUpsertFormGroup, getPetUpsertFormValue } from '@/app/features/pets/forms/pet-upsert-form.factory';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { parsePetCreateHttpError } from '@/app/features/pets/utils/pet-create-validation-parse.utils';
import { SpeciesService } from '@/app/features/species/services/species.service';
import type { PetSuggestion } from '@/app/features/visits/models/visit-vm.model';
import { samePhone, splitSearchTermForRegistration } from '@/app/features/visits/utils/visit-registration.utils';
import type { SelectOption } from '@/app/shared/forms/client-pet-selection.utils';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';

export interface RegistrationOwner {
    id: string;
    name: string;
}

const DUPLICATE_SEARCH_DEBOUNCE_MS = 400;

/**
 * Randevusuz gelişte kayıtsız hasta: müşteri → hayvan sırayla oluşturulur (Visit'i üst diyalog açar).
 * Müşteri/hayvan form doğrulamaları mevcut upsert factory'lerinden gelir; burada yalnızca telefon zorunlu eklenir.
 * Yarım kayıt: müşteri oluşup hayvan hata verirse müşteri kimliği tutulur, yeniden denemede ikinci müşteri oluşturulmaz.
 */
@Component({
    selector: 'app-visit-quick-registration',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, ButtonModule, InputTextModule, SelectModule],
    template: `
        <section class="rounded-lg border border-surface-200 dark:border-surface-700 p-4" aria-label="Hızlı kayıt">
            <h3 class="text-base font-semibold mt-0 mb-3">{{ owner() ? 'Bu sahibe yeni hayvan ekle' : 'Yeni müşteri ve hasta ekle' }}</h3>
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
                    @if (createdClientId()) {
                        <div class="col-span-12 text-sm text-green-600" role="status">Müşteri kaydedildi.</div>
                    }
                    @if (duplicates().length > 0 && !createdClientId()) {
                        <div class="col-span-12 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3" role="alert">
                            @for (d of duplicates(); track d.id) {
                                <div class="flex flex-wrap items-center gap-2">
                                    <span class="text-sm">Bu telefonla kayıtlı müşteri var: <strong>{{ d.fullName }}</strong>.</span>
                                    <p-button type="button" label="Onu seç" size="small" severity="secondary" (onClick)="useExisting(d)" />
                                </div>
                            }
                            <label class="flex items-center gap-2 mt-2 text-sm">
                                <input type="checkbox" [checked]="confirmDuplicate()" (change)="confirmDuplicate.set(!confirmDuplicate())" />
                                Yine de yeni müşteri oluştur
                            </label>
                        </div>
                    }
                }
                <div class="col-span-12 md:col-span-6">
                    <label for="vr-petName" class="block text-sm font-medium text-muted-color mb-2">Hayvan adı *</label>
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
                        filterBy="label"
                        styleClass="w-full"
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
                <p-button
                    type="button"
                    [label]="owner() || createdClientId() ? 'Hayvanı kaydet ve geliş için seç' : 'Müşteri ve hastayı kaydet'"
                    icon="pi pi-check"
                    [loading]="submitting()"
                    [disabled]="submitting() || !canSubmit()"
                    (onClick)="submit()"
                />
                <p-button type="button" label="Vazgeç" icon="pi pi-times" severity="secondary" [disabled]="submitting()" (onClick)="cancelled.emit()" />
            </div>
        </section>
    `
})
export class VisitQuickRegistrationComponent implements OnInit {
    /** Aranan metin; telefon biçimindeyse telefona, aksi halde sahip adına yazılır. */
    readonly searchTerm = input('');
    /** Doluysa kayıtlı sahibe yalnızca hayvan eklenir. */
    readonly existingOwner = input<RegistrationOwner | null>(null);
    /** Hayvan oluştu (ve gerekirse müşteri); üst diyalog Visit'i açar. */
    readonly registered = output<PetSuggestion>();
    readonly cancelled = output<void>();

    private readonly fb = inject(FormBuilder);
    private readonly clientsService = inject(ClientsService);
    private readonly petsService = inject(PetsService);
    private readonly speciesService = inject(SpeciesService);
    private readonly destroyRef = inject(DestroyRef);

    readonly clientForm = createClientUpsertFormGroup(this.fb);
    readonly petForm = createPetUpsertFormGroup(this.fb);

    readonly owner = signal<RegistrationOwner | null>(null);
    /** Müşteri adımı başarılı olduysa kimliği; yeniden denemede aynı müşteri kullanılır. */
    readonly createdClientId = signal<string | null>(null);
    readonly duplicates = signal<ClientListItemVm[]>([]);
    readonly confirmDuplicate = signal(false);
    readonly submitting = signal(false);
    readonly stepError = signal<string | null>(null);
    readonly apiClientErrors = signal<ClientCreateFieldErrors>({});
    readonly speciesOptions = signal<SelectOption[]>([]);
    readonly loadingSpecies = signal(false);

    constructor() {
        // Bu akışta telefon zorunlu (mevcut müşteri formunda opsiyonel; kural yalnızca burada eklenir).
        this.clientForm.controls.phone.addValidators(Validators.required);
        this.clientForm.controls.phone.updateValueAndValidity({ emitEvent: false });

        // Çift kayıt uyarısı: aynı telefonlu müşteri var mı (sunucu `search`, biçim farkları sunucuda çözülür).
        this.clientForm.controls.phone.valueChanges
            .pipe(
                debounceTime(DUPLICATE_SEARCH_DEBOUNCE_MS),
                map((v) => v.trim()),
                distinctUntilChanged(),
                switchMap((phone) => this.findClientsByPhone(phone)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((matches) => {
                this.duplicates.set(matches);
                this.confirmDuplicate.set(false);
            });
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

    useExisting(client: ClientListItemVm): void {
        this.owner.set({ id: client.id, name: client.fullName });
        this.duplicates.set([]);
    }

    canSubmit(): boolean {
        const petOk = this.petForm.controls.name.valid && this.petForm.controls.speciesId.valid && this.petForm.controls.microchipNumber.valid;
        const ownerOk =
            !!this.owner() ||
            !!this.createdClientId() ||
            (this.clientForm.controls.fullName.valid &&
                this.clientForm.controls.phone.valid &&
                (this.duplicates().length === 0 || this.confirmDuplicate()));
        return petOk && ownerOk;
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
        this.apiClientErrors.set({});
        this.submitting.set(true);
        this.ensureClient().subscribe({
            next: (client) => this.createPet(client),
            error: (e: unknown) => this.failClientStep(e)
        });
    }

    private ensureClient(): Observable<RegistrationOwner> {
        const known = this.owner();
        if (known) {
            return of(known);
        }
        const name = this.clientForm.controls.fullName.value.trim();
        const created = this.createdClientId();
        if (created) {
            return of({ id: created, name });
        }
        return this.clientsService.createClient(mapClientUpsertFormValueToCreateRequest(getClientUpsertFormValue(this.clientForm))).pipe(
            tap(({ id }) => {
                this.createdClientId.set(id);
                this.clientForm.disable({ emitEvent: false });
            }),
            map(({ id }) => ({ id, name }))
        );
    }

    private createPet(client: RegistrationOwner): void {
        this.petForm.controls.clientId.setValue(client.id);
        const payload = mapPetUpsertFormToCreateRequest(getPetUpsertFormValue(this.petForm), []);
        this.petsService.createPet(payload).subscribe({
            next: ({ id }) => {
                this.submitting.set(false);
                const species = this.speciesOptions().find((o) => o.value === payload.speciesId)?.label ?? '—';
                this.registered.emit({
                    id,
                    label: `${payload.name} — ${species} · Sahip: ${client.name}`,
                    clientId: client.id,
                    clientName: client.name
                });
            },
            error: (e: unknown) => this.failPetStep(e)
        });
    }

    private failClientStep(e: unknown): void {
        this.submitting.set(false);
        if (e instanceof HttpErrorResponse) {
            const parsed = parseClientCreateHttpError(e);
            this.apiClientErrors.set(parsed.fieldErrors);
            this.stepError.set(`Müşteri kaydedilemedi: ${parsed.summaryMessage ?? 'Bilgileri kontrol edin.'}`);
            return;
        }
        this.stepError.set(`Müşteri kaydedilemedi: ${panelHttpFailureMessage(e, 'Beklenmeyen bir hata oluştu.')}`);
    }

    private failPetStep(e: unknown): void {
        this.submitting.set(false);
        const detail = e instanceof HttpErrorResponse ? (parsePetCreateHttpError(e).summaryMessage ?? 'Bilgileri kontrol edin.') : panelHttpFailureMessage(e, 'Beklenmeyen bir hata oluştu.');
        const savedNote = this.createdClientId() ? 'Müşteri kaydedildi (yeniden denemede tekrar oluşturulmaz); ' : '';
        this.stepError.set(`${savedNote}hayvan kaydedilemedi: ${detail}`);
    }

    private findClientsByPhone(phone: string): Observable<ClientListItemVm[]> {
        const control = this.clientForm.controls.phone;
        if (!phone || control.invalid || this.owner() || this.createdClientId()) {
            return of([]);
        }
        return this.clientsService.getClients({ page: 1, pageSize: 5, search: phone }).pipe(
            map((r) => r.items.filter((c) => samePhone(c.phone, phone))),
            catchError(() => of([]))
        );
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
