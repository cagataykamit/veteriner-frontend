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
import { mapAppointmentUpsertFormToCreateRequest } from '@/app/features/appointments/data/appointment.mapper';
import { AppointmentsService } from '@/app/features/appointments/services/appointments.service';
import {
    type AppointmentUpsertFieldErrors,
    type AppointmentUpsertFormFieldKey,
    parseAppointmentUpsertHttpError
} from '@/app/features/appointments/utils/appointment-upsert-validation-parse.utils';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import {
    clientOptionsFromList,
    filterPetsByClientId,
    petOptionsFromList,
    trimClientIdControlValue,
    type SelectOption
} from '@/app/shared/forms/client-pet-selection.utils';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';
import { dateTimeLocalInputToIsoUtc } from '@/app/shared/utils/date.utils';
import { messageFromClinicResolutionHttpError } from '@/app/features/appointments/utils/clinic-resolution-error.utils';
import { APPOINTMENT_TYPE_WRITE_OPTIONS } from '@/app/features/appointments/utils/appointment-type.utils';
import { APPOINTMENT_WRITE_STATUS_OPTIONS } from '@/app/features/appointments/utils/appointment-status.utils';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { QuickClientDialogComponent } from '@/app/shared/forms/quick-create/quick-client-dialog.component';
import { QuickPetDialogComponent } from '@/app/shared/forms/quick-create/quick-pet-dialog.component';

