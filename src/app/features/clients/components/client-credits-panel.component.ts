import { Component, computed, effect, inject, input, signal, untracked, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { AuthService } from '@/app/core/auth/auth.service';
import { CHARGES_READ_CLAIM, PAYMENTS_CORRECT_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { ClientCreditApplicationItemDto, ClientCreditDto } from '@/app/entities/client-credit/models/client-credit-api.model';
import { ClientCreditsService } from '@/app/entities/client-credit/services/client-credits.service';
import { clientCreditSourceLabel, clientCreditStatusTag } from '@/app/entities/client-credit/utils/client-credit.utils';
import { type CanonicalPaymentMethod, PAYMENT_WRITE_METHOD_OPTIONS, paymentMethodLabel } from '@/app/entities/payment/utils/payment-method.utils';
import { TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { ReasonConfirmDialogComponent } from '@/app/shared/ui/reason-confirm-dialog/reason-confirm-dialog.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { formatMoney } from '@/app/shared/utils/money.utils';
import { addTracedToast } from '@/app/shared/utils/toast-trace.utils';

/** Ödeme ekranında krediden mahsup sonrası müşteri kartına dönerken eklenen sorgu anahtarı (bilgi mesajı bir kez gösterilir). */
export const CREDIT_APPLIED_QUERY_KEY = 'creditApplied';

/**
 * Müşteri kartı "Müşteri kredisi" (FIN-005, `CLIENT_CREDIT_API_CONTRACT.md` §5–§7): açık krediler, isteğe bağlı kapalılar ve
 * her kredinin mahsupları. `Charges.Read` yoksa ya da kredi yokken kapalılar gösterilmiyorsa bölüm hiç çizilmez.
 * İade ve mahsup geri alma `Payments.Correct` ister; salt okunur kiracıda kapalıdır. Toast sayfanın `MessageService`'iyle gösterilir.
 */
@Component({
    selector: 'app-client-credits-panel',
    standalone: true,
    imports: [FormsModule, RouterLink, ButtonModule, SelectModule, ToggleSwitchModule, AppErrorStateComponent, AppStatusTagComponent, ReasonConfirmDialogComponent, TrDateTimePipe],
    host: { class: 'block' },
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (visible()) {
            <section class="card mb-0" aria-labelledby="client-credits-title" data-testid="client-credits">
                <div class="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3">
                    <h5 id="client-credits-title" class="m-0 text-base">Müşteri kredisi</h5>
                    <span class="font-medium tabular-nums" data-testid="client-credits-available">Kullanılabilir: {{ money(available()) }}</span>
                    <label class="flex items-center gap-2 text-sm ml-auto" for="clientCreditsClosed">
                        <p-toggleswitch inputId="clientCreditsClosed" [ngModel]="includeClosed()" (ngModelChange)="includeClosed.set($event)" />
                        Kapalıları göster
                    </label>
                </div>
                @if (loadError(); as err) {
                    <app-error-state [detail]="err" (retry)="load()" />
                } @else if ((credits() ?? []).length === 0) {
                    <p class="m-0 text-sm text-muted-color">Bu müşterinin kredi kaydı yok.</p>
                } @else {
                    <ul class="list-none m-0 p-0 flex flex-col gap-3">
                        @for (c of credits(); track c.id) {
                            <li class="border border-surface-200 dark:border-surface-700 rounded-border p-3" data-testid="client-credit-row">
                                <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
                                    <span class="font-medium">{{ sourceLabel(c.source) }}</span>
                                    <app-status-tag [label]="statusTag(c).label" [severity]="statusTag(c).severity" />
                                    <span class="text-sm text-muted-color">{{ c.createdAtUtc | trDateTime }}</span>
                                    <a [routerLink]="['/panel/payments', c.sourcePaymentId]" class="text-primary text-sm no-underline max-sm:touch-hit">Kaynak ödeme</a>
                                    @if (canCorrect && c.status === 'Open' && c.remainingAmount > 0) {
                                        <button pButton type="button" class="p-button-text p-button-sm p-button-danger ml-auto" data-testid="client-credit-refund" (click)="openRefund(c)"><i class="pi pi-replay"></i>İade et</button>
                                    }
                                </div>
                                <dl class="m-0 mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                                    <div class="flex gap-2">
                                        <dt class="text-muted-color">Tutar</dt>
                                        <dd class="m-0 tabular-nums">{{ money(c.amount) }}</dd>
                                    </div>
                                    <div class="flex gap-2">
                                        <dt class="text-muted-color">Kullanılan</dt>
                                        <dd class="m-0 tabular-nums">{{ money(c.usedAmount) }}</dd>
                                    </div>
                                    <div class="flex gap-2">
                                        <dt class="text-muted-color">Kalan</dt>
                                        <dd class="m-0 tabular-nums font-medium">{{ money(c.remainingAmount) }}</dd>
                                    </div>
                                </dl>
                                @if (c.refundedAtUtc) {
                                    <p class="m-0 mt-1 text-sm text-muted-color">
                                        İade: {{ c.refundedAtUtc | trDateTime }}
                                        @if (c.refundedAmount != null) {
                                            · {{ money(c.refundedAmount) }}
                                        }
                                        @if (c.refundMethod) {
                                            · {{ methodLabel(c.refundMethod) }}
                                        }
                                        @if (c.refundReason) {
                                            · Gerekçe: {{ c.refundReason }}
                                        }
                                    </p>
                                }
                                @if (c.applications.length > 0) {
                                    <ul class="list-none m-0 mt-2 p-0 flex flex-col gap-1 text-sm" [attr.aria-label]="'Mahsuplar: ' + sourceLabel(c.source)">
                                        @for (a of c.applications; track a.id) {
                                            <li class="flex flex-wrap items-center gap-x-3 gap-y-1" data-testid="client-credit-application">
                                                <span class="break-words">{{ a.chargeDescription || '—' }}</span>
                                                <span class="tabular-nums" [class.line-through]="!!a.reversedAtUtc">{{ money(a.amount) }}</span>
                                                <span class="text-muted-color">{{ a.createdAtUtc | trDateTime }}</span>
                                                @if (a.reversedAtUtc) {
                                                    <app-status-tag label="Geri alındı" severity="secondary" />
                                                    @if (a.reverseReason) {
                                                        <span class="text-muted-color">Gerekçe: {{ a.reverseReason }}</span>
                                                    }
                                                } @else if (canCorrect && c.status !== 'Refunded' && c.status !== 'Voided') {
                                                    <button pButton type="button" class="p-button-text p-button-sm" data-testid="client-credit-reverse" (click)="openReverse(c, a)"><i class="pi pi-undo"></i>Geri al</button>
                                                }
                                            </li>
                                        }
                                    </ul>
                                }
                            </li>
                        }
                    </ul>
                }
            </section>
        }

        @if (canCorrect) {
            <app-reason-confirm-dialog
                [(visible)]="reverseVisible"
                header="Mahsubu geri al"
                [summary]="reverseTarget() ? (reverseTarget()!.application.chargeDescription || '—') + ' · ' + money(reverseTarget()!.application.amount) : null"
                description="Tutar müşteri kredisine geri döner, ücretin açık tutarı aynı miktarda artar."
                confirmLabel="Mahsubu geri al"
                failureFallback="Mahsup geri alınamadı."
                [execute]="reverse"
                (confirmed)="afterChange('Mahsup geri alındı.', 'Tutar krediye döndü; ücretin açık tutarı arttı.')"
            />
            <app-reason-confirm-dialog
                [(visible)]="refundVisible"
                header="Krediyi iade et"
                [summary]="refundTarget() ? sourceLabel(refundTarget()!.source) + ' · kalan ' + money(refundTarget()!.remainingAmount) : null"
                description="Kalan kredinin tamamı müşteriye geri verilir ve gün sonunda kasadan çıkış olarak görünür. Kısmi iade yoktur; işlem geri alınamaz."
                confirmLabel="İade et"
                failureFallback="Kredi iade edilemedi."
                [execute]="refund"
                (confirmed)="afterChange('Kredi iade edildi.', 'Kalan tutar müşteriye geri verildi.')"
            >
                <label for="clientCreditRefundMethod" class="block text-sm font-medium text-muted-color mb-2">İade yöntemi *</label>
                <p-select inputId="clientCreditRefundMethod" class="w-full mb-4" appendTo="body" [options]="methodOptions" optionLabel="label" optionValue="value" [ngModel]="refundMethod()" (ngModelChange)="refundMethod.set($event)" />
            </app-reason-confirm-dialog>
        }
    `
})
export class ClientCreditsPanelComponent {
    readonly clientId = input.required<string>();

    private readonly creditsService = inject(ClientCreditsService);
    private readonly auth = inject(AuthService);
    private readonly messages = inject(MessageService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    readonly ro = inject(TenantReadOnlyContextService);

    private readonly canRead = this.auth.hasOperationClaim(CHARGES_READ_CLAIM);
    readonly canCorrect = this.auth.hasOperationClaim(PAYMENTS_CORRECT_CLAIM) && !this.ro.mutationBlocked();

    readonly includeClosed = signal(false);
    /** `null`: henüz yüklenmedi. */
    readonly credits = signal<ClientCreditDto[] | null>(null);
    readonly loadError = signal<string | null>(null);
    /** Kredi yoksa ve kapalılar istenmediyse bölüm çizilmez; yükleme hatası her zaman görünür. */
    readonly visible = computed(() => this.canRead && (!!this.loadError() || (this.credits() ?? []).length > 0 || this.includeClosed()));
    /** Açık kredilerin kalan toplamı (kuruş hatasız). */
    readonly available = computed(() => (this.credits() ?? []).filter((c) => c.status === 'Open').reduce((sum, c) => sum + Math.round(c.remainingAmount * 100), 0) / 100);

    readonly methodOptions = [...PAYMENT_WRITE_METHOD_OPTIONS];
    readonly refundMethod = signal<CanonicalPaymentMethod>('cash');
    readonly refundTarget = signal<ClientCreditDto | null>(null);
    readonly reverseTarget = signal<{ credit: ClientCreditDto; application: ClientCreditApplicationItemDto } | null>(null);
    refundVisible = false;
    reverseVisible = false;

    readonly reverse = (reason: string) => this.creditsService.reverseApplication(this.clientId(), this.reverseTarget()!.application.id, reason);
    readonly refund = (reason: string) => this.creditsService.refundCredit(this.clientId(), this.refundTarget()!.id, reason, this.refundMethod());

    readonly sourceLabel = clientCreditSourceLabel;
    readonly methodLabel = paymentMethodLabel;
    readonly money = (amount: number) => formatMoney(amount, 'TRY');

    constructor() {
        effect(() => {
            this.clientId();
            this.includeClosed();
            untracked(() => this.load());
        });
        this.showCreditAppliedNotice();
    }

    statusTag(c: ClientCreditDto) {
        return clientCreditStatusTag(c.status);
    }

    load(): void {
        if (!this.canRead) {
            return;
        }

        const clientId = this.clientId();
        const includeClosed = this.includeClosed();

        this.loadError.set(null);
        this.creditsService.getCredits(clientId, includeClosed).subscribe({
            next: (items) => {
                if (clientId === this.clientId() && includeClosed === this.includeClosed()) {
                    this.credits.set(items);
                }
            },
            error: (e: unknown) => {
                this.credits.set(null);
                this.loadError.set(panelHttpFailureMessage(e, 'Müşteri kredileri yüklenemedi.'));
            }
        });
    }

    openRefund(credit: ClientCreditDto): void {
        this.refundTarget.set(credit);
        this.refundMethod.set('cash');
        this.refundVisible = true;
    }

    openReverse(credit: ClientCreditDto, application: ClientCreditApplicationItemDto): void {
        this.reverseTarget.set({ credit, application });
        this.reverseVisible = true;
    }

    afterChange(summary: string, detail: string): void {
        addTracedToast(this.messages, 'ClientCreditsPanel', this.router.url, { severity: 'success', summary, detail, life: 5000 });
        this.load();
    }

    /** Ödeme ekranında "Krediden öde" başarılıysa kart bu anahtarla açılır: mesaj bir kez gösterilir, anahtar adresten silinir. */
    private showCreditAppliedNotice(): void {
        if (this.route.snapshot.queryParamMap.get(CREDIT_APPLIED_QUERY_KEY) !== '1') {
            return;
        }

        addTracedToast(this.messages, 'ClientCreditsPanel', this.router.url, {
            severity: 'success',
            summary: 'Krediden ödendi.',
            detail: 'Seçilen ücretler müşteri kredisinden kapatıldı; ödeme kaydı oluşmadı.',
            life: 6000
        });
        void this.router.navigate([], { relativeTo: this.route, queryParams: { [CREDIT_APPLIED_QUERY_KEY]: null }, queryParamsHandling: 'merge', replaceUrl: true });
    }
}
