import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { AuthService } from '@/app/core/auth/auth.service';
import { CASH_COUNTS_CORRECT_CLAIM, CASH_COUNTS_CREATE_CLAIM, CASH_REGISTERS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import type { CashRegisterDto } from '@/app/entities/cash-register/models/cash-register.model';
import { CashRegistersService } from '@/app/entities/cash-register/services/cash-registers.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AppPlanUpgradeNoticeComponent } from '@/app/entities/subscription/components/app-plan-upgrade-notice.component';
import { CASH_COUNT_EXPECTED_CHANGED_CODE, CASH_COUNT_MAX_AMOUNT, CASH_COUNT_NOTE_MAX, type CashCountAmountsBody, type CashCountDayDto, type CashCountDto } from '@/app/features/reports/end-of-day/models/cash-count.model';
import { CashCountService } from '@/app/features/reports/end-of-day/services/cash-count.service';
import { cashCountDifferenceLabel, cashCountDifferenceTone, cashCountPreview, ymdDaysBefore } from '@/app/features/reports/end-of-day/utils/cash-count.utils';
import { dayText } from '@/app/features/reports/registers/data/register-definition';
import { REASON_MAX, REASON_MIN } from '@/app/shared/forms/reason-length.validator';
import { MoneyPipe } from '@/app/shared/pipes/money.pipe';
import { panelHttpFailureMessage, problemCodeFromHttpError } from '@/app/shared/utils/api-error.utils';
import { formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';

type Mode = 'view' | 'correct' | 'void';

/** Geçmiş listesi: seçilen günle biten son 30 gün. */
const HISTORY_DAYS = 30;

/**
 * Günlük kasa kontrolü (TIER-008, `CASH_COUNT_API_CONTRACT.md`): seçilen gün, tek klinik ve kasa için açılış ve sayılan nakit. Beklenen
 * nakit kasanın gün netidir: nakit tahsilat (kasa özetinin nakit satırı) ile kasa giriş/çıkışı ve aktarımlar; sunucu hesaplar. Birden
 * fazla kasa varsa kasa seçilir, yoksa Ana kasa. Kayıt Profesyonel ve Kurumsal'da; okuma her pakette. Düzeltme kaydı ezmez, eski kayıt
 * gerekçeyle iptal edilir ve günün izinde kalır.
 */
@Component({
    selector: 'app-cash-count-panel',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, ButtonModule, InputNumberModule, AppPlanUpgradeNoticeComponent, MoneyPipe, SelectModule],
    styles: `
        .cash-count-expected {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem 1.5rem;
            padding: 0.75rem 1rem;
            border-radius: var(--content-border-radius, 6px);
            background: var(--p-content-hover-background, var(--surface-ground));
            font-size: 0.875rem;
        }

        .cash-count-expected-total {
            margin-left: auto;
        }

        .cash-count-result,
        .cash-count-form {
            margin-top: 1rem;
        }

        .cash-count-figures {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
            gap: 0.75rem 1rem;
            margin: 0;

            dt {
                font-size: 0.875rem;
                color: var(--text-color-secondary);
            }

            dd {
                margin: 0.25rem 0 0;
                font-size: 1.25rem;
                font-weight: 500;
            }
        }

        .cash-count-diff[data-tone='even'] {
            color: var(--p-green-700, #15803d);
        }

        .cash-count-diff[data-tone='over'] {
            color: var(--p-orange-600, #ea580c);
        }

        .cash-count-diff[data-tone='short'],
        .cash-count-warn {
            color: var(--p-red-600, #dc2626);
        }

        @media print {
            .cash-count-diff[data-tone],
            .cash-count-warn {
                color: inherit;
            }
        }
    `,
    template: `
        <section class="card mb-4 cash-count" aria-labelledby="eodCashCountTitle" data-testid="cash-count">
            <h5 id="eodCashCountTitle" class="mt-0 mb-1">Kasa kontrolü</h5>
            <p class="text-sm text-muted-color mt-0 mb-3">{{ dayLabel(date()) }} · yalnız nakit. Kart ve havale kasaya girmez.</p>

            @if (registers().length > 1) {
                <div class="mb-3 eod-screen-only" data-testid="cash-count-register">
                    <label for="ccRegister" class="block text-sm font-medium text-muted-color mb-2">Kasa</label>
                    <p-select inputId="ccRegister" [options]="registers()" optionLabel="name" optionValue="id" [ngModel]="registerId()" (ngModelChange)="selectRegister($event)" styleClass="w-full sm:w-72" />
                </div>
            }

            @if (loadError(); as err) {
                <p class="text-danger text-sm m-0" role="alert">{{ err }}</p>
            } @else if (day(); as d) {
                <div class="cash-count-expected" data-testid="cash-count-expected">
                    <span
                        >Nakit tahsilat <strong>{{ d.cash.collectedAmount | money }}</strong></span
                    >
                    <span
                        >İptal <strong>−{{ d.cash.voidedAmount | money }}</strong></span
                    >
                    @if (d.cash.refundedCreditAmount) {
                        <span
                            >Kredi iadesi <strong>−{{ d.cash.refundedCreditAmount | money }}</strong></span
                        >
                    }
                    @if (d.movements.inAmount) {
                        <span
                            >Kasa girişi <strong>+{{ d.movements.inAmount | money }}</strong></span
                        >
                    }
                    @if (d.movements.outAmount) {
                        <span
                            >Kasa çıkışı <strong>−{{ d.movements.outAmount | money }}</strong></span
                        >
                    }
                    @if (d.movements.transferInAmount) {
                        <span
                            >Gelen aktarım <strong>+{{ d.movements.transferInAmount | money }}</strong></span
                        >
                    }
                    @if (d.movements.transferOutAmount) {
                        <span
                            >Giden aktarım <strong>−{{ d.movements.transferOutAmount | money }}</strong></span
                        >
                    }
                    <span class="cash-count-expected-total"
                        >Günün kasa neti <strong data-testid="cash-count-expected-total">{{ d.expectedCashAmount | money }}</strong></span
                    >
                </div>

                @if (d.current && mode() !== 'correct') {
                    <div class="cash-count-result" data-testid="cash-count-current">
                        <dl class="cash-count-figures">
                            <div>
                                <dt>Açılış</dt>
                                <dd>{{ d.current.openingAmount | money }}</dd>
                            </div>
                            <div>
                                <dt>Günün kasa neti</dt>
                                <dd>{{ d.current.expectedCashAmount | money }}</dd>
                            </div>
                            <div>
                                <dt>Olması gereken</dt>
                                <dd>{{ d.current.expectedClosingAmount | money }}</dd>
                            </div>
                            <div>
                                <dt>Sayılan</dt>
                                <dd>{{ d.current.countedAmount | money }}</dd>
                            </div>
                            <div class="cash-count-diff" [attr.data-tone]="tone(d.current.differenceAmount)">
                                <dt>{{ differenceLabel(d.current.differenceAmount) }}</dt>
                                <dd data-testid="cash-count-difference">{{ d.current.differenceAmount | money }}</dd>
                            </div>
                        </dl>
                        @if (d.current.note) {
                            <p class="text-sm mt-3 mb-0">Açıklama: {{ d.current.note }}</p>
                        }
                        <p class="text-xs text-muted-color mt-2 mb-0">Kaydeden {{ d.current.createdByName || '—' }} · {{ timeLabel(d.current.createdAtUtc) }}</p>
                        @if (d.expectedChangedSinceCount) {
                            <p class="cash-count-warn text-sm mt-3 mb-0" role="note" data-testid="cash-count-changed">
                                <i class="pi pi-exclamation-triangle mr-1" aria-hidden="true"></i>Sayımdan sonra kasa hareketi değişti; günün kasa neti şimdi {{ d.expectedCashAmount | money }}. Gerekirse düzeltin.
                            </p>
                        }
                        @if (canCorrect() && mode() === 'view') {
                            <div class="flex flex-wrap gap-2 mt-3 eod-screen-only">
                                <button pButton type="button" severity="secondary" [outlined]="true" (click)="startCorrect(d.current)" data-testid="cash-count-correct"><i class="p-button-icon pi pi-pencil"></i>Düzelt</button>
                                <button pButton type="button" severity="danger" [outlined]="true" (click)="startVoid()" data-testid="cash-count-void"><i class="p-button-icon pi pi-times"></i>İptal et</button>
                            </div>
                        }
                    </div>
                } @else if (planLocked() && !d.current) {
                    <app-plan-upgrade-notice
                        feature="CashManagement"
                        detail="Gün sonunda her kasadaki nakdi sayıp beklenenle karşılaştırın; birden fazla kasa, kasa giriş/çıkışı ve aktarım da bu pakettedir. Gün sonu raporu her pakette aynen kalır."
                    />
                } @else if (!d.current && !canCreate()) {
                    <p class="text-sm text-muted-color m-0">Bu gün için kasa sayımı yok.</p>
                }

                @if (showForm()) {
                    <form class="cash-count-form eod-screen-only" (ngSubmit)="submit()" data-testid="cash-count-form">
                        <div class="grid grid-cols-12 gap-4">
                            <div class="col-span-12 sm:col-span-6 lg:col-span-3">
                                <label for="ccOpening" class="block text-sm font-medium text-muted-color mb-2">Açılış (gün başı nakit) *</label>
                                <p-inputnumber
                                    inputId="ccOpening"
                                    name="opening"
                                    [ngModel]="opening()"
                                    (ngModelChange)="opening.set($event)"
                                    mode="decimal"
                                    locale="tr-TR"
                                    [minFractionDigits]="2"
                                    [maxFractionDigits]="2"
                                    [min]="0"
                                    [max]="maxAmount"
                                    styleClass="w-full"
                                    inputStyleClass="w-full"
                                />
                                @if (d.previous && mode() === 'view') {
                                    <small class="text-muted-color">Önceki sayım {{ dayLabel(d.previous.businessDate) }}: {{ d.previous.countedAmount | money }}</small>
                                }
                            </div>
                            <div class="col-span-12 sm:col-span-6 lg:col-span-3">
                                <label for="ccCounted" class="block text-sm font-medium text-muted-color mb-2">Sayılan nakit *</label>
                                <p-inputnumber
                                    inputId="ccCounted"
                                    name="counted"
                                    [ngModel]="counted()"
                                    (ngModelChange)="counted.set($event)"
                                    mode="decimal"
                                    locale="tr-TR"
                                    [minFractionDigits]="2"
                                    [maxFractionDigits]="2"
                                    [min]="0"
                                    [max]="maxAmount"
                                    styleClass="w-full"
                                    inputStyleClass="w-full"
                                />
                            </div>
                            <div class="col-span-12 sm:col-span-6 lg:col-span-3">
                                <span class="block text-sm font-medium text-muted-color mb-2">Olması gereken</span>
                                <div class="p-inputtext p-component w-full font-semibold" aria-live="polite" data-testid="cash-count-preview-closing">{{ preview().closing | money }}</div>
                            </div>
                            <div class="col-span-12 sm:col-span-6 lg:col-span-3 cash-count-diff" [attr.data-tone]="preview().difference === null ? null : tone(preview().difference!)">
                                <span class="block text-sm font-medium text-muted-color mb-2">{{ preview().difference === null ? 'Fark' : differenceLabel(preview().difference!) }}</span>
                                <div class="p-inputtext p-component w-full font-semibold" aria-live="polite" data-testid="cash-count-preview-difference">{{ preview().difference | money }}</div>
                            </div>
                            <div class="col-span-12">
                                <label for="ccNote" class="block text-sm font-medium text-muted-color mb-2">Açıklama{{ noteRequired() ? ' *' : '' }}</label>
                                <textarea id="ccNote" name="note" rows="2" class="w-full p-inputtext p-component" [ngModel]="note()" (ngModelChange)="note.set($event)" [attr.maxlength]="noteMax" placeholder="Fark varsa nedenini yazın"></textarea>
                                @if (noteRequired() && !note().trim()) {
                                    <small class="text-muted-color">Sayılan nakit beklenenden farklıysa açıklama zorunludur.</small>
                                }
                            </div>
                            @if (mode() === 'correct') {
                                <div class="col-span-12">
                                    <label for="ccReason" class="block text-sm font-medium text-muted-color mb-2">Düzeltme gerekçesi *</label>
                                    <input id="ccReason" name="reason" type="text" class="w-full p-inputtext p-component" [ngModel]="reason()" (ngModelChange)="reason.set($event)" [attr.maxlength]="reasonMax" />
                                    <small class="text-muted-color">Önceki kayıt silinmez; gerekçeyle iptal edilir ve günün izinde kalır. {{ reasonMin }}–{{ reasonMax }} karakter.</small>
                                </div>
                            }
                        </div>
                        @if (saveError(); as err) {
                            <p class="text-danger text-sm mt-3 mb-0" role="alert">{{ err }}</p>
                        }
                        <div class="flex flex-wrap gap-2 mt-4">
                            <button pButton type="submit" [disabled]="!canSubmit()" data-testid="cash-count-save">
                                <i class="p-button-icon" [class]="saving() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>{{ mode() === 'correct' ? 'Düzeltmeyi kaydet' : 'Sayımı kaydet' }}
                            </button>
                            @if (mode() === 'correct') {
                                <button pButton type="button" severity="secondary" (click)="cancel()" [disabled]="saving()"><i class="p-button-icon pi pi-times"></i>Vazgeç</button>
                            }
                        </div>
                    </form>
                }

                @if (mode() === 'void') {
                    <div class="cash-count-form eod-screen-only" data-testid="cash-count-void-form">
                        <label for="ccVoidReason" class="block text-sm font-medium text-muted-color mb-2">İptal gerekçesi *</label>
                        <input id="ccVoidReason" type="text" class="w-full p-inputtext p-component" [ngModel]="reason()" (ngModelChange)="reason.set($event)" [attr.maxlength]="reasonMax" />
                        <small class="text-muted-color">Gün yeniden sayılabilir hale gelir; kayıt silinmez. {{ reasonMin }}–{{ reasonMax }} karakter.</small>
                        @if (saveError(); as err) {
                            <p class="text-danger text-sm mt-3 mb-0" role="alert">{{ err }}</p>
                        }
                        <div class="flex flex-wrap gap-2 mt-3">
                            <button pButton type="button" severity="danger" [disabled]="saving() || !reasonValid()" (click)="submitVoid()" data-testid="cash-count-void-confirm"><i class="p-button-icon pi pi-check"></i>Sayımı iptal et</button>
                            <button pButton type="button" severity="secondary" (click)="cancel()" [disabled]="saving()"><i class="p-button-icon pi pi-times"></i>Vazgeç</button>
                        </div>
                    </div>
                }

                @if (trail().length > 0) {
                    <details class="mt-4">
                        <summary class="text-sm cursor-pointer">Bu günün düzeltme izi ({{ trail().length }})</summary>
                        <ul class="list-none p-0 m-0 mt-2 flex flex-col gap-2 text-sm" data-testid="cash-count-trail">
                            @for (h of trail(); track h.id) {
                                <li>
                                    <span class="eod-kind eod-kind-void">İptal edildi</span>
                                    Sayılan {{ h.countedAmount | money }}, fark {{ h.differenceAmount | money }} · {{ h.createdByName || '—' }}, {{ timeLabel(h.createdAtUtc) }}
                                    <span class="block text-xs text-muted-color">Gerekçe: {{ h.voidReason }} · {{ h.voidedByName || '—' }}, {{ timeLabel(h.voidedAtUtc) }}</span>
                                </li>
                            }
                        </ul>
                    </details>
                }
            } @else {
                <p class="text-sm text-muted-color m-0">Kasa kontrolü yükleniyor…</p>
            }

            @if (history().length > 0) {
                <div class="overflow-x-auto mt-4">
                    <table class="eod-table" aria-label="Geçmiş kasa sayımları" data-testid="cash-count-history">
                        <caption class="text-left text-sm font-medium mb-2">
                            Son
                            {{
                                historyDays
                            }}
                            günün sayımları
                        </caption>
                        <thead>
                            <tr>
                                <th>Gün</th>
                                <th class="text-right">Açılış</th>
                                <th class="text-right">Kasa neti</th>
                                <th class="text-right">Sayılan</th>
                                <th class="text-right">Fark</th>
                                <th>Kaydeden</th>
                            </tr>
                        </thead>
                        <tbody>
                            @for (h of history(); track h.id) {
                                <tr>
                                    <td>{{ dayLabel(h.businessDate) }}</td>
                                    <td class="text-right">{{ h.openingAmount | money }}</td>
                                    <td class="text-right">{{ h.expectedCashAmount | money }}</td>
                                    <td class="text-right">{{ h.countedAmount | money }}</td>
                                    <td class="text-right font-medium cash-count-diff" [attr.data-tone]="tone(h.differenceAmount)">{{ h.differenceAmount | money }}</td>
                                    <td>
                                        {{ h.createdByName || '—' }}
                                        @if (h.note) {
                                            <span class="block text-xs text-muted-color">{{ h.note }}</span>
                                        }
                                    </td>
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>
            }
        </section>
    `
})
export class CashCountPanelComponent {
    /** Seçilen gün (`yyyy-MM-dd`). */
    readonly date = input.required<string>();
    readonly clinicId = input.required<string>();

    private readonly service = inject(CashCountService);
    private readonly registersService = inject(CashRegistersService);
    private readonly auth = inject(AuthService);
    private readonly ro = inject(TenantReadOnlyContextService);

    protected readonly maxAmount = CASH_COUNT_MAX_AMOUNT;
    protected readonly noteMax = CASH_COUNT_NOTE_MAX;
    protected readonly reasonMin = REASON_MIN;
    protected readonly reasonMax = REASON_MAX;
    protected readonly historyDays = HISTORY_DAYS;
    protected readonly dayLabel = dayText;
    protected readonly differenceLabel = cashCountDifferenceLabel;
    protected readonly tone = cashCountDifferenceTone;

    readonly day = signal<CashCountDayDto | null>(null);
    readonly history = signal<readonly CashCountDto[]>([]);
    readonly loadError = signal<string | null>(null);
    readonly mode = signal<Mode>('view');
    readonly opening = signal<number | null>(null);
    readonly counted = signal<number | null>(null);
    readonly note = signal('');
    readonly reason = signal('');
    readonly saving = signal(false);
    readonly saveError = signal<string | null>(null);
    /** Klinikteki aktif kasalar; birden fazlaysa seçim gösterilir. */
    readonly registers = signal<CashRegisterDto[]>([]);
    /** Seçilen kasa; boşsa Ana kasa (sunucu). */
    readonly registerId = signal<string | null>(null);
    private seq = 0;
    private registersSeq = 0;

    readonly planLocked = computed(() => this.ro.lockedPlanFeature('CashManagement') !== null);
    private readonly writable = computed(() => !this.planLocked() && !this.ro.mutationBlocked());
    readonly canCreate = computed(() => this.writable() && this.auth.hasOperationClaim(CASH_COUNTS_CREATE_CLAIM));
    readonly canCorrect = computed(() => this.writable() && this.auth.hasOperationClaim(CASH_COUNTS_CORRECT_CLAIM));

    readonly showForm = computed(() => {
        const d = this.day();

        return !!d && ((this.mode() === 'view' && !d.current && this.canCreate()) || this.mode() === 'correct');
    });

    readonly preview = computed(() => cashCountPreview(this.opening(), this.day()?.expectedCashAmount ?? 0, this.counted()));
    readonly noteRequired = computed(() => {
        const diff = this.preview().difference;

        return diff !== null && diff !== 0;
    });
    readonly reasonValid = computed(() => {
        const len = this.reason().trim().length;

        return len >= REASON_MIN && len <= REASON_MAX;
    });
    readonly canSubmit = computed(() => !this.saving() && this.opening() !== null && this.counted() !== null && (!this.noteRequired() || this.note().trim().length > 0) && (this.mode() !== 'correct' || this.reasonValid()));

    /** Günün iptal edilen kayıtları (yeniden eskiye); geçerli kayıt üstte ayrıca gösterilir. */
    readonly trail = computed(() => (this.day()?.history ?? []).filter((h) => h.isVoided));

    constructor() {
        effect(() => {
            const clinicId = this.clinicId();
            const canChoose = !this.planLocked() && this.auth.hasOperationClaim(CASH_REGISTERS_READ_CLAIM);

            untracked(() => this.loadRegisters(clinicId, canChoose));
        });
        effect(() => {
            const date = this.date();
            const clinicId = this.clinicId();

            untracked(() => {
                this.mode.set('view');
                this.resetForm(null);
                this.load(date, clinicId);
            });
        });
    }

    /** Kasa değişince gün ve geçmiş o kasa için yeniden okunur. */
    selectRegister(id: string | null): void {
        if (id === this.registerId()) {
            return;
        }

        this.registerId.set(id);
        this.mode.set('view');
        this.resetForm(null);
        this.load(this.date(), this.clinicId());
    }

    timeLabel(utcIso: string | null): string {
        return utcIso ? formatUtcIsoAsLocalDateTimeDisplay(utcIso) : '—';
    }

    startCorrect(current: CashCountDto): void {
        this.mode.set('correct');
        this.opening.set(current.openingAmount);
        this.counted.set(current.countedAmount);
        this.note.set(current.note ?? '');
        this.reason.set('');
        this.saveError.set(null);
    }

    startVoid(): void {
        this.mode.set('void');
        this.reason.set('');
        this.saveError.set(null);
    }

    cancel(): void {
        this.mode.set('view');
        this.resetForm(this.day());
    }

    submit(): void {
        const d = this.day();

        if (!d || !this.canSubmit()) {
            return;
        }

        const body: CashCountAmountsBody = {
            openingAmount: this.opening()!,
            countedAmount: this.counted()!,
            expectedCashAmount: d.expectedCashAmount,
            note: this.note().trim() || null
        };
        const request = this.mode() === 'correct' && d.current ? this.service.correct(d.current.id, body, this.reason().trim()) : this.service.create(this.clinicId(), this.date(), body, this.registerId());

        this.saving.set(true);
        this.saveError.set(null);
        request.subscribe({
            next: () => this.afterSave(),
            error: (err: unknown) => this.onSaveError(err)
        });
    }

    submitVoid(): void {
        const current = this.day()?.current;

        if (!current || !this.reasonValid()) {
            return;
        }

        this.saving.set(true);
        this.saveError.set(null);
        this.service.void(current.id, this.reason().trim()).subscribe({
            next: () => this.afterSave(),
            error: (err: unknown) => this.onSaveError(err)
        });
    }

    private afterSave(): void {
        this.saving.set(false);
        this.mode.set('view');
        this.resetForm(null);
        this.load(this.date(), this.clinicId());
    }

    /** Beklenen nakit değiştiyse gün yeniden okunur; girilen değerler kalır, personel güncel rakamla yeniden onaylar. */
    private onSaveError(err: unknown): void {
        this.saving.set(false);
        this.saveError.set(panelHttpFailureMessage(err, 'Kasa sayımı kaydedilemedi.'));

        if (err instanceof HttpErrorResponse && problemCodeFromHttpError(err) === CASH_COUNT_EXPECTED_CHANGED_CODE) {
            this.load(this.date(), this.clinicId(), true);
        }
    }

    private load(date: string, clinicId: string, keepForm = false): void {
        const seq = ++this.seq;

        if (!keepForm) {
            this.day.set(null);
        }

        this.loadError.set(null);
        const registerId = this.registerId();

        this.service.loadDay(date, clinicId, registerId).subscribe({
            next: (d) => {
                if (seq === this.seq) {
                    this.day.set(d);

                    if (!keepForm) {
                        this.resetForm(d);
                    }
                }
            },
            error: (err: unknown) => seq === this.seq && this.loadError.set(panelHttpFailureMessage(err, 'Kasa kontrolü yüklenemedi.'))
        });
        this.service.loadHistory(ymdDaysBefore(date, HISTORY_DAYS - 1), date, clinicId, HISTORY_DAYS, registerId).subscribe({
            next: (rows) => seq === this.seq && this.history.set(rows),
            error: () => seq === this.seq && this.history.set([])
        });
    }

    /** Klinik değişince kasa seçimi Ana kasaya döner; paket dışında ya da izin yoksa seçim gösterilmez. */
    private loadRegisters(clinicId: string, canChoose: boolean): void {
        const seq = ++this.registersSeq;

        this.registers.set([]);
        this.registerId.set(null);

        if (!canChoose) {
            return;
        }

        this.registersService.list(clinicId).subscribe({
            next: (rows) => {
                if (seq === this.registersSeq) {
                    this.registers.set(rows);
                    this.registerId.set(rows.find((r) => r.isMain)?.id ?? null);
                }
            },
            error: () => seq === this.registersSeq && this.registers.set([])
        });
    }

    /** Yeni sayımda açılış önerisi önceki günün sayılan nakdidir; personel değiştirebilir. */
    private resetForm(d: CashCountDayDto | null): void {
        this.opening.set(d?.previous?.countedAmount ?? null);
        this.counted.set(null);
        this.note.set('');
        this.reason.set('');
        this.saveError.set(null);
    }
}
