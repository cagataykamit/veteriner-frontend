import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { forkJoin, firstValueFrom } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import type { ExaminationListItemVm } from '@/app/features/examinations/models/examination-vm.model';
import { ExaminationsService } from '@/app/features/examinations/services/examinations.service';
import {
    followUpBeforePrescribedMessage,
    mapPrescriptionUpsertFormToCreateRequest
} from '@/app/features/prescriptions/data/prescription.mapper';
import type { PrescriptionEditVm } from '@/app/features/prescriptions/models/prescription-vm.model';
import { PrescriptionsService } from '@/app/features/prescriptions/services/prescriptions.service';
import {
    type PrescriptionUpsertFieldErrors,
    type PrescriptionUpsertFormFieldKey,
    parsePrescriptionUpsertHttpError
} from '@/app/features/prescriptions/utils/prescription-upsert-validation-parse.utils';
import {
    examinationListItemFromDetail,
    filterTreatmentsByExamination,
    prescriptionExaminationSelectOption,
    prescriptionTreatmentSelectOption,
    treatmentListItemFromDetail
} from '@/app/features/prescriptions/utils/prescription-relation-select.utils';
import { PetsService } from '@/app/features/pets/services/pets.service';
import type { TreatmentListItemVm } from '@/app/features/treatments/models/treatment-vm.model';
import { TreatmentsService } from '@/app/features/treatments/services/treatments.service';
import {
    clientOptionsFromList,
    filterPetsByClientId,
    isStalePetListResponse,
    petOptionsFromList,
    trimClientIdControlValue,
    type SelectOption
} from '@/app/shared/forms/client-pet-selection.utils';
import { QuickClientDialogComponent } from '@/app/shared/forms/quick-create/quick-client-dialog.component';
import { QuickPetDialogComponent } from '@/app/shared/forms/quick-create/quick-pet-dialog.component';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { messageFromHttpError, panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { dateOnlyInputToUtcIso, dateTimeLocalInputToIsoUtc } from '@/app/shared/utils/date.utils';

@Component({
    selector: 'app-prescription-edit-page',
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
        AppErrorStateComponent,
        QuickClientDialogComponent,
        QuickPetDialogComponent
    ],
    template: `
        <a routerLink="/panel/prescriptions" class="text-primary font-medium no-underline inline-block mb-4">← Reçete listesine dön</a>

        @if (loading()) {
            <app-loading-state message="Reçete düzenleme bilgileri yükleniyor…" />
        } @else if (loadError()) {
            <div class="card">
                <app-error-state [detail]="loadError()!" (retry)="reload()" />
            </div>
        } @else {
            <app-page-header title="Reçeteyi Düzenle" subtitle="Klinik" description="Reçete kaydını güncelleyin." />

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
                            <div class="flex flex-wrap gap-2 align-items-center mt-2">
                                <p-button
                                    type="button"
                                    label="Yeni müşteri"
                                    icon="pi pi-user-plus"
                                    [text]="true"
                                    styleClass="p-0"
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
                                <small class="text-red-500">Hayvan seçimi zorunludur.</small>
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
                            <label for="prescribedAtLocal" class="block text-sm font-medium text-muted-color mb-2">Reçete tarihi / saati *</label>
                            <input
                                id="prescribedAtLocal"
                                type="datetime-local"
                                class="w-full p-inputtext p-component"
                                formControlName="prescribedAtLocal"
                            />
                            @if (apiFieldErrors().prescribedAtLocal) {
                                <small class="text-red-500">{{ apiFieldErrors().prescribedAtLocal }}</small>
                            } @else if (form.controls.prescribedAtLocal.invalid && form.controls.prescribedAtLocal.touched) {
                                <small class="text-red-500">Reçete tarihi zorunludur.</small>
                            }
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label for="followUpDate" class="block text-sm font-medium text-muted-color mb-2">Takip tarihi</label>
                            <input id="followUpDate" type="date" class="w-full p-inputtext p-component" formControlName="followUpDate" />
                            @if (apiFieldErrors().followUpDate) {
                                <small class="text-red-500">{{ apiFieldErrors().followUpDate }}</small>
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
                                [disabled]="relationSelectsDisabled()"
                            />
                            @if (apiFieldErrors().examinationId) {
                                <small class="text-red-500">{{ apiFieldErrors().examinationId }}</small>
                            }
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label for="treatmentId" class="block text-sm font-medium text-muted-color mb-2">Bağlı tedavi</label>
                            <p-select
                                inputId="treatmentId"
                                formControlName="treatmentId"
                                [options]="treatmentOptions()"
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Hayvan seçin"
                                [filter]="true"
                                filterBy="label"
                                [showClear]="true"
                                styleClass="w-full"
                                [loading]="loadingTreatments()"
                                [disabled]="relationSelectsDisabled()"
                            />
                            @if (apiFieldErrors().treatmentId) {
                                <small class="text-red-500">{{ apiFieldErrors().treatmentId }}</small>
                            }
                        </div>
                        <div class="col-span-12">
                            <label for="title" class="block text-sm font-medium text-muted-color mb-2">Başlık *</label>
                            <input id="title" type="text" class="w-full p-inputtext p-component" formControlName="title" />
                            @if (apiFieldErrors().title) {
                                <small class="text-red-500">{{ apiFieldErrors().title }}</small>
                            } @else if (form.controls.title.invalid && form.controls.title.touched) {
                                <small class="text-red-500">Başlık zorunludur.</small>
                            }
                        </div>
                        <div class="col-span-12">
                            <label for="content" class="block text-sm font-medium text-muted-color mb-2">İçerik *</label>
                            <textarea id="content" rows="4" class="w-full p-inputtext p-component" formControlName="content"></textarea>
                            @if (apiFieldErrors().content) {
                                <small class="text-red-500">{{ apiFieldErrors().content }}</small>
                            } @else if (form.controls.content.invalid && form.controls.content.touched) {
                                <small class="text-red-500">İçerik zorunludur.</small>
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

            <app-quick-client-dialog [(visible)]="quickClientOpen" (clientCreated)="onQuickClientCreated($event)" />
            <app-quick-pet-dialog
                [(visible)]="quickPetOpen"
                [ownerClientId]="quickPetOwnerClientId()"
                (petCreated)="onQuickPetCreated($event)"
            />
        }
    `
})
export class PrescriptionEditPageComponent implements OnInit {
    readonly copy = PANEL_COPY;

