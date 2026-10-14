import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import type { TableLazyLoadEvent } from 'primeng/table';
import { AuthService } from '@/app/core/auth/auth.service';
import { CHARGES_CORRECT_CLAIM, CHARGES_CREATE_CLAIM, PAYMENTS_CREATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { ChargeCorrectionDialogComponent } from '@/app/features/charges/components/charge-correction-dialog.component';
import type { ChargeVm } from '@/app/features/charges/models/charge-vm.model';
import { ChargesService } from '@/app/features/charges/services/charges.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { ClientSearchComponent } from '@/app/shared/forms/client-search/client-search.component';
import { ReasonConfirmDialogComponent } from '@/app/shared/ui/reason-confirm-dialog/reason-confirm-dialog.component';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { formatMoney } from '@/app/shared/utils/money.utils';

@Component({
    selector: 'app-charges-list-page',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterLink,
        TableModule,
        ButtonModule,
        ClientSearchComponent,
        ChargeCorrectionDialogComponent,
        ReasonConfirmDialogComponent,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppErrorStateComponent,
        AppStatusTagComponent
    ],
    template: `
        <app-page-header title="Ücretler" description="Müşterilere yazılan ücret satırları.">
            @if (canCreate && !ro.mutationBlocked()) {
                <a
                    actions
                    routerLink="/panel/charges/new"
                    [queryParams]="clientId ? { clientId } : null"
                    pButton
                    type="button"
                    label="Yeni Ücret"
                    icon="pi pi-plus"
                    class="p-button-primary"
                ></a>
            } @else if (canCreate) {
                <button
                    actions
                    pButton
                    type="button"
                    label="Yeni Ücret (salt okunur)"
                    icon="pi pi-lock"
                    [disabled]="true"
                    class="p-button-secondary"
                ></button>
            }
        </app-page-header>

        <div class="card">
            <div class="mb-4 max-w-md">
                <label for="chargeClientFilter" class="block text-xs font-medium text-muted-color mb-1">Müşteri</label>
                <app-client-search inputId="chargeClientFilter" placeholder="Tümü — ad, telefon, hayvan veya mikroçip ile arayın" [ngModel]="clientId" (ngModelChange)="onClientFilterChange($event)" />
            </div>

            @if (error()) {
                <app-error-state [detail]="error()!" (retry)="reload()" />
            } @else if (loading() && rows().length === 0) {
                <app-loading-state message="Ücret listesi yükleniyor…" />
            } @else if (!loading() && rows().length === 0) {
                <app-empty-state message="Ücret kaydı yok." hint="Filtreyi temizleyin veya yeni ücret ekleyin." />
            } @else {
                <div class="overflow-x-auto">
                    <p-table
                        [value]="rows()"
                        [lazy]="true"
                        [paginator]="true"
                        [rows]="pageSize()"
                        [first]="first()"
                        [totalRecords]="totalItems()"
                        [loading]="loading()"
                        [rowsPerPageOptions]="[10, 20, 50]"
                        [paginatorDropdownAppendTo]="'body'"
                        [showCurrentPageReport]="true"
                        currentPageReportTemplate="{first} - {last} / {totalRecords}"
                        (onLazyLoad)="onLazyLoad($event)"
                        [tableStyle]="{ 'min-width': '66rem' }"
                    >
                        <ng-template #header>
                            <tr>
                                <th>Tarih</th>
                                <th>Müşteri</th>
                                <th>Hayvan</th>
                                <th>Açıklama</th>
                                <th class="text-right">Miktar</th>
                                <th class="text-right">Birim fiyat</th>
                                <th class="text-right">Tutar</th>
                                <th class="text-right">Ödenen</th>
                                <th class="text-right">Kalan</th>
                                @if (hasRowActions) {
                                    <th style="width: 18rem">İşlemler</th>
                                }
                            </tr>
                        </ng-template>
                        <ng-template #body let-row>
                            <tr>
                                <td>{{ formatDate(row.createdAtUtc) }}</td>
                                <td>
                                    <a [routerLink]="['/panel/clients', row.clientId]" class="text-primary font-medium no-underline">{{ row.clientName }}</a>
                                </td>
                                <td>
                                    @if (row.petId) {
                                        <a [routerLink]="['/panel/pets', row.petId]" class="text-primary font-medium no-underline">{{ row.petName }}</a>
                                    } @else {
                                        —
                                    }
                                </td>
                                <td class="break-words">{{ row.description }}</td>
                                <td class="text-right">{{ row.quantity }}</td>
                                <td class="text-right">{{ money(row.unitPrice, row.currency) }}</td>
                                <td class="text-right font-medium">{{ money(row.amount, row.currency) }}</td>
                                <td class="text-right">{{ money(row.allocatedAmount, row.currency) }}</td>
                                <td class="text-right">
                                    @if (row.outstandingAmount === 0) {
                                        <app-status-tag label="Ödendi" severity="success" />
                                    } @else {
                                        <span class="font-medium">{{ money(row.outstandingAmount, row.currency) }}</span>
                                    }
                                </td>
                                @if (hasRowActions) {
                                    <td class="whitespace-nowrap">
                                        @if (ro.mutationBlocked()) {
                                            <span class="text-muted-color text-sm">Salt okunur</span>
                                        } @else {
                                            @if (canCollectPayment && row.outstandingAmount !== 0) {
                                                <a
                                                    [routerLink]="['/panel/payments/new']"
                                                    [queryParams]="paymentQueryParams(row)"
                                                    pButton
                                                    label="Ödeme al"
                                                    icon="pi pi-wallet"
                                                    size="small"
                                                    class="p-button-sm mr-1"
                                                ></a>
                                            }
                                            @if (canCorrect) {
                                                <p-button label="Düzelt" icon="pi pi-pencil" size="small" [text]="true" (onClick)="openCorrection(row)" />
                                                <p-button label="İptal et" icon="pi pi-ban" size="small" severity="danger" [text]="true" (onClick)="openVoid(row)" />
                                            }
                                        }
                                    </td>
                                }
                            </tr>
                        </ng-template>
                    </p-table>
                </div>
            }
        </div>

        <app-charge-correction-dialog [(visible)]="correctionVisible" [charge]="actionTarget()" (corrected)="reload()" />
        <app-reason-confirm-dialog
            [(visible)]="voidVisible"
            header="Ücreti iptal et"
            [summary]="voidSummary()"
            description="İptal edilen ücret listelerden, bakiyeden ve Bugün tutarlarından düşer; geri alınamaz. Yanlışsa yeni ücret yazılır. Ödemesi olan ücret önce ödeme iptal edilmeden iptal edilemez."
            confirmLabel="Ücreti iptal et"
            failureFallback="Ücret iptal edilemedi."
            [execute]="voidCharge"
            (confirmed)="reload()"
        />
    `
})
export class ChargesListPageComponent implements OnInit {
    private readonly chargesService = inject(ChargesService);
    private readonly route = inject(ActivatedRoute);
    private readonly auth = inject(AuthService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly canCreate = this.auth.hasOperationClaim(CHARGES_CREATE_CLAIM);
    readonly canCorrect = this.auth.hasOperationClaim(CHARGES_CORRECT_CLAIM);
    readonly canCollectPayment = this.auth.hasOperationClaim(PAYMENTS_CREATE_CLAIM);
    readonly hasRowActions = this.canCorrect || this.canCollectPayment;

    /** Düzeltme veya iptal diyaloğunun açık olduğu satır. */
    readonly actionTarget = signal<ChargeVm | null>(null);
    correctionVisible = false;
    voidVisible = false;

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly rows = signal<ChargeVm[]>([]);
    readonly totalItems = signal(0);
    readonly pageSize = signal(20);
    readonly first = signal(0);

    clientId: string | null = null;

    readonly voidSummary = computed(() => {
        const c = this.actionTarget();
        return c ? `${c.clientName} · ${c.description} · ${formatMoney(c.amount, c.currency || 'TRY')}` : null;
    });
    readonly voidCharge = (reason: string) => this.chargesService.voidCharge(this.actionTarget()!.id, reason);

    readonly formatDate = (v: string | null) => formatUtcIsoAsLocalDateTimeDisplay(v);
    readonly money = (amount: number | null, currency: string) => formatMoney(amount, currency || 'TRY');

    ngOnInit(): void {
        this.clientId = this.route.snapshot.queryParamMap.get('clientId')?.trim() || null;
        this.load(1, this.pageSize());
    }

    /** Ödeme formu müşteri ve ücret bağlamıyla açılır; o ücret tam kalan tutarla dolu gelir. */
    paymentQueryParams(row: ChargeVm): Record<string, string> {
        return { clientId: row.clientId, chargeId: row.id, ...(row.visitId ? { visitId: row.visitId } : {}) };
    }

    openCorrection(row: ChargeVm): void {
        this.actionTarget.set(row);
        this.correctionVisible = true;
    }

    openVoid(row: ChargeVm): void {
        this.actionTarget.set(row);
        this.voidVisible = true;
    }

    reload(): void {
        this.load(Math.floor(this.first() / this.pageSize()) + 1, this.pageSize());
    }

    onClientFilterChange(clientId: string | null): void {
        this.clientId = clientId || null;
        this.load(1, this.pageSize());
    }

    onLazyLoad(event: TableLazyLoadEvent): void {
        const rows = event.rows ?? this.pageSize();
        const page = Math.floor((event.first ?? 0) / rows) + 1;
        if (page === Math.floor(this.first() / this.pageSize()) + 1 && rows === this.pageSize()) {
            return;
        }
        this.load(page, rows);
    }

    private load(page: number, pageSize: number): void {
        this.loading.set(true);
        this.error.set(null);
        this.chargesService.getCharges({ page, pageSize, clientId: this.clientId ?? undefined }).subscribe({
            next: (r) => {
                // Son sayfadaki son kayıt iptal edilince boş sayfa yerine bir önceki sayfaya dön.
                if (r.items.length === 0 && page > 1) {
                    this.load(page - 1, pageSize);
                    return;
                }
                this.rows.set(r.items);
                this.totalItems.set(r.totalItems);
                this.pageSize.set(r.pageSize);
                this.first.set((r.page - 1) * r.pageSize);
                this.loading.set(false);
            },
            error: (e: Error) => {
                this.error.set(e.message ?? 'Yükleme hatası');
                this.loading.set(false);
            }
        });
    }
}
