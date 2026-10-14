import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import type { AppointmentListItemVm } from '@/app/features/appointments/models/appointment-vm.model';
import { appointmentStatusLabel } from '@/app/features/appointments/utils/appointment-status.utils';
import type { ChargeSuggestionVm } from '@/app/features/charges/models/charge-suggestion-vm.model';
import { ClientCardHeaderComponent } from '@/app/features/clients/components/client-card-header.component';
import { ClientPetsPanelComponent } from '@/app/features/clients/components/client-pets-panel.component';
import type { ClientBalanceVm } from '@/app/features/clients/models/client-balance-vm.model';
import type { ExaminationListItemVm } from '@/app/features/examinations/models/examination-vm.model';
import type { ClientDetailVm, ClientPaymentSummaryVm } from '@/app/features/clients/models/client-vm.model';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import { buildClientPetRows, buildClientTodo, type ClientPetRow } from '@/app/features/clients/utils/client-card.utils';
import { PetTodoPanelComponent } from '@/app/features/pets/components/pet-todo-panel.component';
import type { PetListItemVm } from '@/app/features/pets/models/pet-vm.model';
import { PetCardDataService } from '@/app/features/pets/services/pet-card-data.service';
import { nextScheduledAppointment, okData, type PetCardSection, petCardEmphasis } from '@/app/features/pets/utils/pet-card.utils';
import { paymentMethodLabel } from '@/app/features/payments/utils/payment-method.utils';
import type { PetSuggestion } from '@/app/features/visits/models/visit-vm.model';
import { sliceDetailRelatedList } from '@/app/shared/panel/detail-related-list.utils';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { PatientActionBarComponent } from '@/app/shared/panel/patient-action-bar/patient-action-bar.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { formatMoney } from '@/app/shared/utils/money.utils';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { EMPTY, Subscription, switchMap } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { CHARGES_READ_CLAIM, CLIENTS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';

/**
 * Müşteri kartı — okuma öncelikli 360 görünüm (ADR-020 karar 6, hasta kartıyla aynı ilke): iletişim ve hesap durumu,
 * her zaman görünür eylem çubuğu, para Yapılacakları, hayvanlar, ödeme özeti ve son randevu/muayeneler; düzenleme formu "Düzenle" arkasında.
 * Rol vurgusu yalnız sıralamadır (hasta kartıyla aynı kural): muayene açabilen hayvanları ve geçmişi, ücret/ödeme alan parayı öne alır.
 */
