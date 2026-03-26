import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import type { CreateExaminationRequest } from '@/app/features/examinations/models/examination-create.model';
import { ExaminationsService } from '@/app/features/examinations/services/examinations.service';
import {
    type ExaminationUpsertFieldErrors,
    type ExaminationUpsertFormFieldKey,
    parseExaminationUpsertHttpError
} from '@/app/features/examinations/utils/examination-upsert-validation-parse.utils';
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
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';
import { dateTimeLocalInputToIsoUtc } from '@/app/shared/utils/date.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { AuthService } from '@/app/core/auth/auth.service';

@Component({
    selector: 'app-examination-edit-page',
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
        <a routerLink="/panel/examinations" class="text-primary font-medium no-underline inline-block mb-4">← Muayene listesine dön</a>

        @if (loading()) {
            <app-loading-state message="Muayene düzenleme bilgileri yükleniyor…" />
        } @else if (loadError()) {
            <div class="card">
                <app-error-state [detail]="loadError()!" (retry)="reload()" />
            </div>
        } @else {
            <app-page-header title="Muayeneyi Düzenle" subtitle="Klinik" description="Muayene kaydını güncelleyin." />

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
                            <label for="examinationDateLocal" class="block text-sm font-medium text-muted-color mb-2">Muayene tarihi / saati *</label>
                            <input
                                id="examinationDateLocal"
                                type="datetime-local"
                                class="w-full p-inputtext p-component"
                                formControlName="examinationDateLocal"
                            />
                            @if (apiFieldErrors().examinationDateLocal) {
                                <small class="text-red-500">{{ apiFieldErrors().examinationDateLocal }}</small>
                            } @else if (form.controls.examinationDateLocal.invalid && form.controls.examinationDateLocal.touched) {
                                <small class="text-red-500">Muayene tarihi zorunludur.</small>
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
                            <label for="visitReason" class="block text-sm font-medium text-muted-color mb-2">Ziyaret sebebi *</label>
                            <textarea id="visitReason" rows="3" class="w-full p-inputtext p-component" formControlName="visitReason"></textarea>
                            @if (apiFieldErrors().visitReason) {
                                <small class="text-red-500">{{ apiFieldErrors().visitReason }}</small>
                            } @else if (form.controls.visitReason.invalid && form.controls.visitReason.touched) {
                                <small class="text-red-500">Ziyaret sebebi zorunludur.</small>
                            }
                        </div>
                        <div class="col-span-12">
                            <label for="notes" class="block text-sm font-medium text-muted-color mb-2">Notlar</label>
                            <textarea id="notes" rows="3" class="w-full p-inputtext p-component" formControlName="notes"></textarea>
                            @if (apiFieldErrors().notes) {
                                <small class="text-red-500">{{ apiFieldErrors().notes }}</small>
                            }
                        </div>
                        <div class="col-span-12">
                            <label for="findings" class="block text-sm font-medium text-muted-color mb-2">Bulgular *</label>
                            <textarea id="findings" rows="3" class="w-full p-inputtext p-component" formControlName="findings"></textarea>
                            @if (apiFieldErrors().findings) {
                                <small class="text-red-500">{{ apiFieldErrors().findings }}</small>
                            } @else if (form.controls.findings.invalid && form.controls.findings.touched) {
                                <small class="text-red-500">Bulgular zorunludur.</small>
                            }
                        </div>
                        <div class="col-span-12">
                            <label for="assessment" class="block text-sm font-medium text-muted-color mb-2">Değerlendirme</label>
                            <textarea id="assessment" rows="3" class="w-full p-inputtext p-component" formControlName="assessment"></textarea>
                            @if (apiFieldErrors().assessment) {
                                <small class="text-red-500">{{ apiFieldErrors().assessment }}</small>
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
export class ExaminationEditPageComponent implements OnInit {
    readonly copy = PANEL_COPY;

    private readonly fb = inject(FormBuilder);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly examinationsService = inject(ExaminationsService);
    private readonly clientsService = inject(ClientsService);
    private readonly petsService = inject(PetsService);
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
    readonly apiFieldErrors = signal<ExaminationUpsertFieldErrors>({});
    readonly activeClinicLabel = signal<string>('Belirlenmedi');

    private examinationId = '';
    private isInitializingClient = false;

    readonly statusOptions = [
        { label: 'Taslak', value: 'draft' },
        { label: 'Bekliyor', value: 'pending' },
        { label: 'Devam ediyor', value: 'in_progress' },
        { label: 'Tamamlandı', value: 'completed' },
        { label: 'İptal', value: 'cancelled' }
    ];

    readonly form = this.fb.nonNullable.group({
        clientId: ['', Validators.required],
        petId: [{ value: '', disabled: true }, Validators.required],
        examinationDateLocal: ['', Validators.required],
        status: ['draft', Validators.required],
        visitReason: ['', Validators.required],
        notes: [''],
        findings: ['', Validators.required],
        assessment: ['']
    });

    constructor() {
        const fields: ExaminationUpsertFormFieldKey[] = [
            'clientId',
            'petId',
            'examinationDateLocal',
            'status',
            'visitReason',
            'notes',
            'findings',
            'assessment'
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
        this.activeClinicLabel.set(this.auth.getClinicName() ?? this.auth.getClinicId() ?? 'Belirlenmedi');
        const id = this.route.snapshot.paramMap.get('id')?.trim() ?? '';
        if (!id) {
            this.loadError.set('Geçersiz muayene.');
            this.loading.set(false);
            return;
        }
        this.examinationId = id;

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
        this.examinationsService.getExaminationForEditById(this.examinationId).subscribe({
            next: (x) => {
                this.isInitializingClient = true;
                this.form.patchValue({
                    clientId: x.clientId,
                    petId: '',
                    examinationDateLocal: toDateTimeLocalInput(x.examinationDateUtc),
                    status: x.status,
                    visitReason: x.complaint,
                    notes: x.notes,
                    findings: x.findings,
                    assessment: x.diagnosis
                });
                if (x.clientId) {
                    this.form.controls.petId.enable({ emitEvent: false });
                    this.loadPetsForClient(x.clientId, x.petId);
                } else {
                    this.form.controls.petId.disable({ emitEvent: false });
                    this.isInitializingClient = false;
                }
                this.loading.set(false);
            },
            error: (e: Error) => {
                this.loadError.set(e.message ?? 'Yükleme hatası');
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
        const examinedAtUtc = dateTimeLocalInputToIsoUtc(v.examinationDateLocal);
        if (!examinedAtUtc) {
            this.submitError.set('Geçerli bir muayene tarihi ve saati seçin.');
            return;
        }
        const clinicId = this.auth.getClinicId()?.trim() ?? '';
        if (!clinicId) {
            this.submitError.set('Aktif klinik bulunamadı. Lütfen yeniden giriş yapın.');
            return;
        }

        const payload: CreateExaminationRequest = {
            clinicId,
            petId: v.petId.trim() || undefined,
            examinedAtUtc,
            visitReason: v.visitReason.trim(),
            findings: v.findings.trim(),
            assessment: v.assessment.trim() || null,
            notes: v.notes.trim() || null
        };

        this.submitting.set(true);
        this.examinationsService.updateExamination(this.examinationId, payload).subscribe({
            next: () => {
                this.submitting.set(false);
                void this.router.navigate(['/panel/examinations', this.examinationId], { queryParams: { saved: '1' } });
            },
            error: (e: unknown) => {
                this.submitting.set(false);
                if (e instanceof HttpErrorResponse) {
                    const parsed = parseExaminationUpsertHttpError(e);
                    this.apiFieldErrors.set(parsed.fieldErrors);
                    this.submitError.set(parsed.summaryMessage);
                    return;
                }
                this.submitError.set(e instanceof Error ? e.message : 'Kayıt sırasında hata oluştu.');
            }
        });
    }

    goDetail(): void {
        void this.router.navigate(['/panel/examinations', this.examinationId]);
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
                if (selectedPetId) {
                    const exists = items.some((x) => x.id === selectedPetId);
                    this.form.controls.petId.setValue(exists ? selectedPetId : '');
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

    private mapLoadError(e: unknown, fallback: string): string {
        if (e instanceof HttpErrorResponse) {
            return messageFromHttpError(e, fallback);
        }
        return e instanceof Error ? e.message : fallback;
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
