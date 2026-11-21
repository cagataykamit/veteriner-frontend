import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, ElementRef, inject, input, signal, untracked, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { type AbstractControl, FormBuilder, FormsModule, ReactiveFormsModule, type ValidationErrors, type ValidatorFn, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectButtonModule } from 'primeng/selectbutton';
import type { Subscription } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { VITAL_MEASUREMENTS_CREATE_CLAIM, VITAL_MEASUREMENTS_READ_CLAIM, VITAL_MEASUREMENTS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { RecordHistoryButtonComponent } from '@/app/entities/record-history/components/record-history-button.component';
import { VitalTrendChartComponent } from '@/app/entities/vital-measurement/components/vital-trend-chart.component';
import {
    VITAL_SIGNS,
    type VitalMeasurementDetailVm,
    type VitalPointVm,
    type VitalSeriesVm,
    type VitalSignDefinition,
    type VitalSignKey
} from '@/app/entities/vital-measurement/models/vital-measurement-vm.model';
import { VitalMeasurementsService } from '@/app/entities/vital-measurement/services/vital-measurements.service';
import { VITAL_CONCURRENCY_CONFLICT_CODE, VITAL_UPDATE_PROBLEM_OVERRIDES } from '@/app/entities/vital-measurement/utils/vital-measurement-error.utils';
import {
    formatVitalValue,
    measuredAtError,
    VITAL_BACKDATE_DAYS,
    VITAL_LATE_REASON_MAX,
    VITAL_LATE_REASON_MIN,
    VITAL_NOTE_MAX,
    vitalInputError,
    vitalSummary,
    vitalValuesFromInputs
} from '@/app/entities/vital-measurement/utils/vital-measurement-rules';
import { DateInputComponent } from '@/app/shared/forms/date-input/date-input.component';
import { TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { ReadOnlyReasonDirective } from '@/app/shared/ui/read-only-reason/read-only-reason.directive';
import { ReasonConfirmDialogComponent } from '@/app/shared/ui/reason-confirm-dialog/reason-confirm-dialog.component';
import { messageFromHttpError, panelHttpFailureMessage, problemCodeFromHttpError } from '@/app/shared/utils/api-error.utils';
import { dateTimeYearRangeValidator } from '@/app/shared/utils/date-input-validation.utils';
import { formatUtcIsoAsLocalDateTimeDisplay, fromIstanbulDateTimeLocalInputToUtcIso, toIstanbulDateTimeLocalInputValue } from '@/app/shared/utils/date.utils';

type VitalRange = '7d' | '1y' | 'all';

const DAY_MS = 86_400_000;
const RANGE_DAYS: Record<VitalRange, number | null> = { '7d': 7, '1y': 365, all: null };
const SAVE_FALLBACK = 'Ölçüm kaydedilemedi.';

let nextSectionId = 0;

function vitalInputValidator(def: VitalSignDefinition): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const message = vitalInputError(def, control.value as string);

        return message ? { vital: message } : null;
    };
}

/** En az bir değer zorunlu (sözleşme D3). */
const atLeastOneVital: ValidatorFn = (group: AbstractControl): ValidationErrors | null =>
    VITAL_SIGNS.some((def) => String(group.get(def.key)?.value ?? '').trim()) ? null : { valueRequired: true };

/** Giriş kutusuna yazılacak metin: binlik ayırıcı yok, ondalık virgül. */
function vitalInputText(value: number | null): string {
    return value === null ? '' : String(value).replace('.', ',');
}

/**
 * Vital ölçümleri (HOSP-004, tasarım B · Eğilim): her zaman açık hızlı giriş satırı, dört ölçü için ortak zaman eksenli
 * dört grafik, seçilen ölçümün ayrıntısı (düzenle, gerekçeli iptal, geçmiş) ve tablo görünümü.
 * Üç yerde kullanılır: yatış detayı (`hospitalizationId`), muayene (`examinationId`) ve hasta kartı (ikisi de boş: serbest ölçüm).
 * Okuma izni yoksa hiçbir şey çizilmez; yazma düğmeleri izne ve salt okunur kiracı durumuna göre gizlenir.
 */