@Component({
    selector: 'app-client-detail-page',
    standalone: true,
    imports: [
        CommonModule,
        RouterLink,
        ButtonModule,
        AppPageHeaderComponent,
        PatientActionBarComponent,
        ClientCardHeaderComponent,
        ClientPetsPanelComponent,
        PetTodoPanelComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppErrorStateComponent
    ],
    template: `
        <a routerLink="/panel/clients" class="text-primary font-medium no-underline inline-block mb-4">← Müşteri listesine dön</a>

        @if (showSavedBanner()) {
            <p class="mb-4 m-0 text-sm font-medium">Müşteri kaydedildi.</p>
        }

        @if (loading()) {
            <app-loading-state message="Müşteri yükleniyor…" />
        } @else if (error()) {
            <div class="card">
                <app-error-state [detail]="error()!" (retry)="reload()" />
            </div>
        } @else if (client(); as c) {
            <app-page-header [title]="c.fullName" [description]="registrationLine()">
                @if (canUpdateClient && !ro.mutationBlocked()) {
                    <a actions [routerLink]="['/panel/clients', c.id, 'edit']" pButton type="button" label="Düzenle" icon="pi pi-pencil" class="p-button-secondary"></a>
                } @else if (canUpdateClient && ro.mutationBlocked()) {
                    <button actions pButton type="button" label="Düzenle (salt okunur)" icon="pi pi-lock" [disabled]="true" class="p-button-secondary"></button>
                }
            </app-page-header>

            <app-patient-action-bar [sticky]="true" [clientId]="c.id" [clientName]="c.fullName" [arrivalPet]="arrivalPet()" />

            <app-client-card-header
                [client]="c"
                [balance]="balance()"
                [pendingCharges]="pendingCharges()"
                [lastExamination]="lastExamination()"
                [nextAppointment]="nextAppointment()"
            />

            <div class="grid grid-cols-12 gap-4 mb-4">
                <div class="col-span-12 lg:col-span-5" [class.order-first]="emphasis === 'frontDesk'" data-testid="todo-column">
                    <app-pet-todo-panel [view]="todo()" />
                </div>
                <div class="col-span-12 lg:col-span-7" [class.order-first]="emphasis === 'clinical'" data-testid="pets-column">
                    <app-client-pets-panel [rows]="petRows()" [clientId]="c.id" [currency]="currency()" />
                </div>
            </div>

            <div class="grid grid-cols-12 gap-4">
                <div class="col-span-12 lg:col-span-6" [class.order-first]="emphasis === 'frontDesk'" data-testid="payments-column">
                    <div class="card">
                        <div
                            class="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-3 gap-y-1 items-center pb-2 mb-3 border-b border-surface-200 dark:border-surface-700"
                        >
                            <h5 class="mt-0 mb-0 min-w-0 text-base">Ödeme özeti</h5>
                            @if (canReadCharges) {
                                <a routerLink="/panel/charges" [queryParams]="{ clientId: c.id }" class="text-primary font-medium no-underline text-sm shrink-0 whitespace-nowrap"
                                    >Ücretler →</a
                                >
                            }
                            <a routerLink="/panel/payments" [queryParams]="{ clientId: c.id }" class="text-primary font-medium no-underline text-sm shrink-0 whitespace-nowrap"
                                >Ödemeler →</a
                            >
                        </div>
                        @if (paymentSummaryLoading()) {
                            <p class="text-muted-color text-sm m-0">{{ copy.loadingDefault }}</p>
                        } @else if (paymentSummaryError()) {
                            <app-error-state [detail]="paymentSummaryError()!" (retry)="retryPaymentSummary()" />
                        } @else if (paymentSummary()) {
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-3 text-sm">
                                <div class="min-w-0 text-left">
                                    <p class="text-muted-color text-xs m-0 mb-0.5">Toplam ödeme</p>
                                    <p class="m-0 font-semibold text-surface-900 dark:text-surface-0">{{ paymentSummary()!.totalPaymentsCount }}</p>
                                </div>
                                <div class="min-w-0 text-left md:text-center">
                                    <p class="text-muted-color text-xs m-0 mb-0.5">Son ödeme</p>
                                    <p
                                        class="m-0 font-semibold text-surface-900 dark:text-surface-0 break-words"
                                        [title]="paymentSummary()!.lastPaymentAtUtc ? formatDt(paymentSummary()!.lastPaymentAtUtc) : ''"
                                    >
                                        {{ paymentSummary()!.lastPaymentAtUtc ? formatDt(paymentSummary()!.lastPaymentAtUtc) : '—' }}
                                    </p>
                                </div>
                                <div class="min-w-0 text-left md:text-right">
                                    <p class="text-muted-color text-xs m-0 mb-0.5">Para birimi toplamları</p>
                                    @if (paymentSummary()!.currencyTotals.length > 0) {
                                        <ul class="list-none m-0 p-0 space-y-0.5 md:text-right">
                                            @for (ct of paymentSummary()!.currencyTotals; track ct.currency) {
                                                <li class="font-semibold text-sm text-surface-900 dark:text-surface-0 leading-tight">{{ money(ct.totalAmount, ct.currency) }}</li>
                                            }
                                        </ul>
                                    } @else if (paymentSummary()!.totalPaidAmount != null && paymentSummary()!.totalPaidAmount !== 0) {
                                        <p class="m-0 font-semibold text-sm text-surface-900 dark:text-surface-0">{{ money(paymentSummary()!.totalPaidAmount, 'TRY') }}</p>
                                        <p class="text-muted-color text-[10px] m-0 mt-0.5 leading-tight md:text-right">Genel toplam (rapor)</p>
                                    } @else if (paymentSummary()!.totalPaidAmount === 0 && paymentSummary()!.totalPaymentsCount > 0) {
                                        <p class="text-muted-color text-xs m-0 leading-snug md:text-right">
                                            Çoklu para biriminde tek tutar özetlenmez; doğruluk para birimi kırılımıyla backend’de tutulur.
                                        </p>
                                    } @else {
                                        <p class="m-0 font-semibold text-surface-900 dark:text-surface-0">—</p>
                                    }
                                </div>
                            </div>
                            <div class="pt-2 border-t border-surface-200 dark:border-surface-700">
                                <h6 class="mt-0 mb-2 text-surface-900 dark:text-surface-0 font-semibold text-sm">Son ödemeler</h6>
                                @if (paymentRecentView().total === 0) {
                                    <app-empty-state [message]="copy.listEmptyMessage" />
                                } @else {
                                    <div class="max-lg:overflow-visible max-lg:mx-0 max-lg:px-0 overflow-x-auto -mx-1 px-1 lg:mx-0 lg:px-0">
                                        <div class="w-full min-w-0 lg:min-w-[18rem]">
                                            <div
                                                class="hidden lg:grid grid-cols-[5.5rem_minmax(0,1fr)_4.5rem_auto] gap-x-2 px-0.5 pb-2 text-xs font-medium text-muted-color border-b border-surface-200 dark:border-surface-700"
                                            >
                                                <span>Tarih</span>
                                                <span>Hayvan / Klinik / Yöntem</span>
                                                <span class="text-right">Tutar</span>
                                                <span class="text-right">İşlem</span>
                                            </div>
                                            <ul class="list-none m-0 p-0">
                                                @for (row of paymentRecentView().displayed; track row.id) {
                                                    <li
                                                        class="min-w-0 max-lg:rounded-border max-lg:border max-lg:border-surface-200 max-lg:dark:border-surface-700 max-lg:p-3 max-lg:mb-3 max-lg:last:mb-0 max-lg:shadow-sm lg:border-b lg:border-surface-200 lg:dark:border-surface-700 lg:last:border-0"
                                                    >
                                                        <div class="lg:hidden space-y-2 min-w-0">
                                                            <div class="text-muted-color text-sm">{{ formatDt(row.paidAtUtc) }}</div>
                                                            <div class="font-semibold text-base tabular-nums text-surface-900 dark:text-surface-0 min-w-0 break-words">
                                                                {{ money(row.amount, row.currency) }}
                                                            </div>
                                                            @if (row.petName?.trim()) {
                                                                <div class="text-surface-900 dark:text-surface-0 font-medium text-sm min-w-0 break-words">{{ row.petName }}</div>
                                                            }
                                                            @if (row.clinicName?.trim()) {
                                                                <div class="text-muted-color text-sm min-w-0 break-words">{{ row.clinicName }}</div>
                                                            }
                                                            <div class="text-muted-color text-sm min-w-0 break-words">{{ payMethodLabel(row.method) }}</div>
                                                            <div class="flex justify-end pt-2 mt-1 border-t border-surface-200 dark:border-surface-700">
                                                                <a [routerLink]="['/panel/payments', row.id]" class="text-primary font-medium no-underline text-sm py-1">Detay →</a>
                                                            </div>
                                                        </div>
                                                        <div class="hidden lg:grid lg:grid-cols-[5.5rem_minmax(0,1fr)_4.5rem_auto] gap-x-2 items-center py-1.5 text-sm">
                                                            <div class="text-muted-color">{{ formatDt(row.paidAtUtc) }}</div>
                                                            <div class="min-w-0 space-y-0.5">
                                                                @if (row.petName?.trim()) {
                                                                    <div class="text-surface-900 dark:text-surface-0 leading-tight">{{ row.petName }}</div>
                                                                }
                                                                @if (row.clinicName?.trim()) {
                                                                    <div class="text-muted-color text-xs leading-tight">{{ row.clinicName }}</div>
                                                                }
                                                                <div class="text-muted-color text-xs leading-tight">{{ payMethodLabel(row.method) }}</div>
                                                            </div>
                                                            <div class="text-right font-semibold tabular-nums">{{ money(row.amount, row.currency) }}</div>
                                                            <div class="text-right">
                                                                <a [routerLink]="['/panel/payments', row.id]" class="text-primary font-medium no-underline text-sm whitespace-nowrap">Detay →</a>
                                                            </div>
                                                        </div>
                                                    </li>
                                                }
                                            </ul>
                                        </div>
                                    </div>
                                }
                            </div>
                        }
                    </div>
                </div>

                <div class="col-span-12 lg:col-span-6 flex flex-col gap-4" [class.order-first]="emphasis === 'clinical'" data-testid="history-column">
                    <div class="card mb-0">
                        <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 items-center mb-4">
                            <h5 class="mt-0 mb-0">Son muayeneler</h5>
                            <a routerLink="/panel/examinations" [queryParams]="{ clientId: c.id }" class="text-primary font-medium no-underline text-sm">Tümü →</a>
                        </div>
                        @if (recentSummaryLoading()) {
                            <p class="text-muted-color text-sm m-0">{{ copy.loadingDefault }}</p>
                        } @else if (recentSummaryError()) {
                            <p class="text-muted-color m-0">{{ recentSummaryError() }}</p>
                        } @else if (examListView().total === 0) {
                            <app-empty-state message="Bu müşteriye ait muayene kaydı yok." />
                        } @else {
                            <ul class="list-none m-0 p-0">
                                @for (row of examListView().displayed; track row.id) {
                                    <li class="py-2 border-b border-surface-200 dark:border-surface-700 last:border-b-0 min-w-0">
                                        <div class="flex flex-wrap gap-2 justify-between items-baseline">
                                            <span class="text-muted-color text-sm min-w-0">{{ formatDt(row.examinedAtUtc) }}</span>
                                            <a [routerLink]="['/panel/examinations', row.id]" class="text-primary font-medium no-underline text-sm shrink-0">Detay →</a>
                                        </div>
                                        <div class="font-medium min-w-0 break-words">{{ row.petName }}</div>
                                        <div class="text-sm text-muted-color min-w-0 break-words">{{ row.visitReason }}</div>
                                    </li>
                                }
                            </ul>
                        }
                    </div>
                    <div class="card mb-0">
                        <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 items-center mb-4">
                            <h5 class="mt-0 mb-0">Son randevular</h5>
                            <a routerLink="/panel/appointments" [queryParams]="{ clientId: c.id }" class="text-primary font-medium no-underline text-sm">Tümü →</a>
                        </div>
                        @if (recentSummaryLoading()) {
                            <p class="text-muted-color text-sm m-0">{{ copy.loadingDefault }}</p>
                        } @else if (recentSummaryError()) {
                            <p class="text-muted-color m-0">{{ recentSummaryError() }}</p>
                        } @else if (apptListView().total === 0) {
                            <app-empty-state message="Bu müşteriye ait randevu kaydı yok." />
                        } @else {
                            <ul class="list-none m-0 p-0">
                                @for (row of apptListView().displayed; track row.id) {
                                    <li class="py-2 border-b border-surface-200 dark:border-surface-700 last:border-b-0 min-w-0">
                                        <div class="flex flex-wrap gap-2 justify-between items-baseline">
                                            <span class="text-muted-color text-sm min-w-0">{{ formatDt(row.scheduledAtUtc) }}</span>
                                            <a [routerLink]="['/panel/appointments', row.id]" class="text-primary font-medium no-underline text-sm shrink-0">Detay →</a>
                                        </div>
                                        <div class="font-medium min-w-0 break-words">{{ row.petName }}</div>
                                        <div class="text-sm text-muted-color min-w-0 break-words">
                                            {{ statusLabel(row.status) }}
                                            @if (row.notes?.trim()) {
                                                <span> · {{ row.notes }}</span>
                                            }
                                        </div>
                                    </li>
                                }
                            </ul>
                        }
                    </div>
                </div>
            </div>
        }
    `
})
export class ClientDetailPageComponent implements OnInit, OnDestroy {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly clientsService = inject(ClientsService);
    private readonly cardData = inject(PetCardDataService);
    private readonly auth = inject(AuthService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly copy = PANEL_COPY;

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly client = signal<ClientDetailVm | null>(null);
    /** Yeni oluşturma sonrası kısa onay (query `saved=1`). */
    readonly showSavedBanner = signal(false);

    readonly pets = signal<PetCardSection<PetListItemVm[]>>(null);
    readonly balance = signal<PetCardSection<ClientBalanceVm>>(null);
    readonly pendingCharges = signal<PetCardSection<ChargeSuggestionVm[]>>(null);

    readonly recentSummaryLoading = signal(false);
    readonly recentSummaryError = signal<string | null>(null);
    readonly apptItems = signal<AppointmentListItemVm[]>([]);
    readonly examItems = signal<ExaminationListItemVm[]>([]);

    readonly paymentSummaryLoading = signal(false);
    readonly paymentSummaryError = signal<string | null>(null);
    readonly paymentSummary = signal<ClientPaymentSummaryVm | null>(null);

    readonly apptListView = computed(() => sliceDetailRelatedList(this.apptItems()));
    readonly examListView = computed(() => sliceDetailRelatedList(this.examItems()));
    readonly paymentRecentView = computed(() => sliceDetailRelatedList(this.paymentSummary()?.recentPayments));

    readonly formatDt = (v: string | null) => formatUtcIsoAsLocalDateTimeDisplay(v);
    readonly money = (amount: number | null, currency: string | null | undefined) => formatMoney(amount, currency?.trim() ? currency.trim() : 'TRY');
    readonly statusLabel = appointmentStatusLabel;
    readonly payMethodLabel = paymentMethodLabel;
    readonly canUpdateClient = this.auth.hasOperationClaim(CLIENTS_UPDATE_CLAIM);
    readonly canReadCharges = this.auth.hasOperationClaim(CHARGES_READ_CLAIM);
    readonly emphasis = petCardEmphasis((claim) => this.auth.hasOperationClaim(claim));

    readonly registrationLine = computed(() => {
        const c = this.client();
        if (!c) {
            return '';
        }
        return c.updatedAtUtc ? `Kayıt: ${this.formatDt(c.createdAtUtc)} · Güncellenme: ${this.formatDt(c.updatedAtUtc)}` : `Kayıt: ${this.formatDt(c.createdAtUtc)}`;
    });

    readonly lastExamination = computed(() => this.recentSection((s) => s.examinations[0] ?? null));
    readonly nextAppointment = computed(() => this.recentSection((s) => nextScheduledAppointment(s.appointments)));

    readonly todo = computed(() =>
        buildClientTodo(
            { pendingCharges: this.pendingCharges(), balance: this.balance() },
            {
                clientId: this.client()?.id ?? '',
                hasClaim: (claim) => this.auth.hasOperationClaim(claim),
                mutationBlocked: this.ro.mutationBlocked(),
                emphasis: this.emphasis
            }
        )
    );

    readonly petRows = computed<PetCardSection<ClientPetRow[]>>(() => {
        const p = this.pets();
        if (p?.state !== 'ok') {
            return p;
        }
        return { state: 'ok', data: buildClientPetRows(p.data, okData(this.balance()), okData(this.pendingCharges()), this.apptItems()) };
    });

    readonly currency = computed(() => okData(this.balance())?.currency || 'TRY');

    /** Tek hayvanlı müşteride "Geldi" o hayvanı seçili açar; birden çok hayvanda hasta diyalogda aranır. */
    readonly arrivalPet = computed<PetSuggestion | null>(() => {
        const c = this.client();
        const list = okData(this.pets());
        if (!c || list?.length !== 1) {
            return null;
        }
        const pet = list[0];
        return { id: pet.id, label: `${pet.name} — ${pet.speciesName} · Sahip: ${c.fullName}`, clientId: c.id, clientName: c.fullName };
    });

    private lastId: string | null = null;
    private cardSubscriptions = new Subscription();

    ngOnInit(): void {
        if (this.route.snapshot.queryParamMap.get('saved') === '1') {
            this.showSavedBanner.set(true);
            void this.router.navigate([], {
                relativeTo: this.route,
                queryParams: { saved: null },
                queryParamsHandling: '',
                replaceUrl: true
            });
        }

        this.route.paramMap
            .pipe(
                switchMap((params) => {
                    const id = params.get('id');
                    this.resetCard();
                    if (!id) {
                        this.error.set('Geçersiz client.');
                        this.loading.set(false);
                        return EMPTY;
                    }
                    this.lastId = id;
                    this.loading.set(true);
                    this.error.set(null);
                    return this.clientsService.getClientById(id);
                })
            )
            .subscribe({
                next: (c) => this.onClientLoaded(c),
                error: (e: Error) => {
                    this.error.set(e.message ?? 'Yükleme hatası');
                    this.loading.set(false);
                }
            });
    }

    ngOnDestroy(): void {
        this.resetCard();
    }

    reload(): void {
        if (!this.lastId) {
            return;
        }
        this.resetCard();
        this.loading.set(true);
        this.error.set(null);
        this.clientsService.getClientById(this.lastId).subscribe({
            next: (c) => this.onClientLoaded(c),
            error: (e: Error) => {
                this.error.set(e.message ?? 'Yükleme hatası');
                this.loading.set(false);
            }
        });
    }

    retryPaymentSummary(): void {
        if (!this.lastId) {
            return;
        }
        this.loadPaymentSummary(this.lastId);
    }

    /** Son özet (randevu/muayene) kart bölümüne; özet yetki ayrımı yapmaz, hata `error` olur. */
    private recentSection<T>(pick: (s: { appointments: AppointmentListItemVm[]; examinations: ExaminationListItemVm[] }) => T): PetCardSection<T> {
        if (this.recentSummaryError()) {
            return { state: 'error' };
        }
        if (this.recentSummaryLoading()) {
            return { state: 'loading' };
        }
        return { state: 'ok', data: pick({ appointments: this.apptItems(), examinations: this.examItems() }) };
    }

    private onClientLoaded(c: ClientDetailVm): void {
        this.client.set(c);
        this.loading.set(false);
        this.loadRecentSummary(c.id);
        this.loadPaymentSummary(c.id);
        this.cardSubscriptions.add(this.cardData.ownerBalance(c.id).subscribe((s) => this.balance.set(s)));
        this.cardSubscriptions.add(
            this.cardData.clientPets(c.id).subscribe((s) => {
                this.pets.set(s);
                if (s?.state === 'ok') {
                    // Ücret önerisi ucunda müşteri süzgeci yok; hayvanlar gelince hayvan başına okunur.
                    this.cardSubscriptions.add(this.cardData.clientPendingCharges(s.data.map((p) => p.id)).subscribe((pc) => this.pendingCharges.set(pc)));
                } else if (s?.state === 'error' && this.canReadCharges) {
                    this.pendingCharges.set({ state: 'error' });
                }
            })
        );
    }

    private resetCard(): void {
        this.cardSubscriptions.unsubscribe();
        this.cardSubscriptions = new Subscription();
        this.pets.set(null);
        this.balance.set(null);
        this.pendingCharges.set(null);
        this.apptItems.set([]);
        this.examItems.set([]);
        this.recentSummaryLoading.set(false);
        this.recentSummaryError.set(null);
        this.paymentSummary.set(null);
        this.paymentSummaryLoading.set(false);
        this.paymentSummaryError.set(null);
    }

    private loadPaymentSummary(clientId: string): void {
        this.paymentSummaryLoading.set(true);
        this.paymentSummaryError.set(null);
        this.clientsService.getClientPaymentSummary(clientId).subscribe({
            next: (s) => {
                this.paymentSummary.set(s);
                this.paymentSummaryLoading.set(false);
            },
            error: (e: Error) => {
                this.paymentSummaryError.set(e.message ?? 'Ödeme özeti yüklenemedi.');
                this.paymentSummaryLoading.set(false);
            }
        });
    }

    private loadRecentSummary(clientId: string): void {
        this.recentSummaryLoading.set(true);
        this.recentSummaryError.set(null);
        this.clientsService.getClientRecentSummary(clientId).subscribe({
            next: (s) => {
                this.apptItems.set(s.appointments);
                this.examItems.set(s.examinations);
                this.recentSummaryLoading.set(false);
            },
            error: (e: Error) => {
                this.apptItems.set([]);
                this.examItems.set([]);
                this.recentSummaryError.set(e.message ?? 'Müşteri özeti yüklenemedi.');
                this.recentSummaryLoading.set(false);
            }
        });
    }
}
