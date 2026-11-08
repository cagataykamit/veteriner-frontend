import { DateInputComponent } from '@/app/shared/forms/date-input/date-input.component';
import { ClientSearchComponent } from '@/app/entities/client/components/client-search.component';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ClientsService } from '@/app/entities/client/services/clients.service';
import type { ClientOpenChargeVm } from '@/app/entities/client/models/client-balance-vm.model';
import { mapPaymentUpsertFormToWriteRequest } from '@/app/entities/payment/data/payment.mapper';
import { PaymentsService } from '@/app/entities/payment/services/payments.service';
import {
    allocationAmountError,
    allocationTotal,
    buildAllocations,
    creditApplyError,
    PAYMENT_CURRENCY,
    receivedAmountError,
    receivedCreditAmount
} from '@/app/features/payments/utils/payment-allocation.utils';
import { CashRegisterSelectComponent } from '@/app/entities/cash-register/components/cash-register-select.component';
import { ClientCreditsService } from '@/app/entities/client-credit/services/client-credits.service';
import { CLIENT_CREDIT_PROBLEM_MESSAGES } from '@/app/entities/client-credit/utils/client-credit-error.utils';
import { PAYMENT_WRITE_METHOD_OPTIONS } from '@/app/entities/payment/utils/payment-method.utils';
import { type PaymentUpsertFieldErrors, parsePaymentUpsertHttpError } from '@/app/features/payments/utils/payment-upsert-validation-parse.utils';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { trimClientIdControlValue } from '@/app/shared/forms/client-pet-selection.utils';
import { messageFromHttpError, panelHttpFailureMessage, problemCodeFromHttpError } from '@/app/shared/utils/api-error.utils';
import { fromIstanbulDateTimeLocalInputToUtcIso } from '@/app/shared/utils/date.utils';
import { dateTimeYearRangeValidator, effectiveDateTimeLocalInputMin } from '@/app/shared/utils/date-input-validation.utils';
import { PAYMENT_DATE_TOO_FAR_PAST_MESSAGE, paymentDateNotTooFarPastValidator, paymentDateTimeLocalMinAllowed } from '@/app/features/payments/utils/payment-date-validation.utils';
import { formatMoney } from '@/app/shared/utils/money.utils';
import { parseDecimalFormInput } from '@/app/shared/utils/decimal-form.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';

/** Açık tutar bu arada değişti: güncel bakiye yeniden okunur, aynı `requestId` ile tekrar denemek güvenlidir. */
const STALE_BALANCE_CODES = new Set(['PaymentAllocations.ExceedsOutstanding', 'Payments.ConcurrencyConflict']);
const STALE_BALANCE_MESSAGE = 'Açık tutarlar değişti; güncel tutarlar yüklendi. Kontrol edip tekrar kaydedin.';
/** Krediden mahsupta kredi ya da açık tutar bu arada değişti: bakiye yeniden okunur, aynı `requestId` ile tekrar denemek güvenlidir. */
const STALE_CREDIT_CODES = new Set(['PaymentAllocations.ExceedsOutstanding', 'ClientCredits.ConcurrencyConflict', 'ClientCredits.InsufficientBalance']);
const STALE_CREDIT_MESSAGE = 'Kredi ya da açık tutarlar değişti; güncel tutarlar yüklendi. Kontrol edip tekrar deneyin.';
const DUPLICATE_MISMATCH_MESSAGE ='Bu form için ödeme daha önce kaydedilmiş olabilir. Ödeme listesini kontrol edin; gerekirse sayfayı yenileyip yeni bir ödeme girin.';

