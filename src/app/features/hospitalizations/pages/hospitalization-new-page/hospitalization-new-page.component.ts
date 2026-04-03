import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { AuthService } from '@/app/core/auth/auth.service';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import { ExaminationsService } from '@/app/features/examinations/services/examinations.service';
import {
    mapHospitalizationUpsertFormToCreateRequest
} from '@/app/features/hospitalizations/data/hospitalization.mapper';
import { HospitalizationsService } from '@/app/features/hospitalizations/services/hospitalizations.service';
import {
    type HospitalizationUpsertFieldErrors,
    parseHospitalizationUpsertHttpError
} from '@/app/features/hospitalizations/utils/hospitalization-upsert-validation-parse.utils';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { prescriptionExaminationSelectOption } from '@/app/features/prescriptions/utils/prescription-relation-select.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import {
    clientOptionsFromList,
    filterPetsByClientId,
    petOptionsFromList,
    trimClientIdControlValue,
    type SelectOption
} from '@/app/shared/forms/client-pet-selection.utils';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';
import { dateTimeLocalInputToIsoUtc } from '@/app/shared/utils/date.utils';

@Component({
    selector: 'app-hospitalization-new-page',
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
        <a routerLink="/panel/hospitalizations" class="text-primary font-medium no-underline inline-block mb-4">← Listeye dön</a>

        <app-page-header title="Yeni yatış" subtitle="Klinik" description="Yatış kaydı oluşturun." />

        <div class="card">
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
                        @if (form.controls.clientId.invalid && form.controls.clientId.touched) {
                            <small class="text-red-500">Zorunlu alan.</small>
                        } @else if (apiFieldErrors().clientId) {
                            <small class="text-red-500">{{ apiFieldErrors().clientId }}</small>
                        }
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
                        } @else if (apiFieldErrors().petId) {
                            <small class="text-red-500">{{ apiFieldErrors().petId }}</small>
                        }
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="admittedAtLocal" class="block text-sm font-medium text-muted-color mb-2">Yatış tarihi / saati *</label>
                        <input
                            id="admittedAtLocal"
                            type="datetime-local"
                            class="w-full p-inputtext p-component"
                            formControlName="admittedAtLocal"
                        />
                        @if (form.controls.admittedAtLocal.invalid && form.controls.admittedAtLocal.touched) {
                            <small class="text-red-500">Zorunlu alan.</small>
                        } @else if (apiFieldErrors().admittedAtLocal) {
                            <small class="text-red-500">{{ apiFieldErrors().admittedAtLocal }}</small>
                        }
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="plannedDischargeAtLocal" class="block text-sm font-medium text-muted-color mb-2">Planlı taburcu</label>
                        <input
                            id="plannedDischargeAtLocal"
                            type="datetime-local"
                            class="w-full p-inputtext p-component"
                            formControlName="plannedDischargeAtLocal"
                        />
                        @if (apiFieldErrors().plannedDischargeAtLocal) {
                            <small class="text-red-500">{{ apiFieldErrors().plannedDischargeAtLocal }}</small>
                        }
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="examinationId" class="block text-sm font-medium text-muted-color mb-2">Bağlı muayene</label>
                        <p-select
                            inputId="examinationId"
                            formControlName="examinationId"
                            [options]="examinationOptions()"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Hayvan seçin"
                            [filter]="true"
                            filterBy="label"
                            [showClear]="true"
                            styleClass="w-full"
                            [loading]="loadingExaminations()"
                        />
                        @if (apiFieldErrors().examinationId) {
                            <small class="text-red-500">{{ apiFieldErrors().examinationId }}</small>
                        }
                    </div>
                    <div class="col-span-12">
                        <label for="reason" class="block text-sm font-medium text-muted-color mb-2">Yatış nedeni *</label>
                        <textarea id="reason" rows="3" class="w-full p-inputtext p-component" formControlName="reason"></textarea>
                        @if (form.controls.reason.invalid && form.controls.reason.touched) {
                            <small class="text-red-500">Zorunlu alan.</small>
                        } @else if (apiFieldErrors().reason) {
                            <small class="text-red-500">{{ apiFieldErrors().reason }}</small>
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
                        [disabled]="form.invalid || submitting() || loadingClients()"
                    />
                    <p-button type="button" [label]="copy.buttonCancel" icon="pi pi-times" severity="secondary" (onClick)="goList()" [disabled]="submitting()" />
                </div>
            </form>
        </div>
    `
})
export class HospitalizationNewPageComponent implements OnInit {
    readonly copy = PANEL_COPY;

    private readonly fb = inject(FormBuilder);
    private readonly hospitalizationsService = inject(HospitalizationsService);
    private readonly examinationsService = inject(ExaminationsService);
    private readonly clientsService = inject(ClientsService);
    private readonly petsService = inject(PetsService);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);
    private readonly auth = inject(AuthService);

    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);
    readonly selectionError = signal<string | null>(null);

    readonly loadingClients = signal(false);
    readonly loadingPets = signal(false);
    readonly loadingExaminations = signal(false);
    readonly clientOptions = signal<SelectOption[]>([]);
    readonly petOptions = signal<SelectOption[]>([]);
    readonly examinationOptions = signal<SelectOption[]>([]);
    private relationLoadSeq = 0;
    readonly apiFieldErrors = signal<HospitalizationUpsertFieldErrors>({});

    readonly form = this.fb.nonNullable.group({
        clientId: ['', Validators.required],
        petId: [{ value: '', disabled: true }, Validators.required],
        admittedAtLocal: ['', Validators.required],
        plannedDischargeAtLocal: [''],
        examinationId: [''],
        reason: ['', Validators.required],
        notes: ['']
    });

    readonly activeClinicLabel = signal<string>('Belirlenmedi');

    ngOnInit(): void {
        this.activeClinicLabel.set(this.auth.getClinicName() ?? this.auth.getClinicId() ?? 'Belirlenmedi');
        this.form.controls.examinationId.disable({ emitEvent: false });
        this.loadClients();
        this.form.controls.clientId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            this.form.controls.petId.setValue('');
            this.submitError.set(null);
            this.selectionError.set(null);
            const id = trimClientIdControlValue(this.form.controls.clientId.value);
            if (!id) {
                this.petOptions.set([]);
                this.form.controls.petId.disable({ emitEvent: false });
                this.syncExaminationSelectState();
                return;
            }
            this.form.controls.petId.enable({ emitEvent: false });
            this.loadPetsForClient(id);
        });

        this.form.controls.petId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            const pid = trimClientIdControlValue(this.form.controls.petId.value);
            this.form.patchValue({ examinationId: '' }, { emitEvent: false });
            if (!pid) {
                this.relationLoadSeq += 1;
                this.examinationOptions.set([]);
                this.loadingExaminations.set(false);
                this.syncExaminationSelectState();
                return;
            }
            this.loadExaminationsForPet(pid);
        });
    }

    private syncExaminationSelectState(): void {
        const hasPet =
            !this.form.controls.petId.disabled && !!trimClientIdControlValue(this.form.controls.petId.value);
        if (!hasPet) {
            this.form.controls.examinationId.disable({ emitEvent: false });
        } else {
            this.form.controls.examinationId.enable({ emitEvent: false });
        }
    }

    goList(): void {
        void this.router.navigate(['/panel/hospitalizations']);
    }

    onSubmit(): void {
        this.submitError.set(null);
        this.apiFieldErrors.set({});
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const v = this.form.getRawValue();
        const admittedAtUtc = dateTimeLocalInputToIsoUtc(v.admittedAtLocal);
        if (!admittedAtUtc) {
            this.submitError.set('Geçerli bir yatış tarihi ve saati seçin.');
            return;
        }
        const plannedRaw = v.plannedDischargeAtLocal?.trim();
        const plannedDischargeAtUtc = plannedRaw ? dateTimeLocalInputToIsoUtc(plannedRaw) : null;
        if (plannedRaw && !plannedDischargeAtUtc) {
            this.submitError.set('Planlı taburcu tarihi geçersiz.');
            return;
        }

        const clinicId = this.auth.getClinicId()?.trim() ?? '';
        if (!clinicId) {
            this.submitError.set('Aktif klinik bulunamadı. Lütfen yeniden giriş yapın.');
            return;
        }

        const payload = mapHospitalizationUpsertFormToCreateRequest({
            clinicId,
            petId: v.petId,
            admittedAtUtc,
            plannedDischargeAtUtc,
            reason: v.reason,
            notes: v.notes,
            examinationId: v.examinationId
        });

        this.submitting.set(true);
        this.hospitalizationsService.createHospitalization(payload).subscribe({
            next: ({ id }) => {
                this.submitting.set(false);
                void this.router.navigate(['/panel/hospitalizations', id]);
            },
            error: (e: unknown) => {
                this.submitting.set(false);
                if (e instanceof HttpErrorResponse) {
                    const parsed = parseHospitalizationUpsertHttpError(e);
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

    private loadExaminationsForPet(petId: string): void {
        const seq = ++this.relationLoadSeq;
        const pid = petId.trim();
        this.loadingExaminations.set(true);
        this.selectionError.set(null);
        this.examinationsService.getExaminations({ page: 1, pageSize: 200, petId: pid }).subscribe({
            next: (ex) => {
                if (seq !== this.relationLoadSeq) {
                    return;
                }
                if (trimClientIdControlValue(this.form.controls.petId.value) !== pid) {
                    return;
                }
                this.examinationOptions.set(ex.items.map(prescriptionExaminationSelectOption));
                this.loadingExaminations.set(false);
                this.syncExaminationSelectState();
            },
            error: (e: unknown) => {
                if (seq !== this.relationLoadSeq) {
                    return;
                }
                this.selectionError.set(this.mapLoadError(e, 'Muayene listesi yüklenemedi.'));
                this.examinationOptions.set([]);
                this.loadingExaminations.set(false);
                this.syncExaminationSelectState();
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
                this.syncExaminationSelectState();
            },
            error: (e: unknown) => {
                this.selectionError.set(this.mapLoadError(e, 'Hayvan listesi yüklenemedi.'));
                this.petOptions.set([]);
                this.loadingPets.set(false);
                this.syncExaminationSelectState();
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
