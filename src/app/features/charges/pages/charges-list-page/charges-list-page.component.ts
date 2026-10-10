import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import type { TableLazyLoadEvent } from 'primeng/table';
import { AuthService } from '@/app/core/auth/auth.service';
import { CHARGES_CREATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import type { ChargeVm } from '@/app/features/charges/models/charge-vm.model';
import { ChargesService } from '@/app/features/charges/services/charges.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { ClientSearchComponent } from '@/app/shared/forms/client-search/client-search.component';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
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
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppErrorStateComponent
    ],
    template: `
        <app-page-header title="Ücretler" subtitle="Finans" description="Müşterilere yazılan ücret satırları.">
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
                        [tableStyle]="{ 'min-width': '56rem' }"
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
                            </tr>
                        </ng-template>
                    </p-table>
                </div>
            }
        </div>
    `
})
export class ChargesListPageComponent implements OnInit {
    private readonly chargesService = inject(ChargesService);
    private readonly route = inject(ActivatedRoute);
    private readonly auth = inject(AuthService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly canCreate = this.auth.hasOperationClaim(CHARGES_CREATE_CLAIM);

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly rows = signal<ChargeVm[]>([]);
    readonly totalItems = signal(0);
    readonly pageSize = signal(20);
    readonly first = signal(0);

    clientId: string | null = null;

    readonly formatDate = (v: string | null) => formatUtcIsoAsLocalDateTimeDisplay(v);
    readonly money = (amount: number | null, currency: string) => formatMoney(amount, currency || 'TRY');

    ngOnInit(): void {
        this.clientId = this.route.snapshot.queryParamMap.get('clientId')?.trim() || null;
        this.load(1, this.pageSize());
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