@Component({
    selector: 'app-payment-new-page',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink, ButtonModule, SelectModule, TableModule, AppPageHeaderComponent, ClientSearchComponent, DateInputComponent, TrDateTimePipe, CashRegisterSelectComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <app-page-header categoryLink="/panel/payments" categoryLinkLabel="Ödeme listesine dön" title="Yeni Ödeme" description="Müşterinin açık ücretlerinden hangilerine ne kadar ödeme alındığını girin." />

        <div class="card">
            @if (ro.mutationBlocked()) {
                <p class="text-amber-700 dark:text-amber-300 text-sm mt-0 mb-4" role="status">İşletme salt okunur moddadır; kayıt oluşturulamaz.</p>
            }
            <p class="text-sm text-muted-color mt-0 mb-4">Aktif Klinik: {{ activeClinicLabel() }}</p>
            <form [formGroup]="form" (ngSubmit)="onSubmit()">
                <div class="grid grid-cols-12 gap-4">
                    <div class="col-span-12 md:col-span-6">
                        <label for="clientId" class="block text-sm font-medium text-muted-color mb-2">Müşteri *</label>
                        <app-client-search inputId="clientId" formControlName="clientId" />
                        @if (apiFieldErrors().clientId) {
                            <small class="text-red-500">{{ apiFieldErrors().clientId }}</small>
                        } @else if (form.controls.clientId.invalid && form.controls.clientId.touched) {
                            <small class="text-red-500">Zorunlu alan.</small>
                        }
                    </div>

                    @if (clientSelected() && !balanceLoading() && !balanceError() && creditBalance() > 0) {
                        <div class="col-span-12" data-testid="payment-credit">
                            <div class="flex flex-wrap items-center gap-x-4 gap-y-2 p-3 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800" role="status">
                                <span class="font-medium"><i class="pi pi-wallet mr-2" aria-hidden="true"></i>Kullanılabilir kredi: {{ money(creditBalance()) }}</span>
                                @if (openCharges().length > 0) {
                                    <span class="text-sm text-muted-color">Ücretlere tutar girip krediden kapatabilirsiniz; ödeme kaydı oluşmaz.</span>
                                    <button pButton type="button" size="small" class="ml-auto" [disabled]="!canApplyCredit() || busy() || ro.mutationBlocked()" (click)="applyCredit()">
                                        <i class="p-button-icon" [class]="applyingCredit() ? 'pi pi-spin pi-spinner' : 'pi pi-wallet'"></i>Krediden öde
                                    </button>
                                }
                            </div>
                            @if (creditLimitError(); as err) {
                                <small class="text-red-500 block mt-1">{{ err }}</small>
                            }
                            @if (creditError()) {
                                <p class="text-red-500 mt-2 mb-0" role="alert">{{ creditError() }}</p>
                            }
                        </div>
                    }

                    <div class="col-span-12">
                        <span class="block text-sm font-medium text-muted-color mb-2">Hangi ücrete?{{ prepayment() ? '' : ' *' }}</span>
                        @if (!clientSelected()) {
                            <p class="text-sm text-muted-color m-0">Önce müşteriyi seçin.</p>
                        } @else if (balanceLoading()) {
                            <p class="text-sm text-muted-color m-0" role="status">Açık ücretler yükleniyor…</p>
                        } @else if (balanceError()) {
                            <p class="text-red-500 m-0" role="alert">{{ balanceError() }}</p>
                        } @else if (openCharges().length === 0) {
                            @if (prepayment()) {
                                <p class="text-sm m-0" role="status" data-testid="payment-prepayment">
                                    Avans (peşin ödeme): alınan tutarın tamamı müşteri kredisine yazılır; sonraki ücretler krediden kapatılabilir.
                                    <button pButton type="button" size="small" severity="secondary" [text]="true" (click)="setPrepayment(false)">Vazgeç</button>
                                </p>
                            } @else {
                                <p class="text-sm m-0" role="status">
                                    Bu müşterinin açık ücreti yok. Ödemeyi bir ücrete bağlamak için önce
                                    <a [routerLink]="['/panel/charges/new']" [queryParams]="chargeNewQueryParams()" class="text-primary font-medium no-underline">ücret ekleyin</a>
                                    ya da peşin alınan tutarı avans olarak kaydedin.
                                </p>
                                <button pButton type="button" size="small" severity="secondary" [outlined]="true" class="mt-2" (click)="setPrepayment(true)" data-testid="payment-prepayment-start">
                                    <i class="p-button-icon pi pi-wallet"></i>Avans/peşin ödeme olarak kaydet
                                </button>
                            }
                        } @else {
                            <div class="overflow-x-auto table-stack-phone">
                                <p-table [value]="openCharges()" dataKey="chargeId" size="small" [tableStyle]="{ 'min-width': '44rem' }">
                                    <ng-template #header>
                                        <tr>
                                            <th>Ücret</th>
                                            <th>Tarih</th>
                                            <th class="text-right">Kalan</th>
                                            <th class="text-right" style="width: 14rem">Bu ödemeden</th>
                                        </tr>
                                    </ng-template>
                                    <ng-template #body let-row>
                                        <tr>
                                            <td>
                                                <div class="break-words max-sm:font-medium">{{ row.description }}</div>
                                                @if (row.petName) {
                                                    <div class="text-sm text-muted-color">{{ row.petName }}</div>
                                                }
                                            </td>
                                            <td class="whitespace-nowrap" data-label="Tarih">{{ row.createdAtUtc | trDateTime }}</td>
                                            <td class="text-right whitespace-nowrap" data-label="Kalan">{{ money(row.outstandingAmount) }}</td>
                                            <td class="text-right" data-label="Bu ödemeden">
                                                <div class="flex items-center justify-end max-sm:justify-start gap-2">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        inputmode="decimal"
                                                        class="p-inputtext p-component w-28 text-right"
                                                        [attr.aria-label]="'Ödenecek tutar: ' + row.description"
                                                        [value]="amountOf(row)"
                                                        (input)="onAmountInput(row, $any($event.target).value)"
                                                    />
                                                    <button pButton type="button" size="small" severity="secondary" [text]="true" (click)="fillOutstanding(row)">Tamamı</button>
                                                </div>
                                                @if (rowError(row); as err) {
                                                    <small class="text-red-500">{{ err }}</small>
                                                }
                                            </td>
                                        </tr>
                                    </ng-template>
                                </p-table>
                            </div>
                        }
                    </div>

                    @if (!prepayment()) {
                        <div class="col-span-12 md:col-span-6 lg:col-span-3">
                            <span class="block text-sm font-medium text-muted-color mb-2">Seçilen ücretlerin toplamı</span>
                            <div class="p-inputtext p-component w-full font-semibold" aria-live="polite">{{ money(total()) }}</div>
                        </div>
                    }
                    <div class="col-span-12 md:col-span-6 lg:col-span-3">
                        <label for="receivedAmount" class="block text-sm font-medium text-muted-color mb-2">Alınan tutar{{ prepayment() ? ' *' : '' }}</label>
                        <input
                            id="receivedAmount"
                            type="number"
                            step="0.01"
                            min="0"
                            inputmode="decimal"
                            class="p-inputtext p-component w-full text-right"
                            [placeholder]="prepayment() ? '' : money(total())"
                            [value]="receivedInput() ?? ''"
                            (input)="onReceivedInput($any($event.target).value)"
                        />
                        @if (receivedError(); as err) {
                            <small class="text-red-500 block">{{ err }}</small>
                        } @else if (apiFieldErrors().amount) {
                            <small class="text-red-500 block">{{ apiFieldErrors().amount }}</small>
                        } @else if (creditAmount() > 0 && !prepayment()) {
                            <small class="block font-medium" data-testid="payment-overpayment" aria-live="polite">Fazlası ({{ money(creditAmount()) }}) müşteri kredisine yazılır.</small>
                        } @else {
                            <small class="text-muted-color block">{{ prepayment() ? 'Tamamı müşteri kredisine yazılır; yalnız TRY.' : 'Boş bırakılırsa seçilen ücretlerin toplamı alınır; yalnız TRY.' }}</small>
                        }
                    </div>
                    <div class="col-span-12 md:col-span-6 lg:col-span-3">
                        <label for="method" class="block text-sm font-medium text-muted-color mb-2">Yöntem *</label>
                        <p-select inputId="method" [options]="methodOptions" formControlName="method" optionLabel="label" optionValue="value" class="w-full" />
                        @if (apiFieldErrors().method) {
                            <small class="text-red-500">{{ apiFieldErrors().method }}</small>
                        }
                    </div>
                    <app-cash-register-select fieldClass="col-span-12 md:col-span-6 lg:col-span-3" [clinicId]="activeClinicId" [method]="methodValue()" [(value)]="cashRegisterId" [disabled]="busy()" />
                    <div class="col-span-12 md:col-span-6 lg:col-span-3">
                        <label for="paidAtLocal" class="block text-sm font-medium text-muted-color mb-2">Ödeme tarihi / saati *</label>
                        <app-date-input inputId="paidAtLocal" type="datetime-local" formControlName="paidAtLocal" [min]="paymentDateMinAllowed" limit="past" />
                        @if (form.controls.paidAtLocal.hasError('dateYearInvalid') && form.controls.paidAtLocal.touched) {
                            <small class="text-red-500 block">Yıl 4 haneli olmalıdır.</small>
                        } @else if (form.controls.paidAtLocal.hasError('paymentDateTooFarPast') && form.controls.paidAtLocal.touched) {
                            <small class="text-red-500 block">{{ paymentDateTooFarPastMessage }}</small>
                        } @else if (apiFieldErrors().paidAtLocal) {
                            <small class="text-red-500 block">{{ apiFieldErrors().paidAtLocal }}</small>
                        } @else if (form.controls.paidAtLocal.hasError('required') && form.controls.paidAtLocal.touched) {
                            <small class="text-red-500 block">Zorunlu alan.</small>
                        }
                    </div>
                    <div class="col-span-12">
                        <label for="note" class="block text-sm font-medium text-muted-color mb-2">Not</label>
                        <textarea id="note" rows="3" class="w-full p-inputtext p-component" formControlName="note"></textarea>
                        @if (apiFieldErrors().note) {
                            <small class="text-red-500">{{ apiFieldErrors().note }}</small>
                        }
                    </div>
                </div>

                @if (submitError()) {
                    <p class="text-red-500 mt-4 mb-0" role="alert">{{ submitError() }}</p>
                }

                <div class="flex flex-wrap gap-2 mt-4">
                    <button pButton type="submit" [disabled]="!canSubmit() || busy() || ro.mutationBlocked()"><i class="p-button-icon" [class]="submitting() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>{{ copy.buttonSave }}</button>
                    <button pButton type="button" severity="secondary" (click)="goList()" [disabled]="busy()"><i class="p-button-icon pi pi-times"></i>{{ copy.buttonCancel }}</button>
                </div>
            </form>
        </div>
    `
})
export class PaymentNewPageComponent implements OnInit {
    readonly copy = PANEL_COPY;
    protected readonly paymentDateTooFarPastMessage = PAYMENT_DATE_TOO_FAR_PAST_MESSAGE;

    private readonly fb = inject(FormBuilder);
    private readonly paymentsService = inject(PaymentsService);
    private readonly clientsService = inject(ClientsService);
    private readonly clientCreditsService = inject(ClientCreditsService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly destroyRef = inject(DestroyRef);
    private readonly auth = inject(AuthService);
    readonly ro = inject(TenantReadOnlyContextService);

    /** Form başına bir kez üretilir; hata sonrası yeniden denemede de aynı kalır (ikinci ödeme oluşmaz). */
    private readonly requestId = crypto.randomUUID();
    /** Krediden mahsup için ayrı anahtar (ayrı uç); aynı kuralla form başına bir. */
    private readonly creditRequestId = crypto.randomUUID();

    /** Muayene/geliş bağlamı yalnız bağlamın müşterisi seçiliyken geçerlidir. */
    private context: { clientId: string; examinationId: string | null; visitId: string | null; chargeId: string | null } | null = null;

    /** Ödeme zamanı alt sınırı sayfa açılışında bir kez hesaplanır: şablonda her değişiklik algılama turunda yeniden hesaplanınca dakika sınırında NG0100 veriyordu. 7 gün kuralını doğrulayıcı (paymentDateNotTooFarPastValidator) her an uygular. */
    readonly paymentDateMinAllowed = effectiveDateTimeLocalInputMin(paymentDateTimeLocalMinAllowed());
    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);

    readonly activeClinicLabel = signal<string>('Belirlenmedi');
    readonly apiFieldErrors = signal<PaymentUpsertFieldErrors>({});

    readonly clientIdValue = signal('');
    readonly clientSelected = computed(() => this.clientIdValue() !== '');
    /** "Ücret ekleyin" bağlantısı: müşteri yanında bilinen geliş de taşınır (Yeni Ücret'te yeniden seçmek gerekmesin). */
    readonly chargeNewQueryParams = computed(() => ({ clientId: this.clientIdValue(), ...(this.context?.visitId ? { visitId: this.context.visitId } : {}) }));
    readonly balanceLoading = signal(false);
    readonly balanceError = signal<string | null>(null);
    /** Aktif kliniğin açık ücretleri (başka klinik ücretine tahsis edilemez). */
    readonly openCharges = signal<ClientOpenChargeVm[]>([]);
    private readonly amounts = signal<Record<string, number | null>>({});

    readonly allocations = computed(() => buildAllocations(this.openCharges(), this.amounts()));
    readonly total = computed(() => allocationTotal(this.allocations()));
    private readonly hasRowErrors = computed(() => this.openCharges().some((c) => this.rowError(c) !== null));
    private readonly formValid = signal(false);

    /** Açık ücreti olmayan müşteride tutarın tamamı avans (kredi) olarak kaydedilir. */
    readonly prepayment = signal(false);
    /** "Alınan tutar"; boşsa (`null`) seçilen ücretlerin toplamı alınmış sayılır. */
    readonly receivedInput = signal<number | null>(null);
    readonly receivedError = computed(() => receivedAmountError(this.receivedInput(), this.total()));
    private readonly received = computed(() => this.receivedInput() ?? this.total());
    readonly creditAmount = computed(() => receivedCreditAmount(this.received(), this.total()));
    readonly canSubmit = computed(
        () =>
            this.formValid() &&
            !this.hasRowErrors() &&
            !this.balanceLoading() &&
            !this.receivedError() &&
            (this.prepayment() ? this.openCharges().length === 0 && this.received() > 0 : this.total() > 0)
    );

    /** Aktif klinikteki kullanılabilir kredi (bakiye ucundan); ödeme ekranı önce krediyi önerir. */
    readonly creditBalance = signal(0);
    readonly applyingCredit = signal(false);
    readonly creditError = signal<string | null>(null);
    readonly creditLimitError = computed(() => creditApplyError(this.total(), this.creditBalance()));
    readonly canApplyCredit = computed(() => this.creditBalance() > 0 && this.total() > 0 && !this.hasRowErrors() && !this.creditLimitError() && !this.balanceLoading());
    readonly busy = computed(() => this.submitting() || this.applyingCredit());

    readonly methodOptions = [...PAYMENT_WRITE_METHOD_OPTIONS];
    /** Nakitte kasa sorulur (TIER-008); boşsa sunucu Ana kasayı kullanır. */
    readonly methodValue = signal('cash');
    readonly cashRegisterId = signal<string | null>(null);
    readonly activeClinicId = this.auth.getClinicId()?.trim() || null;

    readonly form = this.fb.nonNullable.group({
        clientId: ['', Validators.required],
        method: ['cash', Validators.required],
        paidAtLocal: ['', [Validators.required, dateTimeYearRangeValidator(), paymentDateNotTooFarPastValidator()]],
        note: ['']
    });

    readonly money = (amount: number | null) => formatMoney(amount, PAYMENT_CURRENCY);

    ngOnInit(): void {
        this.activeClinicLabel.set(this.auth.getClinicName() ?? this.auth.getClinicId() ?? 'Belirlenmedi');
        this.form.statusChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.formValid.set(this.form.valid));
        this.form.controls.method.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((m) => this.methodValue.set(m));
        this.formValid.set(this.form.valid);
        this.form.controls.clientId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((clientId) => {
            this.submitError.set(null);

            if (clientId === null || clientId === undefined) {
                this.form.controls.clientId.setValue('', { emitEvent: false });
            }

            const id = trimClientIdControlValue(this.form.controls.clientId.value);

            this.clientIdValue.set(id);

            if (this.context && this.context.clientId !== id) {
                this.context = null;
            }

            if (!id) {
                this.resetCharges();

                return;
            }

            this.loadBalance(id);
        });
        this.applyRouteContext();
    }

    goList(): void {
        void this.router.navigate(['/panel/payments']);
    }

    amountOf(row: ClientOpenChargeVm): number | string {
        return this.amounts()[row.chargeId] ?? '';
    }

    onAmountInput(row: ClientOpenChargeVm, raw: string): void {
        this.amounts.update((a) => ({ ...a, [row.chargeId]: parseDecimalFormInput(raw) }));
    }

    fillOutstanding(row: ClientOpenChargeVm): void {
        this.amounts.update((a) => ({ ...a, [row.chargeId]: row.outstandingAmount }));
    }

    rowError(row: ClientOpenChargeVm): string | null {
        return allocationAmountError(this.amounts()[row.chargeId], row.outstandingAmount);
    }

    onReceivedInput(raw: string): void {
        this.receivedInput.set(parseDecimalFormInput(raw));
    }

    setPrepayment(on: boolean): void {
        this.prepayment.set(on);
        this.receivedInput.set(null);
        this.submitError.set(null);
    }

    /** Seçilen ücret tutarları krediden kapatılır (ödeme oluşmaz); başarıda müşteri kartına dönülür, kart bilgi mesajını gösterir. */
    applyCredit(): void {
        if (this.busy() || this.ro.mutationBlocked() || !this.canApplyCredit()) {
            return;
        }

        const clientId = this.clientIdValue();

        this.creditError.set(null);
        this.submitError.set(null);
        this.applyingCredit.set(true);
        this.clientCreditsService.applyCredit(clientId, this.creditRequestId, this.allocations()).subscribe({
            next: () => {
                // Başarıda düğme kilitli kalır (sayfadan çıkılır); aynı requestId ile tekrar mahsup zaten yazılmaz.
                void this.router.navigate(['/panel/clients', clientId], { queryParams: { creditApplied: '1' } });
            },
            error: (e: unknown) => {
                this.applyingCredit.set(false);

                if (!(e instanceof HttpErrorResponse)) {
                    this.creditError.set(e instanceof Error ? e.message : 'Krediden ödenemedi.');

                    return;
                }

                const code = problemCodeFromHttpError(e);

                if (code && STALE_CREDIT_CODES.has(code)) {
                    this.creditError.set(STALE_CREDIT_MESSAGE);
                    this.loadBalance(clientId, true);

                    return;
                }

                this.creditError.set(messageFromHttpError(e, 'Krediden ödenemedi.', CLIENT_CREDIT_PROBLEM_MESSAGES));
            }
        });
    }

    onSubmit(): void {
        if (this.busy() || this.ro.mutationBlocked()) {
            return;
        }

        this.submitError.set(null);
        this.apiFieldErrors.set({});

        if (this.form.invalid) {
            this.form.markAllAsTouched();

            return;
        }

        if (!this.canSubmit()) {
            this.submitError.set(this.prepayment() ? 'Geçerli bir alınan tutar girin.' : 'En az bir ücrete geçerli bir tutar girin.');

            return;
        }

        const v = this.form.getRawValue();
        const clinicId = this.auth.getClinicId()?.trim() ?? '';

        if (!clinicId) {
            this.submitError.set('Aktif klinik bulunamadı. Lütfen yeniden giriş yapın.');

            return;
        }

        const paidAtLocal = v.paidAtLocal?.trim() ?? '';
        const paidAtUtc = fromIstanbulDateTimeLocalInputToUtcIso(paidAtLocal);

        if (!paidAtUtc) {
            this.submitError.set('Geçerli bir ödeme tarihi / saati seçin.');

            return;
        }

        const payload = {
            ...mapPaymentUpsertFormToWriteRequest({
                clinicId,
                clientId: v.clientId,
                examinationId: this.context?.examinationId,
                amount: this.received(),
                currency: PAYMENT_CURRENCY,
                method: v.method,
                paidAtUtc,
                note: v.note
            }),
            requestId: this.requestId,
            allocations: this.allocations(),
            creditAmount: this.creditAmount(),
            cashRegisterId: v.method === 'cash' ? this.cashRegisterId() : null
        };

        this.submitting.set(true);
        this.paymentsService.createPayment(payload).subscribe({
            next: ({ id }) => {
                // Başarıda düğme kilitli kalır (sayfadan çıkılır); aynı requestId ile tekrar kayıt zaten oluşmaz.
                void this.router.navigate(['/panel/payments', id], { queryParams: { saved: '1' } });
            },
            error: (e: unknown) => {
                this.submitting.set(false);

                if (e instanceof HttpErrorResponse) {
                    this.handleHttpError(e);

                    return;
                }

                this.submitError.set(e instanceof Error ? e.message : 'Kayıt oluşturulamadı.');
            }
        });
    }

    private handleHttpError(e: HttpErrorResponse): void {
        const code = problemCodeFromHttpError(e);

        if (code && STALE_BALANCE_CODES.has(code)) {
            this.submitError.set(STALE_BALANCE_MESSAGE);
            this.loadBalance(this.clientIdValue(), true);

            return;
        }

        if (code === 'Payments.DuplicateRequestMismatch') {
            this.submitError.set(DUPLICATE_MISMATCH_MESSAGE);

            return;
        }

        const parsed = parsePaymentUpsertHttpError(e);

        this.apiFieldErrors.set(parsed.fieldErrors);
        this.submitError.set(Object.keys(parsed.fieldErrors).length > 0 ? null : parsed.summaryMessage);
    }

    /** Muayene/geliş ekranlarından gelen bağlam: müşteri ön seçilir, o muayene/gelişin ücretleri dolu gelir. */
    private applyRouteContext(): void {
        const q = this.route.snapshot.queryParamMap;
        const clientId = q.get('clientId')?.trim() ?? '';

        if (!clientId) {
            return;
        }

        this.context = {
            clientId,
            examinationId: q.get('examinationId')?.trim() || null,
            visitId: q.get('visitId')?.trim() || null,
            chargeId: q.get('chargeId')?.trim() || null
        };
        this.form.controls.clientId.setValue(clientId);
    }

    private resetCharges(): void {
        this.openCharges.set([]);
        this.amounts.set({});
        this.creditBalance.set(0);
        this.creditError.set(null);
        this.prepayment.set(false);
        this.receivedInput.set(null);
        this.balanceError.set(null);
        this.balanceLoading.set(false);
    }

    private loadBalance(clientId: string, keepAmounts = false): void {
        const clinicId = this.auth.getClinicId()?.trim() ?? '';

        if (!keepAmounts) {
            this.resetCharges();
        }

        this.balanceLoading.set(true);
        this.balanceError.set(null);
        this.clientsService.getClientBalance(clientId).subscribe({
            next: (b) => {
                if (clientId !== this.clientIdValue()) {
                    return;
                }

                const charges = b.openCharges.filter((c) => c.clinicId === clinicId);

                this.openCharges.set(charges);
                this.creditBalance.set(b.creditBalance);

                if (charges.length > 0) {
                    this.prepayment.set(false);
                }

                this.amounts.update((a) => (keepAmounts ? this.keepEnteredAmounts(charges, a) : this.contextAmounts(charges)));
                this.balanceLoading.set(false);
            },
            error: (e: Error) => {
                if (clientId !== this.clientIdValue()) {
                    return;
                }

                this.balanceError.set(panelHttpFailureMessage(e, 'Açık ücretler yüklenemedi.'));
                this.balanceLoading.set(false);
            }
        });
    }

    /** Bağlamdaki ücret, muayene veya gelişe ait açık ücretler tam tutarla dolu başlar; bağlam yoksa boş. */
    private contextAmounts(charges: ClientOpenChargeVm[]): Record<string, number | null> {
        const ctx = this.context;
        const filled: Record<string, number | null> = {};

        if (!ctx || (!ctx.chargeId && !ctx.examinationId && !ctx.visitId)) {
            return filled;
        }

        for (const c of charges) {
            const matches = ctx.chargeId ? c.chargeId === ctx.chargeId : ctx.examinationId ? c.examinationId === ctx.examinationId : c.visitId === ctx.visitId;

            if (matches) {
                filled[c.chargeId] = c.outstandingAmount;
            }
        }

        return filled;
    }

    /** Yeniden okumada girilen tutarlar korunur (kapanmış ücretinki atılır); yeni kalanı aşan tutar satır hatası gösterir. */
    private keepEnteredAmounts(charges: ClientOpenChargeVm[], previous: Record<string, number | null>): Record<string, number | null> {
        const kept: Record<string, number | null> = {};

        for (const c of charges) {
            if (previous[c.chargeId] != null) {
                kept[c.chargeId] = previous[c.chargeId];
            }
        }

        return kept;
    }
}