@Component({
    selector: 'app-vital-measurements-section',
    standalone: true,
    imports: [
        ReactiveFormsModule,
        FormsModule,
        RouterLink,
        ButtonModule,
        CheckboxModule,
        SelectButtonModule,
        DateInputComponent,
        VitalTrendChartComponent,
        RecordHistoryButtonComponent,
        ReasonConfirmDialogComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent,
        ReadOnlyReasonDirective,
        TrDateTimePipe
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (canRead) {
            <section class="card mb-0 @container" [attr.aria-labelledby]="uid + '-title'" data-testid="vital-measurements-section">
                <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mb-3">
                    <h5 [id]="uid + '-title'" class="m-0">{{ mode() === 'pet' ? 'Vital ve kilo eğilimi' : 'Vital ölçümleri' }}</h5>
                    @if (mode() === 'pet') {
                        <p-selectbutton [options]="rangeOptions" [ngModel]="range()" (ngModelChange)="range.set($event)" optionLabel="label" optionValue="value" [allowEmpty]="false" [ariaLabelledBy]="uid + '-title'" data-testid="vital-range" />
                    }
                </div>

                @if (mode() === 'examination') {
                    <p class="text-sm text-muted-color mt-0 mb-3">Muayenenin ilk ölçümü muayene kaydındaki vital alanlarında durur. Aynı muayenede yeniden ölçtüğünüzde buradan ekleyin; ikisi de eğilimde görünür.</p>
                }

                @if (canAdd() || editing()) {
                    <form [formGroup]="form" (ngSubmit)="onSubmit()" (keydown.escape)="cancelEdit()" novalidate [class]="'rounded-border border p-3 mb-4 ' + (editing() ? 'border-primary bg-primary-50 dark:bg-primary-950/30' : 'border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/40')" data-testid="vital-form">
                        <p class="mt-0 mb-2 text-sm">
                            @if (editing(); as ed) {
                                <span class="font-semibold" data-testid="vital-editing"><i class="pi pi-pencil text-xs mr-1" aria-hidden="true"></i>{{ ed.measuredAtUtc | trDateTime }} ölçümünü düzenliyorsunuz</span>
                            } @else {
                                <span class="font-semibold">Hızlı giriş</span>
                                <span class="text-muted-color"> · Ölçtüğünüz değerleri yazın; boş kalanlar kaydedilmez. Enter kaydeder.</span>
                            }
                        </p>
                        <div class="grid grid-cols-2 @2xl:grid-cols-4 @5xl:grid-cols-[repeat(4,minmax(0,1fr))_15rem_auto] gap-3 items-start">
                            @for (h of headers(); track h.def.key) {
                                <div class="min-w-0">
                                    <label [for]="uid + '-' + h.def.key" class="block text-sm font-medium text-muted-color mb-2">{{ h.def.label }} ({{ h.def.unit }})</label>
                                    <input #valueInput [id]="uid + '-' + h.def.key" type="text" inputmode="decimal" autocomplete="off" class="w-full p-inputtext p-component tabular-nums" [formControlName]="h.def.key" [attr.data-testid]="'vital-input-' + h.def.key" />
                                    @if (valueError(h.def.key); as e) {
                                        <small class="text-danger block">{{ e }}</small>
                                    } @else if (!editing() && h.current) {
                                        <small class="text-muted-color block tabular-nums">son {{ h.currentText }} · {{ h.current.measuredAtUtc | trDateTime }}</small>
                                    }
                                </div>
                            }
                            <div class="col-span-2 @5xl:col-span-1 min-w-0">
                                <label [for]="uid + '-at'" class="block text-sm font-medium text-muted-color mb-2">Ölçüm zamanı</label>
                                <app-date-input [inputId]="uid + '-at'" type="datetime-local" formControlName="measuredAtLocal" limit="past" />
                                @if (form.controls.measuredAtLocal.hasError('dateYearInvalid') && form.controls.measuredAtLocal.touched) {
                                    <small class="text-danger block">Yıl 4 haneli olmalıdır.</small>
                                } @else if (timeError(); as e) {
                                    <small class="text-danger block" data-testid="vital-time-error">{{ e }}</small>
                                } @else if (!editing()) {
                                    <small class="text-muted-color block">Boş bırakırsanız şimdi. Geriye en çok {{ backdateDays }} gün.</small>
                                }
                            </div>
                            <div class="col-span-2 @5xl:col-span-full @5xl:order-last min-w-0 flex flex-col gap-3">
                                <div>
                                    <input type="text" class="w-full p-inputtext p-component" formControlName="note" [attr.maxlength]="noteMax" placeholder="Not (isteğe bağlı)" aria-label="Not" data-testid="vital-note" />
                                </div>
                                @if (needsLateReason()) {
                                    <div>
                                        <label [for]="uid + '-late'" class="block text-sm font-medium text-muted-color mb-2">Sonradan ekleme gerekçesi *</label>
                                        <textarea [id]="uid + '-late'" rows="2" class="w-full p-inputtext p-component" formControlName="lateEntryReason" [attr.maxlength]="lateReasonMax" data-testid="vital-late-reason"></textarea>
                                        @if (lateError(); as e) {
                                            <small class="text-danger block">{{ e }}</small>
                                        } @else {
                                            <small class="text-muted-color block">Muayene kesinleştirildi; ölçüm gerekçe yazılarak eklenir.</small>
                                        }
                                    </div>
                                }
                            </div>
                            <div class="col-span-2 @2xl:col-span-4 @5xl:col-span-1 @5xl:pt-7 flex flex-wrap justify-end gap-2">
                                @if (editing()) {
                                    <button pButton type="button" severity="secondary" [disabled]="submitting()" (click)="cancelEdit()" data-testid="vital-edit-discard">Vazgeç</button>
                                }
                                <button pButton type="submit" [disabled]="ro.mutationBlocked() || submitting() || conflict()" appReadOnlyReason data-testid="vital-save">
                                    <i class="p-button-icon" [class]="submitting() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>{{ editing() ? 'Güncelle' : 'Kaydet' }}
                                </button>
                            </div>
                        </div>
                        @if (attempted() && form.hasError('valueRequired')) {
                            <p class="text-danger mt-3 mb-0" role="alert" data-testid="vital-value-required">En az bir değer girin.</p>
                        }
                        @if (conflict()) {
                            <div class="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-4 mt-3" role="alert" data-testid="vital-conflict">
                                <p class="text-amber-800 dark:text-amber-200 m-0 font-medium">{{ submitError() }}</p>
                                <div class="mt-3">
                                    <button pButton type="button" severity="secondary" size="small" (click)="discardAndReload()"><i class="p-button-icon pi pi-refresh"></i>Yazdıklarımı atıp güncel kaydı yükle</button>
                                </div>
                            </div>
                        } @else if (submitError()) {
                            <p class="text-danger mt-3 mb-0" role="alert" data-testid="vital-submit-error">{{ submitError() }}</p>
                        }
                    </form>
                }

                @if (error()) {
                    <app-error-state [detail]="error()!" (retry)="reload()" />
                } @else if (loading() && !series()) {
                    <app-loading-state message="Vital ölçümleri yükleniyor…" />
                } @else if (rows().length === 0) {
                    <p class="m-0 field-empty" data-testid="vital-empty">{{ mode() === 'pet' && range() !== 'all' ? 'Bu dönemde vital ölçümü yok.' : 'Vital ölçümü yok.' }}</p>
                    @if (!showCancelled()) {
                        <button type="button" class="mt-2 p-0 border-0 bg-transparent text-primary text-sm font-medium cursor-pointer" (click)="setShowCancelled(true)">İptal edilenleri göster</button>
                    }
                } @else {
                    <div class="grid grid-cols-1 @2xl:grid-cols-2 gap-3" [class.opacity-60]="loading()" [attr.aria-busy]="loading()">
                        @for (h of headers(); track h.def.key) {
                            <div class="rounded-border border border-surface-200 dark:border-surface-700 px-3 pt-3 pb-1 min-w-0" [attr.data-testid]="'vital-panel-' + h.def.key">
                                <div class="text-sm font-medium text-muted-color">{{ h.def.label }}</div>
                                <div class="flex flex-wrap items-baseline gap-x-3">
                                    <span class="text-2xl font-semibold tabular-nums text-surface-900 dark:text-surface-0">
                                        {{ h.currentText ?? '—' }}<span class="text-sm font-medium text-muted-color ml-1">{{ h.def.unit }}</span>
                                    </span>
                                    @if (h.current) {
                                        <span class="text-sm text-muted-color tabular-nums whitespace-nowrap">
                                            @if (h.deltaText) {
                                                <i class="pi text-xs" [class]="h.deltaIcon" aria-hidden="true"></i> {{ h.deltaText }} ·
                                            }
                                            {{ h.current.measuredAtUtc | trDateTime }}
                                        </span>
                                    }
                                </div>
                                <app-vital-trend-chart [sign]="h.def" [points]="points()" [domain]="domain()" [selectedKey]="selectedKey()" [hoverTime]="hoverTime()" [height]="mode() === 'examination' ? 120 : 150" (hovered)="hoverTime.set($event)" (picked)="select($event)" />
                            </div>
                        }
                    </div>
                    <p class="mt-2 mb-0 text-xs text-muted-color flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span class="inline-flex items-center gap-1"><span class="inline-block w-2 h-2 rounded-full bg-primary"></span>Vital ölçümü</span>
                        <span class="inline-flex items-center gap-1"><span class="inline-block w-2 h-2 rounded-full border-2 border-primary"></span>Muayeneden</span>
                        @if (series()?.truncated) {
                            <span data-testid="vital-truncated">Çok ölçüm var; yalnız en yenileri gösteriliyor.</span>
                        }
                        @if (series()?.examinationsOmitted) {
                            <span data-testid="vital-exams-omitted">Muayene yetkiniz olmadığı için muayenedeki ölçümler gösterilmiyor.</span>
                        }
                    </p>

                    <div class="mt-3 pt-3 border-t border-surface-200 dark:border-surface-700 flex flex-wrap items-start gap-2 min-h-12" data-testid="vital-selection">
                        @if (selected(); as s) {
                            <div class="flex-1 basis-80 min-w-0">
                                <p class="m-0 break-words">
                                    <span class="font-semibold tabular-nums">{{ s.measuredAtUtc | trDateTime }}</span> · <span [class.line-through]="s.cancelled">{{ summaryOf(s) }}</span>
                                </p>
                                <p class="m-0 text-sm text-muted-color">
                                    {{ linkLabel(s) }}
                                    @if (detail()?.addedAfterFinalization) {
                                        · kesinleştirmeden sonra eklendi
                                    }
                                </p>
                                @if (detail(); as d) {
                                    @if (d.note) {
                                        <p class="m-0 text-sm whitespace-pre-wrap break-words" data-testid="vital-detail-note">Not: {{ d.note }}</p>
                                    }
                                    @if (d.lateEntryReason) {
                                        <p class="m-0 text-sm text-muted-color whitespace-pre-wrap break-words">Sonradan ekleme gerekçesi: {{ d.lateEntryReason }}</p>
                                    }
                                    @if (d.cancelledAtUtc) {
                                        <p class="m-0 text-sm text-red-700 dark:text-red-300 whitespace-pre-wrap break-words" data-testid="vital-detail-cancelled">
                                            <i class="pi pi-ban text-xs" aria-hidden="true"></i> İptal edildi · {{ d.cancelledAtUtc | trDateTime }} · Gerekçe: {{ d.cancelReason ?? '—' }}
                                        </p>
                                    } @else if (lockedByFinalizedExamination()) {
                                        <p class="m-0 text-sm text-muted-color" data-testid="vital-locked">Kesinleşmiş muayeneye bağlı ölçüm düzenlenemez. Düzeltmek için iptal edip yeniden girin.</p>
                                    }
                                } @else if (detailError()) {
                                    <p class="m-0 text-sm text-danger" role="alert">{{ detailError() }}</p>
                                }
                            </div>
                            @if (s.source === 'Examination') {
                                @if (s.sourceId !== examinationId()) {
                                    <a [routerLink]="['/panel/examinations', s.sourceId]" pButton type="button" size="small" class="p-button-outlined p-button-secondary" data-testid="vital-open-exam">Muayeneyi aç</a>
                                }
                            } @else {
                                @if (canEditSelected()) {
                                    <button pButton type="button" size="small" class="p-button-outlined p-button-secondary" (click)="startEdit()" data-testid="vital-edit"><i class="pi pi-pencil"></i>Düzenle</button>
                                }
                                @if (canCancelSelected()) {
                                    <button pButton type="button" size="small" class="p-button-danger p-button-outlined" (click)="cancelVisible.set(true)" data-testid="vital-cancel"><i class="pi pi-ban"></i>İptal et</button>
                                }
                                <app-record-history-button resource="vital-measurements" [recordId]="s.sourceId" />
                            }
                            <button pButton type="button" size="small" class="p-button-text p-button-secondary" aria-label="Seçimi kapat" (click)="select(s.key)"><i class="pi pi-times"></i></button>
                        } @else {
                            <p class="m-0 text-sm text-muted-color">Grafikte bir noktaya tıklayın: o saatin bütün değerleri{{ canWrite() ? ', düzenleme ve iptal' : '' }} burada açılır.</p>
                        }
                    </div>

                    <details class="mt-3" [open]="tableOpen()" (toggle)="tableOpen.set($any($event.target).open)" data-testid="vital-table">
                        <summary class="cursor-pointer text-primary text-sm font-medium">Tablo olarak göster ({{ rows().length }} ölçüm)</summary>
                        <div class="flex items-center gap-2 mt-3">
                            <p-checkbox [inputId]="uid + '-cancelled'" [binary]="true" [ngModel]="showCancelled()" (ngModelChange)="setShowCancelled($event)" data-testid="vital-show-cancelled" />
                            <label [for]="uid + '-cancelled'" class="text-sm cursor-pointer">İptal edilenleri göster</label>
                            @if (cancelledError()) {
                                <span class="text-sm text-danger" role="alert">{{ cancelledError() }}</span>
                            }
                        </div>
                        <div class="overflow-x-auto mt-2 rounded-border border border-surface-200 dark:border-surface-700">
                            <table class="w-full text-sm tabular-nums border-collapse">
                                <thead>
                                    <tr class="text-muted-color">
                                        <th scope="col" class="text-left font-medium px-3 py-2 whitespace-nowrap">Zaman</th>
                                        @for (def of signs; track def.key) {
                                            <th scope="col" class="text-right font-medium px-3 py-2 whitespace-nowrap">{{ def.label }} ({{ def.unit }})</th>
                                        }
                                        <th scope="col" class="text-left font-medium px-3 py-2 whitespace-nowrap">Kaynak</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    @for (row of rows(); track row.key) {
                                        <tr [class]="'border-t border-surface-200 dark:border-surface-700' + (row.key === selectedKey() ? ' bg-primary-50 dark:bg-primary-950/30' : '')" data-testid="vital-row">
                                            <td class="px-3 py-2 whitespace-nowrap">
                                                <button type="button" class="p-0 border-0 bg-transparent text-primary font-medium cursor-pointer" [attr.aria-pressed]="row.key === selectedKey()" (click)="select(row.key)">{{ row.measuredAtUtc | trDateTime }}</button>
                                            </td>
                                            @for (def of signs; track def.key) {
                                                <td class="px-3 py-2 text-right whitespace-nowrap" [class.line-through]="row.cancelled" [class.text-muted-color]="row.cancelled">{{ valueText(def, row[def.key]) }}</td>
                                            }
                                            <td class="px-3 py-2 whitespace-nowrap">{{ linkLabel(row) }}{{ row.cancelled ? ' · iptal' : '' }}</td>
                                        </tr>
                                    }
                                </tbody>
                            </table>
                        </div>
                    </details>
                }
            </section>

            <app-reason-confirm-dialog
                [(visible)]="cancelVisible"
                header="Ölçümü iptal et"
                [summary]="cancelSummary()"
                description="Yanlış girilen ölçüm içindir. İptal edilen ölçüm silinmez; eğilimde ve tabloda varsayılan olarak gizlenir. Geri alınamaz."
                confirmLabel="Ölçümü iptal et"
                failureFallback="Ölçüm iptal edilemedi."
                [execute]="cancelMeasurement"
                (confirmed)="onCancelled()"
            />
        }
    `
})
export class VitalMeasurementsSectionComponent {
    readonly petId = input.required<string>();
    /** Yatış detayı: ölçümler yatışa bağlanır, eğilim yatış süresini gösterir. */
    readonly hospitalizationId = input<string | null>(null);
    readonly admittedAtUtc = input<string | null>(null);
    /** Muayene: yeniden ölçümler muayeneye bağlanır, eğilim hastanın geçmişini gösterir. */
    readonly examinationId = input<string | null>(null);
    readonly examinationFinalized = input(false);
    /** Yeni ölçüm girilemez (taburcu ya da iptal edilmiş yatış, vefat etmiş hasta); mevcut ölçümler düzeltilebilir. */
    readonly entryClosed = input(false);

    private readonly service = inject(VitalMeasurementsService);
    private readonly auth = inject(AuthService);
    private readonly fb = inject(FormBuilder);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly canRead = this.auth.hasOperationClaim(VITAL_MEASUREMENTS_READ_CLAIM);
    private readonly canCreate = this.auth.hasOperationClaim(VITAL_MEASUREMENTS_CREATE_CLAIM);
    private readonly canUpdate = this.auth.hasOperationClaim(VITAL_MEASUREMENTS_UPDATE_CLAIM);
    readonly canAdd = computed(() => this.canCreate && !this.ro.mutationBlocked() && !this.entryClosed());
    protected readonly canWrite = computed(() => this.canUpdate && !this.ro.mutationBlocked());

    protected readonly uid = `vital-${++nextSectionId}`;
    protected readonly signs = VITAL_SIGNS;
    protected readonly noteMax = VITAL_NOTE_MAX;
    protected readonly lateReasonMax = VITAL_LATE_REASON_MAX;
    protected readonly backdateDays = VITAL_BACKDATE_DAYS;
    protected readonly rangeOptions: ReadonlyArray<{ label: string; value: VitalRange }> = [
        { label: 'Son 7 gün', value: '7d' },
        { label: '1 yıl', value: '1y' },
        { label: 'Tümü', value: 'all' }
    ];

    readonly mode = computed(() => (this.hospitalizationId() ? 'hospitalization' : this.examinationId() ? 'examination' : 'pet'));
    readonly range = signal<VitalRange>('1y');

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly series = signal<VitalSeriesVm | null>(null);
    /** Eğilimin okunduğu an: zaman ekseni buraya kadar uzar, dönem başlangıcı buradan hesaplanır. */
    private readonly loadedAt = signal(Date.now());

    readonly showCancelled = signal(false);
    private readonly cancelled = signal<VitalPointVm[]>([]);
    protected readonly cancelledError = signal<string | null>(null);

    protected readonly hoverTime = signal<number | null>(null);
    readonly selectedKey = signal<string | null>(null);
    readonly detail = signal<VitalMeasurementDetailVm | null>(null);
    protected readonly detailError = signal<string | null>(null);
    private detailRequest: Subscription | null = null;
    /** Son okunan hasta/yatış; değişince önceki kaydın eğilimi ekranda kalmaz. */
    private loadedSubject = '';

    readonly editing = signal<VitalMeasurementDetailVm | null>(null);
    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);
    readonly conflict = signal(false);
    protected readonly attempted = signal(false);
    protected readonly timeError = signal<string | null>(null);
    protected readonly lateError = signal<string | null>(null);
    readonly cancelVisible = signal(false);
    protected readonly tableOpen = signal(false);

    private readonly valueInputs = viewChild<ElementRef<HTMLInputElement>>('valueInput');

    readonly form = this.fb.nonNullable.group(
        {
            temperatureC: ['', vitalInputValidator(VITAL_SIGNS[0])],
            heartRateBpm: ['', vitalInputValidator(VITAL_SIGNS[1])],
            respiratoryRatePerMin: ['', vitalInputValidator(VITAL_SIGNS[2])],
            weightKg: ['', vitalInputValidator(VITAL_SIGNS[3])],
            measuredAtLocal: ['', dateTimeYearRangeValidator()],
            note: ['', Validators.maxLength(VITAL_NOTE_MAX)],
            lateEntryReason: ['']
        },
        { validators: atLeastOneVital }
    );

    /** İptal edilmemiş noktalar, artan zaman (grafikler). */
    readonly points = computed(() => this.series()?.points ?? []);

    /** Tablo satırları: en yeni üstte; istenirse iptal edilenlerle birlikte. */
    readonly rows = computed(() => [...this.points(), ...(this.showCancelled() ? this.cancelled() : [])].sort((a, b) => b.time - a.time));

    readonly selected = computed(() => {
        const key = this.selectedKey();

        return key ? (this.rows().find((r) => r.key === key) ?? null) : null;
    });

    /** Ortak zaman ekseni: yatışta yatış anından başlar; açık kayıtlarda okuma anına kadar uzar. */
    protected readonly domain = computed<readonly [number, number]>(() => {
        const pts = this.points();
        const admittedAt = this.admittedAtUtc() ? Date.parse(this.admittedAtUtc()!) : Number.NaN;
        const first = pts.length ? pts[0].time : this.loadedAt();
        const last = pts.length ? pts[pts.length - 1].time : this.loadedAt();
        const from = this.mode() === 'hospitalization' && !Number.isNaN(admittedAt) ? Math.min(admittedAt, first) : first;

        return [from, this.entryClosed() ? last : Math.max(last, this.loadedAt())];
    });

    /** Her ölçü için son değer ve bir önceki ölçüme göre fark (grafik başlığı ve giriş kutusu ipucu). */
    protected readonly headers = computed(() =>
        VITAL_SIGNS.map((def) => {
            const filled = this.points().filter((p) => p[def.key] !== null);
            const current = filled[filled.length - 1] ?? null;
            const previous = filled[filled.length - 2] ?? null;
            const delta = current && previous ? Number(((current[def.key] as number) - (previous[def.key] as number)).toFixed(def.decimals)) : null;

            return {
                def,
                current,
                currentText: current ? formatVitalValue(def, current[def.key] as number) : null,
                deltaText: delta === null ? null : delta === 0 ? 'değişmedi' : `${delta > 0 ? '+' : '−'}${formatVitalValue(def, Math.abs(delta))}`,
                deltaIcon: delta === null || delta === 0 ? 'pi-minus' : delta > 0 ? 'pi-arrow-up-right' : 'pi-arrow-down-right'
            };
        })
    );

    /** Kesinleşmiş muayeneye yeni ölçüm gerekçe ister (D7). */
    protected readonly needsLateReason = computed(() => !this.editing() && this.mode() === 'examination' && this.examinationFinalized());

    /** Bu muayeneye bağlı ölçüm, muayene kesinleşince düzenlenemez (D7); iptal edilebilir. */
    protected readonly lockedByFinalizedExamination = computed(() => {
        const d = this.detail();

        return !!d && this.examinationFinalized() && !!this.examinationId() && d.examinationId === this.examinationId();
    });

    protected readonly canEditSelected = computed(() => {
        const d = this.detail();

        return this.canWrite() && !!d && !d.cancelledAtUtc && !this.lockedByFinalizedExamination() && !this.editing();
    });

    protected readonly canCancelSelected = computed(() => {
        const d = this.detail();

        return this.canWrite() && !!d && !d.cancelledAtUtc && !this.editing();
    });

    protected readonly cancelSummary = computed(() => {
        const s = this.selected();

        return s ? `${formatUtcIsoAsLocalDateTimeDisplay(s.measuredAtUtc)} · ${vitalSummary(s)}` : null;
    });

    /** Gerekçeli iptal; seçili kaydın okunduğu sürümle (çakışmada backend mesajı diyalogda kalır). */
    protected readonly cancelMeasurement = (reason: string) => this.service.cancel(this.detail()!.id, reason, this.detail()!.rowVersion);

    constructor() {
        effect(() => {
            this.petId();
            this.hospitalizationId();
            this.range();

            if (this.canRead) {
                untracked(() => {
                    const subject = `${this.petId()}|${this.hospitalizationId() ?? ''}`;

                    if (subject !== this.loadedSubject) {
                        this.loadedSubject = subject;
                        this.series.set(null);
                    }

                    this.selectedKey.set(null);
                    this.clearDetail();
                    this.editing.set(null);
                    this.reload();
                });
            }
        });
    }

    reload(selectKey?: string): void {
        const now = Date.now();
        const days = this.mode() === 'pet' ? RANGE_DAYS[this.range()] : null;
        const fromUtc = days === null ? null : new Date(now - days * DAY_MS).toISOString();

        this.loading.set(true);
        this.error.set(null);
        this.service.getSeries({ petId: this.petId(), hospitalizationId: this.hospitalizationId(), fromUtc }).subscribe({
            next: (series) => {
                this.loadedAt.set(now);
                this.series.set(series);
                this.loading.set(false);

                if (selectKey) {
                    this.selectedKey.set(null);
                    this.select(selectKey);
                }
            },
            error: (e: Error) => {
                this.error.set(panelHttpFailureMessage(e, 'Vital ölçümleri yüklenemedi.'));
                this.loading.set(false);
            }
        });

        if (this.showCancelled()) {
            this.loadCancelled();
        }
    }

    /** Seçimi açar ya da aynı noktada kapatır; vital ölçümü kaydında not, iptal bilgisi ve sürüm için detay okunur. */
    select(key: string): void {
        if (this.editing()) {
            return;
        }

        this.clearDetail();

        if (this.selectedKey() === key) {
            this.selectedKey.set(null);

            return;
        }

        this.selectedKey.set(key);
        const point = this.selected();

        if (point?.source === 'VitalMeasurement') {
            this.loadDetail(point.sourceId);
        }
    }

    setShowCancelled(show: boolean): void {
        this.showCancelled.set(show);
        this.cancelledError.set(null);

        if (show) {
            this.loadCancelled();
        } else if (this.selected() === null) {
            this.selectedKey.set(null);
            this.clearDetail();
        }
    }

    startEdit(): void {
        const d = this.detail();

        if (!d || !this.canEditSelected()) {
            return;
        }

        this.editing.set(d);
        this.resetFormState();
        this.form.reset({
            temperatureC: vitalInputText(d.temperatureC),
            heartRateBpm: vitalInputText(d.heartRateBpm),
            respiratoryRatePerMin: vitalInputText(d.respiratoryRatePerMin),
            weightKg: vitalInputText(d.weightKg),
            measuredAtLocal: toIstanbulDateTimeLocalInputValue(d.measuredAtUtc),
            note: d.note ?? '',
            lateEntryReason: ''
        });
        this.focusFirstInput();
    }

    cancelEdit(): void {
        if (!this.editing() || this.submitting()) {
            return;
        }

        this.editing.set(null);
        this.resetFormState();
        this.form.reset();
    }

    /** Çakışmada yazılanlar atılır; eğilim ve seçili kayıt (yeni `rowVersion` ile) yeniden yüklenir. */
    discardAndReload(): void {
        const key = this.selectedKey();

        this.editing.set(null);
        this.resetFormState();
        this.form.reset();
        this.reload(key ?? undefined);
    }

    onSubmit(): void {
        if (this.submitting() || this.ro.mutationBlocked()) {
            return;
        }

        const editing = this.editing();
        const raw = this.form.getRawValue();
        const measuredAtUtc = this.resolveMeasuredAt(raw.measuredAtLocal, editing);
        const lateReason = raw.lateEntryReason.trim();

        this.attempted.set(true);
        this.submitError.set(null);
        this.conflict.set(false);
        this.timeError.set(measuredAtUtc.error);
        this.lateError.set(
            this.needsLateReason() && (lateReason.length < VITAL_LATE_REASON_MIN || lateReason.length > VITAL_LATE_REASON_MAX) ? `Gerekçe ${VITAL_LATE_REASON_MIN}–${VITAL_LATE_REASON_MAX} karakter olmalı.` : null
        );

        if (this.form.invalid || measuredAtUtc.error || this.lateError()) {
            this.form.markAllAsTouched();

            return;
        }

        const write = { ...vitalValuesFromInputs(raw), measuredAtUtc: measuredAtUtc.value, note: raw.note.trim() || null };

        this.submitting.set(true);

        if (editing) {
            this.service.update(editing.id, write, editing.rowVersion).subscribe({
                next: () => {
                    this.submitting.set(false);
                    this.editing.set(null);
                    this.resetFormState();
                    this.form.reset();
                    this.reload(`VitalMeasurement:${editing.id}`);
                },
                error: (e: unknown) => this.onSaveError(e)
            });

            return;
        }

        this.service
            .create({ ...write, petId: this.petId(), hospitalizationId: this.hospitalizationId(), examinationId: this.hospitalizationId() ? null : this.examinationId(), lateEntryReason: this.needsLateReason() ? lateReason : null })
            .subscribe({
                next: ({ id }) => {
                    this.submitting.set(false);
                    this.resetFormState();
                    this.form.reset();
                    this.reload(`VitalMeasurement:${id}`);
                    this.focusFirstInput();
                },
                error: (e: unknown) => this.onSaveError(e)
            });
    }

    protected onCancelled(): void {
        const key = this.selectedKey();

        // İptal edilenler görünüyorsa kayıt seçili kalır (iptal bilgisiyle); gizliyse seçim kapanır.
        this.reload(this.showCancelled() && key ? key : undefined);

        if (!this.showCancelled()) {
            this.selectedKey.set(null);
            this.clearDetail();
        }
    }

    protected valueError(key: VitalSignKey): string | null {
        const control = this.form.controls[key];

        return control.invalid && (control.touched || control.dirty) ? ((control.errors?.['vital'] as string | undefined) ?? null) : null;
    }

    protected valueText(def: VitalSignDefinition, value: number | null): string {
        return value === null ? '—' : formatVitalValue(def, value);
    }

    protected summaryOf(point: VitalPointVm): string {
        return vitalSummary(point);
    }

    protected linkLabel(point: VitalPointVm): string {
        return point.source === 'Examination' ? 'Muayeneden' : point.hospitalizationId ? 'Yatışa bağlı' : point.examinationId ? 'Muayeneye bağlı' : 'Serbest ölçüm';
    }

    /**
     * Ölçüm zamanı: boşsa şimdi. Düzenlemede zaman değişmediyse kaydın kendi zamanı aynen gönderilir ve yeniden denetlenmez
     * (eski kayıtta değer düzeltmek 7 gün kuralına takılmasın; kararı sunucu verir).
     */
    private resolveMeasuredAt(local: string, editing: VitalMeasurementDetailVm | null): { value: string; error: string | null } {
        if (editing && local === toIstanbulDateTimeLocalInputValue(editing.measuredAtUtc)) {
            return { value: editing.measuredAtUtc, error: null };
        }

        const value = local ? fromIstanbulDateTimeLocalInputToUtcIso(local) : new Date().toISOString();

        if (!value) {
            return { value: '', error: 'Geçerli bir ölçüm zamanı girin.' };
        }

        const linkedToThisHospitalization = editing ? !!this.hospitalizationId() && editing.hospitalizationId === this.hospitalizationId() : this.mode() === 'hospitalization';

        return { value, error: measuredAtError(value, Date.now(), linkedToThisHospitalization ? this.admittedAtUtc() : null) };
    }

    private onSaveError(e: unknown): void {
        this.submitting.set(false);

        if (e instanceof HttpErrorResponse) {
            this.conflict.set(e.status === 409 && problemCodeFromHttpError(e) === VITAL_CONCURRENCY_CONFLICT_CODE);
            this.submitError.set(messageFromHttpError(e, SAVE_FALLBACK, VITAL_UPDATE_PROBLEM_OVERRIDES));

            return;
        }

        this.submitError.set(e instanceof Error ? e.message : SAVE_FALLBACK);
    }

    private loadDetail(id: string): void {
        this.detailRequest = this.service.getById(id).subscribe({
            next: (d) => this.detail.set(d),
            error: (e: Error) => this.detailError.set(panelHttpFailureMessage(e, 'Ölçüm yüklenemedi.'))
        });
    }

    private loadCancelled(): void {
        const admittedAt = this.mode() === 'hospitalization' ? this.admittedAtUtc() : null;
        const days = this.mode() === 'pet' ? RANGE_DAYS[this.range()] : null;
        const dateFromUtc = admittedAt ?? (days === null ? null : new Date(Date.now() - days * DAY_MS).toISOString());

        this.service.getCancelled({ petId: this.petId(), dateFromUtc }).subscribe({
            next: (points) => this.cancelled.set(points),
            error: (e: Error) => this.cancelledError.set(panelHttpFailureMessage(e, 'İptal edilen ölçümler yüklenemedi.'))
        });
    }

    private clearDetail(): void {
        this.detailRequest?.unsubscribe();
        this.detailRequest = null;
        this.detail.set(null);
        this.detailError.set(null);
    }

    private resetFormState(): void {
        this.attempted.set(false);
        this.submitError.set(null);
        this.conflict.set(false);
        this.timeError.set(null);
        this.lateError.set(null);
    }

    private focusFirstInput(): void {
        queueMicrotask(() => this.valueInputs()?.nativeElement.focus());
    }
}
