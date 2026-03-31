import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import type { UpdateVaccinationRequest } from '@/app/features/vaccinations/models/vaccination-create.model';
import type { VaccinationEditVm } from '@/app/features/vaccinations/models/vaccination-vm.model';
import { VaccinationsService } from '@/app/features/vaccinations/services/vaccinations.service';
import {
    type VaccinationUpsertFieldErrors,
    type VaccinationUpsertFormFieldKey,
    parseVaccinationUpsertHttpError
} from '@/app/features/vaccinations/utils/vaccination-upsert-validation-parse.utils';
import { VACCINATION_WRITE_STATUS_OPTIONS } from '@/app/features/vaccinations/utils/vaccination-status.utils';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import {
    clientOptionsFromList,
    filterPetsByClientId,
    petOptionsFromList,
    type SelectOption
} from '@/app/shared/forms/client-pet-selection.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { messageFromHttpError, panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { dateOnlyInputToUtcIso, dateTimeLocalInputToIsoUtc } from '@/app/shared/utils/date.utils';
import { AuthService } from '@/app/core/auth/auth.service';

@Component({
    selector: 'app-vaccination-edit-page',
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
        <a routerLink="/panel/vaccinations" class="text-primary font-medium no-underline inline-block mb-4">← Aşı listesine dön</a>

        @if (loading()) {
            <app-loading-state message="Aşı düzenleme bilgileri yükleniyor…" />
        } @else if (loadError()) {
            <div class="card">
                <app-error-state [detail]="loadError()!" (retry)="reload()" />
            </div>
        } @else {
            <app-page-header title="Aşıyı Düzenle" subtitle="Klinik" description="Aşı kaydını güncelleyin." />

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
                            @if (apiFieldErrors().clientId) {
                                <small class="text-red-500">{{ apiFieldErrors().clientId }}</small>
                            } @else if (form.controls.clientId.invalid && form.controls.clientId.touched) {
                                <small class="text-red-500">Müşteri seçimi zorunludur.</small>
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
                            @if (apiFieldErrors().petId) {
                                <small class="text-red-500">{{ apiFieldErrors().petId }}</small>
                            } @else if (form.controls.petId.invalid && form.controls.petId.touched) {
                                <small class="text-red-500">Hayvan seçimi zorunludur.</small>
                            }
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label for="vaccineName" class="block text-sm font-medium text-muted-color mb-2">Aşı adı *</label>
                            <input id="vaccineName" pInputText class="w-full" formControlName="vaccineName" />
                            @if (apiFieldErrors().vaccineName) {
                                <small class="text-red-500">{{ apiFieldErrors().vaccineName }}</small>
                            } @else if (form.controls.vaccineName.invalid && form.controls.vaccineName.touched) {
                                <small class="text-red-500">Aşı adı zorunludur.</small>
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
                        <div class="col-span-12 md:col-span-6">
                            <label for="appliedAtLocal" class="block text-sm font-medium text-muted-color mb-2">Uygulama tarihi / saati</label>
                            <input
                                id="appliedAtLocal"
                                type="datetime-local"
                                class="w-full p-inputtext p-component"
                                formControlName="appliedAtLocal"
                            />
                            @if (apiFieldErrors().appliedAtLocal) {
                                <small class="text-red-500">{{ apiFieldErrors().appliedAtLocal }}</small>
                            } @else if (form.controls.appliedAtLocal.invalid && form.controls.appliedAtLocal.touched) {
                                <small class="text-red-500">Bu durum için uygulama tarihi / saati zorunludur.</small>
                            }
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label for="nextDueDate" class="block text-sm font-medium text-muted-color mb-2">Sonraki tarih</label>
                            <input id="nextDueDate" type="date" class="w-full p-inputtext p-component" formControlName="nextDueDate" />
                            @if (apiFieldErrors().nextDueDate) {
                                <small class="text-red-500">{{ apiFieldErrors().nextDueDate }}</small>
                            } @else if (form.controls.nextDueDate.invalid && form.controls.nextDueDate.touched) {
                                <small class="text-red-500">Bu durum için sonraki tarih zorunludur.</small>
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
                            [disabled]="form.invalid || submitting() || loadingClients() || loadingPets()"
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
export class VaccinationEditPageComponent implements OnInit {
    readonly copy = PANEL_COPY;

    private readonly fb = inject(FormBuilder);
    private readonly vaccinationsService = inject(VaccinationsService);
    private readonly clientsService = inject(ClientsService);
    private readonly petsService = inject(PetsService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly destroyRef = inject(DestroyRef);
    private readonly auth = inject(AuthService);

    readonly loading = signal(true);
    readonly loadError = signal<string | null>(null);
    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);
    readonly selectionError = signal<string | null>(null);
    readonly loadingClients = signal(false);
    readonly loadingPets = signal(false);
    readonly clientOptions = signal<SelectOption[]>([]);
    readonly petOptions = signal<SelectOption[]>([]);
    readonly apiFieldErrors = signal<VaccinationUpsertFieldErrors>({});
    readonly activeClinicLabel = signal<string>('Belirlenmedi');

    private vaccinationId = '';
    private isInitializingClient = false;
    /** GET /vaccinations/:id — dropdown’larda eksik etiketleri tamamlamak için önbellek. */
    private editVmCache: VaccinationEditVm | null = null;

    readonly statusOptions = [...VACCINATION_WRITE_STATUS_OPTIONS];

    readonly form = this.fb.nonNullable.group({
        clientId: ['', Validators.required],
        petId: [{ value: '', disabled: true }, Validators.required],
        vaccineName: ['', Validators.required],
        status: [0 as number | null, Validators.required],
        appliedAtLocal: [''],
        nextDueDate: [''],
        notes: ['']
    });

    constructor() {
        const fields: VaccinationUpsertFormFieldKey[] = [
            'clientId',
            'petId',
            'vaccineName',
            'status',
            'appliedAtLocal',
            'nextDueDate',
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
        this.activeClinicLabel.set(this.auth.getClinicName() ?? this.auth.getClinicId() ?? 'Belirlenmedi');
        const id = this.route.snapshot.paramMap.get('id')?.trim() ?? '';
        if (!id) {
            this.loadError.set('Geçersiz aşı kaydı.');
            this.loading.set(false);
            return;
        }
        this.vaccinationId = id;

        this.updateDateValidators(this.form.controls.status.value);
        this.form.controls.status.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((status) => {
            this.updateDateValidators(status);
        });

        this.form.controls.clientId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((clientId) => {
            const cid = (clientId ?? '').trim();
            this.form.controls.petId.setValue('');
            this.submitError.set(null);
            this.selectionError.set(null);
            if (!cid) {
                this.petOptions.set([]);
                this.form.controls.petId.disable({ emitEvent: false });
                return;
            }
            this.form.controls.petId.enable({ emitEvent: false });
            this.loadPetsForClient(cid);
        });

        this.loadClients();
        this.reload();
    }

    reload(): void {
        this.loading.set(true);
        this.loadError.set(null);
        this.vaccinationsService.getVaccinationForEditById(this.vaccinationId).subscribe({
            next: (x) => {
                this.editVmCache = x;
                this.isInitializingClient = true;
                // clientId patch’i valueChanges tetiklemesin: pet sıfırlanmasın, loadPets tek kez ve petId ile gitsin.
                this.form.patchValue(
                    {
                        clientId: x.clientId,
                        petId: '',
                        vaccineName: x.vaccineName,
                        status: x.status ?? 0,
                        notes: x.notes
                    },
                    { emitEvent: false }
                );
                this.updateDateValidators(String(x.status ?? 0));
                this.form.patchValue(
                    {
                        appliedAtLocal: toDateTimeLocalInput(x.appliedAtUtc),
                        nextDueDate: toDateInput(x.dueAtUtc)
                    },
                    { emitEvent: false }
                );
                this.mergeClientOptionFromCache();
                if (x.clientId) {
                    this.form.controls.petId.enable({ emitEvent: false });
                    this.loadPetsForClient(x.clientId, x.petId);
                } else {
                    this.form.controls.petId.disable({ emitEvent: false });
                    this.isInitializingClient = false;
                }
                this.loading.set(false);
            },
            error: (e: unknown) => {
                this.loadError.set(panelHttpFailureMessage(e, 'Aşı kaydı bilgileri yüklenemedi.'));
                this.loading.set(false);
            }
        });
    }

    onSubmit(): void {
        this.submitError.set(null);
        this.apiFieldErrors.set({});
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        const v = this.form.getRawValue();
        const status = Number(v.status);
        if (!Number.isFinite(status) || ![0, 1, 2].includes(status)) {
            this.submitError.set('Geçerli bir durum seçin.');
            return;
        }
        const needsAppliedAt = status === 1;
        const needsDueAt = status === 0;

        let appliedAtUtc: string | undefined;
        const appliedRaw = v.appliedAtLocal?.trim();
        if (appliedRaw) {
            const iso = dateTimeLocalInputToIsoUtc(appliedRaw);
            if (!iso) {
                this.submitError.set('Geçerli bir uygulama tarihi ve saati seçin.');
                return;
            }
            appliedAtUtc = iso;
        }
        if (needsAppliedAt && !appliedAtUtc) {
            this.submitError.set('Seçilen durum için uygulama tarihi / saati zorunludur.');
            return;
        }

        const clinicId = this.auth.getClinicId()?.trim() ?? '';
        if (!clinicId) {
            this.submitError.set('Aktif klinik bulunamadı. Lütfen yeniden giriş yapın.');
            return;
        }

        let dueAtUtc: string | undefined;
        if (v.nextDueDate?.trim()) {
            const iso = dateOnlyInputToUtcIso(v.nextDueDate.trim());
            if (!iso) {
                this.submitError.set('Geçerli bir sonraki tarih seçin.');
                return;
            }
            dueAtUtc = iso;
        }
        if (needsDueAt && !dueAtUtc) {
            this.submitError.set('Seçilen durum için sonraki tarih zorunludur.');
            return;
        }

        const payload: UpdateVaccinationRequest = {
            id: this.vaccinationId,
            clinicId,
            petId: v.petId.trim(),
            examinationId: this.editVmCache?.examinationId ?? null,
            vaccineName: v.vaccineName.trim(),
            appliedAtUtc: appliedAtUtc ?? null,
            dueAtUtc: dueAtUtc ?? null,
            status,
            notes: v.notes.trim() || null
        };

        this.submitting.set(true);
        this.vaccinationsService.updateVaccination(this.vaccinationId, payload).subscribe({
            next: () => {
                this.submitting.set(false);
                void this.router.navigate(['/panel/vaccinations', this.vaccinationId], { queryParams: { saved: '1' } });
            },
            error: (e: unknown) => {
                this.submitting.set(false);
                if (e instanceof HttpErrorResponse) {
                    const parsed = parseVaccinationUpsertHttpError(e);
                    this.apiFieldErrors.set(parsed.fieldErrors);
                    this.submitError.set(parsed.summaryMessage);
                    return;
                }
                this.submitError.set(e instanceof Error ? e.message : 'Kayıt sırasında hata oluştu.');
            }
        });
    }

    goDetail(): void {
        void this.router.navigate(['/panel/vaccinations', this.vaccinationId]);
    }

    private loadClients(): void {
        this.loadingClients.set(true);
        this.selectionError.set(null);
        this.clientsService.getClients({ page: 1, pageSize: 300 }).subscribe({
            next: (r) => {
                this.clientOptions.set(clientOptionsFromList(r.items));
                this.mergeClientOptionFromCache();
                this.loadingClients.set(false);
            },
            error: (e: unknown) => {
                this.selectionError.set(this.mapLoadError(e, 'Müşteri listesi yüklenemedi.'));
                this.loadingClients.set(false);
            }
        });
    }

    private loadPetsForClient(clientId: string, selectedPetId = ''): void {
        this.loadingPets.set(true);
        this.petsService.getPets({ page: 1, pageSize: 200, clientId }).subscribe({
            next: (r) => {
                let items = r.items;
                const anyClientId = items.some((p) => (p.clientId ?? '').trim());
                if (anyClientId) {
                    items = filterPetsByClientId(items, clientId);
                }
                this.petOptions.set(petOptionsFromList(items));
                this.mergePetOptionFromCache();
                if (selectedPetId) {
                    const exists = items.some((x) => x.id === selectedPetId);
                    const allowFromDetail =
                        !!this.editVmCache?.petName?.trim() &&
                        (this.editVmCache?.petId ?? '').trim() === selectedPetId;
                    this.form.controls.petId.setValue(exists || allowFromDetail ? selectedPetId : '');
                } else if (!this.isInitializingClient) {
                    this.form.controls.petId.setValue('');
                }
                this.loadingPets.set(false);
                this.isInitializingClient = false;
            },
            error: (e: unknown) => {
                this.selectionError.set(this.mapLoadError(e, 'Hayvan listesi yüklenemedi.'));
                this.petOptions.set([]);
                this.loadingPets.set(false);
                this.isInitializingClient = false;
            }
        });
    }

    /** Liste sayfası (ör. 300) dışında kalan müşteri için API’den gelen adı seçenek olarak ekle. */
    private mergeClientOptionFromCache(): void {
        const vm = this.editVmCache;
        const cid = vm?.clientId?.trim();
        const label = vm?.clientName?.trim();
        if (!cid || !label) {
            return;
        }
        const opts = this.clientOptions();
        if (opts.some((o) => o.value === cid)) {
            return;
        }
        this.clientOptions.set([{ value: cid, label }, ...opts]);
    }

    /** Hayvan listesi eşleşmezse detay yanıtındaki adı seçenek olarak ekle. */
    private mergePetOptionFromCache(): void {
        const vm = this.editVmCache;
        const pid = vm?.petId?.trim();
        const label = vm?.petName?.trim();
        if (!pid || !label) {
            return;
        }
        const opts = this.petOptions();
        if (opts.some((o) => o.value === pid)) {
            return;
        }
        this.petOptions.set([{ value: pid, label }, ...opts]);
    }

    private mapLoadError(e: unknown, fallback: string): string {
        if (e instanceof HttpErrorResponse) {
            return messageFromHttpError(e, fallback);
        }
        return e instanceof Error ? e.message : fallback;
    }

    private updateDateValidators(status: unknown): void {
        const s = String(status ?? '').trim();
        const needsAppliedAt = s === '1';
        const needsDueAt = s === '0';

        this.form.controls.appliedAtLocal.setValidators(needsAppliedAt ? [Validators.required] : []);
        this.form.controls.nextDueDate.setValidators(needsDueAt ? [Validators.required] : []);

        this.form.controls.appliedAtLocal.updateValueAndValidity({ emitEvent: false });
        this.form.controls.nextDueDate.updateValueAndValidity({ emitEvent: false });
    }
}

function toDateTimeLocalInput(isoUtc: string | null): string {
    if (!isoUtc?.trim()) {
        return '';
    }
    const d = new Date(isoUtc);
    if (Number.isNaN(d.getTime())) {
        return '';
    }
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day}T${hh}:${mm}`;
}

function toDateInput(isoUtc: string | null): string {
    if (!isoUtc?.trim()) {
        return '';
    }
    const d = new Date(isoUtc);
    if (Number.isNaN(d.getTime())) {
        return '';
    }
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
