import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { AuthService } from '@/app/core/auth/auth.service';
import { AppointmentsService } from '@/app/features/appointments/services/appointments.service';
import { isAppointmentCancelledStatus } from '@/app/features/appointments/utils/appointment-status.utils';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import { ExaminationPatientHeaderComponent } from '@/app/features/examinations/components/examination-patient-header.component';
import {
    mapExaminationFormToCreateRequest,
    isPartialVitalClear,
    mapExaminationFormToUpdateRequest
} from '@/app/features/examinations/data/examination.mapper';
import type { ExaminationWorkspaceFormValue } from '@/app/features/examinations/models/examination-form.model';
import type { ExaminationEditVm } from '@/app/features/examinations/models/examination-vm.model';
import { ExaminationsService } from '@/app/features/examinations/services/examinations.service';
import {
    EXAMINATION_TIME_SELECT_OPTIONS,
    examinationTimeSelectOptionsWithLegacy
} from '@/app/features/examinations/utils/examination-time-options.utils';
import {
    type ExaminationUpsertFieldErrors,
    type ExaminationUpsertFormFieldKey,
    parseExaminationUpsertHttpError
} from '@/app/features/examinations/utils/examination-upsert-validation-parse.utils';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import {
    clientOptionsFromList,
    filterPetsByClientId,
    petOptionsFromList,
    trimClientIdControlValue,
    type SelectOption
} from '@/app/shared/forms/client-pet-selection.utils';
import { QuickClientDialogComponent } from '@/app/shared/forms/quick-create/quick-client-dialog.component';
import {
    canShowQuickClientCreateButton,
    canShowQuickPetCreateButton
} from '@/app/shared/forms/quick-create/quick-client-pet-create-visibility.utils';
import { QuickPetDialogComponent } from '@/app/shared/forms/quick-create/quick-pet-dialog.component';
import { parseAppointmentExaminationRouteContext } from '@/app/shared/panel/examination-create-route-context.utils';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { messageFromHttpError, panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { DATE_INPUT_MAX, DATE_INPUT_MIN, dateYearRangeValidator } from '@/app/shared/utils/date-input-validation.utils';
import { toIstanbulDateTimeInputParts, toIstanbulDateTimeLocalInputValue } from '@/app/shared/utils/date.utils';

function requiredTrimmed(c: AbstractControl): ValidationErrors | null {
    return typeof c.value === 'string' && c.value.trim() ? null : { required: true };
}

/** Vital değerler opsiyonel; girildiyse `> 0` (üst sınır/uyarı eşiği yok). */
function positiveWhenPresent(c: AbstractControl): ValidationErrors | null {
    const v = c.value as number | null;
    if (v === null || v === undefined) {
        return null;
    }
    return typeof v === 'number' && v > 0 ? null : { positive: true };
}

function integerWhenPresent(c: AbstractControl): ValidationErrors | null {
    const v = c.value as number | null;
    if (v === null || v === undefined) {
        return null;
    }
    return Number.isInteger(v) ? null : { integer: true };
}

type VitalKey = 'weightKg' | 'temperatureC' | 'heartRateBpm' | 'respiratoryRatePerMin';

/**
 * Muayene çalışma alanı: `new` ve `:id/edit` rotaları aynı bileşeni kullanır.
 * Hata ve çakışmada form değerlerine dokunulmaz; yeni `rowVersion` yalnızca başarılı yazma yanıtından alınır.
 */
@Component({
    selector: 'app-examination-workspace-page',
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
        ExaminationPatientHeaderComponent,
        QuickClientDialogComponent,
        QuickPetDialogComponent
    ],
    template: `
        <a routerLink="/panel/examinations" class="text-primary font-medium no-underline inline-block mb-4">← Muayene listesine dön</a>

        @if (loading()) {
            <app-loading-state message="Muayene yükleniyor…" />
        } @else if (loadError()) {
            <div class="card">
                <app-error-state [detail]="loadError()!" (retry)="reload()" />
            </div>
        } @else {
            <app-page-header
                [title]="isEdit ? 'Muayene' : 'Yeni Muayene'"
                subtitle="Klinik"
                [description]="isEdit ? 'Klinik notları ve vital değerleri güncelleyin.' : 'Muayene kaydı oluşturun.'"
            >
                <div actions class="flex flex-wrap gap-2">
                    @if (isEdit) {
                        <a [routerLink]="['/panel/examinations', examinationId]" class="text-primary font-medium no-underline text-sm">Muayene özeti →</a>
                    }
                </div>
            </app-page-header>

            @if (ro.mutationBlocked()) {
                <p class="text-amber-700 dark:text-amber-300 text-sm mt-0 mb-4" role="status">
                    İşletme salt okunur moddadır; değişiklik kaydedilemez.
                </p>
            }
            @if (selectionError()) {
                <p class="text-red-500 mt-0 mb-4" role="alert">{{ selectionError() }}</p>
            }

            @if (cancelledAppointmentBlocked()) {
                <div class="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-4">
                    <p class="text-amber-800 dark:text-amber-200 m-0 font-medium" role="alert">
                        {{ copy.cancelledAppointmentExamCreateBlocked }}
                    </p>
                    <p class="text-amber-700 dark:text-amber-300 mt-2 mb-0 text-sm">
                        {{ copy.cancelledAppointmentExamCreateHint }}
                    </p>
                    <div class="flex flex-wrap gap-2 mt-4">
                        <p-button type="button" label="Randevu detayı" icon="pi pi-calendar" (onClick)="goAppointmentDetail()" />
                        <p-button type="button" label="Randevu listesi" icon="pi pi-list" severity="secondary" (onClick)="goAppointmentsList()" />
                    </div>
                </div>
            } @else {
                @if (isEdit) {
                    <app-examination-patient-header
                        [petId]="current?.petId ?? null"
                        [clientId]="current?.clientId ?? null"
                        [fallbackPetName]="current?.petName ?? null"
                        [fallbackClientName]="current?.clientName ?? null"
                    />
                } @else {
                    <div class="card mb-4">
                        <p class="text-sm text-muted-color mt-0 mb-4">Aktif Klinik: {{ activeClinicLabel() }}</p>
                        @if (contextFromAppointment()) {
                            <p class="text-sm text-muted-color mt-0 mb-4">
                                Bu randevu kaydından bağlam taşındı; müşteri ve hayvan kilitlidir; kayıt ilgili randevuya bağlanır.
                            </p>
                        }
                        <form [formGroup]="selectionForm">
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
                                    @if (selectionForm.controls.clientId.invalid && selectionForm.controls.clientId.touched) {
                                        <small class="text-red-500">Zorunlu alan.</small>
                                    } @else if (apiFieldErrors().clientId) {
                                        <small class="text-red-500">{{ apiFieldErrors().clientId }}</small>
                                    }
                                    @if (canShowQuickClientCreate()) {
                                        <div class="flex flex-wrap gap-2 mt-2">
                                            <p-button type="button" label="Yeni müşteri" icon="pi pi-user-plus" [text]="true" styleClass="p-0" (onClick)="quickClientOpen.set(true)" />
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
                                        [placeholder]="selectionForm.controls.petId.disabled ? 'Önce müşteri seçin' : 'Hayvan seçin'"
                                        [filter]="true"
                                        filterBy="label"
                                        [showClear]="true"
                                        styleClass="w-full"
                                        [loading]="loadingPets()"
                                    />
                                    @if (selectionForm.controls.petId.invalid && selectionForm.controls.petId.touched) {
                                        <small class="text-red-500">Zorunlu alan.</small>
                                    } @else if (apiFieldErrors().petId) {
                                        <small class="text-red-500">{{ apiFieldErrors().petId }}</small>
                                    }
                                    @if (canShowQuickPetCreate()) {
                                        <div class="flex flex-wrap gap-2 mt-2">
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
                            </div>
                        </form>
                    </div>
                    @if (selectedPetId()) {
                        <app-examination-patient-header [petId]="selectedPetId()" [clientId]="selectedClientId()" />
                    }
                }

                <form [formGroup]="form" (ngSubmit)="onSubmit()">
                    <div class="card mb-4">
                        <div class="grid grid-cols-12 gap-4">
                            <div class="col-span-12 md:col-span-6">
                                <label for="examinationDate" class="block text-sm font-medium text-muted-color mb-2">Muayene tarihi *</label>
                                <input
                                    id="examinationDate"
                                    type="date"
                                    class="w-full md:max-w-64 p-inputtext p-component"
                                    formControlName="examinationDate"
                                    [min]="dateInputMin"
                                    [max]="dateInputMax"
                                />
                                @if (form.controls.examinationDate.hasError('dateYearInvalid') && form.controls.examinationDate.touched) {
                                    <small class="text-red-500 block">Yıl 4 haneli olmalıdır.</small>
                                } @else if (form.controls.examinationDate.invalid && form.controls.examinationDate.touched) {
                                    <small class="text-red-500">Muayene tarihi seçilmelidir.</small>
                                } @else if (apiFieldErrors().examinationDate) {
                                    <small class="text-red-500">{{ apiFieldErrors().examinationDate }}</small>
                                }
                            </div>
                            <div class="col-span-12 md:col-span-6">
                                <label for="examinationTime" class="block text-sm font-medium text-muted-color mb-2">Muayene saati *</label>
                                <p-select
                                    inputId="examinationTime"
                                    formControlName="examinationTime"
                                    [options]="timeOptions()"
                                    optionLabel="label"
                                    optionValue="value"
                                    placeholder="Muayene saati seçin"
                                    [showClear]="true"
                                    styleClass="w-full vet-time-select"
                                    panelStyleClass="vet-time-select-panel"
                                />
                                @if (form.controls.examinationTime.invalid && form.controls.examinationTime.touched) {
                                    <small class="text-red-500">Muayene saati seçilmelidir.</small>
                                } @else if (apiFieldErrors().examinationTime) {
                                    <small class="text-red-500">{{ apiFieldErrors().examinationTime }}</small>
                                }
                            </div>
                        </div>
                    </div>

                    <div class="card mb-4">
                        <h5 class="mt-0 mb-4">Şikâyet ve anamnez</h5>
                        <div class="grid grid-cols-12 gap-4">
                            <div class="col-span-12">
                                <label for="visitReason" class="block text-sm font-medium text-muted-color mb-2">Ziyaret sebebi / şikâyet *</label>
                                <textarea id="visitReason" rows="3" class="w-full p-inputtext p-component" formControlName="visitReason"></textarea>
                                @if (apiFieldErrors().visitReason) {
                                    <small class="text-red-500">{{ apiFieldErrors().visitReason }}</small>
                                } @else if (form.controls.visitReason.invalid && form.controls.visitReason.touched) {
                                    <small class="text-red-500">Ziyaret sebebi zorunludur.</small>
                                }
                            </div>
                            <div class="col-span-12">
                                <label for="anamnesis" class="block text-sm font-medium text-muted-color mb-2">Anamnez</label>
                                <textarea id="anamnesis" rows="6" class="w-full p-inputtext p-component" formControlName="anamnesis"></textarea>
                                @if (apiFieldErrors().anamnesis) {
                                    <small class="text-red-500">{{ apiFieldErrors().anamnesis }}</small>
                                }
                            </div>
                        </div>
                    </div>

                    <div class="card mb-4">
                        <h5 class="mt-0 mb-4">Klinik bulgular ve vital değerler</h5>
                        <div class="grid grid-cols-12 gap-4">
                            <div class="col-span-12">
                                <label for="findings" class="block text-sm font-medium text-muted-color mb-2">Klinik bulgular</label>
                                <textarea id="findings" rows="6" class="w-full p-inputtext p-component" formControlName="findings"></textarea>
                                @if (apiFieldErrors().findings) {
                                    <small class="text-red-500">{{ apiFieldErrors().findings }}</small>
                                }
                            </div>
                            <div class="col-span-12 sm:col-span-6 lg:col-span-3">
                                <label for="weightKg" class="block text-sm font-medium text-muted-color mb-2">Kilo (kg)</label>
                                <input id="weightKg" type="number" step="any" min="0" class="w-full p-inputtext p-component" formControlName="weightKg" />
                                @if (vitalError('weightKg'); as e) {
                                    <small class="text-red-500">{{ e }}</small>
                                }
                            </div>
                            <div class="col-span-12 sm:col-span-6 lg:col-span-3">
                                <label for="temperatureC" class="block text-sm font-medium text-muted-color mb-2">Vücut sıcaklığı (°C)</label>
                                <input id="temperatureC" type="number" step="any" min="0" class="w-full p-inputtext p-component" formControlName="temperatureC" />
                                @if (vitalError('temperatureC'); as e) {
                                    <small class="text-red-500">{{ e }}</small>
                                }
                            </div>
                            <div class="col-span-12 sm:col-span-6 lg:col-span-3">
                                <label for="heartRateBpm" class="block text-sm font-medium text-muted-color mb-2">Kalp atış hızı (atım/dk)</label>
                                <input id="heartRateBpm" type="number" step="1" min="0" class="w-full p-inputtext p-component" formControlName="heartRateBpm" />
                                @if (vitalError('heartRateBpm'); as e) {
                                    <small class="text-red-500">{{ e }}</small>
                                }
                            </div>
                            <div class="col-span-12 sm:col-span-6 lg:col-span-3">
                                <label for="respiratoryRatePerMin" class="block text-sm font-medium text-muted-color mb-2">Solunum sayısı (soluk/dk)</label>
                                <input id="respiratoryRatePerMin" type="number" step="1" min="0" class="w-full p-inputtext p-component" formControlName="respiratoryRatePerMin" />
                                @if (vitalError('respiratoryRatePerMin'); as e) {
                                    <small class="text-red-500">{{ e }}</small>
                                }
                            </div>
                            <div class="col-span-12 md:col-span-6">
                                <label for="vitalsMeasuredAtLocal" class="block text-sm font-medium text-muted-color mb-2">Ölçüm zamanı</label>
                                <input
                                    id="vitalsMeasuredAtLocal"
                                    type="datetime-local"
                                    class="w-full p-inputtext p-component"
                                    formControlName="vitalsMeasuredAtLocal"
                                />
                                <small class="text-muted-color block">Vital değerler opsiyoneldir. Boş bırakılırsa ilk ölçüm girişinde muayene zamanı kullanılır.</small>
                                @if (form.hasError('partialVitalClear')) {
                                    <small class="text-red-500 block" role="alert">Kayıttaki tek bir vital değer silinemez; tüm vital alanlarını boşaltın veya değeri yeniden girin.</small>
                                }
                                @if (apiFieldErrors().vitalsMeasuredAt) {
                                    <small class="text-red-500">{{ apiFieldErrors().vitalsMeasuredAt }}</small>
                                }
                            </div>
                        </div>
                    </div>

                    <div class="card mb-4">
                        <h5 class="mt-0 mb-4">Değerlendirme / tanı</h5>
                        <label for="assessment" class="block text-sm font-medium text-muted-color mb-2">Değerlendirme / tanı</label>
                        <textarea id="assessment" rows="5" class="w-full p-inputtext p-component" formControlName="assessment"></textarea>
                        @if (apiFieldErrors().assessment) {
                            <small class="text-red-500">{{ apiFieldErrors().assessment }}</small>
                        }
                    </div>

                    <div class="card mb-4">
                        <h5 class="mt-0 mb-4">Plan / tedavi planı</h5>
                        <div class="grid grid-cols-12 gap-4">
                            <div class="col-span-12">
                                <label for="plan" class="block text-sm font-medium text-muted-color mb-2">Plan / tedavi planı</label>
                                <textarea id="plan" rows="5" class="w-full p-inputtext p-component" formControlName="plan"></textarea>
                                @if (apiFieldErrors().plan) {
                                    <small class="text-red-500">{{ apiFieldErrors().plan }}</small>
                                }
                            </div>
                            <div class="col-span-12">
                                <label for="notes" class="block text-sm font-medium text-muted-color mb-2">Ek notlar</label>
                                <textarea id="notes" rows="3" class="w-full p-inputtext p-component" formControlName="notes"></textarea>
                                @if (apiFieldErrors().notes) {
                                    <small class="text-red-500">{{ apiFieldErrors().notes }}</small>
                                }
                            </div>
                        </div>
                    </div>

                    <div class="card">
                        @if (conflict()) {
                            <div class="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-4 mb-4" role="alert">
                                <p class="text-amber-800 dark:text-amber-200 m-0 font-medium">{{ submitError() }}</p>
                                <div class="flex flex-wrap gap-4 items-center mt-3">
                                    <a
                                        [routerLink]="['/panel/examinations', examinationId]"
                                        target="_blank"
                                        rel="noopener"
                                        class="text-primary font-medium no-underline"
                                        >Güncel kaydı yeni sekmede aç →</a
                                    >
                                    <p-button
                                        type="button"
                                        label="Yazdıklarımı atıp güncel kaydı yükle"
                                        icon="pi pi-refresh"
                                        severity="secondary"
                                        size="small"
                                        (onClick)="discardAndReload()"
                                    />
                                </div>
                            </div>
                        } @else if (submitError()) {
                            <p class="text-red-500 mt-0 mb-4" role="alert">{{ submitError() }}</p>
                        }

                        <div class="flex flex-wrap gap-2">
                            <p-button type="submit" [label]="copy.buttonSave" icon="pi pi-check" [loading]="submitting()" [disabled]="saveDisabled()" />
                            <p-button
                                type="button"
                                [label]="copy.buttonCancel"
                                icon="pi pi-times"
                                severity="secondary"
                                (onClick)="onCancel()"
                                [disabled]="submitting()"
                            />
                        </div>
                    </div>
                </form>
            }

            @if (!isEdit) {
                <app-quick-client-dialog [(visible)]="quickClientOpen" (clientCreated)="onQuickClientCreated($event)" />
                <app-quick-pet-dialog [(visible)]="quickPetOpen" [ownerClientId]="quickPetOwnerClientId()" (petCreated)="onQuickPetCreated($event)" />
            }
        }
    `
})
export class ExaminationWorkspacePageComponent implements OnInit {
    readonly copy = PANEL_COPY;
    protected readonly dateInputMin = DATE_INPUT_MIN;
    protected readonly dateInputMax = DATE_INPUT_MAX;

