import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
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
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { ClientSearchComponent } from '@/app/entities/client/components/client-search.component';
import { ReasonConfirmDialogComponent } from '@/app/shared/ui/reason-confirm-dialog/reason-confirm-dialog.component';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { AppListHeaderComponent } from '@/app/shared/ui/list-header/app-list-header.component';
import { FilterFieldComponent } from '@/app/shared/ui/filter-field/filter-field.component';
import { formatMoney } from '@/app/shared/utils/money.utils';
import { AppRowActionButtonComponent } from '@/app/shared/ui/row-action-button/app-row-action-button.component';
import { MoneyPipe } from '@/app/shared/pipes/money.pipe';
import { TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';

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
        AppListHeaderComponent,
        FilterFieldComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppErrorStateComponent,
        AppStatusTagComponent,
        AppRowActionButtonComponent,
        MoneyPipe,
        TrDateTimePipe
    ],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <div class="card">
            <app-list-header class="mb-4" title="Ücretler" [count]="totalItems()">
                <app-filter-field label="Müşteri" labelFor="chargeClientFilter" [active]="!!clientId">
                    <app-client-search inputId="chargeClientFilter" placeholder="Müşteri ara…" [ngModel]="clientId" (ngModelChange)="onClientFilterChange($event)" />
                </app-filter-field>
                @if (canCreate && !ro.mutationBlocked()) {
                    <a actions routerLink="/panel/charges/new" [queryParams]="clientId ? { clientId } : null" pButton type="button" class="p-button-primary"><i class="pi pi-plus"></i>Yeni Ücret</a>
                } @else if (canCreate) {
                    <button actions pButton type="button" [disabled]="true" class="p-button-secondary"><i class="pi pi-lock"></i>Yeni Ücret (salt okunur)</button>
                }
            </app-list-header>

            @if (error()) {
                <app-error-state [detail]="error()!" (retry)="reload()" />
            } @else if (loading() && rows().length === 0) {
                <app-loading-state message="Ücret listesi yükleniyor…" />
            } @else if (!loading() && rows().length === 0) {
                <app-empty-state message="Ücret kaydı yok." hint="Filtreyi temizleyin veya yeni ücret ekleyin." />
            } @else {
                <div class="overflow-x-auto">
                    <p-table
                        size="small"
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
                            <tr class="whitespace-nowrap">
                                <th>Tarih</th>
                                <th>Müşteri</th>
                                <th>Hasta</th>
                                <th>Açıklama</th>
                                <th class="text-right">Miktar</th>
                                <th class="text-right">Birim fiyat</th>
                                <th class="text-right">Tutar</th>
                                <th class="text-right">Ödenen</th>
                                <th class="text-right">Kalan</th>
                                @if (hasRowActions) {
                                    <th>İşlemler</th>
                                }
                            </tr>
                        </ng-template>
                        <ng-template #body let-row>
                            <tr>
                                <td class="whitespace-nowrap">{{ row.createdAtUtc | trDateTime }}</td>
                                <td>
                                    <a [routerLink]="['/panel/clients', row.clientId]" class="block max-w-[9rem] truncate text-primary font-medium no-underline" [title]="row.clientName">{{ row.clientName }}</a>
                                </td>
                                <td>
                                    @if (row.petId) {
                                        <a [routerLink]="['/panel/pets', row.petId]" class="block max-w-[7rem] truncate text-primary font-medium no-underline" [title]="row.petName">{{ row.petName }}</a>
                                    } @else {
                                        —
                                    }
                                </td>
                                <td>
                                    <div class="max-w-[10rem] truncate" [title]="row.description">{{ row.description }}</div>
                                </td>
                                <td class="text-right">{{ row.quantity }}</td>
                                <td class="text-right whitespace-nowrap">{{ row.unitPrice | money: row.currency || 'TRY' }}</td>
                                <td class="text-right whitespace-nowrap font-medium">{{ row.amount | money: row.currency || 'TRY' }}</td>
                                <td class="text-right whitespace-nowrap">{{ row.allocatedAmount | money: row.currency || 'TRY' }}</td>
                                <td class="text-right whitespace-nowrap">
                                    @if (row.outstandingAmount === 0) {
                                        <app-status-tag label="Ödendi" severity="success" />
                                    } @else {
                                        <span class="font-medium">{{ row.outstandingAmount | money: row.currency || 'TRY' }}</span>
                                    }
                                </td>
                                @if (hasRowActions) {
                                    <td class="whitespace-nowrap">
                                        <div class="flex items-center justify-end gap-1">
                                            @if (ro.mutationBlocked()) {
                                                <span class="text-muted-color text-sm">Salt okunur</span>
                                            } @else {
                                                @if (canCollectPayment && row.outstandingAmount !== 0) {
                                                    <a [routerLink]="['/panel/payments/new']" [queryParams]="paymentQueryParams(row)" pButton size="small" class="p-button-sm mr-1"><i class="pi pi-wallet"></i>Ödeme al</a>
                                                }
                                                @if (canCorrect) {
                                                    <app-row-action-button action="edit" label="Düzelt" (pressed)="openCorrection(row)" />
                                                    <app-row-action-button action="void" (pressed)="openVoid(row)" />
                                                }
                                            }
                                        </div>
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
