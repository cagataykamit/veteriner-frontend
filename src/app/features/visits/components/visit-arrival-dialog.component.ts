import { CommonModule } from '@angular/common';
import { Component, DestroyRef, effect, inject, input, model, output, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors } from '@angular/forms';
import { AutoCompleteCompleteEvent, AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { catchError, forkJoin, map, Observable, of, Subject, switchMap } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { CLIENTS_CREATE_CLAIM, PETS_CREATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import { PetsService } from '@/app/features/pets/services/pets.service';
import type { PetListItemVm } from '@/app/features/pets/models/pet-vm.model';
import { VisitQuickRegistrationComponent, type RegistrationOwner } from '@/app/features/visits/components/visit-quick-registration.component';
import type { CreateVisitRequest, PetSuggestion, TodayItemVm, VisitCreateResultVm } from '@/app/features/visits/models/visit-vm.model';
import { findVeterinarianUserId } from '@/app/features/visits/data/visit.mapper';
import { VisitsService } from '@/app/features/visits/services/visits.service';
import type { SelectOption } from '@/app/shared/forms/client-pet-selection.utils';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';

const PET_SEARCH_PAGE_SIZE = 10;

function petSelected(c: AbstractControl): ValidationErrors | null {
    // AutoComplete yazarken string, listeden seçilince nesne tutar; yalnızca seçilmiş hasta geçerlidir.
    const v = c.value as PetSuggestion | string | null;
    return v && typeof v === 'object' && v.id ? null : { required: true };
}

/**
 * Hasta kabulü. `appointment` verilirse randevudan "Geldi" (hasta kilitli); verilmezse randevusuz hızlı geliş
 * (tek alanda hasta araması). Sorumlu hekim iki akışta da opsiyoneldir.
 * Çift tıklama: gönderim sürerken düğme kilitli, `onSubmit` ikinci çağrıyı yok sayar; sunucu da mevcut Visit'i döndürür.
 */
@Component({
    selector: 'app-visit-arrival-dialog',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, DialogModule, ButtonModule, SelectModule, AutoCompleteModule, CheckboxModule, VisitQuickRegistrationComponent],
    template: `
        <p-dialog
            [header]="appointment() ? 'Hasta geldi' : 'Randevusuz geliş'"
            [modal]="true"
            [dismissableMask]="!submitting()"
            [closable]="!submitting()"
            [style]="{ width: 'min(560px, 95vw)' }"
            [contentStyle]="{ overflow: 'visible' }"
            [(visible)]="visible"
        >
            @if (loadError()) {
                <p class="text-red-500 mt-0 mb-3" role="alert">{{ loadError() }}</p>
            }
            <form [formGroup]="form" (ngSubmit)="onSubmit()" id="visit-arrival-form">
                <div class="grid grid-cols-12 gap-4">
                    @if (appointment(); as appt) {
                        <div class="col-span-12">
                            <p class="m-0 font-medium">{{ appt.petName }} · {{ appt.speciesName }}</p>
                            <p class="m-0 text-sm text-muted-color">{{ appt.clientName }}</p>
                        </div>
                    } @else {
                        <div class="col-span-12">
                            <label for="va-pet" class="block text-sm font-medium text-muted-color mb-2">Hasta *</label>
                            <p-autocomplete
                                inputId="va-pet"
                                formControlName="pet"
                                [suggestions]="petSuggestions()"
                                (completeMethod)="onPetSearch($event)"
                                optionLabel="label"
                                [delay]="300"
                                [minQueryLength]="2"
                                [showClear]="true"
                                [fluid]="true"
                                placeholder="Hasta, sahip, telefon veya mikroçip ile arayın"
                                emptyMessage="Eşleşen hasta bulunamadı."
                                appendTo="body"
                            />
                            @if (form.controls.pet.invalid && form.controls.pet.touched) {
                                <small class="text-red-500">Listeden bir hasta seçin.</small>
                            }
                        </div>
                        @if (registration(); as reg) {
                            <div class="col-span-12">
                                <app-visit-quick-registration
                                    [searchTerm]="lastSearchTerm()"
                                    [existingOwner]="reg.owner"
                                    (registered)="onRegistered($event)"
                                    (cancelled)="registration.set(null)"
                                />
                            </div>
                        } @else {
                            <div class="col-span-12 flex flex-wrap gap-3 -mt-2">
                                @if (canRegisterNewOwner) {
                                    <p-button type="button" label="Yeni müşteri ve hasta ekle" icon="pi pi-user-plus" size="small" [text]="true" (onClick)="openRegistration(null)" />
                                }
                                @if (canAddPet && selectedOwner(); as owner) {
                                    <p-button type="button" label="Bu sahibe yeni hayvan ekle" icon="pi pi-plus" size="small" [text]="true" (onClick)="openRegistration(owner)" />
                                }
                            </div>
                        }
                    }
                    <div class="col-span-12">
                        <label for="va-vet" class="block text-sm font-medium text-muted-color mb-2">Sorumlu hekim (opsiyonel)</label>
                        <p-select
                            inputId="va-vet"
                            formControlName="veterinarianId"
                            [options]="veterinarianOptions()"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Hekim seçilmedi"
                            [showClear]="true"
                            styleClass="w-full"
                            [loading]="loadingVeterinarians()"
                            appendTo="body"
                        />
                    </div>
                    <div class="col-span-12 flex items-center gap-2">
                        <p-checkbox inputId="va-urgent" formControlName="isUrgent" [binary]="true" />
                        <label for="va-urgent" class="font-medium">Acil</label>
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
                    [label]="appointment() ? 'Geldi olarak kaydet' : 'Kaydet'"
                    icon="pi pi-check"
                    [loading]="submitting()"
                    [disabled]="form.invalid || submitting()"
                    (onClick)="onSubmit()"
                />
            </ng-template>
        </p-dialog>
    `
})

export class VisitArrivalDialogComponent {
    readonly visible = model(false);
    /** Doluysa randevudan geliş (hasta kilitli); `null` ise randevusuz geliş. */
    readonly appointment = input<TodayItemVm | null>(null);
    /** Sunucu yanıtı (yeni ya da mevcut Visit); `created` bayrağı üst bileşenin mesajını belirler. */
    readonly arrived = output<VisitCreateResultVm>();

    private readonly fb = inject(FormBuilder);
    private readonly auth = inject(AuthService);
    private readonly visitsService = inject(VisitsService);
    private readonly clientsService = inject(ClientsService);
    private readonly petsService = inject(PetsService);
    private readonly destroyRef = inject(DestroyRef);

    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);
    readonly loadError = signal<string | null>(null);
    readonly loadingVeterinarians = signal(false);
    readonly petSuggestions = signal<PetSuggestion[]>([]);
    /** Hızlı kayıt açıksa (`owner`: kayıtlı sahibe hayvan ekleme); kapalıysa `null`. */
    readonly registration = signal<{ owner: RegistrationOwner | null } | null>(null);
    readonly lastSearchTerm = signal('');
    /** Yeni müşteri + hasta için ikisi de, mevcut sahibe hayvan için yalnızca `Pets.Create` gerekir. */
    readonly canAddPet = this.auth.hasOperationClaim(PETS_CREATE_CLAIM);
    readonly canRegisterNewOwner = this.canAddPet && this.auth.hasOperationClaim(CLIENTS_CREATE_CLAIM);
    /** Hızlı kayıtla az önce oluşturulan hasta; Visit adımı hata verirse mesajda belirtilir. */
    private registeredPetId: string | null = null;
    readonly veterinarianOptions = signal<SelectOption[]>([]);

    readonly form = this.fb.group({
        pet: this.fb.control<PetSuggestion | string | null>(null, petSelected),
        veterinarianId: this.fb.nonNullable.control(''),
        isUrgent: this.fb.nonNullable.control(false)
    });

    /** Sahip adı çözümlemesi aramalar arasında paylaşılır (aynı sahip için tekrar istek yok). */
    private readonly ownerNames = new Map<string, string>();
    private readonly petSearch$ = new Subject<string>();

    constructor() {
        // Form, diyalog açılırken (görünürlük değişince) hazırlanır; p-dialog'un onShow olayı açılış animasyonundan
        // ~300 ms sonra tetiklenir ve o sırada kullanıcının yazdıklarını sıfırlardı.
        effect(() => {
            if (this.visible()) {
                untracked(() => this.prepareForm());
            }
        });
        // Sunucu tarafı arama (`search`: Türkçe harf, telefon, mikroçip, sahip adı backend'de çözülür); `switchMap` eski yanıtı atar.
        this.petSearch$
            .pipe(
                switchMap((term) =>
                    this.petsService.getPets({ page: 1, pageSize: PET_SEARCH_PAGE_SIZE, search: term }).pipe(
                        switchMap((r) => this.withOwnerLabels(r.items)),
                        catchError((e: unknown) => {
                            this.loadError.set(panelHttpFailureMessage(e, 'Hasta araması yapılamadı.'));
                            return of([] as PetSuggestion[]);
                        })
                    )
                ),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((suggestions) => this.petSuggestions.set(suggestions));
    }

    onPetSearch(event: AutoCompleteCompleteEvent): void {
        const term = event.query.trim();
        this.lastSearchTerm.set(term);
        if (term) {
            this.loadError.set(null);
            this.petSearch$.next(term);
        }
    }

    /** Diyalog her açıldığında formu ve yüklemeleri sıfırlar. */
    private prepareForm(): void {
        this.submitError.set(null);
        this.loadError.set(null);
        this.petSuggestions.set([]);
        this.form.reset({ pet: null, veterinarianId: '', isUrgent: false });
        this.registration.set(null);
        this.registeredPetId = null;
        this.lastSearchTerm.set('');
        // Randevulu geliş: hasta randevudan gelir; devre dışı kontrol geçerliliği etkilemez.
        if (this.appointment()) {
            this.form.controls.pet.disable({ emitEvent: false });
        } else {
            this.form.controls.pet.enable({ emitEvent: false });
        }
        this.loadVeterinarians();
    }

    close(): void {
        this.visible.set(false);
    }

    /** Seçili hastanın sahibi (liste yanıtında sahip kimliği varsa); "bu sahibe yeni hayvan" için. */
    selectedOwner(): RegistrationOwner | null {
        const pet = this.form.controls.pet.value;
        return pet && typeof pet === 'object' && pet.clientId ? { id: pet.clientId, name: pet.clientName } : null;
    }

    openRegistration(owner: RegistrationOwner | null): void {
        this.registration.set({ owner });
    }

    /** Müşteri/hayvan kaydedildi: hasta seçilir ve geliş (Visit) hemen açılır; Visit hata verirse hasta yeniden oluşturulmaz. */
    onRegistered(pet: PetSuggestion): void {
        this.registeredPetId = pet.id;
        this.registration.set(null);
        this.form.controls.pet.setValue(pet);
        this.onSubmit();
    }

    onSubmit(): void {
        if (this.submitting()) {
            return;
        }
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        const request = this.buildRequest();
        if (!request) {
            this.submitError.set('Aktif klinik bulunamadı. Lütfen yeniden giriş yapın.');
            return;
        }
        this.submitError.set(null);
        this.submitting.set(true);
        this.visitsService.createVisit(request).subscribe({
            next: (result) => {
                this.submitting.set(false);
                this.visible.set(false);
                this.arrived.emit(result);
            },
            error: (e: unknown) => {
                this.submitting.set(false);
                const message = panelHttpFailureMessage(e, 'Geliş kaydı oluşturulamadı.');
                this.submitError.set(request.petId && request.petId === this.registeredPetId ? `Kayıt tamamlandı, ancak geliş kaydı oluşturulamadı: ${message} Yeniden denemek için Kaydet'e basın.` : message);
            }
        });
    }

    private buildRequest(): CreateVisitRequest | null {
        const { pet, veterinarianId, isUrgent } = this.form.getRawValue();
        const appointmentId = this.appointment()?.appointmentId;
        if (appointmentId) {
            return { appointmentId, responsibleVeterinarianUserId: veterinarianId, isUrgent };
        }
        const clinicId = this.auth.getClinicId()?.trim();
        if (!clinicId || !pet || typeof pet !== 'object') {
            return null;
        }
        return { clinicId, petId: pet.id, responsibleVeterinarianUserId: veterinarianId, isUrgent };
    }

    /** Aynı ada sahip hastaları ayırt etmek için sonuçlara sahip adı eklenir (liste DTO'sunda sahip adı yok). */
    private withOwnerLabels(pets: PetListItemVm[]): Observable<PetSuggestion[]> {
        const missing = [...new Set(pets.map((p) => p.clientId).filter((id): id is string => !!id && !this.ownerNames.has(id)))];
        const lookups = missing.map((id) =>
            this.clientsService.getClientById(id).pipe(
                map((c) => this.ownerNames.set(id, c.fullName)),
                catchError(() => of(this.ownerNames.set(id, '—')))
            )
        );
        return (lookups.length ? forkJoin(lookups) : of([])).pipe(
            map(() =>
                pets.map((p) => ({
                    id: p.id,
                    label: `${p.name} — ${p.speciesName} · Sahip: ${(p.clientId && this.ownerNames.get(p.clientId)) || '—'}`,
                    clientId: p.clientId,
                    clientName: (p.clientId && this.ownerNames.get(p.clientId)) || '—'
                }))
            )
        );
    }

    /** Hekim opsiyonel: liste yüklenemezse geliş hekimsiz kaydedilebilir. */
    private loadVeterinarians(): void {
        const clinicId = this.auth.getClinicId()?.trim();
        if (!clinicId) {
            return;
        }
        this.loadingVeterinarians.set(true);
        this.visitsService.getVeterinarians(clinicId).subscribe({
            next: (vets) => {
                this.veterinarianOptions.set(vets.map((v) => ({ label: v.name, value: v.userId })));
                // Hekim kullanıcı için varsayılan kendisi; kullanıcı yüklenirken başka seçim yaptıysa ezilmez.
                const self = findVeterinarianUserId(vets, this.auth.getUserId());
                if (self && !this.form.controls.veterinarianId.value) {
                    this.form.controls.veterinarianId.setValue(self);
                }
                this.loadingVeterinarians.set(false);
            },
            error: (e: unknown) => {
                this.veterinarianOptions.set([]);
                this.loadError.set(panelHttpFailureMessage(e, 'Hekim listesi yüklenemedi; hekim seçmeden devam edebilirsiniz.'));
                this.loadingVeterinarians.set(false);
            }
        });
    }
}
