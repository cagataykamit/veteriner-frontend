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
import type { CreateAppointmentRequest } from '@/app/features/appointments/models/appointment-create.model';
import { AppointmentsService } from '@/app/features/appointments/services/appointments.service';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import {
    clientOptionsFromList,
    filterPetsByClientId,
    petOptionsFromList,
    type SelectOption
} from '@/app/shared/forms/client-pet-selection.utils';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';
import { dateTimeLocalInputToIsoUtc } from '@/app/shared/utils/date.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';

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
        AppPageHeaderComponent
    ],
    template: `
        <a routerLink="/panel/appointments" class="text-primary font-medium no-underline inline-block mb-4">← Randevu listesine dön</a>

        <app-page-header title="Yeni Randevu" subtitle="Operasyon" description="Randevu kaydı oluşturun." />

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
                        @if (form.controls.clientId.invalid && form.controls.clientId.touched) {
                            <small class="text-red-500">Zorunlu alan.</small>
                        }
                        <p class="text-muted-color text-sm mt-2 mb-0">
                            Aradığınız kayıt yoksa
                            <a routerLink="/panel/clients/new" class="text-primary font-medium no-underline">Yeni Müşteri</a>.
                        </p>
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
                        @if (form.controls.petId.invalid && form.controls.petId.touched) {
                            <small class="text-red-500">Zorunlu alan.</small>
                        }
                        <p class="text-muted-color text-sm mt-2 mb-0">
                            <a routerLink="/panel/pets/new" class="text-primary font-medium no-underline">Yeni Hayvan</a>
                            — bu müşteri için hayvan ekleyebilirsiniz.
                        </p>
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="scheduledAtLocal" class="block text-sm font-medium text-muted-color mb-2">Tarih / saat *</label>
                        <input
                            id="scheduledAtLocal"
                            type="datetime-local"
                            class="w-full p-inputtext p-component"
                            formControlName="scheduledAtLocal"
                        />
                        @if (form.controls.scheduledAtLocal.invalid && form.controls.scheduledAtLocal.touched) {
                            <small class="text-red-500">Zorunlu alan.</small>
                        }
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="type" class="block text-sm font-medium text-muted-color mb-2">Tür *</label>
                        <p-select
                            inputId="type"
                            formControlName="type"
                            [options]="typeOptions"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Tür seçin"
                            [showClear]="true"
                            styleClass="w-full"
                        />
                        @if (form.controls.type.invalid && form.controls.type.touched) {
                            <small class="text-red-500">Zorunlu alan.</small>
                        }
                    </div>
                    <div class="col-span-12">
                        <label for="reason" class="block text-sm font-medium text-muted-color mb-2">Sebep</label>
                        <textarea id="reason" rows="3" class="w-full p-inputtext p-component" formControlName="reason"></textarea>
                    </div>
                    <div class="col-span-12">
                        <label for="notes" class="block text-sm font-medium text-muted-color mb-2">Notlar</label>
                        <textarea id="notes" rows="3" class="w-full p-inputtext p-component" formControlName="notes"></textarea>
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
                        [disabled]="form.invalid || submitting() || loadingClients()"
                    />
                    <p-button type="button" label="İptal" icon="pi pi-times" severity="secondary" (onClick)="goList()" [disabled]="submitting()" />
                </div>
            </form>
        </div>
    `
})
export class AppointmentNewPageComponent implements OnInit {
    readonly copy = PANEL_COPY;

    private readonly fb = inject(FormBuilder);
    private readonly appointmentsService = inject(AppointmentsService);
    private readonly clientsService = inject(ClientsService);
    private readonly petsService = inject(PetsService);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);

    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);
    readonly selectionError = signal<string | null>(null);

    readonly loadingClients = signal(false);
    readonly loadingPets = signal(false);
    readonly clientOptions = signal<SelectOption[]>([]);
    readonly petOptions = signal<SelectOption[]>([]);

    readonly typeOptions = [
        { label: 'Konsültasyon', value: 'consultation' },
        { label: 'Genel kontrol', value: 'checkup' },
        { label: 'Aşı', value: 'vaccination' },
        { label: 'Cerrahi', value: 'surgery' },
        { label: 'Bakım / tıraş', value: 'grooming' },
        { label: 'Acil', value: 'emergency' },
        { label: 'Kontrol', value: 'followup' },
        { label: 'Diş', value: 'dental' },
        { label: 'Görüntüleme', value: 'imaging' },
        { label: 'Diğer', value: 'other' }
    ];

    readonly form = this.fb.nonNullable.group({
        clientId: ['', Validators.required],
        petId: [{ value: '', disabled: true }, Validators.required],
        scheduledAtLocal: ['', Validators.required],
        type: ['', Validators.required],
        reason: [''],
        notes: ['']
    });

    ngOnInit(): void {
        this.loadClients();
        this.form.controls.clientId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((clientId) => {
            this.form.controls.petId.setValue('');
            this.submitError.set(null);
            this.selectionError.set(null);
            const id = typeof clientId === 'string' ? clientId.trim() : '';
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

    onSubmit(): void {
        this.submitError.set(null);
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

        const payload: CreateAppointmentRequest = {
            clientId: v.clientId.trim(),
            petId: v.petId.trim(),
            scheduledAtUtc,
            type: v.type.trim(),
            reason: v.reason.trim() || undefined,
            notes: v.notes.trim() || undefined
        };

        this.submitting.set(true);
        this.appointmentsService.createAppointment(payload).subscribe({
            next: ({ id }) => {
                this.submitting.set(false);
                void this.router.navigate(['/panel/appointments', id]);
            },
            error: (e: unknown) => {
                this.submitting.set(false);
                this.submitError.set(this.mapSubmitError(e));
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

    private loadPetsForClient(clientId: string): void {
        this.loadingPets.set(true);
        this.petsService.getPets({ page: 1, pageSize: 200, clientId }).subscribe({
            next: (r) => {
                let items = r.items;
                const anyClientId = items.some((p) => (p.clientId ?? '').trim());
                if (anyClientId) {
                    items = filterPetsByClientId(items, clientId);
                }
                this.petOptions.set(petOptionsFromList(items));
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

    private mapSubmitError(e: unknown): string {
        if (e instanceof HttpErrorResponse) {
            return messageFromHttpError(e, 'Kayıt oluşturulamadı.');
        }
        return e instanceof Error ? e.message : 'Kayıt oluşturulamadı.';
    }
}
