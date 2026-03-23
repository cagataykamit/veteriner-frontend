import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { AppointmentListItemVm } from '@/app/features/appointments/models/appointment-vm.model';
import { appointmentTypeLabel } from '@/app/features/appointments/utils/appointment-type.utils';
import type { ClientDetailVm } from '@/app/features/clients/models/client-vm.model';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import { clientStatusLabel, clientStatusSeverity } from '@/app/features/clients/utils/client-status.utils';
import type { PaymentListItemVm } from '@/app/features/payments/models/payment-vm.model';
import type { PetListItemVm } from '@/app/features/pets/models/pet-vm.model';
import { DetailRelatedSummariesService } from '@/app/shared/panel/detail-related-summaries.service';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { formatDateDisplay, formatDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { formatMoney } from '@/app/shared/utils/money.utils';
import { EMPTY, switchMap } from 'rxjs';

@Component({
    selector: 'app-client-detail-page',
    standalone: true,
    imports: [
        CommonModule,
        RouterLink,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppErrorStateComponent,
        AppStatusTagComponent
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
            <app-page-header [title]="client()!.fullName" subtitle="Müşteri" [description]="'Kayıt: ' + formatDt(client()!.createdAtUtc)" />

            <div class="grid grid-cols-12 gap-8">
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Genel bilgiler</h5>
                        <dl class="m-0 grid grid-cols-12 gap-3">
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Durum</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">
                                <app-status-tag [label]="statusLabel(client()!.status)" [severity]="statusSeverity(client()!.status)" />
                            </dd>
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
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ client()!.phone }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">E-posta</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ client()!.email }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Adres</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ client()!.address }}</dd>
                        </dl>
                    </div>
                </div>
                <div class="col-span-12">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Notlar</h5>
                        <p class="m-0 whitespace-pre-wrap">{{ client()!.notes }}</p>
                    </div>
                </div>

                <div class="col-span-12 lg:col-span-4">
                    <div class="card">
                        <div class="flex flex-wrap gap-2 items-center justify-between mb-4">
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
                        <div class="flex flex-wrap gap-2 items-center justify-between mb-4">
                            <h5 class="mt-0 mb-0">Son randevular</h5>
                            <a routerLink="/panel/appointments" class="text-primary font-medium no-underline text-sm">Tümü →</a>
                        </div>
                        @if (apptLoading()) {
                            <p class="text-muted-color text-sm m-0">{{ copy.loadingDefault }}</p>
                        } @else if (apptError()) {
                            <p class="text-muted-color m-0">{{ apptError() }}</p>
                        } @else if (apptItems().length === 0) {
                            <app-empty-state [message]="copy.listEmptyMessage" />
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
                                        <div class="font-medium">{{ row.petName }} · {{ typeLabel(row.type) }}</div>
                                    </li>
                                }
                            </ul>
                        }
                    </div>
                </div>
                <div class="col-span-12 lg:col-span-4">
                    <div class="card">
                        <div class="flex flex-wrap gap-2 items-center justify-between mb-4">
                            <h5 class="mt-0 mb-0">Son ödemeler</h5>
                            <a routerLink="/panel/payments" class="text-primary font-medium no-underline text-sm">Tümü →</a>
                        </div>
                        @if (payLoading()) {
                            <p class="text-muted-color text-sm m-0">{{ copy.loadingDefault }}</p>
                        } @else if (payError()) {
                            <p class="text-muted-color m-0">{{ payError() }}</p>
                        } @else if (payItems().length === 0) {
                            <app-empty-state [message]="copy.listEmptyMessage" />
                        } @else {
                            <ul class="list-none m-0 p-0">
                                @for (row of payItems(); track row.id) {
                                    <li class="mb-3 last:mb-0">
                                        <div class="flex flex-wrap gap-2 justify-between items-baseline">
                                            <span class="font-medium">{{ money(row.amount, row.currency) }}</span>
                                            <a [routerLink]="['/panel/payments', row.id]" class="text-primary font-medium no-underline text-sm shrink-0"
                                                >Detay →</a
                                            >
                                        </div>
                                        <div class="text-sm text-muted-color">
                                            {{ formatDate(row.paidAtUtc ?? row.createdAtUtc) }} · {{ row.petName }}
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
export class ClientDetailPageComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly clientsService = inject(ClientsService);
    private readonly related = inject(DetailRelatedSummariesService);

    readonly copy = PANEL_COPY;

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly client = signal<ClientDetailVm | null>(null);
    /** Yeni oluşturma sonrası kısa onay (query `saved=1`). */
    readonly showSavedBanner = signal(false);

    readonly petsLoading = signal(false);
    readonly petsError = signal<string | null>(null);
    readonly petsItems = signal<PetListItemVm[]>([]);

    readonly apptLoading = signal(false);
    readonly apptError = signal<string | null>(null);
    readonly apptItems = signal<AppointmentListItemVm[]>([]);

    readonly payLoading = signal(false);
    readonly payError = signal<string | null>(null);
    readonly payItems = signal<PaymentListItemVm[]>([]);

    private lastId: string | null = null;

    readonly formatDt = (v: string | null) => formatDateTimeDisplay(v);
    readonly formatDate = (v: string | null) => formatDateDisplay(v);
    readonly money = (amount: number | null, currency: string) => formatMoney(amount, currency || 'TRY');
    readonly statusLabel = clientStatusLabel;
    readonly statusSeverity = clientStatusSeverity;
    readonly typeLabel = appointmentTypeLabel;

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
                        return EMPTY;
                    }
                    this.lastId = id;
                    this.loading.set(true);
                    this.error.set(null);
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
                }
            });
    }

    reload(): void {
        if (!this.lastId) {
            return;
        }
        this.loading.set(true);
        this.error.set(null);
        this.clientsService.getClientById(this.lastId).subscribe({
            next: (c) => {
                this.client.set(c);
                this.loading.set(false);
                this.loadRelatedBlocks(c.id);
            },
            error: (e: Error) => {
                this.error.set(e.message ?? 'Yükleme hatası');
                this.loading.set(false);
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

        this.apptLoading.set(true);
        this.apptError.set(null);
        this.related.loadRecentAppointmentsForClient(clientId).subscribe({
            next: (items) => {
                this.apptItems.set(items);
                this.apptLoading.set(false);
            },
            error: (e: Error) => {
                this.apptError.set(e.message ?? 'Randevu listesi yüklenemedi.');
                this.apptLoading.set(false);
            }
        });

        this.payLoading.set(true);
        this.payError.set(null);
        this.related.loadRecentPaymentsForClient(clientId).subscribe({
            next: (items) => {
                this.payItems.set(items);
                this.payLoading.set(false);
            },
            error: (e: Error) => {
                this.payError.set(e.message ?? 'Ödeme listesi yüklenemedi.');
                this.payLoading.set(false);
            }
        });
    }
}
