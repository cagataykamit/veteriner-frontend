import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, input, model, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { AuthService } from '@/app/core/auth/auth.service';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import { PetsService } from '@/app/features/pets/services/pets.service';
import type { CreateVisitRequest, TodayItemVm, VisitCreateResultVm } from '@/app/features/visits/models/visit-vm.model';
import { VisitsService } from '@/app/features/visits/services/visits.service';
import {
    clientOptionsFromList,
    filterPetsByClientId,
    isStalePetListResponse,
    petOptionsFromList,
    trimClientIdControlValue,
    type SelectOption
} from '@/app/shared/forms/client-pet-selection.utils';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';

/**
 * Hasta kabulü. `appointment` verilirse randevudan "Geldi" (hasta kilitli); verilmezse randevusuz hızlı geliş
 * (müşteri → hayvan seçimi). Sorumlu hekim iki akışta da opsiyoneldir.
 * Çift tıklama: gönderim sürerken düğme kilitli, `onSubmit` ikinci çağrıyı yok sayar; sunucu da mevcut Visit'i döndürür.
 */
@Component({
    selector: 'app-visit-arrival-dialog',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, DialogModule, ButtonModule, SelectModule],
    template: `
        <p-dialog
            [header]="appointment() ? 'Hasta geldi' : 'Randevusuz geliş'"
            [modal]="true"
            [dismissableMask]="!submitting()"
            [closable]="!submitting()"
            [style]="{ width: 'min(560px, 95vw)' }"
            [contentStyle]="{ overflow: 'visible' }"
            [(visible)]="visible"
            (onShow)="onDialogShow()"
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
                            <label for="va-clientId" class="block text-sm font-medium text-muted-color mb-2">Müşteri *</label>
                            <p-select
                                inputId="va-clientId"
                                formControlName="clientId"
                                [options]="clientOptions()"
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Müşteri arayın veya seçin"
                                [filter]="true"
                                filterBy="label"
                                [showClear]="true"
                                styleClass="w-full"
                                [loading]="loadingClients()"
                                appendTo="body"
                            />
                            @if (form.controls.clientId.invalid && form.controls.clientId.touched) {
                                <small class="text-red-500">Zorunlu alan.</small>
                            }
                        </div>
                        <div class="col-span-12">
                            <label for="va-petId" class="block text-sm font-medium text-muted-color mb-2">Hayvan *</label>
                            <p-select
                                inputId="va-petId"
                                formControlName="petId"
                                [options]="petOptions()"
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Önce müşteri seçin"
                                [filter]="true"
                                filterBy="label"
                                styleClass="w-full"
                                [loading]="loadingPets()"
                                appendTo="body"
                            />
                            @if (form.controls.petId.invalid && form.controls.petId.touched) {
                                <small class="text-red-500">Zorunlu alan.</small>
                            }
                        </div>
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
    readonly loadingClients = signal(false);
    readonly loadingPets = signal(false);
    readonly loadingVeterinarians = signal(false);
    readonly clientOptions = signal<SelectOption[]>([]);
    readonly petOptions = signal<SelectOption[]>([]);
    readonly veterinarianOptions = signal<SelectOption[]>([]);

    readonly form = this.fb.nonNullable.group({
        clientId: ['', Validators.required],
        petId: [{ value: '', disabled: true }, Validators.required],
        veterinarianId: ['']
    });

    constructor() {
        this.form.controls.clientId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((raw) => {
            this.form.controls.petId.setValue('');
            this.petOptions.set([]);
            const clientId = trimClientIdControlValue(raw);
            if (!clientId) {
                this.form.controls.petId.disable({ emitEvent: false });
                this.loadingPets.set(false);
                return;
            }
            this.form.controls.petId.enable({ emitEvent: false });
            this.loadPets(clientId);
        });
    }

    onDialogShow(): void {
        this.submitError.set(null);
        this.loadError.set(null);
        this.petOptions.set([]);
        this.form.reset({ clientId: '', petId: '', veterinarianId: '' }, { emitEvent: false });
        if (this.appointment()) {
            // Randevulu geliş: hasta randevudan gelir; disabled kontroller geçerliliği etkilemez.
            this.form.controls.clientId.disable({ emitEvent: false });
            this.form.controls.petId.disable({ emitEvent: false });
        } else {
            this.form.controls.clientId.enable({ emitEvent: false });
            this.form.controls.petId.disable({ emitEvent: false });
            this.loadClients();
        }
        this.loadVeterinarians();
    }

    close(): void {
        this.visible.set(false);
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
                this.submitError.set(panelHttpFailureMessage(e, 'Geliş kaydı oluşturulamadı.'));
            }
        });
    }

    private buildRequest(): CreateVisitRequest | null {
        const veterinarian = this.form.getRawValue().veterinarianId;
        const appointmentId = this.appointment()?.appointmentId;
        if (appointmentId) {
            return { appointmentId, responsibleVeterinarianUserId: veterinarian };
        }
        const clinicId = this.auth.getClinicId()?.trim();
        if (!clinicId) {
            return null;
        }
        return { clinicId, petId: this.form.getRawValue().petId, responsibleVeterinarianUserId: veterinarian };
    }

    private loadClients(): void {
        this.loadingClients.set(true);
        this.clientsService.getClients({ page: 1, pageSize: 200 }).subscribe({
            next: (r) => {
                this.clientOptions.set(clientOptionsFromList(r.items));
                this.loadingClients.set(false);
            },
            error: (e: unknown) => {
                this.loadError.set(panelHttpFailureMessage(e, 'Müşteri listesi yüklenemedi.'));
                this.loadingClients.set(false);
            }
        });
    }

    private loadPets(clientId: string): void {
        this.loadingPets.set(true);
        this.petsService.getPets({ page: 1, pageSize: 200, clientId }).subscribe({
            next: (r) => {
                if (isStalePetListResponse(this.form.controls.clientId.value, clientId)) {
                    return;
                }
                const items = r.items.some((p) => (p.clientId ?? '').trim()) ? filterPetsByClientId(r.items, clientId) : r.items;
                this.petOptions.set(petOptionsFromList(items));
                this.loadingPets.set(false);
            },
            error: (e: unknown) => {
                this.loadError.set(panelHttpFailureMessage(e, 'Hayvan listesi yüklenemedi.'));
                this.loadingPets.set(false);
            }
        });
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