    private readonly fb = inject(FormBuilder);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly examinationsService = inject(ExaminationsService);
    private readonly appointmentsService = inject(AppointmentsService);
    private readonly clientsService = inject(ClientsService);
    private readonly petsService = inject(PetsService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly auth = inject(AuthService);
    readonly ro = inject(TenantReadOnlyContextService);

    /** `:id/edit` rotası → düzenleme; `new` → oluşturma. */
    examinationId = '';
    isEdit = false;
    /** Düzenlemede son bilinen sunucu kaydı (bağlam + rowVersion). Form girdisi değildir. */
    current: ExaminationEditVm | null = null;

    readonly loading = signal(false);
    readonly loadError = signal<string | null>(null);
    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);
    readonly conflict = signal(false);
    readonly selectionError = signal<string | null>(null);
    readonly apiFieldErrors = signal<ExaminationUpsertFieldErrors>({});
    readonly activeClinicLabel = signal<string>('Belirlenmedi');

    readonly loadingClients = signal(false);
    readonly loadingPets = signal(false);
    readonly clientOptions = signal<SelectOption[]>([]);
    readonly petOptions = signal<SelectOption[]>([]);
    readonly selectedClientId = signal<string | null>(null);
    readonly selectedPetId = signal<string | null>(null);
    readonly quickClientOpen = signal(false);
    readonly quickPetOpen = signal(false);

