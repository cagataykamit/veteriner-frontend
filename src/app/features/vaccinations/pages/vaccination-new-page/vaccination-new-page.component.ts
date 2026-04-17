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
import type { CreateVaccinationRequest } from '@/app/features/vaccinations/models/vaccination-create.model';
import { VaccinationsService } from '@/app/features/vaccinations/services/vaccinations.service';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import {
    clientOptionsFromList,
    filterPetsByClientId,
    petOptionsFromList,
    type SelectOption
} from '@/app/shared/forms/client-pet-selection.utils';
import {
    parseVaccinationCreateRouteContext,
    type VaccinationCreateRouteContext
} from '@/app/shared/panel/examination-create-route-context.utils';
import { formatClientPhoneForDisplay } from '@/app/shared/utils/phone-display.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';
import { dateOnlyInputToUtcIso, dateTimeLocalInputToIsoUtc } from '@/app/shared/utils/date.utils';
import { AuthService } from '@/app/core/auth/auth.service';
import { parseVaccinationUpsertHttpError } from '@/app/features/vaccinations/utils/vaccination-upsert-validation-parse.utils';
import type { VaccinationUpsertFieldErrors, VaccinationUpsertFormFieldKey } from '@/app/features/vaccinations/utils/vaccination-upsert-validation-parse.utils';
import { VACCINATION_WRITE_STATUS_OPTIONS } from '@/app/features/vaccinations/utils/vaccination-status.utils';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';

