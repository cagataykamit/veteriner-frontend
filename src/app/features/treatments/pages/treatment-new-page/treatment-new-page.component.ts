import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { AuthService } from '@/app/core/auth/auth.service';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import { ExaminationsService } from '@/app/features/examinations/services/examinations.service';
import {
    examinationListItemFromDetail,
    prescriptionExaminationSelectOption
} from '@/app/features/prescriptions/utils/prescription-relation-select.utils';
import {
    followUpBeforeTreatmentMessage,
    mapTreatmentUpsertFormToCreateRequest
} from '@/app/features/treatments/data/treatment.mapper';
import { TreatmentsService } from '@/app/features/treatments/services/treatments.service';
import {
    type TreatmentUpsertFieldErrors,
    parseTreatmentUpsertHttpError
} from '@/app/features/treatments/utils/treatment-upsert-validation-parse.utils';
import { PetsService } from '@/app/features/pets/services/pets.service';
import {
    clientOptionsFromList,
    filterPetsByClientId,
    petOptionsFromList,
    trimClientIdControlValue,
    type SelectOption
} from '@/app/shared/forms/client-pet-selection.utils';
import { QuickClientDialogComponent } from '@/app/shared/forms/quick-create/quick-client-dialog.component';
import { QuickPetDialogComponent } from '@/app/shared/forms/quick-create/quick-pet-dialog.component';
import { parseExaminationCreateRouteContext } from '@/app/shared/panel/examination-create-route-context.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { dateOnlyInputToUtcIso, dateTimeLocalInputToIsoUtc } from '@/app/shared/utils/date.utils';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';

