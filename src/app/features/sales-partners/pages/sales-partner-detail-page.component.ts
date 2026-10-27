import { Component, computed, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { forkJoin, type Observable } from 'rxjs';
import { DiscountCodeFormDialogComponent } from '@/app/features/sales-partners/components/discount-code-form-dialog.component';
import { SalesPartnerFormDialogComponent } from '@/app/features/sales-partners/components/sales-partner-form-dialog.component';
import { COMMISSION_STATUS_LABELS, minorToAmount, type CommissionStatus, type DiscountCodeDto, type DiscountCollectionDto, type DiscountRedemptionRowDto, type SalesPartnerDto } from '@/app/entities/sales-partner/models/sales-partner.model';
import { SalesPartnersService } from '@/app/features/sales-partners/services/sales-partners.service';
import { formatPercent } from '@/app/entities/sales-partner/utils/discount-code.utils';
import { downloadSalesPartnerCsv } from '@/app/features/sales-partners/utils/sales-partner-csv.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { ReasonConfirmDialogComponent } from '@/app/shared/ui/reason-confirm-dialog/reason-confirm-dialog.component';
import { AppRowActionButtonComponent } from '@/app/shared/ui/row-action-button/app-row-action-button.component';
import { AppStatusTagComponent, type StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { formatUtcIsoAsLocalDateDisplay, fromIstanbulDateAndTimeToUtcIso, localDateYyyyMmDd } from '@/app/shared/utils/date.utils';
import { formatMoney } from '@/app/shared/utils/money.utils';

const STATUS_SEVERITY: Readonly<Record<CommissionStatus, StatusTagSeverity>> = { Accrued: 'warn', Paid: 'success', Cancelled: 'secondary' };

/** Platform yöneticisi: ortak detayı, kodları, kullanım/tahsilat satırları, komisyon ödendi ve iade işaretleri, CSV (ADR-037). */
@Component({
    selector: 'app-sales-partner-detail-page',
    standalone: true,
    imports: [
        FormsModule,
        ButtonModule,
        CheckboxModule,
        DialogModule,
        InputTextModule,
        TableModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent,
        AppEmptyStateComponent,
        AppStatusTagComponent,
        AppRowActionButtonComponent,
        ReasonConfirmDialogComponent,
        SalesPartnerFormDialogComponent,
        DiscountCodeFormDialogComponent
    ],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        @if (loading() && !partner()) {
            <app-loading-state message="Satış ortağı yükleniyor…" />
        } @else if (error()) {
            <div class="card"><app-error-state [detail]="error()!" (retry)="load()" /></div>
        } @else if (partner(); as p) {
            <app-page-header categoryLink="/panel/sales-partners" categoryLinkLabel="Satış ortakları" [title]="p.name" [description]="contactLine(p)">
                <button actions pButton type="button" severity="secondary" [disabled]="exporting()" (click)="exportCsv()"><i [class]="exporting() ? 'pi pi-spin pi-spinner' : 'pi pi-download'"></i>CSV indir</button>
                <button actions pButton type="button" severity="secondary" (click)="partnerDialogVisible.set(true)"><i class="fa-solid fa-pen-to-square"></i>Düzenle</button>
            </app-page-header>

            @if (actionError()) {
                <p class="text-red-500 text-sm mt-0 mb-3" role="alert">{{ actionError() }}</p>
            }

            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6" data-testid="sp-summary">
                <div class="card mb-0">
                    <div class="text-muted-color text-sm mb-1">Kullanım (deneme / ücretli)</div>
                    <div class="text-xl font-semibold">
                        {{ p.summary.redemptionCount }} <span class="text-base font-normal text-muted-color">({{ p.summary.trialCustomerCount }} / {{ p.summary.paidCustomerCount }})</span>
                    </div>
                </div>
                <div class="card mb-0">
                    <div class="text-muted-color text-sm mb-1">Ciro (net, KDV hariç)</div>
                    <div class="text-xl font-semibold">{{ money(p.summary.revenueNetMinor) }}</div>
                </div>
                <div class="card mb-0">
                    <div class="text-muted-color text-sm mb-1">Komisyon hak edilen / ödenen</div>
                    <div class="text-xl font-semibold">
                        {{ money(p.summary.commissionEarnedMinor) }} <span class="text-base font-normal text-muted-color">/ {{ money(p.summary.commissionPaidMinor) }}</span>
                    </div>
                </div>
                <div class="card mb-0">
                    <div class="text-muted-color text-sm mb-1">Bekleyen komisyon</div>
                    <div class="text-xl font-semibold">{{ money(p.summary.commissionPendingMinor) }}</div>
                    @if (p.summary.commissionClawbackMinor > 0) {
                        <div class="text-sm text-red-600 dark:text-red-400 mt-1">Geri alınacak: {{ money(p.summary.commissionClawbackMinor) }}</div>
                    }
                </div>
            </div>

            <div class="card">
                <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <h5 class="m-0">Kodlar</h5>
                    <button pButton type="button" size="small" (click)="openCode(null)" data-testid="sp-new-code"><i class="p-button-icon pi pi-plus"></i>Yeni kod</button>
                </div>
                @if (codes().length === 0) {
                    <app-empty-state message="Bu ortağın kodu yok." />
                } @else {
                    <div class="overflow-x-auto">
                        <p-table [value]="codes()" [tableStyle]="{ 'min-width': '48rem' }">
                            <ng-template #header>
                                <tr>
                                    <th>Kod</th>
                                    <th class="text-right">İndirim</th>
                                    <th class="text-right">Komisyon</th>
                                    <th>Geçerlilik</th>
                                    <th class="text-right">Kullanım</th>
                                    <th>Durum</th>
                                    <th style="width: 6rem"><span class="sr-only">İşlem</span></th>
                                </tr>
                            </ng-template>
                            <ng-template #body let-c>
                                <tr data-testid="sp-code-row">
                                    <td class="font-mono font-medium">{{ c.code }}</td>
                                    <td class="text-right">%{{ percent(c.discountPercent) }}</td>
                                    <td class="text-right">%{{ percent(c.commissionPercent) }}</td>
                                    <td class="text-sm">{{ validityText(c) }}</td>
                                    <td class="text-right">{{ c.redemptionCount }}{{ c.maxRedemptions ? ' / ' + c.maxRedemptions : '' }}</td>
                                    <td><app-status-tag [label]="c.isActive ? 'Açık' : 'Kapalı'" [severity]="c.isActive ? 'success' : 'secondary'" /></td>
                                    <td>
                                        <div class="flex gap-1">
                                            <app-row-action-button action="edit" (pressed)="openCode(c)" />
                                            @if (c.isActive) {
                                                <app-row-action-button action="void" label="Kodu kapat" [loading]="mutatingId() === c.id" (pressed)="setCodeActive(c, false)" />
                                            } @else {
                                                <button pButton type="button" size="small" severity="secondary" [text]="true" [disabled]="mutatingId() === c.id" (click)="setCodeActive(c, true)">@if (mutatingId() === c.id) {<i class="p-button-icon pi pi-spin pi-spinner"></i>}Aç</button>
                                            }
                                        </div>
                                    </td>
                                </tr>
                            </ng-template>
                        </p-table>
                    </div>
                }
            </div>

            <div class="card">
                <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <h5 class="m-0">Kullanımlar ve tahsilatlar</h5>
                    <button pButton type="button" size="small" [disabled]="selectedIds().length === 0" (click)="openMarkPaid()" data-testid="sp-mark-paid"><i class="p-button-icon pi pi-check"></i>Seçilenleri ödendi işaretle</button>
                </div>
                @if (redemptions().length === 0) {
                    <app-empty-state message="Bu ortağın kodunu kullanan kurum yok." />
                } @else {
                    @for (r of redemptions(); track r.redemptionId) {
                        <div class="border border-surface-200 dark:border-surface-700 rounded-lg p-4 mb-4" data-testid="sp-redemption">
                            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3">
                                <span class="font-medium">{{ r.tenantName || r.tenantId }}</span>
                                <span class="text-sm text-muted-color">Kod {{ r.code }} · %{{ percent(r.discountPercent) }} indirim · %{{ percent(r.commissionPercent) }} komisyon</span>
                                <span class="text-sm text-muted-color">Kullanım: {{ date(r.redeemedAtUtc) }}</span>
                                @if (r.windowEndsAtUtc) {
                                    <span class="text-sm text-muted-color">Pencere: {{ date(r.windowStartsAtUtc) }} – {{ date(r.windowEndsAtUtc) }}</span>
                                }
                                <app-status-tag [label]="r.customerStatus === 'Paid' ? 'Ücretli' : 'Deneme'" [severity]="r.customerStatus === 'Paid' ? 'success' : 'info'" />
                            </div>
                            @if (r.collections.length === 0) {
                                <p class="text-sm text-muted-color m-0">Henüz tahsilat yok.</p>
                            } @else {
                                <div class="overflow-x-auto">
                                    <p-table [value]="r.collections" [tableStyle]="{ 'min-width': '56rem' }" size="small">
                                        <ng-template #header>
                                            <tr>
                                                <th style="width: 3rem"><span class="sr-only">Seç</span></th>
                                                <th>Tahsilat</th>
                                                <th>Dönem</th>
                                                <th class="text-right">Brüt</th>
                                                <th class="text-right">İndirim</th>
                                                <th class="text-right">Net</th>
                                                <th class="text-right">Komisyon</th>
                                                <th>Durum</th>
                                                <th style="width: 4rem"><span class="sr-only">İşlem</span></th>
                                            </tr>
                                        </ng-template>
                                        <ng-template #body let-c>
                                            <tr data-testid="sp-collection-row">
                                                <td>
                                                    @if (c.status === 'Accrued') {
                                                        <p-checkbox [binary]="true" [ngModel]="isSelected(c.id)" (ngModelChange)="toggle(c.id, $event)" [ariaLabel]="'Seç: ' + date(c.collectedAtUtc)" />
                                                    }
                                                </td>
                                                <td>{{ date(c.collectedAtUtc) }}</td>
                                                <td>{{ c.billingPeriod === 'Yearly' ? 'Yıllık' : 'Aylık' }}</td>
                                                <td class="text-right">{{ money(c.grossAmountMinor) }}</td>
                                                <td class="text-right">{{ money(c.discountAmountMinor) }}</td>
                                                <td class="text-right">{{ money(c.netAmountMinor) }}</td>
                                                <td class="text-right font-medium">{{ money(c.commissionAmountMinor) }}</td>
                                                <td>
                                                    <app-status-tag [label]="statusLabel(c)" [severity]="statusSeverity(c)" />
                                                    @if (c.status === 'Paid' && c.paidAtUtc) {
                                                        <div class="text-xs text-muted-color mt-1">{{ date(c.paidAtUtc) }}{{ c.paidNote ? ' · ' + c.paidNote : '' }}</div>
                                                    }
                                                    @if (c.status === 'Cancelled' && c.cancelReason) {
                                                        <div class="text-xs text-muted-color mt-1">{{ c.cancelReason }}</div>
                                                    }
                                                </td>
                                                <td>
                                                    @if (c.status !== 'Cancelled') {
                                                        <app-row-action-button action="void" label="İade/iptal işaretle" (pressed)="openCancel(c)" />
                                                    }
                                                </td>
                                            </tr>
                                        </ng-template>
                                    </p-table>
                                </div>
                            }
                        </div>
                    }
                }
            </div>

            <app-sales-partner-form-dialog [(visible)]="partnerDialogVisible" [partner]="p" (saved)="load()" />
            <app-discount-code-form-dialog [(visible)]="codeDialogVisible" [partnerId]="p.id" [code]="editingCode()" (saved)="load()" />

            <p-dialog header="Komisyon ödendi" [modal]="true" [(visible)]="markPaidVisible" [style]="{ width: 'min(28rem, 95vw)' }" [draggable]="false">
                <div class="flex flex-col gap-4">
                    <p class="m-0 text-sm">{{ selectedIds().length }} satır, toplam {{ money(selectedCommissionMinor()) }} ödendi olarak işaretlenecek. Ödeme sistem dışında yapılır.</p>
                    <div class="flex flex-col gap-1">
                        <label for="paidOn" class="text-sm font-medium text-muted-color">Ödeme tarihi *</label>
                        <input id="paidOn" pInputText type="date" [(ngModel)]="paidOn" />
                    </div>
                    <div class="flex flex-col gap-1">
                        <label for="paidNote" class="text-sm font-medium text-muted-color">Not</label>
                        <input id="paidNote" pInputText [(ngModel)]="paidNote" maxlength="500" placeholder="ör. havale açıklaması" />
                    </div>
                    @if (markPaidError()) {
                        <p class="text-red-500 text-sm m-0" role="alert">{{ markPaidError() }}</p>
                    }
                    <div class="flex justify-end gap-2">
                        <button pButton type="button" severity="secondary" (click)="markPaidVisible.set(false)" [disabled]="markingPaid()">{{ copy.buttonCancel }}</button>
                        <button pButton type="button" [disabled]="!paidOn || markingPaid()" (click)="markPaid()"><i class="p-button-icon" [class]="markingPaid() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>Ödendi işaretle</button>
                    </div>
                </div>
            </p-dialog>

            <app-reason-confirm-dialog
                [(visible)]="cancelVisible"
                header="Tahsilatı iade/iptal işaretle"
                [summary]="cancelSummary()"
                description="Komisyon hak edişten düşer; komisyon ödenmişse ortaktan geri alınacak olarak görünür. Ödeme sağlayıcısındaki iade ayrıca yapılır."
                confirmLabel="İptal işaretle"
                [execute]="cancelExecute"
                (confirmed)="load()"
            />
        }
    `
})
export class SalesPartnerDetailPageComponent implements OnInit {
    readonly copy = PANEL_COPY;

    private readonly route = inject(ActivatedRoute);
    private readonly partners = inject(SalesPartnersService);
    private readonly partnerId = this.route.snapshot.paramMap.get('id') ?? '';

    readonly partner = signal<SalesPartnerDto | null>(null);
    readonly codes = signal<DiscountCodeDto[]>([]);
    readonly redemptions = signal<DiscountRedemptionRowDto[]>([]);
    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly actionError = signal<string | null>(null);
    readonly exporting = signal(false);
    readonly mutatingId = signal<string | null>(null);

    readonly partnerDialogVisible = signal(false);
    readonly codeDialogVisible = signal(false);
    readonly editingCode = signal<DiscountCodeDto | null>(null);

    readonly selectedIds = signal<string[]>([]);
    readonly selectedCommissionMinor = computed(() => {
        const ids = new Set(this.selectedIds());

        return this.redemptions()
            .flatMap((r) => r.collections)
            .filter((c) => ids.has(c.id))
            .reduce((sum, c) => sum + c.commissionAmountMinor, 0);
    });
    readonly markPaidVisible = signal(false);
    readonly markingPaid = signal(false);
    readonly markPaidError = signal<string | null>(null);
    paidOn = '';
    paidNote = '';

    readonly cancelVisible = signal(false);
    private readonly cancelling = signal<DiscountCollectionDto | null>(null);
    readonly cancelSummary = computed(() => {
        const c = this.cancelling();

        return c ? `${this.date(c.collectedAtUtc)} tahsilatı, komisyon ${this.money(c.commissionAmountMinor)}` : null;
    });
    readonly cancelExecute = (reason: string): Observable<unknown> => this.partners.cancelCollection(this.partnerId, this.cancelling()?.id ?? '', reason);

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.error.set(null);
        forkJoin({ detail: this.partners.get(this.partnerId), redemptions: this.partners.redemptions(this.partnerId) }).subscribe({
            next: ({ detail, redemptions }) => {
                this.partner.set(detail.partner);
                this.codes.set(detail.codes);
                this.redemptions.set(redemptions);
                this.selectedIds.set([]);
                this.loading.set(false);
            },
            error: (e: unknown) => {
                this.error.set(e instanceof Error ? e.message : 'Satış ortağı yüklenemedi.');
                this.loading.set(false);
            }
        });
    }

    openCode(code: DiscountCodeDto | null): void {
        this.editingCode.set(code);
        this.codeDialogVisible.set(true);
    }

    setCodeActive(code: DiscountCodeDto, active: boolean): void {
        if (this.mutatingId()) {
            return;
        }

        this.mutatingId.set(code.id);
        this.actionError.set(null);
        this.partners.setCodeActive(this.partnerId, code.id, active).subscribe({
            next: () => {
                this.mutatingId.set(null);
                this.load();
            },
            error: (e: unknown) => {
                this.mutatingId.set(null);
                this.actionError.set(e instanceof Error ? e.message : 'İşlem başarısız.');
            }
        });
    }

    isSelected(id: string): boolean {
        return this.selectedIds().includes(id);
    }

    toggle(id: string, selected: boolean): void {
        this.selectedIds.update((ids) => (selected ? [...ids.filter((x) => x !== id), id] : ids.filter((x) => x !== id)));
    }

    openMarkPaid(): void {
        this.paidOn = localDateYyyyMmDd();
        this.paidNote = '';
        this.markPaidError.set(null);
        this.markPaidVisible.set(true);
    }

    markPaid(): void {
        const paidAtUtc = fromIstanbulDateAndTimeToUtcIso(this.paidOn, '12:00');

        if (!paidAtUtc || this.markingPaid()) {
            return;
        }

        this.markingPaid.set(true);
        this.markPaidError.set(null);
        this.partners.markPaid(this.partnerId, this.selectedIds(), paidAtUtc, this.paidNote.trim() || null).subscribe({
            next: () => {
                this.markingPaid.set(false);
                this.markPaidVisible.set(false);
                this.load();
            },
            error: (e: unknown) => {
                this.markingPaid.set(false);
                this.markPaidError.set(e instanceof Error ? e.message : 'Komisyon ödendi işaretlenemedi.');
            }
        });
    }

    openCancel(collection: DiscountCollectionDto): void {
        this.cancelling.set(collection);
        this.cancelVisible.set(true);
    }

    exportCsv(): void {
        this.exporting.set(true);
        this.actionError.set(null);
        downloadSalesPartnerCsv(this.partners.exportCsv(this.partnerId), {
            done: () => this.exporting.set(false),
            failed: (message) => {
                this.exporting.set(false);
                this.actionError.set(message);
            }
        });
    }

    contactLine(p: SalesPartnerDto): string {
        const parts = [p.email, p.phone, p.isActive ? 'Aktif' : 'Pasif'].filter((x): x is string => !!x);

        return parts.join(' · ');
    }

    validityText(c: DiscountCodeDto): string {
        if (!c.validFromUtc && !c.validUntilUtc) {
            return 'Süresiz';
        }

        return `${c.validFromUtc ? this.date(c.validFromUtc) : '…'} – ${c.validUntilUtc ? this.date(c.validUntilUtc) : '…'}`;
    }

    statusLabel(c: DiscountCollectionDto): string {
        return c.status === 'Cancelled' && c.paidAtUtc ? 'İptal (geri alınacak)' : COMMISSION_STATUS_LABELS[c.status];
    }

    statusSeverity(c: DiscountCollectionDto): StatusTagSeverity {
        return c.status === 'Cancelled' && c.paidAtUtc ? 'danger' : STATUS_SEVERITY[c.status];
    }

    money(minor: number): string {
        return formatMoney(minorToAmount(minor));
    }

    percent(value: number): string {
        return formatPercent(value);
    }

    date(value: string | null | undefined): string {
        return formatUtcIsoAsLocalDateDisplay(value);
    }
}