@Component({
    selector: 'app-appointment-new-page',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterLink,
        ButtonModule,
        InputTextModule,
        SelectModule,
        AppPageHeaderComponent,
        QuickClientDialogComponent,
        QuickPetDialogComponent
    ],
    template: `
        <a routerLink="/panel/appointments" class="text-primary font-medium no-underline inline-block mb-4">← Randevu listesine dön</a>

        <app-page-header title="Yeni Randevu" subtitle="Operasyon" description="Randevu kaydı oluşturun." />

        <div class="card">
            @if (ro.mutationBlocked()) {
                <p class="text-amber-700 dark:text-amber-300 text-sm mt-0 mb-4" role="status">
                    İşletme salt okunur moddadır; randevu oluşturulamaz.
                </p>
            }
            @if (selectionError()) {
                <p class="text-red-500 mt-0 mb-4" role="alert">{{ selectionError() }}</p>
            }
            <p class="text-sm text-muted-color mt-0 mb-4">Aktif Klinik: {{ activeClinicLabel() }}</p>
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
                            <small class="text-red-500">Zorunlu alan.</small>
                        }
                        <div class="flex flex-wrap gap-2 align-items-center mt-2">
                            <p-button
                                type="button"
                                label="Yeni müşteri"
                                icon="pi pi-user-plus"
                                [text]="true"
                                styleClass="p-0"
                                [disabled]="ro.mutationBlocked()"
                                (onClick)="quickClientOpen.set(true)"
                            />
                        </div>
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="petId" class="block text-sm font-medium text-muted-color mb-2">Hayvan *</label>
                        <p-select
                            inputId="petId"
                            formControlName="petId"
                            [options]="petOptions()"
                            optionLabel="label"
                            optionValue="value"
                            [placeholder]="form.controls.petId.disabled ? 'Önce müşteri seçin' : 'Hayvan seçin'"
                            [filter]="true"
                            filterBy="label"
                            [showClear]="true"
                            styleClass="w-full"
                            [loading]="loadingPets()"
                        />
                        @if (apiFieldErrors().petId) {
                            <small class="text-red-500">{{ apiFieldErrors().petId }}</small>
                        } @else if (form.controls.petId.invalid && form.controls.petId.touched) {
                            <small class="text-red-500">Zorunlu alan.</small>
                        }
                        <div class="flex flex-wrap gap-2 align-items-center mt-2">
                            <p-button
                                type="button"
                                label="Bu müşteri için yeni hayvan"
                                icon="pi pi-plus"
                                [text]="true"
                                styleClass="p-0"
                                [disabled]="petQuickAddDisabled()"
                                (onClick)="quickPetOpen.set(true)"
                            />
                        </div>
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="scheduledAtLocal" class="block text-sm font-medium text-muted-color mb-2">Tarih / saat *</label>
                        <input
                            id="scheduledAtLocal"
                            type="datetime-local"
                            class="w-full p-inputtext p-component"
                            formControlName="scheduledAtLocal"
                        />
                        @if (apiFieldErrors().scheduledAtLocal) {
                            <small class="text-red-500">{{ apiFieldErrors().scheduledAtLocal }}</small>
                        } @else if (form.controls.scheduledAtLocal.invalid && form.controls.scheduledAtLocal.touched) {
                            <small class="text-red-500">Zorunlu alan.</small>
                        }
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="appointmentType" class="block text-sm font-medium text-muted-color mb-2">Randevu Türü *</label>
                        <p-select
                            inputId="appointmentType"
                            formControlName="appointmentType"
                            [options]="typeOptions"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Randevu Türü seçin"
                            [showClear]="true"
                            styleClass="w-full"
                        />
                        @if (apiFieldErrors().appointmentType) {
                            <small class="text-red-500">{{ apiFieldErrors().appointmentType }}</small>
                        } @else if (form.controls.appointmentType.invalid && form.controls.appointmentType.touched) {
                            <small class="text-red-500">Zorunlu alan.</small>
                        }
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="status" class="block text-sm font-medium text-muted-color mb-2">Durum</label>
                        <p-select
                            inputId="status"
                            formControlName="status"
                            [options]="statusOptions"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Durum seçin"
                            [showClear]="true"
                            styleClass="w-full"
                        />
                        @if (apiFieldErrors().status) {
                            <small class="text-red-500">{{ apiFieldErrors().status }}</small>
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
                        label="Kaydet"
                        icon="pi pi-check"
                        [loading]="submitting()"
                        [disabled]="form.invalid || submitting() || loadingClients() || ro.mutationBlocked()"
                    />
                    <p-button type="button" label="İptal" icon="pi pi-times" severity="secondary" (onClick)="goList()" [disabled]="submitting()" />
                </div>
            </form>
        </div>

        <app-quick-client-dialog [(visible)]="quickClientOpen" (clientCreated)="onQuickClientCreated($event)" />
        <app-quick-pet-dialog
            [(visible)]="quickPetOpen"
            [ownerClientId]="quickPetOwnerClientId()"
            (petCreated)="onQuickPetCreated($event)"
        />
    `
})
export class AppointmentNewPageComponent implements OnInit {
    private readonly fb = inject(FormBuilder);
    private readonly appointmentsService = inject(AppointmentsService);
    private readonly clientsService = inject(ClientsService);
    private readonly petsService = inject(PetsService);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);
    private readonly auth = inject(AuthService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);
    readonly selectionError = signal<string | null>(null);
    readonly apiFieldErrors = signal<AppointmentUpsertFieldErrors>({});

    readonly loadingClients = signal(false);
    readonly loadingPets = signal(false);
    readonly clientOptions = signal<SelectOption[]>([]);
    readonly petOptions = signal<SelectOption[]>([]);
    readonly activeClinicLabel = signal<string>('Belirlenmedi');

    readonly quickClientOpen = signal(false);
    readonly quickPetOpen = signal(false);

    readonly typeOptions = [...APPOINTMENT_TYPE_WRITE_OPTIONS];
    readonly statusOptions = [...APPOINTMENT_WRITE_STATUS_OPTIONS];

    readonly form = this.fb.group({
        clientId: this.fb.nonNullable.control('', Validators.required),
        petId: this.fb.nonNullable.control({ value: '', disabled: true }, Validators.required),
        scheduledAtLocal: this.fb.nonNullable.control('', Validators.required),
        appointmentType: this.fb.control<number | null>(null, Validators.required),
        status: this.fb.control<number | null>(0),
        notes: this.fb.nonNullable.control('')
    });

    constructor() {
        const clearApiError = (f: AppointmentUpsertFormFieldKey): void => {
            const cur = this.apiFieldErrors();
            if (cur[f]) {
                const next = { ...cur };
                delete next[f];
                this.apiFieldErrors.set(next);
            }
        };
        this.form.controls.clientId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => clearApiError('clientId'));
        this.form.controls.petId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => clearApiError('petId'));
        this.form.controls.scheduledAtLocal.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => clearApiError('scheduledAtLocal'));
        this.form.controls.appointmentType.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => clearApiError('appointmentType'));
        this.form.controls.status.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => clearApiError('status'));
        this.form.controls.notes.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => clearApiError('notes'));
    }

    ngOnInit(): void {
        this.activeClinicLabel.set(this.auth.getClinicName() ?? this.auth.getClinicId() ?? 'Belirlenmedi');
        this.loadClients();
        this.form.controls.clientId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((clientId) => {
            this.form.controls.petId.setValue('');
            this.submitError.set(null);
            this.selectionError.set(null);
            if (clientId === null || clientId === undefined) {
                this.form.controls.clientId.setValue('', { emitEvent: false });
            }
            const id = trimClientIdControlValue(this.form.controls.clientId.value);
            if (!id) {
                this.petOptions.set([]);
                this.form.controls.petId.disable({ emitEvent: false });
                return;
            }
            this.form.controls.petId.enable({ emitEvent: false });
            this.loadPetsForClient(id);
        });
    }

    goList(): void {
        void this.router.navigate(['/panel/appointments']);
    }

    petQuickAddDisabled(): boolean {
        return (
            this.ro.mutationBlocked() ||
            !trimClientIdControlValue(this.form.getRawValue().clientId) ||
            this.form.controls.petId.disabled
        );
    }

    quickPetOwnerClientId(): string {
        return trimClientIdControlValue(this.form.getRawValue().clientId);
    }

    onQuickClientCreated(clientId: string): void {
        const id = clientId.trim();
        if (!id) {
            return;
        }
        this.reloadClientsAndSelectClient(id);
    }

    onQuickPetCreated(petId: string): void {
        const cid = trimClientIdControlValue(this.form.getRawValue().clientId);
        const pid = petId.trim();
        if (!cid || !pid) {
            return;
        }
        this.loadPetsForClient(cid, pid);
    }

    onSubmit(): void {
        this.submitError.set(null);
        this.apiFieldErrors.set({});
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const v = this.form.getRawValue();
        const scheduledAtUtc = dateTimeLocalInputToIsoUtc(v.scheduledAtLocal);
        if (!scheduledAtUtc) {
            this.submitError.set('Geçerli bir tarih ve saat seçin.');
            return;
        }
        const clinicId = this.auth.getClinicId()?.trim() ?? '';
        if (!clinicId) {
            this.submitError.set('Aktif klinik bulunamadı. Lütfen yeniden giriş yapın.');
            return;
        }

        const appointmentType = v.appointmentType;
        if (appointmentType === null || appointmentType === undefined) {
            this.form.markAllAsTouched();
            this.submitError.set('Randevu Türü seçin.');
            return;
        }

        const payload = mapAppointmentUpsertFormToCreateRequest({
            clinicId,
            petId: v.petId,
            scheduledAtUtc,
            appointmentType,
            status: v.status,
            notes: v.notes
        });

        this.submitting.set(true);
        this.appointmentsService.createAppointment(payload).subscribe({
            next: ({ id }) => {
                this.submitting.set(false);
                void this.router.navigate(['/panel/appointments', id]);
            },
            error: (e: unknown) => {
                this.submitting.set(false);
                if (e instanceof HttpErrorResponse) {
                    const clinicMsg = messageFromClinicResolutionHttpError(e);
                    if (clinicMsg) {
                        this.submitError.set(clinicMsg);
                        return;
                    }
                    const parsed = parseAppointmentUpsertHttpError(e);
                    this.apiFieldErrors.set(parsed.fieldErrors);
                    this.submitError.set(parsed.summaryMessage);
                    return;
                }
                this.submitError.set(e instanceof Error ? e.message : 'Kayıt oluşturulamadı.');
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

    private reloadClientsAndSelectClient(clientId: string): void {
        this.loadingClients.set(true);
        this.selectionError.set(null);
        this.clientsService.getClients({ page: 1, pageSize: 300 }).subscribe({
            next: (r) => {
                this.clientOptions.set(clientOptionsFromList(r.items));
                this.loadingClients.set(false);
                this.form.controls.clientId.setValue(clientId, { emitEvent: true });
            },
            error: (e: unknown) => {
                this.selectionError.set(this.mapLoadError(e, 'Müşteri listesi yüklenemedi.'));
                this.loadingClients.set(false);
            }
        });
    }

    private loadPetsForClient(clientId: string, selectPetId?: string): void {
        this.loadingPets.set(true);
        this.petsService.getPets({ page: 1, pageSize: 200, clientId }).subscribe({
            next: (r) => {
                let items = r.items;
                const anyClientId = items.some((p) => (p.clientId ?? '').trim());
                if (anyClientId) {
                    items = filterPetsByClientId(items, clientId);
                }
                this.petOptions.set(petOptionsFromList(items));
                const want = selectPetId?.trim();
                if (want) {
                    const exists = items.some((p) => p.id === want);
                    if (exists) {
                        this.form.controls.petId.setValue(want, { emitEvent: true });
                    }
                }
                this.loadingPets.set(false);
            },
            error: (e: unknown) => {
                this.selectionError.set(this.mapLoadError(e, 'Hayvan listesi yüklenemedi.'));
                this.petOptions.set([]);
                this.loadingPets.set(false);
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