@Component({
    selector: 'app-treatment-new-page',
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
        <a routerLink="/panel/treatments" class="text-primary font-medium no-underline inline-block mb-4">← Tedavi listesine dön</a>

        <app-page-header title="Yeni Tedavi" subtitle="Klinik" description="Tedavi kaydı oluşturun." />

        <div class="card">
            @if (ro.mutationBlocked()) {
                <p class="text-amber-700 dark:text-amber-300 text-sm mt-0 mb-4" role="status">
                    İşletme salt okunur moddadır; kayıt oluşturulamaz.
                </p>
            }
            @if (selectionError()) {
                <p class="text-red-500 mt-0 mb-4" role="alert">{{ selectionError() }}</p>
            }
            <p class="text-sm text-muted-color mt-0 mb-4">Aktif Klinik: {{ activeClinicLabel() }}</p>
            @if (contextFromExamination()) {
                <p class="text-sm text-muted-color mt-0 mb-4">
                    Bu muayene kaydından bağlam taşındı; müşteri, hayvan ve bağlı muayene alanları kilitlidir.
                </p>
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
                        } @else if (apiFieldErrors().clientId) {
                            <small class="text-red-500">{{ apiFieldErrors().clientId }}</small>
                        }
                        @if (!contextFromExamination()) {
                            <div class="flex flex-wrap gap-2 align-items-center mt-2">
                                <p-button
                                    type="button"
                                    label="Yeni müşteri"
                                    icon="pi pi-user-plus"
                                    [disabled]="ro.mutationBlocked()"
                                    [text]="true"
                                    styleClass="p-0"
                                    (onClick)="quickClientOpen.set(true)"
                                />
                            </div>
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
                        @if (!contextFromExamination()) {
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
                        }
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="treatmentDateLocal" class="block text-sm font-medium text-muted-color mb-2">Tedavi tarihi / saati *</label>
                        <input
                            id="treatmentDateLocal"
                            type="datetime-local"
                            class="w-full p-inputtext p-component"
                            formControlName="treatmentDateLocal"
                        />
                        @if (form.controls.treatmentDateLocal.invalid && form.controls.treatmentDateLocal.touched) {
                            <small class="text-red-500">Zorunlu alan.</small>
                        } @else if (apiFieldErrors().treatmentDateLocal) {
                            <small class="text-red-500">{{ apiFieldErrors().treatmentDateLocal }}</small>
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
                        <label for="title" class="block text-sm font-medium text-muted-color mb-2">Başlık *</label>
                        <input id="title" type="text" class="w-full p-inputtext p-component" formControlName="title" />
                        @if (form.controls.title.invalid && form.controls.title.touched) {
                            <small class="text-red-500">Zorunlu alan.</small>
                        } @else if (apiFieldErrors().title) {
                            <small class="text-red-500">{{ apiFieldErrors().title }}</small>
                        }
                    </div>
                    <div class="col-span-12">
                        <label for="description" class="block text-sm font-medium text-muted-color mb-2">Açıklama *</label>
                        <textarea id="description" rows="4" class="w-full p-inputtext p-component" formControlName="description"></textarea>
                        @if (form.controls.description.invalid && form.controls.description.touched) {
                            <small class="text-red-500">Zorunlu alan.</small>
                        } @else if (apiFieldErrors().description) {
                            <small class="text-red-500">{{ apiFieldErrors().description }}</small>
                        }
                    </div>
                    <div class="col-span-12">
                        <label for="notes" class="block text-sm font-medium text-muted-color mb-2">Notlar</label>
                        <textarea id="notes" rows="3" class="w-full p-inputtext p-component" formControlName="notes"></textarea>
                        @if (apiFieldErrors().notes) {
                            <small class="text-red-500">{{ apiFieldErrors().notes }}</small>
                        }
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="followUpDate" class="block text-sm font-medium text-muted-color mb-2">Takip tarihi</label>
                        <input id="followUpDate" type="date" class="w-full p-inputtext p-component" formControlName="followUpDate" />
                        @if (apiFieldErrors().followUpDate) {
                            <small class="text-red-500">{{ apiFieldErrors().followUpDate }}</small>
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
                        [disabled]="form.invalid || submitting() || loadingClients() || applyingRouteContext() || ro.mutationBlocked()"
                    />
                    <p-button type="button" [label]="copy.buttonCancel" icon="pi pi-times" severity="secondary" (onClick)="goList()" [disabled]="submitting()" />
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
export class TreatmentNewPageComponent implements OnInit {
    readonly copy = PANEL_COPY;

    private readonly fb = inject(FormBuilder);
    private readonly treatmentsService = inject(TreatmentsService);
    private readonly examinationsService = inject(ExaminationsService);
    private readonly clientsService = inject(ClientsService);
    private readonly petsService = inject(PetsService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly destroyRef = inject(DestroyRef);
    private readonly auth = inject(AuthService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly contextFromExamination = signal(false);
    readonly applyingRouteContext = signal(false);

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
    readonly apiFieldErrors = signal<TreatmentUpsertFieldErrors>({});

    readonly form = this.fb.nonNullable.group({
        clientId: ['', Validators.required],
        petId: [{ value: '', disabled: true }, Validators.required],
        treatmentDateLocal: ['', Validators.required],
        examinationId: [''],
        followUpDate: [''],
        title: ['', Validators.required],
        description: ['', Validators.required],
        notes: ['']
    });

    readonly activeClinicLabel = signal<string>('Belirlenmedi');

    readonly quickClientOpen = signal(false);
    readonly quickPetOpen = signal(false);

    ngOnInit(): void {
        this.activeClinicLabel.set(this.auth.getClinicName() ?? this.auth.getClinicId() ?? 'Belirlenmedi');
        this.form.controls.examinationId.disable({ emitEvent: false });
        this.loadClients();
        this.form.controls.clientId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((clientId) => {
            if (this.contextFromExamination()) {
                return;
            }
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
                this.syncExaminationSelectState();
                return;
            }
            this.form.controls.petId.enable({ emitEvent: false });
            this.loadPetsForClient(id);
        });

        this.form.controls.petId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            if (this.contextFromExamination()) {
                return;
            }
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
        if (this.contextFromExamination()) {
            return;
        }
        const hasPet =
            !this.form.controls.petId.disabled && !!trimClientIdControlValue(this.form.controls.petId.value);
        if (!hasPet) {
            this.form.controls.examinationId.disable({ emitEvent: false });
        } else {
            this.form.controls.examinationId.enable({ emitEvent: false });
        }
    }

    goList(): void {
        void this.router.navigate(['/panel/treatments']);
    }

    petQuickAddDisabled(): boolean {
        if (this.ro.mutationBlocked()) {
            return true;
        }
        if (this.contextFromExamination()) {
            return true;
        }
        return !trimClientIdControlValue(this.form.getRawValue().clientId) || this.form.controls.petId.disabled;
    }

    quickPetOwnerClientId(): string {
        return trimClientIdControlValue(this.form.getRawValue().clientId);
    }

    onQuickClientCreated(clientId: string): void {
        if (this.contextFromExamination()) {
            return;
        }
        const id = clientId.trim();
        if (!id) {
            return;
        }
        this.reloadClientsAndSelectClient(id);
    }

    onQuickPetCreated(petId: string): void {
        if (this.contextFromExamination()) {
            return;
        }
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
        const treatmentDateUtc = dateTimeLocalInputToIsoUtc(v.treatmentDateLocal);
        if (!treatmentDateUtc) {
            this.submitError.set('Geçerli bir tedavi tarihi ve saati seçin.');
            return;
        }
        const followUpDateUtc = v.followUpDate?.trim() ? dateOnlyInputToUtcIso(v.followUpDate.trim()) : null;
        if (v.followUpDate?.trim() && !followUpDateUtc) {
            this.submitError.set('Takip tarihi geçersiz.');
            return;
        }
        const orderMsg = followUpBeforeTreatmentMessage(treatmentDateUtc, followUpDateUtc);
        if (orderMsg) {
            this.submitError.set(orderMsg);
            return;
        }

        const clinicId = this.auth.getClinicId()?.trim() ?? '';
        if (!clinicId) {
            this.submitError.set('Aktif klinik bulunamadı. Lütfen yeniden giriş yapın.');
            return;
        }

        const payload = mapTreatmentUpsertFormToCreateRequest({
            clinicId,
            petId: v.petId,
            treatmentDateUtc,
            title: v.title,
            description: v.description,
            notes: v.notes,
            followUpDateUtc,
            examinationId: v.examinationId
        });

        this.submitting.set(true);
        this.treatmentsService.createTreatment(payload).subscribe({
            next: ({ id }) => {
                this.submitting.set(false);
                void this.router.navigate(['/panel/treatments', id]);
            },
            error: (e: unknown) => {
                this.submitting.set(false);
                if (e instanceof HttpErrorResponse) {
                    const parsed = parseTreatmentUpsertHttpError(e);
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
                this.tryApplyExaminationRouteContext();
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

    private tryApplyExaminationRouteContext(): void {
        const ctx = parseExaminationCreateRouteContext(this.route.snapshot.queryParamMap);
        if (!ctx) {
            return;
        }
        this.applyingRouteContext.set(true);
        this.selectionError.set(null);
        this.examinationsService.getExaminationById(ctx.examinationId).subscribe({
            next: (ex) => {
                const cId = ex.clientId?.trim() ?? '';
                const pId = ex.petId?.trim() ?? '';
                if (cId !== ctx.clientId || pId !== ctx.petId) {
                    this.selectionError.set('Muayene bağlamı adres çubuğundaki bilgilerle uyuşmuyor.');
                    this.applyingRouteContext.set(false);
                    return;
                }
                this.mergeClientOptionIfMissing(cId, (ex.clientName ?? '').trim() || '—');
                this.mergePetOptionIfMissing(pId, (ex.petName ?? '').trim() || '—');
                const listItem = examinationListItemFromDetail(ex);
                this.examinationOptions.set([prescriptionExaminationSelectOption(listItem)]);
                this.relationLoadSeq += 1;
                this.form.patchValue(
                    {
                        clientId: cId,
                        petId: pId,
                        examinationId: ex.id
                    },
                    { emitEvent: false }
                );
                this.form.controls.clientId.disable({ emitEvent: false });
                this.form.controls.petId.disable({ emitEvent: false });
                this.form.controls.examinationId.disable({ emitEvent: false });
                this.contextFromExamination.set(true);
                this.loadingExaminations.set(false);
                this.applyingRouteContext.set(false);
            },
            error: () => {
                this.selectionError.set('Muayene bağlamı yüklenemedi; serbest oluşturma ile devam edebilirsiniz.');
                this.applyingRouteContext.set(false);
            }
        });
    }

    private mergeClientOptionIfMissing(id: string, label: string): void {
        const opts = this.clientOptions();
        if (opts.some((o) => o.value === id)) {
            return;
        }
        this.clientOptions.set([{ value: id, label }, ...opts]);
    }

    private mergePetOptionIfMissing(id: string, label: string): void {
        const opts = this.petOptions();
        if (opts.some((o) => o.value === id)) {
            return;
        }
        this.petOptions.set([{ value: id, label }, ...opts]);
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
                if (!this.contextFromExamination()) {
                    this.syncExaminationSelectState();
                }
            },
            error: (e: unknown) => {
                this.selectionError.set(this.mapLoadError(e, 'Hayvan listesi yüklenemedi.'));
                this.petOptions.set([]);
                this.loadingPets.set(false);
                if (!this.contextFromExamination()) {
                    this.syncExaminationSelectState();
                }
            }
        });
    }

    private mapLoadError(e: unknown, fallback: string): string {
        if (e instanceof HttpErrorResponse) {
            const parsed = parseTreatmentUpsertHttpError(e);
            return parsed.summaryMessage ?? fallback;
        }
        return e instanceof Error ? e.message : fallback;
    }
}