    private readonly fb = inject(FormBuilder);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly prescriptionsService = inject(PrescriptionsService);
    private readonly clientsService = inject(ClientsService);
    private readonly petsService = inject(PetsService);
    private readonly examinationsService = inject(ExaminationsService);
    private readonly treatmentsService = inject(TreatmentsService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly auth = inject(AuthService);

    readonly loading = signal(true);
    readonly loadError = signal<string | null>(null);
    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);
    readonly selectionError = signal<string | null>(null);
    readonly loadingClients = signal(false);
    readonly loadingPets = signal(false);
    readonly loadingExaminations = signal(false);
    readonly loadingTreatments = signal(false);
    readonly clientOptions = signal<SelectOption[]>([]);
    readonly petOptions = signal<SelectOption[]>([]);
    readonly examinationOptions = signal<SelectOption[]>([]);
    readonly treatmentOptions = signal<SelectOption[]>([]);
    readonly apiFieldErrors = signal<PrescriptionUpsertFieldErrors>({});
    readonly activeClinicLabel = signal<string>('Belirlenmedi');

    readonly quickClientOpen = signal(false);
    readonly quickPetOpen = signal(false);

    private prescriptionId = '';
    private isInitializingClient = false;
    private editVmCache: PrescriptionEditVm | null = null;
    private initialRelationHydratePending = false;
    private allExaminationsForPet: ExaminationListItemVm[] = [];
    private allTreatmentsForPet: TreatmentListItemVm[] = [];
    private relationLoadSeq = 0;

    readonly form = this.fb.nonNullable.group({
        clientId: ['', Validators.required],
        petId: [{ value: '', disabled: true }, Validators.required],
        prescribedAtLocal: ['', Validators.required],
        followUpDate: [''],
        examinationId: [''],
        treatmentId: [''],
        title: ['', Validators.required],
        content: ['', Validators.required],
        notes: ['']
    });

