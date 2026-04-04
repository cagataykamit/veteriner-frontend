import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import type { AppointmentListItemVm } from '@/app/features/appointments/models/appointment-vm.model';
import { appointmentStatusLabel } from '@/app/features/appointments/utils/appointment-status.utils';
import type { ExaminationListItemVm } from '@/app/features/examinations/models/examination-vm.model';
import type { ClientDetailVm, ClientPaymentSummaryVm } from '@/app/features/clients/models/client-vm.model';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import type { PetListItemVm } from '@/app/features/pets/models/pet-vm.model';
import { paymentMethodLabel } from '@/app/features/payments/utils/payment-method.utils';
import { DetailRelatedSummariesService } from '@/app/shared/panel/detail-related-summaries.service';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { formatDateDisplay, formatDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { formatClientPhoneForDisplay } from '@/app/shared/utils/phone-display.utils';
import { formatMoney } from '@/app/shared/utils/money.utils';
import { EMPTY, switchMap } from 'rxjs';

@Component({
    selector: 'app-client-detail-page',
    standalone: true,
    imports: [
        CommonModule,
        RouterLink,
        ButtonModule,
        AppPageHeaderComponent,
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
        } @else if (client()) {
            <app-page-header [title]="client()!.fullName" subtitle="Müşteri" [description]="'Kayıt: ' + formatDt(client()!.createdAtUtc)">
                <a
                    actions
                    [routerLink]="['/panel/clients', client()!.id, 'edit']"
                    pButton
                    type="button"
                    label="Düzenle"
                    icon="pi pi-pencil"
                    class="p-button-secondary"
                ></a>
            </app-page-header>

            <div class="grid grid-cols-12 gap-8">
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Genel bilgiler</h5>
                        <dl class="m-0 grid grid-cols-12 gap-3">
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Oluşturulma</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ formatDt(client()!.createdAtUtc) }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Güncellenme</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ formatDt(client()!.updatedAtUtc) }}</dd>
                        </dl>
                    </div>
                </div>
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <h5 class="mt-0 mb-4">İletişim bilgileri</h5>
                        <dl class="m-0 grid grid-cols-12 gap-3">
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Telefon</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ formatClientPhoneForDisplay(client()!.phone) }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">E-posta</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ client()!.email }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Adres</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ client()!.address }}</dd>
                        </dl>
                    </div>
                </div>
                <div class="col-span-12 lg:col-span-4">
                    <div class="card">
                        <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 items-center mb-4">
                            <h5 class="mt-0 mb-0">Bağlı hayvanlar</h5>
                            <a routerLink="/panel/pets" class="text-primary font-medium no-underline text-sm">Tümü →</a>
                        </div>
                        @if (petsLoading()) {
                            <p class="text-muted-color text-sm m-0">{{ copy.loadingDefault }}</p>
                        } @else if (petsError()) {
                            <p class="text-muted-color m-0">{{ petsError() }}</p>
                        } @else if (petsItems().length === 0) {
                            <app-empty-state [message]="copy.listEmptyMessage" />
                        } @else {
                            <ul class="list-none m-0 p-0">
                                @for (row of petsItems(); track row.id) {
                                    <li class="mb-3 last:mb-0">
                                        <a [routerLink]="['/panel/pets', row.id]" class="text-primary font-medium no-underline">{{ row.name }}</a>
                                        <div class="text-sm text-muted-color">{{ row.speciesName }} · {{ row.breed }}</div>
                                    </li>
                                }
                            </ul>
                        }
                    </div>
                </div>
                <div class="col-span-12 lg:col-span-4">
                    <div class="card">
                        <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 items-center mb-4">
                            <h5 class="mt-0 mb-0">Son randevular</h5>
                            <a routerLink="/panel/appointments" class="text-primary font-medium no-underline text-sm">Tümü →</a>
                        </div>
                        @if (recentSummaryLoading()) {
                            <p class="text-muted-color text-sm m-0">{{ copy.loadingDefault }}</p>
                        } @else if (recentSummaryError()) {
                            <p class="text-muted-color m-0">{{ recentSummaryError() }}</p>
                        } @else if (apptItems().length === 0) {
                            <app-empty-state message="Bu müşteriye ait randevu kaydı yok." />
                        } @else {
                            <ul class="list-none m-0 p-0">
                                @for (row of apptItems(); track row.id) {
                                    <li class="mb-3 last:mb-0">
                                        <div class="flex flex-wrap gap-2 justify-between items-baseline">
                                            <span class="text-muted-color text-sm">{{ formatDt(row.scheduledAtUtc) }}</span>
                                            <a [routerLink]="['/panel/appointments', row.id]" class="text-primary font-medium no-underline text-sm shrink-0"
                                                >Detay →</a
                                            >
                                        </div>
                                        <div class="font-medium">{{ row.petName }}</div>
                                        <div class="text-sm text-muted-color">
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
                <div class="col-span-12 lg:col-span-4">
                    <div class="card">
                        <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 items-center mb-4">
                            <h5 class="mt-0 mb-0">Son muayeneler</h5>
                            <a routerLink="/panel/examinations" class="text-primary font-medium no-underline text-sm">Tümü →</a>
                        </div>
                        @if (recentSummaryLoading()) {
                            <p class="text-muted-color text-sm m-0">{{ copy.loadingDefault }}</p>
                        } @else if (recentSummaryError()) {
                            <p class="text-muted-color m-0">{{ recentSummaryError() }}</p>
                        } @else if (examItems().length === 0) {
                            <app-empty-state message="Bu müşteriye ait muayene kaydı yok." />
                        } @else {
                            <ul class="list-none m-0 p-0">
                                @for (row of examItems(); track row.id) {
                                    <li class="mb-3 last:mb-0">
                                        <div class="flex flex-wrap gap-2 justify-between items-baseline">
                                            <span class="text-muted-color text-sm">{{ formatDt(row.examinedAtUtc) }}</span>
                                            <a [routerLink]="['/panel/examinations', row.id]" class="text-primary font-medium no-underline text-sm shrink-0"
                                                >Detay →</a
                                            >
                                        </div>
                                        <div class="font-medium">{{ row.petName }}</div>
                                        <div class="text-sm text-muted-color">{{ row.visitReason }}</div>
                                    </li>
                                }
                            </ul>
                        }
                    </div>
                </div>
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <div
                            class="grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-1 items-center pb-2 mb-3 border-b border-surface-200 dark:border-surface-700"
                        >
                            <h5 class="mt-0 mb-0 min-w-0 text-base">Ödeme özeti</h5>
                            <a
                                routerLink="/panel/payments"
                                class="text-primary font-medium no-underline text-sm shrink-0 whitespace-nowrap"
                                >Tümü →</a
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
                                @if (paymentSummary()!.recentPayments.length === 0) {
                                    <app-empty-state [message]="copy.listEmptyMessage" />
                                } @else {
                                    <div class="overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
                                        <div class="min-w-[18rem] sm:min-w-0">
                                            <div
                                                class="hidden sm:grid grid-cols-[5.5rem_minmax(0,1fr)_4.5rem_auto] gap-x-2 px-0.5 pb-2 text-xs font-medium text-muted-color border-b border-surface-200 dark:border-surface-700"
                                            >
                                                <span>Tarih</span>
                                                <span>Hayvan / Klinik / Yöntem</span>
                                                <span class="text-right">Tutar</span>
                                                <span class="text-right">İşlem</span>
                                            </div>
                                            <ul class="list-none m-0 p-0">
                                                @for (row of paymentSummary()!.recentPayments; track row.id) {
                                                    <li class="border-b border-surface-200 dark:border-surface-700 last:border-0">
                                                        <div class="sm:hidden py-2.5 space-y-2">
                                                            <div class="flex justify-between items-baseline gap-2">
                                                                <span class="text-muted-color text-xs shrink-0">{{ formatDt(row.paidAtUtc) }}</span>
                                                                <span class="font-semibold text-sm tabular-nums text-surface-900 dark:text-surface-0">{{
                                                                    money(row.amount, row.currency)
                                                                }}</span>
                                                            </div>
                                                            <div class="min-w-0 space-y-0.5 text-xs">
                                                                @if (row.petName?.trim()) {
                                                                    <div class="text-surface-900 dark:text-surface-0">{{ row.petName }}</div>
                                                                }
                                                                @if (row.clinicName?.trim()) {
                                                                    <div class="text-muted-color">{{ row.clinicName }}</div>
                                                                }
                                                                <div class="text-muted-color">{{ payMethodLabel(row.method) }}</div>
                                                            </div>
                                                            <div class="flex justify-end">
                                                                <a
                                                                    [routerLink]="['/panel/payments', row.id]"
                                                                    class="text-primary font-medium no-underline text-sm"
                                                                    >Detay →</a
                                                                >
                                                            </div>
                                                        </div>
                                                        <div
                                                            class="hidden sm:grid sm:grid-cols-[5.5rem_minmax(0,1fr)_4.5rem_auto] gap-x-2 items-center py-1.5 text-sm"
                                                        >
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
                                                                <a
                                                                    [routerLink]="['/panel/payments', row.id]"
                                                                    class="text-primary font-medium no-underline text-sm whitespace-nowrap"
                                                                    >Detay →</a
                                                                >
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
            </div>
        }
    `
})
export class ClientDetailPageComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly clientsService = inject(ClientsService);
    private readonly related = inject(DetailRelatedSummariesService);

    readonly copy = PANEL_COPY;
    readonly formatClientPhoneForDisplay = formatClientPhoneForDisplay;

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly client = signal<ClientDetailVm | null>(null);
    /** Yeni oluşturma sonrası kısa onay (query `saved=1`). */
    readonly showSavedBanner = signal(false);

    readonly petsLoading = signal(false);
    readonly petsError = signal<string | null>(null);
    readonly petsItems = signal<PetListItemVm[]>([]);

    readonly recentSummaryLoading = signal(false);
    readonly recentSummaryError = signal<string | null>(null);
    readonly apptItems = signal<AppointmentListItemVm[]>([]);
    readonly examItems = signal<ExaminationListItemVm[]>([]);

    readonly paymentSummaryLoading = signal(false);
    readonly paymentSummaryError = signal<string | null>(null);
    readonly paymentSummary = signal<ClientPaymentSummaryVm | null>(null);

    private lastId: string | null = null;

    readonly formatDt = (v: string | null) => formatDateTimeDisplay(v);
    readonly formatDate = (v: string | null) => formatDateDisplay(v);
    readonly money = (amount: number | null, currency: string | null | undefined) =>
        formatMoney(amount, currency?.trim() ? currency.trim() : 'TRY');
    readonly statusLabel = appointmentStatusLabel;
    readonly payMethodLabel = paymentMethodLabel;

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
                    if (!id) {
                        this.error.set('Geçersiz client.');
                        this.loading.set(false);
                        this.resetPaymentSummary();
                        return EMPTY;
                    }
                    this.lastId = id;
                    this.loading.set(true);
                    this.error.set(null);
                    this.resetPaymentSummary();
                    return this.clientsService.getClientById(id);
                })
            )
            .subscribe({
                next: (c) => {
                    this.client.set(c);
                    this.loading.set(false);
                    this.loadRelatedBlocks(c.id);
                },
                error: (e: Error) => {
                    this.error.set(e.message ?? 'Yükleme hatası');
                    this.loading.set(false);
                    this.resetPaymentSummary();
                }
            });
    }

    reload(): void {
        if (!this.lastId) {
            return;
        }
        this.loading.set(true);
        this.error.set(null);
        this.resetPaymentSummary();
        this.clientsService.getClientById(this.lastId).subscribe({
            next: (c) => {
                this.client.set(c);
                this.loading.set(false);
                this.loadRelatedBlocks(c.id);
            },
            error: (e: Error) => {
                this.error.set(e.message ?? 'Yükleme hatası');
                this.loading.set(false);
                this.resetPaymentSummary();
            }
        });
    }

    retryPaymentSummary(): void {
        if (!this.lastId) {
            return;
        }
        this.loadPaymentSummary(this.lastId);
    }

    private resetPaymentSummary(): void {
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

    private loadRelatedBlocks(clientId: string): void {
        this.petsLoading.set(true);
        this.petsError.set(null);
        this.related.loadPetsForClient(clientId).subscribe({
            next: (items) => {
                this.petsItems.set(items);
                this.petsLoading.set(false);
            },
            error: (e: Error) => {
                this.petsError.set(e.message ?? 'Hayvan listesi yüklenemedi.');
                this.petsLoading.set(false);
            }
        });

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

        this.loadPaymentSummary(clientId);
    }
}