@Component({
    selector: 'app-vaccination-new-page',
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
        <a routerLink="/panel/vaccinations" class="text-primary font-medium no-underline inline-block mb-4">← Aşı listesine dön</a>

        <app-page-header title="Yeni Aşı" subtitle="Klinik" description="Aşı kaydı oluşturun." />

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
            @if (contextFromRoute()) {
                <p class="text-sm text-muted-color mt-0 mb-4">
                    Muayene bağlamı taşındı; müşteri ve hayvan seçimi kilitlidir. Aşı bilgilerini doldurun.
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
                        @if (apiFieldErrors().clientId) {
                            <small class="text-red-500">{{ apiFieldErrors().clientId }}</small>
                        } @else if (form.controls.clientId.invalid && form.controls.clientId.touched) {
                            <small class="text-red-500">Zorunlu alan.</small>
                        }
                        @if (!contextFromRoute() && !ro.mutationBlocked()) {
                            <p class="text-muted-color text-sm mt-2 mb-0">
                                Aradığınız kayıt yoksa
                                <a routerLink="/panel/clients/new" class="text-primary font-medium no-underline">Yeni Müşteri</a>.
                            </p>
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
                            <small class="text-red-500">Zorunlu alan.</small>
                        }
                        @if (!contextFromRoute() && !ro.mutationBlocked()) {
                            <p class="text-muted-color text-sm mt-2 mb-0">
                                <a routerLink="/panel/pets/new" class="text-primary font-medium no-underline">Yeni Hayvan</a>
                                — bu müşteri için hayvan ekleyebilirsiniz.
                            </p>
                        }
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="vaccineName" class="block text-sm font-medium text-muted-color mb-2">Aşı adı *</label>
                        <input id="vaccineName" pInputText class="w-full" formControlName="vaccineName" />
                        @if (apiFieldErrors().vaccineName) {
                            <small class="text-red-500">{{ apiFieldErrors().vaccineName }}</small>
                        } @else if (form.controls.vaccineName.invalid && form.controls.vaccineName.touched) {
                            <small class="text-red-500">Zorunlu alan.</small>
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
                            <small class="text-red-500">Zorunlu alan.</small>
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
                        @if (apiFieldErrors().notes) {
                            <small class="text-red-500">{{ apiFieldErrors().notes }}</small>
                        }
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
                        [label]="copy.buttonSave"
                        icon="pi pi-check"
                        [loading]="submitting()"
                        [disabled]="form.invalid || submitting() || loadingClients() || applyingRouteContext() || ro.mutationBlocked()"
                    />
                    <p-button
                        type="button"
                        [label]="copy.buttonCancel"
                        icon="pi pi-times"
                        severity="secondary"
                        (onClick)="goList()"
                        [disabled]="submitting()"
                    />
                </div>
            </form>
        </div>
    `
})
export class VaccinationNewPageComponent implements OnInit {
    readonly copy = PANEL_COPY;

    private readonly fb = inject(FormBuilder);
    private readonly vaccinationsService = inject(VaccinationsService);
    private readonly clientsService = inject(ClientsService);
    private readonly petsService = inject(PetsService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly destroyRef = inject(DestroyRef);
    private readonly auth = inject(AuthService);
    readonly ro = inject(TenantReadOnlyContextService);

    /** Bağlam başarıyla uygulandıysa API’ye iletilir; serbest oluşturmada null kalır. */
    private routeExaminationId: string | null = null;

    readonly contextFromRoute = signal(false);
    readonly applyingRouteContext = signal(false);

    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);
    readonly selectionError = signal<string | null>(null);
    readonly apiFieldErrors = signal<VaccinationUpsertFieldErrors>({});

    readonly loadingClients = signal(false);
    readonly loadingPets = signal(false);
    readonly clientOptions = signal<SelectOption[]>([]);
    readonly petOptions = signal<SelectOption[]>([]);
    readonly activeClinicLabel = signal<string>('Belirlenmedi');

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

    ngOnInit(): void {
        this.activeClinicLabel.set(this.auth.getClinicName() ?? this.auth.getClinicId() ?? 'Belirlenmedi');
        this.updateDateValidators(this.form.controls.status.value);
        this.form.controls.status.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((status) => {
            this.updateDateValidators(status);
        });
        this.loadClients();
        this.form.controls.clientId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((clientId) => {
            if (this.contextFromRoute()) {
                return;
            }
            this.form.controls.petId.setValue('');
            this.submitError.set(null);
            this.selectionError.set(null);
            this.apiFieldErrors.set({});
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
        void this.router.navigate(['/panel/vaccinations']);
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
        const nd = v.nextDueDate?.trim();
        if (nd) {
            // `type="date"` girdisi date-only semantiğindedir; UTC gün başına çevrilir.
            const iso = dateOnlyInputToUtcIso(nd);
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

        const payload: CreateVaccinationRequest = {
            clinicId,
            petId: v.petId.trim(),
            examinationId: this.routeExaminationId,
            vaccineName: v.vaccineName.trim(),
            appliedAtUtc: appliedAtUtc ?? null,
            dueAtUtc: dueAtUtc ?? null,
            status,
            notes: v.notes.trim() || null
        };

        this.submitting.set(true);
        this.vaccinationsService.createVaccination(payload).subscribe({
            next: ({ id }) => {
                this.submitting.set(false);
                void this.router.navigate(['/panel/vaccinations', id], { queryParams: { saved: '1' } });
            },
            error: (e: unknown) => {
                this.submitting.set(false);
                if (e instanceof HttpErrorResponse) {
                    const parsed = parseVaccinationUpsertHttpError(e);
                    this.apiFieldErrors.set(parsed.fieldErrors);
                    this.submitError.set(parsed.summaryMessage);
                    return;
                }
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
                this.tryApplyVaccinationRouteContext();
            },
            error: (e: unknown) => {
                this.selectionError.set(this.mapLoadError(e, 'Müşteri listesi yüklenemedi.'));
                this.loadingClients.set(false);
            }
        });
    }

    private tryApplyVaccinationRouteContext(): void {
        const ctx = parseVaccinationCreateRouteContext(this.route.snapshot.queryParamMap);
        if (!ctx) {
            return;
        }
        this.applyingRouteContext.set(true);
        this.selectionError.set(null);
        const opts = this.clientOptions();
        if (opts.some((o) => o.value === ctx.clientId)) {
            this.applyContextAfterClientMerge(ctx);
            return;
        }
        this.clientsService.getClientById(ctx.clientId).subscribe({
            next: (c) => {
                this.mergeClientOptionIfMissing(c.id, `${c.fullName} — ${formatClientPhoneForDisplay(c.phone)}`);
                this.applyContextAfterClientMerge(ctx);
            },
            error: () => {
                this.selectionError.set('Bağlam müşterisi yüklenemedi.');
                this.applyingRouteContext.set(false);
            }
        });
    }

    private applyContextAfterClientMerge(ctx: VaccinationCreateRouteContext): void {
        this.form.patchValue({ clientId: ctx.clientId }, { emitEvent: false });
        this.form.controls.clientId.disable({ emitEvent: false });
        this.form.controls.petId.enable({ emitEvent: false });
        this.loadPetsForContextLock(ctx);
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

    private loadPetsForContextLock(ctx: VaccinationCreateRouteContext): void {
        this.loadingPets.set(true);
        this.selectionError.set(null);
        this.petsService.getPets({ page: 1, pageSize: 200, clientId: ctx.clientId }).subscribe({
            next: (r) => {
                let items = r.items;
                const anyClientId = items.some((p) => (p.clientId ?? '').trim());
                if (anyClientId) {
                    items = filterPetsByClientId(items, ctx.clientId);
                }
                this.petOptions.set(petOptionsFromList(items));
                const inList = items.some((p) => p.id === ctx.petId);
                if (inList) {
                    this.finalizeContextLock(ctx);
                    return;
                }
                this.petsService.getPetById(ctx.petId).subscribe({
                    next: (pet) => {
                        const owner = (pet.ownerId ?? '').trim();
                        if (owner !== ctx.clientId.trim()) {
                            this.selectionError.set('Hayvan bu müşteri için geçerli değil.');
                            this.loadingPets.set(false);
                            this.applyingRouteContext.set(false);
                            return;
                        }
                        this.mergePetOptionIfMissing(pet.id, `${pet.name} — ${pet.speciesName}`);
                        this.finalizeContextLock(ctx);
                    },
                    error: () => {
                        this.selectionError.set('Bağlam hayvanı yüklenemedi.');
                        this.loadingPets.set(false);
                        this.applyingRouteContext.set(false);
                    }
                });
            },
            error: (e: unknown) => {
                this.selectionError.set(this.mapLoadError(e, 'Hayvan listesi yüklenemedi.'));
                this.petOptions.set([]);
                this.loadingPets.set(false);
                this.applyingRouteContext.set(false);
            }
        });
    }

    private finalizeContextLock(ctx: VaccinationCreateRouteContext): void {
        this.routeExaminationId = ctx.examinationId;
        this.form.patchValue({ petId: ctx.petId }, { emitEvent: false });
        this.form.controls.petId.disable({ emitEvent: false });
        this.contextFromRoute.set(true);
        this.loadingPets.set(false);
        this.applyingRouteContext.set(false);
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

    private updateDateValidators(status: unknown): void {
        const s = String(status ?? '').trim();
        const needsAppliedAt = s === '1';
        const needsDueAt = s === '0';

        this.form.controls.appliedAtLocal.setValidators(needsAppliedAt ? [Validators.required] : []);
        this.form.controls.nextDueDate.setValidators(needsDueAt ? [Validators.required] : []);

        if (!needsAppliedAt) {
            this.form.controls.appliedAtLocal.setValue('', { emitEvent: false });
        }
        if (!needsDueAt) {
            this.form.controls.nextDueDate.setValue('', { emitEvent: false });
        }

        this.form.controls.appliedAtLocal.updateValueAndValidity({ emitEvent: false });
        this.form.controls.nextDueDate.updateValueAndValidity({ emitEvent: false });
    }
}