    readonly contextFromAppointment = signal(false);
    readonly applyingRouteContext = signal(false);
    readonly appointmentContextId = signal<string | null>(null);
    readonly cancelledAppointmentBlocked = signal(false);
    readonly blockedAppointmentId = signal<string | null>(null);

    readonly timeOptions = signal<SelectOption[]>(EXAMINATION_TIME_SELECT_OPTIONS);

    readonly selectionForm = this.fb.nonNullable.group({
        clientId: ['', Validators.required],
        petId: [{ value: '', disabled: true }, Validators.required]
    });

    /** Kayıttaki tek bir vital silinemez (sözleşme: yalnızca tümü `clearVitals` ile). */
    private readonly partialVitalClearValidator: ValidatorFn = (g) =>
        this.current && isPartialVitalClear(g.value, this.current) ? { partialVitalClear: true } : null;

    readonly form = this.fb.group(
        {
            examinationDate: this.fb.nonNullable.control('', [Validators.required, dateYearRangeValidator()]),
            examinationTime: this.fb.nonNullable.control('', Validators.required),
            visitReason: this.fb.nonNullable.control('', [requiredTrimmed, Validators.maxLength(2000)]),
            anamnesis: this.fb.nonNullable.control(''),
            findings: this.fb.nonNullable.control(''),
            weightKg: this.fb.control<number | null>(null, positiveWhenPresent),
            temperatureC: this.fb.control<number | null>(null, positiveWhenPresent),
            heartRateBpm: this.fb.control<number | null>(null, [positiveWhenPresent, integerWhenPresent]),
            respiratoryRatePerMin: this.fb.control<number | null>(null, [positiveWhenPresent, integerWhenPresent]),
            vitalsMeasuredAtLocal: this.fb.nonNullable.control(''),
            assessment: this.fb.nonNullable.control(''),
            plan: this.fb.nonNullable.control(''),
            notes: this.fb.nonNullable.control('')
        },
        { validators: this.partialVitalClearValidator }
    );

