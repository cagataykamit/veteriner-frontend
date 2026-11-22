import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, HostListener, inject, input, output, signal, untracked } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { AuthService } from '@/app/core/auth/auth.service';
import { CHARGES_CREATE_CLAIM, EDOCUMENTS_ISSUE_CLAIM, PAYMENTS_CREATE_CLAIM, VISITS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { CashRegisterSelectComponent } from '@/app/entities/cash-register/components/cash-register-select.component';
import { ChargeSuggestionsService } from '@/app/entities/charge/services/charge-suggestions.service';
import { ClientCreditsService } from '@/app/entities/client-credit/services/client-credits.service';
import { EDocumentIssueDialogComponent } from '@/app/entities/e-document/components/e-document-issue-dialog.component';
import type { EDocumentSource } from '@/app/entities/e-document/models/e-document.model';
import { EDocumentsService } from '@/app/entities/e-document/services/e-documents.service';
import { PaymentsService } from '@/app/entities/payment/services/payments.service';
import { VisitsService } from '@/app/entities/visit/services/visits.service';
import { VisitCheckoutReceiptComponent, type VisitCheckoutReceiptData } from '@/app/entities/visit-checkout/components/visit-checkout-receipt.component';
import {
    CHECKOUT_METHOD_LABEL,
    completesWithoutCharge,
    computeTotals,
    creditError,
    itemAmount,
    lineError,
    parseAmount,
    planAllocations,
    roundMoney,
    sumAmounts,
    type AllocationPlan,
    type ChargeToSettle,
    type CheckoutPaymentLine,
    type CheckoutPaymentMethod,
    type ItemDecision
} from '@/app/entities/visit-checkout/data/visit-checkout.rules';
import type { VisitCheckoutChargeDto, VisitCheckoutOtherChargeDto, VisitCheckoutPendingItemDto, VisitCheckoutSummaryDto } from '@/app/entities/visit-checkout/models/visit-checkout.model';
import { VisitCheckoutService } from '@/app/entities/visit-checkout/services/visit-checkout.service';
import { printSaleReceipt } from '@/app/shared/utils/sale-receipt-print.utils';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { formatUtcIsoAsLocalDateDisplay, formatUtcIsoAsLocalTimeDisplay } from '@/app/shared/utils/date.utils';
import { formatMoney } from '@/app/shared/utils/money.utils';
import { formatClientPhoneForDisplay } from '@/app/shared/utils/phone-display.utils';

type Phase = 'edit' | 'saving' | 'failed' | 'done';
type StepStatus = 'pending' | 'running' | 'done' | 'failed' | 'skipped';
type StepKind = 'convert' | 'waive' | 'credit' | 'pay' | 'complete';

interface SaveStep {
    key: string;
    kind: StepKind;
    label: string;
    detail: string;
    status: StepStatus;
    /** Ödeme adımında satır kimliği (tekrar deneme ve borçla kapatma bu satırı hedefler). */
    lineId?: string;
}

interface PaymentLineState extends CheckoutPaymentLine {
    /** Satır başına bir kez üretilir; tekrar deneme aynı anahtarla gider (çift ödeme olmaz). */
    requestId: string;
}

const METHOD_KEYS: Array<{ method: CheckoutPaymentMethod; key: string; icon: string }> = [
    { method: 'cash', key: 'F2', icon: 'pi pi-money-bill' },
    { method: 'card', key: 'F3', icon: 'pi pi-credit-card' },
    { method: 'transfer', key: 'F4', icon: 'pi pi-building-columns' }
];

const CARE_LABEL = { Waiting: 'Bekliyor', InProgress: 'Muayenede', Completed: 'Tamamlandı' } as const;
const CARE_SEVERITY = { Waiting: 'warn', InProgress: 'info', Completed: 'success' } as const;

/**
 * "Hesabı kapat" paneli (CHECKOUT-001, BE `VISIT_CHECKOUT_API_CONTRACT.md`; onaylı tasarım FE `07e25890`). Tek yüzeyde: ücret bekleyen
 * kalemler → açık ücretler → tahsilat (parçalı, krediden, kasa) → gelişi tamamla → bilgi fişi → e-Belge önerisi (Bugün'deki kapanışla aynı).
 * Okuma tek uçtan; yazma mevcut uçlarla adım adım. Adım hata verirse panel durur, kaydedilenler geçerli kalır.
 */
@Component({
    selector: 'app-visit-checkout-panel',
    standalone: true,
    imports: [ButtonModule, TagModule, TooltipModule, CashRegisterSelectComponent, EDocumentIssueDialogComponent, VisitCheckoutReceiptComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'flex flex-col min-h-0 h-full' },
    template: `
        @if (loading()) {
            <div class="p-4 text-sm text-muted-color" role="status"><i class="pi pi-spin pi-spinner mr-2"></i>Hesap yükleniyor…</div>
        } @else if (loadError(); as err) {
            <div class="p-4" role="alert">
                <p class="m-0 text-sm text-red-600 dark:text-red-300">{{ err }}</p>
                <div class="flex gap-2 mt-3">
                    <button pButton type="button" size="small" (click)="reload()"><i class="p-button-icon pi pi-refresh"></i>Tekrar dene</button>
                    <button pButton type="button" size="small" severity="secondary" [text]="true" (click)="closed.emit()">Kapat</button>
                </div>
            </div>
        } @else if (summary(); as s) {
            @let t = totals();
            <header class="flex items-start gap-3 pb-3 border-b border-surface shrink-0">
                <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p-tag [value]="careLabel(s)" [severity]="careSeverity(s)" />
                        @if (isSettled()) {
                            <p-tag value="Ödendi" severity="success" />
                        }
                    </div>
                    <div class="mt-1 text-sm">
                        <span class="font-medium" data-testid="checkout-pet">{{ s.petName }}</span>
                        @if (s.speciesName) {
                            <span class="text-muted-color"> · {{ s.speciesName }}</span>
                        }
                    </div>
                    <div class="text-sm text-muted-color">
                        {{ s.clientName }}@if (s.clientPhone) { · {{ phone(s.clientPhone) }} } · Geliş {{ time(s.arrivedAtUtc) }}@if (s.responsibleVeterinarianName) { · {{ s.responsibleVeterinarianName }} }
                    </div>
                </div>
                <button pButton type="button" iconOnly size="small" [text]="true" severity="secondary" aria-label="Klavye kısayolları" pTooltip="Kısayollar (?)" tooltipPosition="bottom" (click)="showShortcuts.set(!showShortcuts())">
                    <i class="p-button-icon pi pi-question-circle"></i>
                </button>
            </header>

            @if (showShortcuts()) {
                <div class="py-2 border-b border-surface text-xs flex flex-wrap gap-x-4 gap-y-1" role="note" data-testid="checkout-shortcuts">
                    <span><kbd class="kbd">F2</kbd> Nakit</span>
                    <span><kbd class="kbd">F3</kbd> Kart</span>
                    <span><kbd class="kbd">F4</kbd> Havale</span>
                    <span><kbd class="kbd">F8</kbd> Krediden</span>
                    <span><kbd class="kbd">Alt</kbd>+<kbd class="kbd">T</kbd> Tümünü ücrete çevir</span>
                    <span><kbd class="kbd">Enter</kbd> boş tutarda kalanı yazar, dolu tutarda kaydeder</span>
                    <span><kbd class="kbd">Ctrl</kbd>+<kbd class="kbd">Enter</kbd> Kaydet</span>
                    <span><kbd class="kbd">Alt</kbd>+<kbd class="kbd">P</kbd> Fişi yazdır</span>
                    <span><kbd class="kbd">Esc</kbd> Kapat</span>
                </div>
            }

            @if (s.isVoided) {
                <p class="text-sm text-muted-color mt-4" role="note">Bu geliş yanlış kayıt olarak işaretli; hesap kapatılamaz.</p>
            } @else if (view() === 'receipt') {
                <div class="flex-1 min-h-0 overflow-y-auto py-4">
                    <div class="flex items-center gap-2 mb-3">
                        <button pButton type="button" size="small" severity="secondary" [text]="true" (click)="view.set('panel')"><i class="p-button-icon pi pi-arrow-left"></i>Geri</button>
                        <span class="text-sm text-muted-color">Yazdırma görünümü · A5 dikey</span>
                        <button pButton type="button" size="small" class="ml-auto" (click)="print()"><i class="p-button-icon pi pi-print"></i>Yazdır</button>
                    </div>
                    <app-visit-checkout-receipt [data]="receipt()" />
                </div>
            } @else if (phase() === 'done') {
                <div class="flex-1 min-h-0 overflow-y-auto py-4" data-testid="checkout-done">
                    <div class="rounded-border border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4" role="status">
                        <div class="flex items-center gap-2 text-green-700 dark:text-green-300 font-semibold"><i class="pi pi-check-circle"></i>{{ doneTitle() }}</div>
                        <ul class="m-0 mt-2 pl-5 text-sm">
                            @for (st of steps(); track st.key) {
                                @if (st.status === 'done') {
                                    <li>{{ st.detail }}</li>
                                } @else if (st.status === 'skipped') {
                                    <li class="text-muted-color">{{ st.detail }} (alınmadı)</li>
                                }
                            }
                        </ul>
                        @if (t.remaining > 0) {
                            <p class="mt-3 mb-0 text-sm font-medium">Kalan borç {{ money(t.remaining) }} müşteri hesabında; Bugün satırında görünür.</p>
                        }
                        @if (t.overpaid > 0) {
                            <p class="mt-3 mb-0 text-sm">Fazla alınan {{ money(t.overpaid) }} müşteri kredisine yazıldı.</p>
                        }
                    </div>
                    <div class="flex flex-wrap gap-2 mt-4">
                        <button pButton type="button" (click)="view.set('receipt')"><i class="p-button-icon pi pi-print"></i>Fişi yazdır</button>
                        <button pButton type="button" severity="secondary" (click)="closed.emit()">Bugün'e dön</button>
                    </div>
                </div>
            } @else {
                <div class="flex-1 min-h-0 overflow-y-auto pb-4">
                    @if (s.charges === null) {
                        <p class="text-sm text-muted-color mt-3 mb-0" role="note">Ücretleri görme yetkiniz yok; burada yalnız geliş tamamlanır.</p>
                    } @else if (!canConvert() || !canCollect()) {
                        <p class="text-sm text-muted-color mt-3 mb-0" role="note">Kalemleri ücrete çevirme ve tahsilat yetkisi resepsiyon ve yöneticidedir; burada yalnız görüntülenir.</p>
                    }

                    @if (pendingItems().length > 0) {
                        <section class="pt-4" aria-labelledby="checkout-items">
                            <div class="flex items-center justify-between gap-2 mb-2">
                                <h3 id="checkout-items" class="m-0 text-sm font-semibold uppercase tracking-wide text-muted-color">Ücret bekleyen kalemler</h3>
                                @if (canConvert() && undecided() > 0) {
                                    <button pButton type="button" size="small" severity="secondary" [outlined]="true" (click)="convertAll()" pTooltip="Alt+T" tooltipPosition="left">
                                        <i class="p-button-icon pi pi-check-square"></i>Tümünü ücrete çevir
                                    </button>
                                }
                            </div>
                            <ul class="m-0 p-0 list-none divide-y divide-surface border border-surface rounded-border">
                                @for (item of pendingItems(); track item.id) {
                                    @let d = decisionOf(item.id);
                                    @let price = unitPriceOf(item);
                                    <li class="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2" [class.opacity-60]="d === 'waive'" data-testid="checkout-item">
                                        <div class="min-w-0 flex-1">
                                            <div class="font-medium truncate" [class.line-through]="d === 'waive'">{{ item.description }}</div>
                                            <div class="text-xs text-muted-color">{{ item.quantity }} {{ item.unit }}@if (price !== null) { × {{ money(price) }} } · {{ item.petName }}</div>
                                        </div>
                                        @if (item.suggestedUnitPrice === null && canConvert() && d !== 'waive') {
                                            <label class="sr-only" [for]="'price-' + item.id">Birim fiyat</label>
                                            <input
                                                [id]="'price-' + item.id"
                                                type="text"
                                                inputmode="decimal"
                                                class="p-inputtext p-component p-inputtext-sm w-24 text-right"
                                                placeholder="Fiyat"
                                                [value]="price ?? ''"
                                                (input)="setUnitPrice(item.id, $any($event.target).value)"
                                                [disabled]="phase() !== 'edit'"
                                            />
                                        } @else {
                                            <div class="font-medium tabular-nums whitespace-nowrap">{{ price === null ? '—' : money(itemTotal(item)!) }}</div>
                                        }
                                        @if (canConvert()) {
                                            <div class="flex items-center gap-1 shrink-0 w-full justify-end sm:w-auto">
                                                @if (d === 'convert') {
                                                    <p-tag value="Ücrete çevrilecek" severity="success" />
                                                    <button pButton type="button" size="small" [text]="true" severity="secondary" (click)="setDecision(item.id, 'pending')" [disabled]="phase() !== 'edit'">Geri al</button>
                                                } @else if (d === 'waive') {
                                                    <p-tag value="Ücretsiz" severity="secondary" />
                                                    <button pButton type="button" size="small" [text]="true" severity="secondary" (click)="setDecision(item.id, 'pending')" [disabled]="phase() !== 'edit'">Geri al</button>
                                                } @else {
                                                    <button pButton type="button" size="small" [outlined]="true" (click)="setDecision(item.id, 'convert')" [disabled]="phase() !== 'edit'">Ücrete çevir</button>
                                                    <button pButton type="button" size="small" [text]="true" severity="secondary" (click)="startWaive(item.id)" [disabled]="phase() !== 'edit'">Ücretsiz</button>
                                                }
                                            </div>
                                            @if (waiveFor() === item.id) {
                                                <div class="w-full flex flex-wrap items-center gap-2 pt-1">
                                                    <label class="text-xs text-muted-color" [for]="'waive-' + item.id">Gerekçe *</label>
                                                    <input [id]="'waive-' + item.id" type="text" maxlength="500" class="p-inputtext p-component p-inputtext-sm flex-1 min-w-40" placeholder="Örn. kontrol, ücret alınmadı" [value]="waiveReasons()[item.id] ?? ''" (input)="setWaiveReason(item.id, $any($event.target).value)" (keydown.enter)="confirmWaive(item.id)" />
                                                    <button pButton type="button" size="small" [disabled]="!waiveReasonValid(item.id)" (click)="confirmWaive(item.id)">Onayla</button>
                                                    <button pButton type="button" size="small" [text]="true" severity="secondary" (click)="waiveFor.set(null)">Vazgeç</button>
                                                    <small class="basis-full text-xs text-muted-color">En az 5 karakter; ücretsiz sayma geri alınamaz.</small>
                                                </div>
                                            }
                                        } @else {
                                            <p-tag value="Bekliyor" severity="warn" />
                                        }
                                    </li>
                                }
                            </ul>
                            @if (canConvert() && undecided() > 0) {
                                <p class="mt-2 mb-0 text-xs text-amber-700 dark:text-amber-300" role="note"><i class="pi pi-exclamation-triangle mr-1"></i>{{ undecided() }} kalem karar bekliyor; çevrilmeden kapatılırsa Bugün'de "Ücret yok" rozeti kalır.</p>
                            }
                        </section>
                    }

                    @if (visitOpenCharges().length > 0 || otherCharges().length > 0) {
                        <section class="pt-4" aria-labelledby="checkout-charges">
                            <h3 id="checkout-charges" class="m-0 mb-2 text-sm font-semibold uppercase tracking-wide text-muted-color">Açık ücretler</h3>
                            <ul class="m-0 p-0 list-none divide-y divide-surface border border-surface rounded-border">
                                @for (c of visitOpenCharges(); track c.chargeId) {
                                    <li class="flex items-center gap-3 px-3 py-2" data-testid="checkout-visit-charge">
                                        @if (canCollect()) {
                                            <input type="checkbox" class="size-4 accent-primary" [id]="'ch-' + c.chargeId" [checked]="selected().has(c.chargeId)" (change)="toggleCharge(c.chargeId)" [disabled]="phase() !== 'edit'" />
                                        }
                                        <label [for]="'ch-' + c.chargeId" class="min-w-0 flex-1 cursor-pointer">
                                            <div class="font-medium truncate">{{ c.description }}</div>
                                            <div class="text-xs text-muted-color">Bu geliş · {{ date(c.createdAtUtc) }}</div>
                                        </label>
                                        <div class="font-medium tabular-nums whitespace-nowrap">{{ money(c.outstandingAmount) }}</div>
                                    </li>
                                }
                                @for (c of otherCharges(); track c.chargeId) {
                                    <li class="flex items-center gap-3 px-3 py-2 bg-surface-50 dark:bg-surface-800/60" data-testid="checkout-other-charge">
                                        @if (canCollect()) {
                                            <input type="checkbox" class="size-4 accent-primary" [id]="'ch-' + c.chargeId" [checked]="selected().has(c.chargeId)" (change)="toggleCharge(c.chargeId)" [disabled]="phase() !== 'edit'" />
                                        }
                                        <label [for]="'ch-' + c.chargeId" class="min-w-0 flex-1 cursor-pointer">
                                            <div class="font-medium truncate">{{ c.description }}</div>
                                            <div class="text-xs text-muted-color"><i class="pi pi-history mr-1"></i>@if (c.visitId) {Önceki gelişten kalan · {{ date(c.visitArrivedAtUtc ?? c.createdAtUtc) }}} @else {Gelişe bağlı olmayan borç · {{ date(c.createdAtUtc) }}}@if (c.petName && c.petName !== s.petName) { · {{ c.petName }} }</div>
                                        </label>
                                        <div class="font-medium tabular-nums whitespace-nowrap text-muted-color">{{ money(c.outstandingAmount) }}</div>
                                    </li>
                                }
                            </ul>
                            @if (otherCharges().length > 0 && canCollect()) {
                                <p class="mt-2 mb-0 text-xs text-muted-color">Eski borçlar seçili gelmez; birlikte almak için işaretleyin.</p>
                            }
                        </section>
                    }

                    @if (s.charges !== null && pendingItems().length === 0 && visitOpenCharges().length === 0 && otherCharges().length === 0) {
                        <section class="pt-4">
                            @if (isSettled()) {
                                <div class="rounded-border border border-surface p-3" data-testid="checkout-settled">
                                    <div class="text-sm font-semibold uppercase tracking-wide text-muted-color mb-2">Bu gelişin hesabı</div>
                                    <ul class="m-0 p-0 list-none text-sm">
                                        @for (c of s.charges.visitCharges; track c.chargeId) {
                                            <li class="flex justify-between gap-3 py-1"><span>{{ c.description }}</span><span class="tabular-nums">{{ money(c.amount) }}</span></li>
                                        }
                                    </ul>
                                </div>
                            } @else {
                                <div class="rounded-border border border-dashed border-surface p-4 text-center" data-testid="checkout-empty">
                                    <i class="pi pi-inbox text-2xl text-muted-color"></i>
                                    <p class="m-0 mt-2 text-sm">Bu gelişte ücret bekleyen kalem ve açık ücret yok.</p>
                                </div>
                            }
                        </section>
                    }

                    @if (canCollect() && due() > 0) {
                        <section class="pt-4" aria-labelledby="checkout-pay">
                            <h3 id="checkout-pay" class="m-0 mb-2 text-sm font-semibold uppercase tracking-wide text-muted-color">Tahsilat</h3>

                            @if (creditBalance() > 0) {
                                <div class="flex flex-wrap items-center gap-2 p-3 mb-3 rounded-border bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
                                    <span class="text-sm font-medium"><i class="pi pi-wallet mr-2"></i>Kredi {{ money(creditBalance()) }}</span>
                                    <div class="ml-auto flex items-center gap-2">
                                        <label for="checkout-credit" class="text-xs text-muted-color">Krediden</label>
                                        <input id="checkout-credit" type="text" inputmode="decimal" class="p-inputtext p-component p-inputtext-sm w-28 text-right" [value]="credit() || ''" (input)="setCredit($any($event.target).value)" [disabled]="phase() !== 'edit'" />
                                        <button pButton type="button" size="small" [text]="true" (click)="useCreditMax()" pTooltip="F8" tooltipPosition="top" [disabled]="phase() !== 'edit'">Tamamı</button>
                                    </div>
                                    @if (creditErr(); as err) {
                                        <small class="w-full text-red-500">{{ err }}</small>
                                    }
                                </div>
                            }

                            <div class="flex flex-wrap gap-2 mb-3">
                                @for (m of methodKeys; track m.method) {
                                    <button pButton type="button" size="small" severity="secondary" [outlined]="true" (click)="addLine(m.method)" [disabled]="phase() !== 'edit'" [attr.aria-label]="methodLabel(m.method) + ' satırı ekle (' + m.key + ')'">
                                        <i class="p-button-icon" [class]="m.icon"></i>{{ methodLabel(m.method) }} <kbd class="kbd ml-1">{{ m.key }}</kbd>
                                    </button>
                                }
                            </div>

                            @if (lines().length === 0) {
                                <p class="text-sm text-muted-color m-0 mb-3">Ödeme yöntemi seçin; birden fazla satır eklenebilir (örn. nakit + kart).</p>
                            }

                            <ul class="m-0 p-0 list-none flex flex-col gap-2">
                                @for (line of lines(); track line.id) {
                                    @let saved = savedLineIds().has(line.id);
                                    @let failed = failedLineId() === line.id;
                                    <li class="rounded-border border p-2" [class]="failed ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20' : saved ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20' : 'border-surface'" data-testid="checkout-line">
                                        <div class="flex flex-wrap items-center gap-2">
                                            <span class="inline-flex items-center gap-1 text-sm font-medium min-w-20"><i [class]="methodIcon(line.method)"></i>{{ methodLabel(line.method) }}</span>
                                            <div class="ml-auto flex items-center gap-1">
                                                <input
                                                    [id]="'line-amount-' + line.id"
                                                    type="text"
                                                    inputmode="decimal"
                                                    class="p-inputtext p-component p-inputtext-sm w-28 text-right"
                                                    [attr.aria-label]="methodLabel(line.method) + ' tutarı'"
                                                    [value]="line.amount ?? ''"
                                                    (input)="setLineAmount(line.id, $any($event.target).value)"
                                                    (keydown.enter)="onAmountEnter(line, $event)"
                                                    [disabled]="phase() !== 'edit' || saved"
                                                />
                                                @if (!saved && phase() === 'edit') {
                                                    <button pButton type="button" size="small" [text]="true" severity="secondary" (click)="fillRemaining(line.id)" [disabled]="remainingBefore(line.id) <= 0">Kalanı</button>
                                                    <button pButton type="button" iconOnly size="small" [text]="true" severity="secondary" aria-label="Satırı sil" (click)="removeLine(line.id)"><i class="p-button-icon pi pi-trash"></i></button>
                                                }
                                                @if (saved) {
                                                    <i class="pi pi-check-circle text-green-600" aria-label="Kaydedildi"></i>
                                                }
                                            </div>
                                        </div>
                                        @if (line.method === 'cash') {
                                            <app-cash-register-select
                                                fieldClass="block mt-2"
                                                [inputId]="'line-register-' + line.id"
                                                [clinicId]="s.clinicId"
                                                method="cash"
                                                [disabled]="phase() !== 'edit' || saved"
                                                [value]="line.cashRegisterId"
                                                (valueChange)="setRegister(line.id, $event)"
                                            />
                                        }
                                        @if (!saved && lineErrorOf(line); as err) {
                                            <small class="text-red-500 block mt-1">{{ err }}</small>
                                        }
                                        @if (failed) {
                                            <small class="text-red-600 dark:text-red-300 block mt-1"><i class="pi pi-times-circle mr-1"></i>Kaydedilemedi. Para alındıysa tekrar deneyin; alınmadıysa satırı borçla kapatın.</small>
                                        }
                                    </li>
                                }
                            </ul>
                        </section>
                    }

                    @if (!canCollect() && s.charges !== null && pendingTotal() + visitOutstanding() > 0) {
                        <section class="pt-4">
                            <div class="rounded-border border border-surface p-3 text-sm">
                                <div class="flex justify-between"><span class="text-muted-color">Bekleyen kalemler</span><span class="tabular-nums">{{ money(pendingTotal()) }}</span></div>
                                <div class="flex justify-between"><span class="text-muted-color">Açık ücret</span><span class="tabular-nums">{{ money(visitOutstanding()) }}</span></div>
                                <p class="m-0 mt-2 text-xs text-muted-color">Tahsilatı resepsiyon yapar; geliş yine tamamlanabilir.</p>
                            </div>
                        </section>
                    }

                    @if (phase() === 'saving' || phase() === 'failed') {
                        <section class="pt-4" aria-live="polite">
                            <ol class="m-0 p-0 list-none flex flex-col gap-1 text-sm" data-testid="checkout-steps">
                                @for (st of steps(); track st.key) {
                                    <li class="flex items-center gap-2">
                                        @switch (st.status) {
                                            @case ('done') {
                                                <i class="pi pi-check-circle text-green-600"></i>
                                            }
                                            @case ('running') {
                                                <i class="pi pi-spin pi-spinner text-primary"></i>
                                            }
                                            @case ('failed') {
                                                <i class="pi pi-times-circle text-red-500"></i>
                                            }
                                            @case ('skipped') {
                                                <i class="pi pi-minus-circle text-muted-color"></i>
                                            }
                                            @default {
                                                <i class="pi pi-circle text-muted-color"></i>
                                            }
                                        }
                                        <span [class.text-muted-color]="st.status === 'pending' || st.status === 'skipped'">{{ st.status === 'done' ? st.detail : st.label }}</span>
                                    </li>
                                }
                            </ol>
                            @if (phase() === 'failed') {
                                <div class="mt-3 rounded-border border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3" role="alert" data-testid="checkout-failed">
                                    <div class="font-medium text-red-700 dark:text-red-300">Kapanış yarıda kaldı</div>
                                    <p class="m-0 mt-1 text-sm">{{ failureMessage() }}</p>
                                    <p class="m-0 mt-1 text-sm">Kaydedilenler geçerli (yeşil). Tekrar denemek çift kayıt yapmaz.</p>
                                    <div class="flex flex-wrap gap-2 mt-3">
                                        <button pButton type="button" size="small" (click)="retryFailed()"><i class="p-button-icon pi pi-refresh"></i>Tekrar dene</button>
                                        @if (failedLineId()) {
                                            <button pButton type="button" size="small" severity="secondary" [outlined]="true" (click)="closeWithDebtAfterFailure()">Borçla kapat</button>
                                        }
                                        <button pButton type="button" size="small" severity="secondary" [text]="true" (click)="closed.emit()">Vazgeç</button>
                                    </div>
                                </div>
                            }
                        </section>
                    }
                </div>

                <footer class="shrink-0 border-t border-surface pt-3">
                    @if (!isSettled() && canCollect() && due() > 0) {
                        <dl class="m-0 grid grid-cols-2 gap-y-0.5 text-sm mb-3" data-testid="checkout-totals">
                            <dt class="text-muted-color">Hesap</dt>
                            <dd class="m-0 text-right tabular-nums">{{ money(t.due) }}</dd>
                            @if (t.credit > 0) {
                                <dt class="text-muted-color">Krediden</dt>
                                <dd class="m-0 text-right tabular-nums">{{ money(t.credit) }}</dd>
                            }
                            @if (t.paid > 0) {
                                <dt class="text-muted-color">Alınan</dt>
                                <dd class="m-0 text-right tabular-nums">{{ money(t.paid) }}</dd>
                            }
                            <dt class="font-semibold" [class]="t.remaining > 0 ? 'text-amber-700 dark:text-amber-300' : ''">{{ t.overpaid > 0 ? 'Krediye yazılacak' : 'Kalan' }}</dt>
                            <dd class="m-0 text-right font-semibold tabular-nums text-base" [class]="t.remaining > 0 ? 'text-amber-700 dark:text-amber-300' : ''">{{ money(t.overpaid > 0 ? t.overpaid : t.remaining) }}</dd>
                        </dl>
                    }
                    <div class="flex flex-wrap items-center gap-2">
                        @if (isSettled()) {
                            <button pButton type="button" (click)="view.set('receipt')"><i class="p-button-icon pi pi-print"></i>Fişi yazdır</button>
                            <button pButton type="button" severity="secondary" (click)="closed.emit()">Kapat</button>
                        } @else {
                            <button pButton type="button" [disabled]="!canSubmit()" (click)="submit()" pTooltip="Ctrl+Enter" tooltipPosition="top" [severity]="t.remaining > 0 && t.due > 0 ? 'warn' : 'primary'" data-testid="checkout-submit">
                                <i class="p-button-icon" [class]="phase() === 'saving' ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>{{ primaryLabel() }}
                            </button>
                            <button pButton type="button" severity="secondary" [text]="true" (click)="closed.emit()" [disabled]="phase() === 'saving'">Vazgeç</button>
                        }
                        @if (submitHint(); as hint) {
                            <small class="basis-full text-xs text-muted-color">{{ hint }}</small>
                        }
                    </div>
                </footer>
            }

            @if (canIssueDocument) {
                <app-e-document-issue-dialog [(visible)]="documentOpen" [source]="documentSource()" header="Ziyaret kapandı: e-Belge kes" />
            }
        }
    `,
    styles: `
        .kbd {
            display: inline-block;
            padding: 0 0.35rem;
            border: 1px solid var(--p-surface-300);
            border-bottom-width: 2px;
            border-radius: 0.25rem;
            font-family: inherit;
            font-size: 0.7rem;
            line-height: 1.2rem;
            color: var(--p-text-muted-color);
            background: var(--p-surface-0);
        }
        :host-context(.app-dark) .kbd {
            border-color: var(--p-surface-600);
            background: var(--p-surface-800);
        }
    `
})
export class VisitCheckoutPanelComponent {
    readonly visitId = input.required<string>();
    readonly closed = output<void>();
    /** Kayıt adımları bitti (geliş ve hesap değişti); çağıran listeyi yeniler. */
    readonly finished = output<void>();

    private readonly auth = inject(AuthService);
    private readonly checkout = inject(VisitCheckoutService);
    private readonly suggestions = inject(ChargeSuggestionsService);
    private readonly credits = inject(ClientCreditsService);
    private readonly payments = inject(PaymentsService);
    private readonly visits = inject(VisitsService);
    private readonly eDocuments = inject(EDocumentsService);
    private readonly destroyRef = inject(DestroyRef);

    readonly canIssueDocument = this.auth.hasOperationClaim(EDOCUMENTS_ISSUE_CLAIM);
    private readonly hasConvertClaim = this.auth.hasOperationClaim(CHARGES_CREATE_CLAIM);
    private readonly hasCollectClaim = this.auth.hasOperationClaim(PAYMENTS_CREATE_CLAIM);
    readonly canComplete = this.auth.hasOperationClaim(VISITS_UPDATE_CLAIM);
    readonly methodKeys = METHOD_KEYS;

    readonly loading = signal(true);
    readonly loadError = signal<string | null>(null);
    readonly summary = signal<VisitCheckoutSummaryDto | null>(null);
    /** Geliş bu panelde tamamlandı; özet açılış görüntüsü olarak kalır, yalnız başlıktaki durum rozeti güncellenir. */
    private readonly completedHere = signal(false);

    readonly view = signal<'panel' | 'receipt'>('panel');
    readonly phase = signal<Phase>('edit');
    readonly showShortcuts = signal(false);
    readonly decisions = signal<Record<string, ItemDecision>>({});
    readonly unitPrices = signal<Record<string, number | null>>({});
    readonly waiveFor = signal<string | null>(null);
    readonly waiveReasons = signal<Record<string, string>>({});
    readonly selected = signal<ReadonlySet<string>>(new Set());
    readonly lines = signal<PaymentLineState[]>([]);
    readonly credit = signal(0);
    readonly steps = signal<SaveStep[]>([]);
    readonly savedLineIds = signal<ReadonlySet<string>>(new Set());
    readonly failedLineId = signal<string | null>(null);
    readonly failureMessage = signal('');
    readonly documentSource = signal<EDocumentSource | null>(null);
    readonly documentOpen = signal(false);

    /** Kayıt sırasında biriken sonuçlar: tekrar denemede yapılan adım tekrarlanmaz (anahtarlar da aynı kalır). */
    private readonly convertRequestIds = new Map<string, string>();
    private readonly convertedCharges = new Map<string, ChargeToSettle>();
    private readonly waivedItems = new Set<string>();
    private creditRequestId = crypto.randomUUID();
    private plan: AllocationPlan | null = null;
    private destroyed = false;

    readonly canConvert = computed(() => this.hasConvertClaim && this.summary()?.charges !== null);
    readonly canCollect = computed(() => this.hasCollectClaim && this.summary()?.charges !== null);
    readonly pendingItems = computed<VisitCheckoutPendingItemDto[]>(() => this.summary()?.charges?.pendingItems ?? []);
    readonly visitOpenCharges = computed<VisitCheckoutChargeDto[]>(() => (this.summary()?.charges?.visitCharges ?? []).filter((c) => c.outstandingAmount > 0));
    readonly otherCharges = computed<VisitCheckoutOtherChargeDto[]>(() => this.summary()?.charges?.otherOpenCharges ?? []);
    readonly creditBalance = computed(() => this.summary()?.charges?.creditBalance ?? 0);

    /** Geliş tamamlanmış ve ücretlenecek ya da alınacak bir şey kalmamış: panel yalnız özet ve fiş gösterir. */
    readonly isSettled = computed(() => {
        const s = this.summary();

        return !!s && s.careStatus === 'Completed' && s.charges !== null && this.pendingItems().length === 0 && this.visitOpenCharges().length === 0 && s.charges.visitCharges.length > 0;
    });

    readonly undecided = computed(() => this.pendingItems().filter((i) => this.decisionOf(i.id) === 'pending').length);
    readonly pendingTotal = computed(() => sumAmounts(this.pendingItems().map((i) => this.itemTotal(i))));
    readonly visitOutstanding = computed(() => sumAmounts(this.visitOpenCharges().map((c) => c.outstandingAmount)));
    private readonly convertTotal = computed(() => sumAmounts(this.pendingItems().filter((i) => this.decisionOf(i.id) === 'convert').map((i) => this.itemTotal(i))));
    private readonly selectedTotal = computed(() => {
        const sel = this.selected();

        return sumAmounts([...this.visitOpenCharges(), ...this.otherCharges()].filter((c) => sel.has(c.chargeId)).map((c) => c.outstandingAmount));
    });
    readonly due = computed(() => roundMoney(this.convertTotal() + this.selectedTotal()));
    private readonly validLines = computed(() => this.lines().filter((l) => lineError(l) === null));
    readonly totals = computed(() => computeTotals(this.due(), this.credit(), sumAmounts(this.validLines().map((l) => l.amount))));
    readonly creditErr = computed(() => (this.credit() > 0 ? creditError(this.credit(), this.creditBalance(), this.due()) : null));
    private readonly missingPrice = computed(() => this.pendingItems().some((i) => this.decisionOf(i.id) === 'convert' && this.unitPriceOf(i) === null));

    readonly canSubmit = computed(() => {
        if (this.phase() !== 'edit' || this.waiveFor() !== null || this.summary() === null) {
            return false;
        }

        if (this.lines().some((l) => lineError(l) !== null) || this.creditErr() !== null || this.missingPrice()) {
            return false;
        }

        if (this.due() === 0 && (this.lines().length > 0 || this.credit() > 0)) {
            return false;
        }

        return this.saveWork().length > 0;
    });

    readonly primaryLabel = computed(() => {
        const t = this.totals();
        const completes = this.summary()?.careStatus !== 'Completed';

        if (this.phase() === 'saving') {
            return 'Kaydediliyor…';
        }

        if (t.due === 0) {
            return completes ? 'Gelişi tamamla' : 'Kaydet';
        }

        if (t.remaining > 0 && t.remaining === t.due) {
            return completes ? `Borçla kapat (${this.money(t.remaining)})` : `Borç bırak (${this.money(t.remaining)})`;
        }

        if (t.remaining > 0) {
            return `Tahsil et, ${this.money(t.remaining)} borç bırak`;
        }

        return completes ? 'Tahsil et ve kapat' : 'Tahsil et';
    });

    readonly submitHint = computed(() => {
        if (this.phase() !== 'edit') {
            return null;
        }

        if (this.missingPrice()) {
            return 'Fiyatı olmayan kalem için birim fiyat girin.';
        }

        if (this.waiveFor() !== null) {
            return 'Ücretsiz sayma gerekçesini onaylayın ya da vazgeçin.';
        }

        if (!this.canCollect() && this.undecided() > 0) {
            return `${this.undecided()} kalem ücretlendirilmedi; geliş tamamlanır, ücreti resepsiyon kapatır.`;
        }

        if (!this.canComplete && this.summary()?.careStatus !== 'Completed') {
            return 'Gelişi tamamlama yetkiniz yok; geliş açık kalır.';
        }

        return this.totals().overpaid > 0 ? 'Alınan tutar hesaptan fazla; fazlası müşteri kredisine yazılır.' : null;
    });

    readonly doneTitle = computed(() => {
        const t = this.totals();

        if (t.due === 0) {
            return this.summary()?.careStatus === 'Completed' ? 'Kaydedildi' : 'Geliş tamamlandı';
        }

        return t.remaining > 0 ? 'Kaydedildi, borç kaldı' : 'Hesap kapatıldı';
    });

    readonly receipt = computed<VisitCheckoutReceiptData>(() => {
        const s = this.summary()!;
        const sel = this.selected();
        const t = this.totals();
        const now = new Date().toISOString();
        const header = { clinicName: this.auth.getClinicName() ?? '', dateText: `${this.date(now)} ${this.time(now)}`, clientName: s.clientName, petName: s.petName };

        if (this.isSettled()) {
            return { ...header, charges: (s.charges?.visitCharges ?? []).map((c) => ({ description: c.description, amount: c.amount })), payments: [], creditUsed: 0, creditAdded: 0, remaining: 0, otherDebt: 0 };
        }

        const saved = this.savedLineIds();

        return {
            ...header,
            charges: [
                ...this.pendingItems()
                    .filter((i) => this.decisionOf(i.id) === 'convert')
                    .map((i) => ({ description: i.description, amount: this.itemTotal(i) ?? 0 })),
                ...this.visitOpenCharges()
                    .filter((c) => sel.has(c.chargeId))
                    .map((c) => ({ description: c.description, amount: c.outstandingAmount })),
                ...this.otherCharges()
                    .filter((c) => sel.has(c.chargeId))
                    .map((c) => ({ description: `${c.description} (önceki geliş)`, amount: c.outstandingAmount }))
            ],
            payments: this.lines()
                .filter((l) => saved.has(l.id))
                .map((l) => ({ method: l.method, amount: l.amount ?? 0 })),
            creditUsed: t.credit,
            creditAdded: t.overpaid,
            remaining: t.remaining,
            otherDebt: sumAmounts(this.otherCharges().filter((c) => !sel.has(c.chargeId)).map((c) => c.outstandingAmount))
        };
    });

    constructor() {
        effect(() => {
            const id = this.visitId();

            untracked(() => this.load(id));
        });
        this.destroyRef.onDestroy(() => (this.destroyed = true));
    }

    @HostListener('document:keydown', ['$event'])
    onKeydown(ev: KeyboardEvent): void {
        if (this.documentOpen()) {
            return;
        }

        const inInput = ev.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(ev.target.tagName);

        if (ev.key === 'Escape') {
            if (this.view() === 'receipt') {
                this.view.set('panel');
            } else if (this.phase() !== 'saving') {
                this.closed.emit();
            }

            ev.preventDefault();

            return;
        }

        if (ev.altKey && ev.key.toLowerCase() === 'p' && (this.phase() === 'done' || this.isSettled())) {
            ev.preventDefault();
            this.view.set('receipt');

            return;
        }

        if (this.phase() !== 'edit' || this.view() !== 'panel' || !this.summary()) {
            return;
        }

        const method = METHOD_KEYS.find((m) => m.key === ev.key)?.method;

        if (method && this.canCollect() && this.due() > 0) {
            ev.preventDefault();
            this.addLine(method);
        } else if (ev.key === 'F8' && this.canCollect() && this.creditBalance() > 0) {
            ev.preventDefault();
            this.useCreditMax();
        } else if (ev.altKey && ev.key.toLowerCase() === 't' && this.canConvert()) {
            ev.preventDefault();
            this.convertAll();
        } else if (ev.ctrlKey && ev.key === 'Enter') {
            ev.preventDefault();
            this.submit();
        } else if (ev.key === '?' && !inInput) {
            ev.preventDefault();
            this.showShortcuts.set(!this.showShortcuts());
        }
    }

    reload(): void {
        this.load(this.visitId());
    }

    protected money(n: number): string {
        return formatMoney(n, 'TRY');
    }

    protected phone(value: string): string {
        return formatClientPhoneForDisplay(value);
    }

    protected date(iso: string): string {
        return formatUtcIsoAsLocalDateDisplay(iso);
    }

    protected time(iso: string): string {
        return formatUtcIsoAsLocalTimeDisplay(iso);
    }

    protected methodLabel(m: CheckoutPaymentMethod): string {
        return CHECKOUT_METHOD_LABEL[m];
    }

    protected methodIcon(m: CheckoutPaymentMethod): string {
        return METHOD_KEYS.find((k) => k.method === m)?.icon ?? 'pi pi-wallet';
    }

    protected careLabel(s: VisitCheckoutSummaryDto): string {
        return CARE_LABEL[this.careStatusOf(s)];
    }

    protected careSeverity(s: VisitCheckoutSummaryDto): 'warn' | 'info' | 'success' {
        return CARE_SEVERITY[this.careStatusOf(s)];
    }

    private careStatusOf(s: VisitCheckoutSummaryDto): VisitCheckoutSummaryDto['careStatus'] {
        return this.completedHere() ? 'Completed' : s.careStatus;
    }

    protected lineErrorOf(line: CheckoutPaymentLine): string | null {
        return lineError(line);
    }

    decisionOf(id: string): ItemDecision {
        return this.decisions()[id] ?? 'pending';
    }

    unitPriceOf(item: VisitCheckoutPendingItemDto): number | null {
        return item.suggestedUnitPrice ?? this.unitPrices()[item.id] ?? null;
    }

    itemTotal(item: VisitCheckoutPendingItemDto): number | null {
        return itemAmount(item.quantity, this.unitPriceOf(item));
    }

    // Kalemler

    setDecision(id: string, d: ItemDecision): void {
        this.decisions.update((m) => ({ ...m, [id]: d }));
        this.waiveFor.set(null);
    }

    convertAll(): void {
        const next = { ...this.decisions() };

        for (const item of this.pendingItems()) {
            if ((next[item.id] ?? 'pending') === 'pending') {
                next[item.id] = 'convert';
            }
        }

        this.decisions.set(next);
    }

    setUnitPrice(id: string, raw: string): void {
        this.unitPrices.update((m) => ({ ...m, [id]: parseAmount(raw) }));
    }

    startWaive(id: string): void {
        this.waiveFor.set(id);
        this.focusLater('waive-' + id);
    }

    setWaiveReason(id: string, value: string): void {
        this.waiveReasons.update((m) => ({ ...m, [id]: value }));
    }

    waiveReasonValid(id: string): boolean {
        return (this.waiveReasons()[id] ?? '').trim().length >= 5;
    }

    confirmWaive(id: string): void {
        if (this.waiveReasonValid(id)) {
            this.setDecision(id, 'waive');
        }
    }

    toggleCharge(id: string): void {
        this.selected.update((set) => {
            const next = new Set(set);

            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }

            return next;
        });
    }

    // Tahsilat

    addLine(method: CheckoutPaymentMethod): void {
        const existing = this.lines().find((l) => l.method === method && l.amount === null);

        if (existing) {
            this.focusLater('line-amount-' + existing.id);

            return;
        }

        const id = 'l' + crypto.randomUUID().slice(0, 8);

        this.lines.update((ls) => [...ls, { id, method, amount: null, cashRegisterId: null, requestId: crypto.randomUUID() }]);
        this.focusLater('line-amount-' + id);
    }

    removeLine(id: string): void {
        this.lines.update((ls) => ls.filter((l) => l.id !== id));
    }

    setLineAmount(id: string, raw: string): void {
        const amount = parseAmount(raw);

        this.lines.update((ls) => ls.map((l) => (l.id === id ? { ...l, amount } : l)));
    }

    setRegister(id: string, cashRegisterId: string | null): void {
        this.lines.update((ls) => ls.map((l) => (l.id === id ? { ...l, cashRegisterId } : l)));
    }

    /** Bu satır dışındaki geçerli satırlar ve krediyle kapanmayan tutar: "Kalanı" bunu yazar. */
    remainingBefore(lineId: string): number {
        const others = sumAmounts(this.validLines().filter((l) => l.id !== lineId).map((l) => l.amount));

        return Math.max(0, roundMoney(this.due() - this.credit() - others));
    }

    fillRemaining(id: string): void {
        const amount = this.remainingBefore(id);

        this.lines.update((ls) => ls.map((l) => (l.id === id ? { ...l, amount } : l)));
    }

    /** Enter: tutar boşsa kalanı yazar; doluysa kaydeder (ön büro tek elle çalışır). */
    onAmountEnter(line: CheckoutPaymentLine, ev: Event): void {
        ev.preventDefault();

        if (line.amount === null) {
            this.fillRemaining(line.id);
        } else if (this.canSubmit()) {
            this.submit();
        }
    }

    setCredit(raw: string): void {
        this.credit.set(parseAmount(raw) ?? 0);
    }

    useCreditMax(): void {
        this.credit.set(Math.min(this.creditBalance(), this.due()));
    }

    // Kayıt

    submit(): void {
        if (!this.canSubmit()) {
            return;
        }

        this.plan = null;
        this.steps.set(this.saveWork());
        this.failedLineId.set(null);
        this.phase.set('saving');
        void this.runFrom(0);
    }

    retryFailed(): void {
        const idx = this.steps().findIndex((st) => st.status === 'failed');

        if (idx >= 0) {
            this.failedLineId.set(null);
            this.phase.set('saving');
            void this.runFrom(idx);
        }
    }

    /** Başarısız ödeme satırı alınmamış sayılır; tutarı borç olarak kalır, kalan adımlar (tamamlama dahil) sürer. */
    closeWithDebtAfterFailure(): void {
        const idx = this.steps().findIndex((st) => st.status === 'failed');
        const lineId = idx >= 0 ? this.steps()[idx].lineId : undefined;

        if (!lineId) {
            return;
        }

        this.steps.update((sts) => sts.map((st, i) => (i === idx ? { ...st, status: 'skipped' as const } : st)));
        this.lines.update((ls) => ls.filter((l) => l.id !== lineId));
        this.failedLineId.set(null);
        this.phase.set('saving');
        void this.runFrom(idx + 1);
    }

    print(): void {
        printSaleReceipt();
    }

    /** Kaydedilecek adımlar (K1, sözleşme §4 sırası); boşsa kaydedilecek bir şey yoktur. */
    private saveWork(): SaveStep[] {
        const s = this.summary();

        if (!s || s.isVoided) {
            return [];
        }

        const items = this.pendingItems();
        const convertCount = this.canConvert() ? items.filter((i) => this.decisionOf(i.id) === 'convert').length : 0;
        const waiveCount = this.canConvert() ? items.filter((i) => this.decisionOf(i.id) === 'waive').length : 0;
        const steps: SaveStep[] = [];

        if (convertCount > 0) {
            steps.push({ key: 'convert', kind: 'convert', label: `${convertCount} kalem ücrete çevriliyor`, detail: `${convertCount} kalem ücrete çevrildi`, status: 'pending' });
        }

        if (waiveCount > 0) {
            steps.push({ key: 'waive', kind: 'waive', label: `${waiveCount} kalem ücretsiz sayılıyor`, detail: `${waiveCount} kalem gerekçeyle ücretsiz sayıldı`, status: 'pending' });
        }

        if (this.canCollect() && this.credit() > 0) {
            steps.push({ key: 'credit', kind: 'credit', label: `Krediden ${this.money(this.credit())} düşülüyor`, detail: `Krediden ${this.money(this.credit())} düşüldü`, status: 'pending' });
        }

        if (this.canCollect()) {
            for (const line of this.lines()) {
                const text = `${CHECKOUT_METHOD_LABEL[line.method]} ${this.money(line.amount ?? 0)}`;

                steps.push({ key: 'pay-' + line.id, kind: 'pay', label: `${text} kaydediliyor`, detail: `${text} alındı`, status: 'pending', lineId: line.id });
            }
        }

        if (this.canComplete && s.careStatus !== 'Completed') {
            steps.push({ key: 'complete', kind: 'complete', label: s.careStatus === 'Waiting' ? 'Geliş başlatılıp tamamlanıyor' : 'Geliş tamamlanıyor', detail: 'Geliş tamamlandı', status: 'pending' });
        }

        return steps;
    }

    private async runFrom(index: number): Promise<void> {
        for (let i = index; i < this.steps().length; i++) {
            if (this.destroyed) {
                return;
            }

            const step = this.steps()[i];

            this.setStepStatus(i, 'running');

            try {
                await this.runStep(step);
            } catch (err) {
                this.setStepStatus(i, 'failed');
                this.failedLineId.set(step.lineId ?? null);
                this.failureMessage.set(panelHttpFailureMessage(err, 'İşlem tamamlanamadı.'));
                this.phase.set('failed');

                return;
            }

            this.setStepStatus(i, 'done');

            if (step.lineId) {
                const lineId = step.lineId;

                this.savedLineIds.update((set) => new Set([...set, lineId]));
            }
        }

        this.phase.set('done');
        this.finished.emit();
        this.suggestDocument();
    }

    private async runStep(step: SaveStep): Promise<void> {
        const s = this.summary()!;

        switch (step.kind) {
            case 'convert':
                for (const item of this.pendingItems().filter((i) => this.decisionOf(i.id) === 'convert' && !this.convertedCharges.has(i.id))) {
                    const requestId = this.convertRequestIds.get(item.id) ?? crypto.randomUUID();

                    this.convertRequestIds.set(item.id, requestId);
                    const result = await firstValueFrom(this.suggestions.convert(item.id, { requestId, unitPrice: item.suggestedUnitPrice === null ? (this.unitPriceOf(item) ?? undefined) : undefined }));

                    this.convertedCharges.set(item.id, { chargeId: result.charge.id, outstanding: result.charge.outstandingAmount ?? result.charge.amount });
                }

                return;
            case 'waive':
                for (const item of this.pendingItems().filter((i) => this.decisionOf(i.id) === 'waive' && !this.waivedItems.has(i.id))) {
                    await firstValueFrom(this.suggestions.waive(item.id, this.waiveReasons()[item.id] ?? ''));
                    this.waivedItems.add(item.id);
                }

                return;
            case 'credit':
                await firstValueFrom(this.credits.applyCredit(s.clientId, this.creditRequestId, this.allocationPlan().credit));

                return;

            case 'pay': {
                const index = this.lines().findIndex((l) => l.id === step.lineId);
                const line = this.lines()[index];
                const part = this.allocationPlan().lines[index];

                await firstValueFrom(
                    this.payments.createPayment({
                        clinicId: s.clinicId,
                        clientId: s.clientId,
                        petId: s.petId,
                        amount: line.amount ?? 0,
                        currency: s.currency,
                        method: line.method,
                        paidAtUtc: new Date().toISOString(),
                        requestId: line.requestId,
                        allocations: part.allocations,
                        creditAmount: part.creditAmount > 0 ? part.creditAmount : undefined,
                        cashRegisterId: line.method === 'cash' ? line.cashRegisterId : null
                    })
                );

                return;
            }

            case 'complete': {
                if (s.careStatus === 'Waiting') {
                    await firstValueFrom(this.visits.startVisit(s.visitId));
                }

                const withoutCharge = completesWithoutCharge(s.charges?.visitCharges.length ?? 1, this.convertedCharges.size, this.undecided());

                await firstValueFrom(this.visits.completeVisit(s.visitId, { withoutCharge }));
                this.completedHere.set(true);

                return;
            }
        }
    }

    /**
     * Dağıtım planı, kalemler ücrete çevrildikten sonra bir kez kurulur ve tekrar denemelerde aynı kalır: yeni ücretler (kalem sırasıyla),
     * bu gelişin seçili açık ücretleri, sonra seçili eski borçlar.
     */
    private allocationPlan(): AllocationPlan {
        if (!this.plan) {
            const sel = this.selected();
            const converted = this.pendingItems()
                .map((i) => this.convertedCharges.get(i.id))
                .filter((c): c is ChargeToSettle => !!c);
            const charges: ChargeToSettle[] = [
                ...converted,
                ...[...this.visitOpenCharges(), ...this.otherCharges()].filter((c) => sel.has(c.chargeId)).map((c) => ({ chargeId: c.chargeId, outstanding: c.outstandingAmount }))
            ];

            this.plan = planAllocations(
                charges,
                this.credit(),
                this.lines().map((l) => l.amount ?? 0)
            );
        }

        return this.plan;
    }

    /** Ziyaret kapanışındaki e-Belge önerisi; Bugün'deki "Tamamla" ile aynı kural ve bileşen (K7). */
    private suggestDocument(): void {
        if (!this.canIssueDocument) {
            return;
        }

        this.eDocuments.visitCloseSuggestion(this.visitId()).subscribe((source) => {
            if (source && !this.destroyed) {
                this.documentSource.set(source);
                this.documentOpen.set(true);
            }
        });
    }

    private setStepStatus(index: number, status: StepStatus): void {
        this.steps.update((sts) => sts.map((st, i) => (i === index ? { ...st, status } : st)));
    }

    private load(visitId: string): void {
        this.loading.set(true);
        this.loadError.set(null);
        this.checkout.getSummary(visitId).subscribe({
            next: (s) => {
                this.reset(s);
                this.summary.set(s);
                this.loading.set(false);
            },
            error: (err: unknown) => {
                this.loadError.set(panelHttpFailureMessage(err, 'Hesap bilgisi yüklenemedi.'));
                this.loading.set(false);
            }
        });
    }

    /** Açılış varsayılanı (tasarım): kalemler ücrete çevrilecek, bu gelişin açık ücretleri seçili, eski borçlar seçili değil (K3). */
    private reset(s: VisitCheckoutSummaryDto): void {
        const canConvert = this.hasConvertClaim && s.charges !== null;

        this.view.set('panel');
        this.phase.set('edit');
        this.completedHere.set(false);
        this.steps.set([]);
        this.savedLineIds.set(new Set());
        this.failedLineId.set(null);
        this.waiveFor.set(null);
        this.waiveReasons.set({});
        this.unitPrices.set({});
        this.lines.set([]);
        this.credit.set(0);
        this.convertRequestIds.clear();
        this.convertedCharges.clear();
        this.waivedItems.clear();
        this.creditRequestId = crypto.randomUUID();
        this.plan = null;
        this.decisions.set(Object.fromEntries((s.charges?.pendingItems ?? []).map((i) => [i.id, canConvert ? ('convert' as const) : ('pending' as const)])));
        this.selected.set(new Set((s.charges?.visitCharges ?? []).filter((c) => c.outstandingAmount > 0).map((c) => c.chargeId)));
    }

    private focusLater(elementId: string): void {
        setTimeout(() => document.getElementById(elementId)?.focus(), 0);
    }
}
