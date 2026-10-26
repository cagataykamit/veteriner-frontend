import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import type { SalesPartnerDto } from '@/app/features/sales-partners/models/sales-partner.model';
import { minorToAmount } from '@/app/features/sales-partners/models/sales-partner.model';
import { SalesPartnerFormDialogComponent } from '@/app/features/sales-partners/components/sales-partner-form-dialog.component';
import { SalesPartnersService } from '@/app/features/sales-partners/services/sales-partners.service';
import { downloadSalesPartnerCsv } from '@/app/features/sales-partners/utils/sales-partner-csv.utils';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppRowActionButtonComponent } from '@/app/shared/ui/row-action-button/app-row-action-button.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { formatMoney } from '@/app/shared/utils/money.utils';

/** Platform yöneticisi: satış ortakları ve ortak başına özet (ADR-037 madde 7). */
@Component({
    selector: 'app-sales-partners-list-page',
    standalone: true,
    imports: [ButtonModule, TableModule, AppPageHeaderComponent, AppLoadingStateComponent, AppErrorStateComponent, AppEmptyStateComponent, AppStatusTagComponent, AppRowActionButtonComponent, SalesPartnerFormDialogComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <app-page-header title="Satış ortakları" description="Ortak kodlarıyla gelen kurumlar, ciro ve komisyon. Yalnız Vetinity platform yöneticisi görür.">
            <button actions pButton type="button" severity="secondary" [loading]="exporting()" (click)="exportCsv()" data-testid="sp-export"><i class="pi pi-download"></i>CSV indir</button>
            <button actions pButton type="button" (click)="openCreate()" data-testid="sp-new"><i class="pi pi-plus"></i>Yeni ortak</button>
        </app-page-header>

        @if (actionError()) {
            <p class="text-red-500 text-sm mt-0 mb-3" role="alert">{{ actionError() }}</p>
        }

        <div class="card">
            @if (loading() && rows().length === 0) {
                <app-loading-state message="Satış ortakları yükleniyor…" />
            } @else if (error()) {
                <app-error-state [detail]="error()!" (retry)="load()" />
            } @else if (rows().length === 0) {
                <app-empty-state message="Henüz satış ortağı yok." hint="Yeni ortak ekleyip ona kod tanımlayın." />
            } @else {
                <div class="overflow-x-auto">
                    <p-table [value]="rows()" [tableStyle]="{ 'min-width': '64rem' }">
                        <ng-template #header>
                            <tr>
                                <th>Ortak</th>
                                <th class="text-right">Kod</th>
                                <th class="text-right">Kullanım</th>
                                <th class="text-right">Deneme / Ücretli</th>
                                <th class="text-right">Ciro (net)</th>
                                <th class="text-right">Hak edilen</th>
                                <th class="text-right">Ödenen</th>
                                <th class="text-right">Bekleyen</th>
                                <th>Durum</th>
                                <th style="width: 6rem"><span class="sr-only">İşlem</span></th>
                            </tr>
                        </ng-template>
                        <ng-template #body let-row>
                            <tr data-testid="sp-row">
                                <td>
                                    <div class="font-medium">{{ row.name }}</div>
                                    @if (row.email) {
                                        <div class="text-sm text-muted-color">{{ row.email }}</div>
                                    }
                                </td>
                                <td class="text-right">{{ row.codeCount }}</td>
                                <td class="text-right">{{ row.summary.redemptionCount }}</td>
                                <td class="text-right">{{ row.summary.trialCustomerCount }} / {{ row.summary.paidCustomerCount }}</td>
                                <td class="text-right">{{ money(row.summary.revenueNetMinor) }}</td>
                                <td class="text-right">{{ money(row.summary.commissionEarnedMinor) }}</td>
                                <td class="text-right">{{ money(row.summary.commissionPaidMinor) }}</td>
                                <td class="text-right font-medium">{{ money(row.summary.commissionPendingMinor) }}</td>
                                <td><app-status-tag [label]="row.isActive ? 'Aktif' : 'Pasif'" [severity]="row.isActive ? 'success' : 'warn'" /></td>
                                <td>
                                    <div class="flex gap-1">
                                        <app-row-action-button action="detail" [link]="['/panel/sales-partners', row.id]" />
                                        <app-row-action-button action="edit" (pressed)="openEdit(row)" />
                                    </div>
                                </td>
                            </tr>
                        </ng-template>
                    </p-table>
                </div>
            }
        </div>

        <app-sales-partner-form-dialog [(visible)]="dialogVisible" [partner]="editing()" (saved)="load()" />
    `
})
export class SalesPartnersListPageComponent implements OnInit {
    private readonly partners = inject(SalesPartnersService);

    readonly rows = signal<SalesPartnerDto[]>([]);
    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly actionError = signal<string | null>(null);
    readonly exporting = signal(false);
    readonly dialogVisible = signal(false);
    readonly editing = signal<SalesPartnerDto | null>(null);

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.error.set(null);
        this.partners.list().subscribe({
            next: (rows) => {
                this.rows.set(rows);
                this.loading.set(false);
            },
            error: (e: unknown) => {
                this.error.set(e instanceof Error ? e.message : 'Satış ortakları yüklenemedi.');
                this.loading.set(false);
            }
        });
    }

    openCreate(): void {
        this.editing.set(null);
        this.dialogVisible.set(true);
    }

    openEdit(row: SalesPartnerDto): void {
        this.editing.set(row);
        this.dialogVisible.set(true);
    }

    exportCsv(): void {
        this.exporting.set(true);
        this.actionError.set(null);
        downloadSalesPartnerCsv(this.partners.exportCsv(), {
            done: () => this.exporting.set(false),
            failed: (message) => {
                this.exporting.set(false);
                this.actionError.set(message);
            }
        });
    }

    money(minor: number): string {
        return formatMoney(minorToAmount(minor));
    }
}