    readonly canShowQuickClientCreate = (): boolean =>
        canShowQuickClientCreateButton(this.auth, this.ro, this.contextFromAppointment());

    readonly canShowQuickPetCreate = (): boolean =>
        canShowQuickPetCreateButton(this.auth, this.ro, this.contextFromAppointment());

    constructor() {
        const fieldMap: Array<[ExaminationUpsertFormFieldKey, keyof typeof this.form.controls]> = [
            ['examinationDate', 'examinationDate'],
            ['examinationTime', 'examinationTime'],
            ['visitReason', 'visitReason'],
            ['anamnesis', 'anamnesis'],
            ['findings', 'findings'],
            ['weightKg', 'weightKg'],
            ['temperatureC', 'temperatureC'],
            ['heartRateBpm', 'heartRateBpm'],
            ['respiratoryRatePerMin', 'respiratoryRatePerMin'],
            ['vitalsMeasuredAt', 'vitalsMeasuredAtLocal'],
            ['assessment', 'assessment'],
            ['plan', 'plan'],
            ['notes', 'notes']
        ];
        for (const [errKey, controlKey] of fieldMap) {
            (this.form.controls[controlKey] as AbstractControl).valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
                const cur = this.apiFieldErrors();
                if (cur[errKey]) {
                    const next = { ...cur };
                    delete next[errKey];
                    this.apiFieldErrors.set(next);
                }
            });
        }
    }

    ngOnInit(): void {
        this.activeClinicLabel.set(this.auth.getClinicName() ?? this.auth.getClinicId() ?? 'Belirlenmedi');
        const id = this.route.snapshot.paramMap.get('id')?.trim() ?? '';
        this.isEdit = this.route.snapshot.routeConfig?.path?.includes(':id') === true;
        if (this.isEdit) {
            if (!id) {
                this.loadError.set('Geçersiz muayene.');
                return;
            }
            this.examinationId = id;
            this.reload();
            return;
        }
        this.initCreateMode();
    }

    saveDisabled(): boolean {
        return (
            this.form.invalid ||
            (!this.isEdit && (this.selectionForm.invalid || this.loadingClients() || this.applyingRouteContext())) ||
            this.submitting() ||
            this.ro.mutationBlocked()
        );
    }

    vitalError(key: VitalKey): string | null {
        const c = this.form.controls[key];
        if (c.touched || c.dirty) {
            if (c.hasError('positive')) {
                return 'Değer 0’dan büyük olmalıdır.';
            }
            if (c.hasError('integer')) {
                return 'Tam sayı giriniz.';
            }
        }
        return this.apiFieldErrors()[key] ?? null;
    }

    /** Sunucudan (yeniden) yükler; formu kayıttaki değerlerle doldurur. */
    reload(): void {
        this.loading.set(true);
        this.loadError.set(null);
        this.examinationsService.getExaminationForEditById(this.examinationId).subscribe({
            next: (x) => {
                this.current = x;
                const { date, time } = toIstanbulDateTimeInputParts(x.examinedAtUtc);
                this.timeOptions.set(examinationTimeSelectOptionsWithLegacy(time));
                this.form.reset(
                    {
                        examinationDate: date,
                        examinationTime: time,
                        visitReason: x.visitReason,
                        anamnesis: x.anamnesis,
                        findings: x.findings,
                        weightKg: x.weightKg,
                        temperatureC: x.temperatureC,
                        heartRateBpm: x.heartRateBpm,
                        respiratoryRatePerMin: x.respiratoryRatePerMin,
                        vitalsMeasuredAtLocal: x.vitalsMeasuredAtUtc ? toIstanbulDateTimeLocalInputValue(x.vitalsMeasuredAtUtc) : '',
                        assessment: x.assessment,
                        plan: x.plan,
                        notes: x.notes
                    },
                    { emitEvent: false }
                );
                this.apiFieldErrors.set({});
                this.submitError.set(null);
                this.conflict.set(false);
                this.loading.set(false);
            },
            error: (e: unknown) => {
                this.loadError.set(panelHttpFailureMessage(e, 'Muayene bilgileri yüklenemedi.'));
                this.loading.set(false);
            }
        });
    }

    /** Çakışma sonrası kullanıcının açık tercihi: yazdıkları atılır, güncel kayıt yüklenir. */
    discardAndReload(): void {
        this.reload();
    }

    onSubmit(): void {
        if (this.submitting()) {
            return;
        }
        this.submitError.set(null);
        this.conflict.set(false);
        this.apiFieldErrors.set({});
        if (this.cancelledAppointmentBlocked()) {
            this.submitError.set(this.copy.cancelledAppointmentExamCreateBlocked);
            return;
        }
        if (this.form.invalid || (!this.isEdit && this.selectionForm.invalid)) {
            this.form.markAllAsTouched();
            this.selectionForm.markAllAsTouched();
            return;
        }
        const v: ExaminationWorkspaceFormValue = this.form.getRawValue();
        if (this.isEdit) {
            this.submitUpdate(v);
        } else {
            this.submitCreate(v);
        }
    }

    private submitCreate(v: ExaminationWorkspaceFormValue): void {
        const clinicId = this.auth.getClinicId()?.trim() ?? '';
        if (!clinicId) {
            this.submitError.set('Aktif klinik bulunamadı. Lütfen yeniden giriş yapın.');
            return;
        }
        const payload = mapExaminationFormToCreateRequest(v, {
            clinicId,
            petId: this.selectionForm.getRawValue().petId,
            appointmentId: this.appointmentContextId()
        });
        if (!payload) {
            this.submitError.set('Geçerli bir muayene tarihi ve saati seçin.');
            return;
        }
        this.submitting.set(true);
        this.examinationsService.createExamination(payload).subscribe({
            next: ({ id }) => this.goToSavedDetail(id),
            error: (e: unknown) => this.handleSubmitError(e, 'Kayıt oluşturulamadı.')
        });
    }

    private submitUpdate(v: ExaminationWorkspaceFormValue): void {
        const current = this.current;
        if (!current) {
            return;
        }
        const payload = mapExaminationFormToUpdateRequest(v, current);
        if (!payload) {
            this.submitError.set('Geçerli bir muayene tarihi ve saati seçin.');
            return;
        }
        this.submitting.set(true);
        this.examinationsService.updateExamination(this.examinationId, payload).subscribe({
            next: () => this.goToSavedDetail(this.examinationId),
            error: (e: unknown) => this.handleSubmitError(e, 'Kayıt sırasında hata oluştu.')
        });
    }

    /**
     * Başarılı yazmadan sonra muayene detayına döner; "Muayene kaydedildi." toast'ı detay sayfasında `?saved=1` ile gösterilir.
     * `submitting` bilerek açık bırakılır: gezinme bitene kadar ikinci gönderim (eski `rowVersion` ile 409) engellenir.
     */
    private goToSavedDetail(id: string): void {
        void this.router.navigate(['/panel/examinations', id], { queryParams: { saved: '1' } });
    }

    /** Hata durumunda form değerlerine dokunulmaz; yalnızca mesaj ve alan hataları işlenir. */
    private handleSubmitError(e: unknown, fallback: string): void {
        this.submitting.set(false);
        if (e instanceof HttpErrorResponse) {
            const parsed = parseExaminationUpsertHttpError(e);
            this.apiFieldErrors.set(parsed.fieldErrors);
            this.submitError.set(parsed.summaryMessage);
            this.conflict.set(parsed.isConcurrencyConflict);
            return;
        }
        this.submitError.set(e instanceof Error ? e.message : fallback);
    }

    onCancel(): void {
        void this.router.navigate(this.isEdit ? ['/panel/examinations', this.examinationId] : ['/panel/examinations']);
    }

    goAppointmentDetail(): void {
        const id = this.blockedAppointmentId();
        void this.router.navigate(id ? ['/panel/appointments', id] : ['/panel/appointments']);
    }

    goAppointmentsList(): void {
        void this.router.navigate(['/panel/appointments']);
    }

    // ---- Oluşturma: müşteri/hayvan seçimi ve randevu bağlamı ----

    private initCreateMode(): void {
        this.loadClients();
        this.selectionForm.controls.clientId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((clientId) => {
            if (this.contextFromAppointment()) {
                return;
            }
            this.selectionForm.controls.petId.setValue('');
            this.submitError.set(null);
            this.selectionError.set(null);
            if (clientId === null || clientId === undefined) {
                this.selectionForm.controls.clientId.setValue('', { emitEvent: false });
            }
            const id = trimClientIdControlValue(this.selectionForm.controls.clientId.value);
            this.selectedClientId.set(id || null);
            if (!id) {
                this.petOptions.set([]);
                this.selectionForm.controls.petId.disable({ emitEvent: false });
                return;
            }
            this.selectionForm.controls.petId.enable({ emitEvent: false });
            this.loadPetsForClient(id);
        });
        this.selectionForm.controls.petId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((petId) => {
            this.selectedPetId.set(petId?.trim() || null);
        });
    }

    petQuickAddDisabled(): boolean {
        if (this.ro.mutationBlocked() || this.contextFromAppointment()) {
            return true;
        }
        return !trimClientIdControlValue(this.selectionForm.getRawValue().clientId) || this.selectionForm.controls.petId.disabled;
    }

    quickPetOwnerClientId(): string {
        return trimClientIdControlValue(this.selectionForm.getRawValue().clientId);
    }

    onQuickClientCreated(clientId: string): void {
        const id = clientId.trim();
        if (this.contextFromAppointment() || !id) {
            return;
        }
        this.loadingClients.set(true);
        this.selectionError.set(null);
        this.clientsService.getClients({ page: 1, pageSize: 200 }).subscribe({
            next: (r) => {
                this.clientOptions.set(clientOptionsFromList(r.items));
                this.loadingClients.set(false);
                this.selectionForm.controls.clientId.setValue(id, { emitEvent: true });
            },
            error: (e: unknown) => {
                this.selectionError.set(this.mapLoadError(e, 'Müşteri listesi yüklenemedi.'));
                this.loadingClients.set(false);
            }
        });
    }

    onQuickPetCreated(petId: string): void {
        const cid = trimClientIdControlValue(this.selectionForm.getRawValue().clientId);
        const pid = petId.trim();
        if (this.contextFromAppointment() || !cid || !pid) {
            return;
        }
        this.loadPetsForClient(cid, pid);
    }

    private loadClients(): void {
        this.loadingClients.set(true);
        this.selectionError.set(null);
        this.clientsService.getClients({ page: 1, pageSize: 200 }).subscribe({
            next: (r) => {
                this.clientOptions.set(clientOptionsFromList(r.items));
                this.loadingClients.set(false);
                this.tryApplyAppointmentRouteContext();
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
                if (items.some((p) => (p.clientId ?? '').trim())) {
                    items = filterPetsByClientId(items, clientId);
                }
                this.petOptions.set(petOptionsFromList(items));
                const want = selectPetId?.trim();
                if (want && items.some((p) => p.id === want)) {
                    this.selectionForm.controls.petId.setValue(want, { emitEvent: true });
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

    private tryApplyAppointmentRouteContext(): void {
        const ctx = parseAppointmentExaminationRouteContext(this.route.snapshot.queryParamMap);
        if (!ctx) {
            return;
        }
        this.applyingRouteContext.set(true);
        this.selectionError.set(null);
        this.appointmentsService.getAppointmentById(ctx.appointmentId).subscribe({
            next: (ap) => {
                if (isAppointmentCancelledStatus(ap.status)) {
                    this.cancelledAppointmentBlocked.set(true);
                    this.blockedAppointmentId.set(ctx.appointmentId);
                    this.appointmentContextId.set(ctx.appointmentId);
                    this.contextFromAppointment.set(true);
                    this.form.disable({ emitEvent: false });
                    this.selectionError.set(this.copy.cancelledAppointmentExamCreateBlocked);
                    this.applyingRouteContext.set(false);
                    return;
                }
                const cId = ap.clientId?.trim() ?? '';
                const pId = ap.petId?.trim() ?? '';
                if (cId !== ctx.clientId || pId !== ctx.petId) {
                    this.selectionError.set('Randevu bağlamı adres çubuğundaki bilgilerle uyuşmuyor.');
                    this.applyingRouteContext.set(false);
                    return;
                }
                this.mergeOption(this.clientOptions, cId, (ap.clientName ?? '').trim() || '—');
                this.mergeOption(this.petOptions, pId, (ap.petName ?? '').trim() || '—');
                this.appointmentContextId.set(ctx.appointmentId);
                this.selectionForm.controls.petId.enable({ emitEvent: false });
                this.selectionForm.patchValue({ clientId: cId, petId: pId }, { emitEvent: false });
                this.selectionForm.controls.clientId.disable({ emitEvent: false });
                this.selectionForm.controls.petId.disable({ emitEvent: false });
                this.selectedClientId.set(cId);
                this.selectedPetId.set(pId);
                this.contextFromAppointment.set(true);
                this.applyingRouteContext.set(false);
            },
            error: () => {
                this.selectionError.set('Randevu bağlamı yüklenemedi; serbest oluşturma ile devam edebilirsiniz.');
                this.applyingRouteContext.set(false);
            }
        });
    }

    private mergeOption(target: WritableSignal<SelectOption[]>, id: string, label: string): void {
        const opts = target();
        if (!opts.some((o) => o.value === id)) {
            target.set([{ value: id, label }, ...opts]);
        }
    }
}