    constructor() {
        const fields: PrescriptionUpsertFormFieldKey[] = [
            'clientId',
            'petId',
            'prescribedAtLocal',
            'followUpDate',
            'examinationId',
            'treatmentId',
            'title',
            'content',
            'notes'
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
            this.loadError.set('Geçersiz reçete.');
            this.loading.set(false);
            return;
        }
        this.prescriptionId = id;

        this.form.controls.clientId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((clientId) => {
            this.form.controls.petId.setValue('');
            this.submitError.set(null);
            this.selectionError.set(null);
            if (clientId === null || clientId === undefined) {
                this.form.controls.clientId.setValue('', { emitEvent: false });
            }
            const cid = trimClientIdControlValue(this.form.controls.clientId.value);
            if (!cid) {
                this.petOptions.set([]);
                this.form.controls.petId.disable({ emitEvent: false });
                return;
            }
            this.form.controls.petId.enable({ emitEvent: false });
            this.loadPetsForClient(cid);
        });

        this.form.controls.petId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            const pid = trimClientIdControlValue(this.form.controls.petId.value);
            if (!pid) {
                this.relationLoadSeq += 1;
                this.form.patchValue({ examinationId: '', treatmentId: '' }, { emitEvent: false });
                this.allExaminationsForPet = [];
                this.allTreatmentsForPet = [];
                this.examinationOptions.set([]);
                this.treatmentOptions.set([]);
                this.loadingExaminations.set(false);
                this.loadingTreatments.set(false);
                return;
            }
            if (this.initialRelationHydratePending) {
                this.initialRelationHydratePending = false;
                const vm = this.editVmCache;
                if (vm) {
                    void this.loadRelationsForPetHydrate(pid, vm);
                }
                return;
            }
            this.form.patchValue({ examinationId: '', treatmentId: '' }, { emitEvent: false });
            this.loadRelationsForPetFresh(pid);
        });

        this.form.controls.examinationId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            this.applyTreatmentFilter();
        });

        this.form.controls.treatmentId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((tid) => {
            const id = String(tid ?? '').trim();
            if (!id) {
                return;
            }
            const t = this.allTreatmentsForPet.find((x) => x.id === id);
            const ex = t?.examinationId?.trim();
            if (ex && this.form.controls.examinationId.value?.trim() !== ex) {
                this.form.controls.examinationId.setValue(ex, { emitEvent: true });
            }
        });

        this.loadClients();
        this.reload();
    }

    relationSelectsDisabled(): boolean {
        return this.form.controls.petId.disabled || !trimClientIdControlValue(this.form.controls.petId.value);
    }

    reload(): void {
        this.loading.set(true);
        this.loadError.set(null);
        this.prescriptionsService.getPrescriptionForEditById(this.prescriptionId).subscribe({
            next: (x) => {
                this.editVmCache = x;
                this.isInitializingClient = true;
                this.form.patchValue(
                    {
                        clientId: x.clientId,
                        petId: '',
                        prescribedAtLocal: toDateTimeLocalInput(x.prescribedAtUtc),
                        followUpDate: x.followUpDateInput ?? '',
                        title: x.title,
                        content: x.content,
                        notes: x.notes
                    },
                    { emitEvent: false }
                );
                this.mergeClientOptionFromCache();
                if (x.clientId) {
                    this.form.controls.petId.enable({ emitEvent: false });
                    this.initialRelationHydratePending = true;
                    this.loadPetsForClient(x.clientId, x.petId);
                } else {
                    this.form.controls.petId.disable({ emitEvent: false });
                    this.isInitializingClient = false;
                }
                this.loading.set(false);
            },
            error: (e: unknown) => {
                this.loadError.set(panelHttpFailureMessage(e, 'Reçete bilgileri yüklenemedi.'));
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
        const prescribedAtUtc = dateTimeLocalInputToIsoUtc(v.prescribedAtLocal);
        if (!prescribedAtUtc) {
            this.submitError.set('Geçerli bir reçete tarihi ve saati seçin.');
            return;
        }
        const followUpDateUtc = v.followUpDate?.trim() ? dateOnlyInputToUtcIso(v.followUpDate.trim()) : null;
        if (v.followUpDate?.trim() && !followUpDateUtc) {
            this.submitError.set('Takip tarihi geçersiz.');
            return;
        }
        const orderMsg = followUpBeforePrescribedMessage(prescribedAtUtc, followUpDateUtc);
        if (orderMsg) {
            this.submitError.set(orderMsg);
            return;
        }

        const clinicId = this.auth.getClinicId()?.trim() ?? '';
        if (!clinicId) {
            this.submitError.set('Aktif klinik bulunamadı. Lütfen yeniden giriş yapın.');
            return;
        }

        const payload = mapPrescriptionUpsertFormToCreateRequest({
            clinicId,
            petId: v.petId,
            examinationId: v.examinationId,
            treatmentId: v.treatmentId,
            prescribedAtUtc,
            title: v.title,
            content: v.content,
            notes: v.notes,
            followUpDateUtc
        });

        this.submitting.set(true);
        this.prescriptionsService.updatePrescription(this.prescriptionId, payload).subscribe({
            next: () => {
                this.submitting.set(false);
                void this.router.navigate(['/panel/prescriptions', this.prescriptionId], { queryParams: { saved: '1' } });
            },
            error: (e: unknown) => {
                this.submitting.set(false);
                if (e instanceof HttpErrorResponse) {
                    const parsed = parsePrescriptionUpsertHttpError(e);
                    this.apiFieldErrors.set(parsed.fieldErrors);
                    this.submitError.set(parsed.summaryMessage);
                    return;
                }
                this.submitError.set(e instanceof Error ? e.message : 'Kayıt sırasında hata oluştu.');
            }
        });
    }

    goDetail(): void {
        void this.router.navigate(['/panel/prescriptions', this.prescriptionId]);
    }

    petQuickAddDisabled(): boolean {
        return !trimClientIdControlValue(this.form.getRawValue().clientId) || this.form.controls.petId.disabled;
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

    private reloadClientsAndSelectClient(clientId: string): void {
        this.loadingClients.set(true);
        this.selectionError.set(null);
        this.clientsService.getClients({ page: 1, pageSize: 300 }).subscribe({
            next: (r) => {
                this.clientOptions.set(clientOptionsFromList(r.items));
                this.mergeClientOptionFromCache();
                this.loadingClients.set(false);
                this.form.controls.clientId.setValue(clientId, { emitEvent: true });
            },
            error: (e: unknown) => {
                this.selectionError.set(this.mapLoadError(e, 'Müşteri listesi yüklenemedi.'));
                this.loadingClients.set(false);
            }
        });
    }

    private loadPetsForClient(clientId: string, selectedPetId = ''): void {
        const cid = clientId.trim();
        this.loadingPets.set(true);
        this.petsService.getPets({ page: 1, pageSize: 200, clientId: cid }).subscribe({
            next: (r) => {
                if (isStalePetListResponse(this.form.controls.clientId.value, cid)) {
                    return;
                }
                let items = r.items;
                const anyClientId = items.some((p) => (p.clientId ?? '').trim());
                if (anyClientId) {
                    items = filterPetsByClientId(items, cid);
                }
                this.petOptions.set(petOptionsFromList(items));
                this.mergePetOptionFromCache(cid);
                const vmClient = this.editVmCache?.clientId?.trim() ?? '';
                if (selectedPetId) {
                    const exists = items.some((x) => x.id === selectedPetId);
                    const allowFromDetail =
                        cid === vmClient &&
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

    private loadRelationsForPetFresh(petId: string): void {
        const seq = ++this.relationLoadSeq;
        const pid = petId.trim();
        this.loadingExaminations.set(true);
        this.loadingTreatments.set(true);
        this.selectionError.set(null);
        forkJoin({
            ex: this.examinationsService.getExaminations({ page: 1, pageSize: 200, petId: pid }),
            tr: this.treatmentsService.getTreatments({ page: 1, pageSize: 200, petId: pid })
        }).subscribe({
            next: ({ ex, tr }) => {
                if (seq !== this.relationLoadSeq || trimClientIdControlValue(this.form.controls.petId.value) !== pid) {
                    return;
                }
                this.allExaminationsForPet = ex.items;
                this.examinationOptions.set(ex.items.map(prescriptionExaminationSelectOption));
                this.allTreatmentsForPet = tr.items;
                this.applyTreatmentFilter();
                this.loadingExaminations.set(false);
                this.loadingTreatments.set(false);
            },
            error: (e: unknown) => {
                if (seq !== this.relationLoadSeq) {
                    return;
                }
                this.selectionError.set(this.mapLoadError(e, 'Muayene veya tedavi listesi yüklenemedi.'));
                this.allExaminationsForPet = [];
                this.allTreatmentsForPet = [];
                this.examinationOptions.set([]);
                this.treatmentOptions.set([]);
                this.loadingExaminations.set(false);
                this.loadingTreatments.set(false);
            }
        });
    }

    private async loadRelationsForPetHydrate(petId: string, vm: PrescriptionEditVm): Promise<void> {
        const seq = ++this.relationLoadSeq;
        const pid = petId.trim();
        this.loadingExaminations.set(true);
        this.loadingTreatments.set(true);
        this.selectionError.set(null);
        try {
            const { ex, tr } = await firstValueFrom(
                forkJoin({
                    ex: this.examinationsService.getExaminations({ page: 1, pageSize: 200, petId: pid }),
                    tr: this.treatmentsService.getTreatments({ page: 1, pageSize: 200, petId: pid })
                })
            );
            if (seq !== this.relationLoadSeq || trimClientIdControlValue(this.form.controls.petId.value) !== pid) {
                return;
            }
            let exams = [...ex.items];
            let treats = [...tr.items];
            const exW = vm.examinationId?.trim() ?? '';
            const trW = vm.treatmentId?.trim() ?? '';
            if (exW && !exams.some((e) => e.id === exW)) {
                try {
                    const d = await firstValueFrom(this.examinationsService.getExaminationById(exW));
                    exams = [examinationListItemFromDetail(d), ...exams];
                } catch {
                    /* liste dışı muayene yüklenemezse atlanır */
                }
            }
            if (trW && !treats.some((t) => t.id === trW)) {
                try {
                    const d = await firstValueFrom(this.treatmentsService.getTreatmentById(trW));
                    treats = [treatmentListItemFromDetail(d), ...treats];
                } catch {
                    /* liste dışı tedavi yüklenemezse atlanır */
                }
            }
            if (seq !== this.relationLoadSeq || trimClientIdControlValue(this.form.controls.petId.value) !== pid) {
                return;
            }
            this.allExaminationsForPet = exams;
            this.examinationOptions.set(exams.map(prescriptionExaminationSelectOption));
            this.allTreatmentsForPet = treats;
            let examToSet = exW;
            if (trW) {
                const t = treats.find((x) => x.id === trW);
                if (t?.examinationId?.trim()) {
                    examToSet = t.examinationId.trim();
                }
            }
            this.form.patchValue({ examinationId: examToSet, treatmentId: '' }, { emitEvent: false });
            this.applyTreatmentFilter();
            const trOk =
                !!trW &&
                treats.some((t) => {
                    if (t.id !== trW) {
                        return false;
                    }
                    if (!examToSet) {
                        return true;
                    }
                    return (t.examinationId?.trim() ?? '') === examToSet;
                });
            if (trOk) {
                this.form.controls.treatmentId.setValue(trW, { emitEvent: false });
            }
        } catch (e: unknown) {
            if (seq !== this.relationLoadSeq) {
                return;
            }
            this.selectionError.set(this.mapLoadError(e, 'Muayene veya tedavi listesi yüklenemedi.'));
            this.allExaminationsForPet = [];
            this.allTreatmentsForPet = [];
            this.examinationOptions.set([]);
            this.treatmentOptions.set([]);
        } finally {
            if (seq === this.relationLoadSeq) {
                this.loadingExaminations.set(false);
                this.loadingTreatments.set(false);
            }
        }
    }

    private applyTreatmentFilter(): void {
        const examId = this.form.controls.examinationId.value?.trim() ?? '';
        const filtered = filterTreatmentsByExamination(this.allTreatmentsForPet, examId || null);
        this.treatmentOptions.set(filtered.map(prescriptionTreatmentSelectOption));
        const cur = this.form.controls.treatmentId.value?.trim() ?? '';
        if (cur && !filtered.some((t) => t.id === cur)) {
            this.form.controls.treatmentId.setValue('', { emitEvent: false });
        }
    }

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

    private mergePetOptionFromCache(forRequestClientId: string): void {
        const vm = this.editVmCache;
        const vmClient = vm?.clientId?.trim();
        if (!vmClient || forRequestClientId.trim() !== vmClient) {
            return;
        }
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
