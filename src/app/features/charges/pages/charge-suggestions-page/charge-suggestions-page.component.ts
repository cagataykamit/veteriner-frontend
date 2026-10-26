import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { AuthService } from '@/app/core/auth/auth.service';
import { CHARGES_CREATE_CLAIM, PAYMENTS_CREATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { ChargeSuggestionConvertDialogComponent, ChargeSuggestionOverrides } from '@/app/features/charges/components/charge-suggestion-convert-dialog.component';
import type { ChargeSuggestionVm } from '@/app/features/charges/models/charge-suggestion-vm.model';
import type { ChargeCreateResultVm, ChargeVm } from '@/app/features/charges/models/charge-vm.model';
import { ChargeSuggestionsService } from '@/app/features/charges/services/charge-suggestions.service';
import { computeChargeAmount } from '@/app/features/charges/utils/charge-amount.utils';
import { CHARGE_SUGGESTION_PERIOD_OPTIONS, ChargeSuggestionPeriod, filterChargeSuggestions } from '@/app/features/charges/utils/charge-suggestion-filter.utils';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { ClientSearchComponent } from '@/app/features/clients/components/client-search.component';
import { AppContextFilterChipComponent } from '@/app/shared/ui/context-filter-chip/app-context-filter-chip.component';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppListHeaderComponent } from '@/app/shared/ui/list-header/app-list-header.component';
import { FilterFieldComponent } from '@/app/shared/ui/filter-field/filter-field.component';
import { ReasonConfirmDialogComponent } from '@/app/shared/ui/reason-confirm-dialog/reason-confirm-dialog.component';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { formatMoney } from '@/app/shared/utils/money.utils';
import { AppRowActionButtonComponent } from '@/app/shared/ui/row-action-button/app-row-action-button.component';
import { MoneyPipe } from '@/app/shared/pipes/money.pipe';
import { TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';

/** Sözleşme en çok 200 kalem döner; bekleyen liste bundan küçük beklenir, aşılırsa kullanıcıya söylenir. */
const PAGE_SIZE = 200;
/** Bu oturumda çevrilen ücretler için "Ödeme al" kısayolu satırlarının üst sınırı. */
const RECENT_LIMIT = 5;

/** Çevrilen kalemin ücrete ve ödemeye bağlayan kısayol satırı. */
interface ConvertedRow {
    charge: ChargeVm;
    created: boolean;
}

/**
 * Ücretlendir: hekimin işlemlerinden doğan ücret bekleyen kalemler. Resepsiyon (`Charges.Create`) kalemi tek tıkla ya da düzenleyerek ücrete çevirir,
 * ya da gerekçeyle ücretsiz sayar; hekim (`Charges.Read`) kalemleri yalnız görür (ADR-012, ADR-018). Liste her zaman sunucudan okunur.
 */
@Component({
    selector: 'app-charge-suggestions-page',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterLink,
        TableModule,
        ButtonModule,
        ClientSearchComponent,
        ChargeSuggestionConvertDialogComponent,
        ReasonConfirmDialogComponent,
        AppContextFilterChipComponent,
        AppListHeaderComponent,
        FilterFieldComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppErrorStateComponent,
        AppRowActionButtonComponent,
        MoneyPipe,
        TrDateTimePipe
    ],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        @if (hasCreateClaim && ro.mutationBlocked()) {
            <p class="text-sm text-muted-color mt-0 mb-4" role="note">Abonelik salt okunur olduğu için kalemler yalnız görüntülenir.</p>
        } @else if (!hasCreateClaim) {
            <p class="text-sm text-muted-color mt-0 mb-4" role="note">Kalemleri ücrete çevirme yetkisi resepsiyon ve yöneticidedir; burada yalnız görüntülenir.</p>
        }

        @for (row of converted(); track row.charge.id) {
            <div class="card mb-4 flex flex-wrap items-center gap-3 justify-between" role="status" data-testid="converted-row">
                <div class="min-w-0">
                    <span class="font-medium"><i class="pi pi-check-circle text-green-600 mr-2"></i>{{ row.created ? 'Ücrete çevrildi' : 'Daha önce ücrete çevrilmişti' }}</span>
                    <span class="text-muted-color"> · {{ row.charge.clientName }} · {{ row.charge.description }} · {{ row.charge.amount | money: row.charge.currency || 'TRY' }} </span>
                </div>
                <div class="flex flex-wrap gap-2">
                    <a [routerLink]="['/panel/charges']" [queryParams]="{ clientId: row.charge.clientId }" pButton size="small" severity="secondary" [outlined]="true"><i class="pi pi-receipt"></i>Ücret kaydı</a>
                    @if (canCollectPayment()) {
                        <a [routerLink]="['/panel/payments/new']" [queryParams]="paymentQueryParams(row.charge)" pButton size="small"><i class="pi pi-wallet"></i>Ödeme al</a>
                    }
                    <p-button size="small" [text]="true" severity="secondary" icon="pi pi-times" ariaLabel="Kapat" (onClick)="dismissConverted(row.charge.id)" />
                </div>
            </div>
        }

        <div class="card">
            <app-list-header class="mb-4" title="Ücret bekleyenler" [count]="totalItems()">
                <app-filter-field label="Müşteri" labelFor="pendingClientFilter" [active]="!!clientId()">
                    <app-client-search inputId="pendingClientFilter" placeholder="Müşteri ara…" [ngModel]="clientId()" (ngModelChange)="clientId.set($event || null)" />
                </app-filter-field>
                <div>
                    <label for="pendingPeriodFilter" class="block text-xs font-medium text-muted-color mb-1">Tarih</label>
                    <select id="pendingPeriodFilter" class="p-inputtext p-component" [ngModel]="period()" (ngModelChange)="period.set($event)">
                        @for (o of periodOptions; track o.value) {
                            <option [value]="o.value">{{ o.label }}</option>
                        }
                    </select>
                </div>
            </app-list-header>
            @if (contextLabel(); as label) {
                <app-context-filter-chip [label]="label" (clear)="clearContext()" />
            }

            @if (actionError()) {
                <p class="text-red-500 mt-0 mb-4" role="alert" data-testid="action-error">{{ actionError() }}</p>
            }

            @if (error()) {
                <app-error-state [detail]="error()!" (retry)="reload()" />
            } @else if (loading() && rows().length === 0) {
                <app-loading-state message="Bekleyen ücretler yükleniyor…" />
            } @else if (visibleRows().length === 0) {
                <app-empty-state [message]="rows().length === 0 ? 'Ücret bekleyen kalem yok.' : 'Süzgece uyan kalem yok.'" [hint]="rows().length === 0 ? 'Hekimin kaydettiği fiyatlı uygulamalar burada görünür.' : 'Süzgeci değiştirin.'" />
            } @else {
                @if (totalItems() > rows().length) {
                    <p class="text-sm text-muted-color mt-0 mb-3" role="note">İlk {{ rows().length }} kalem gösteriliyor (toplam {{ totalItems() }}); çevirdikçe kalanlar listeye gelir.</p>
                }
                <div class="overflow-x-auto">
                    <p-table [value]="visibleRows()" dataKey="id" [paginator]="visibleRows().length > 20" [rows]="20" [tableStyle]="{ 'min-width': '64rem' }">
                        <ng-template #header>
                            <tr class="whitespace-nowrap">
                                <th>Tarih</th>
                                <th>Müşteri</th>
                                <th>Hasta</th>
                                <th>Kalem</th>
                                <th class="text-right">Miktar</th>
                                <th class="text-right">Birim fiyat</th>
                                <th class="text-right">Tutar</th>
                                @if (canConvert()) {
                                    <th>İşlemler</th>
                                }
                            </tr>
                        </ng-template>
                        <ng-template #body let-row>
                            <tr>
                                <td class="whitespace-nowrap">{{ row.occurredAtUtc | trDateTime }}</td>
                                <td>
                                    <a [routerLink]="['/panel/clients', row.clientId]" class="block max-w-[9rem] truncate text-primary font-medium no-underline" [title]="row.clientName">{{ row.clientName }}</a>
                                </td>
                                <td>
                                    <a [routerLink]="['/panel/pets', row.petId]" class="block max-w-[7rem] truncate text-primary font-medium no-underline" [title]="row.petName">{{ row.petName }}</a>
                                </td>
                                <td>
                                    <div class="max-w-[10rem] truncate" [title]="row.description">{{ row.description }}</div>
                                    <div class="text-sm whitespace-nowrap">
                                        @if (row.examinationId) {
                                            <a [routerLink]="['/panel/examinations', row.examinationId]" class="text-primary no-underline">Muayeneyi aç</a>
                                        } @else {
                                            <span class="text-muted-color">Uygulama kaydı</span>
                                        }
                                    </div>
                                </td>
                                <td class="text-right whitespace-nowrap">{{ row.quantity }} {{ row.unit }}</td>
                                <td class="text-right whitespace-nowrap">
                                    @if (row.suggestedUnitPrice === null) {
                                        <span class="text-amber-700 dark:text-amber-300 font-medium">Fiyat yok</span>
                                    } @else {
                                        {{ row.suggestedUnitPrice | money: row.currency || 'TRY' }}
                                    }
                                </td>
                                <td class="text-right whitespace-nowrap font-medium">{{ rowAmount(row) }}</td>
                                @if (canConvert()) {
                                    <td class="whitespace-nowrap">
                                        <div class="flex items-center gap-1">
                                            @if (row.suggestedUnitPrice === null) {
                                                <p-button label="Fiyat gir ve çevir" icon="pi pi-pencil" size="small" class="mr-1" [disabled]="busy(row.id)" (onClick)="openEdit(row)" />
                                            } @else {
                                                <p-button label="Ücrete çevir" icon="pi pi-check" size="small" class="mr-1" [loading]="busy(row.id)" (onClick)="convertQuick(row)" />
                                                <app-row-action-button action="edit" label="Düzenleyerek çevir" [disabled]="busy(row.id)" (pressed)="openEdit(row)" />
                                            }
                                            <app-row-action-button action="void" label="Ücretsiz say" [disabled]="busy(row.id)" (pressed)="openWaive(row)" />
                                        </div>
                                    </td>
                                }
                            </tr>
                        </ng-template>
                    </p-table>
                </div>
            }
        </div>

        <app-charge-suggestion-convert-dialog [(visible)]="editVisible" [suggestion]="target()" [execute]="convertEdited" (converted)="afterAction()" />
        <app-reason-confirm-dialog
            [(visible)]="waiveVisible"
            header="Ücretsiz say"
            [summary]="waiveSummary()"
            description="Kalem ücret oluşturulmadan listeden düşer; gerekçe kayda geçer ve geri alınamaz."
            confirmLabel="Ücretsiz say"
            failureFallback="Kalem ücretsiz sayılamadı."
            [execute]="waive"
            (confirmed)="afterAction()"
        />
    `
})
export class ChargeSuggestionsPageComponent implements OnInit {
    private readonly service = inject(ChargeSuggestionsService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly auth = inject(AuthService);
    private readonly destroyRef = inject(DestroyRef);
    readonly ro = inject(TenantReadOnlyContextService);

    /** Çevirme ve ücretsiz sayma `Charges.Create` ister; hekimde yoktur, kalemleri yalnız görür. */
    protected readonly hasCreateClaim = this.auth.hasOperationClaim(CHARGES_CREATE_CLAIM);
    readonly canConvert = computed(() => this.hasCreateClaim && !this.ro.mutationBlocked());
    readonly canCollectPayment = computed(() => this.auth.hasOperationClaim(PAYMENTS_CREATE_CLAIM) && !this.ro.mutationBlocked());

    readonly periodOptions = CHARGE_SUGGESTION_PERIOD_OPTIONS;
    readonly clientId = signal<string | null>(null);
    readonly period = signal<ChargeSuggestionPeriod>('all');

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly actionError = signal<string | null>(null);
    readonly rows = signal<ChargeSuggestionVm[]>([]);
    readonly totalItems = signal(0);
    readonly converted = signal<ConvertedRow[]>([]);

    private readonly scope = signal<{ petId?: string; examinationId?: string; visitId?: string }>({});
    private readonly busyIds = signal<ReadonlySet<string>>(new Set());

    /** Düzenleyerek çevirme veya ücretsiz sayma diyaloğunun açık olduğu kalem. */
    readonly target = signal<ChargeSuggestionVm | null>(null);
    editVisible = false;
    waiveVisible = false;

    readonly visibleRows = computed(() => filterChargeSuggestions(this.rows(), { clientId: this.clientId(), period: this.period() }));
    readonly contextLabel = computed(() => {
        const s = this.scope();

        if (s.visitId) {
            return 'Seçili ziyaretin kalemleri';
        }

        if (s.examinationId) {
            return 'Seçili muayenenin kalemleri';
        }

        return s.petId ? 'Seçili hastanın kalemleri' : null;
    });
    readonly waiveSummary = computed(() => {
        const t = this.target();

        return t ? `${t.clientName} · ${t.petName} · ${t.description}` : null;
    });

    /** Çevirme denemesi başına kalem için üretilen anahtar; yeniden denemede (aynı alanlar) aynısı gider, alanlar değişince yenisi üretilir. */
    private readonly attempts = new Map<string, { fields: string; requestId: string }>();

    readonly money = (amount: number | null, currency: string) => formatMoney(amount, currency || 'TRY');

    ngOnInit(): void {
        this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((q) => {
            const pick = (key: string) => q.get(key)?.trim() || undefined;

            this.scope.set({ petId: pick('petId'), examinationId: pick('examinationId'), visitId: pick('visitId') });
            this.reload();
        });
    }

    busy(id: string): boolean {
        return this.busyIds().has(id);
    }

    rowAmount(row: ChargeSuggestionVm): string {
        const amount = computeChargeAmount(row.quantity, row.suggestedUnitPrice);

        return amount === null ? '—' : this.money(amount, row.currency);
    }

    paymentQueryParams(charge: ChargeVm): Record<string, string> {
        return { clientId: charge.clientId, chargeId: charge.id, ...(charge.visitId ? { visitId: charge.visitId } : {}) };
    }

    reload(): void {
        this.loading.set(true);
        this.error.set(null);
        this.service.getPending({ page: 1, pageSize: PAGE_SIZE, ...this.scope() }).subscribe({
            next: (r) => {
                this.rows.set(r.items);
                this.totalItems.set(r.totalItems);
                this.loading.set(false);
            },
            error: (e: Error) => {
                this.error.set(e.message ?? 'Yükleme hatası');
                this.loading.set(false);
            }
        });
    }

    clearContext(): void {
        void this.router.navigate([], { relativeTo: this.route, queryParams: {} });
    }

    dismissConverted(chargeId: string): void {
        this.converted.update((rows) => rows.filter((r) => r.charge.id !== chargeId));
    }

    /** Tek tık: boş gövde, kalemdeki değerlerle. */
    convertQuick(row: ChargeSuggestionVm): void {
        if (this.busy(row.id)) {
            return;
        }

        this.actionError.set(null);
        this.setBusy(row.id, true);
        this.convertRequest(row, {}).subscribe({
            next: () => this.setBusy(row.id, false),
            error: (e: unknown) => {
                this.setBusy(row.id, false);
                this.actionError.set(panelHttpFailureMessage(e, 'Ücrete çevrilemedi.'));
                // 409'larda (zaten çevrilmiş/ücretsiz/iptal) kalem artık bekleyen değildir; liste sunucudan yenilenir.
                this.reload();
            }
        });
    }

    openEdit(row: ChargeSuggestionVm): void {
        this.actionError.set(null);
        this.target.set(row);
        this.editVisible = true;
    }

    openWaive(row: ChargeSuggestionVm): void {
        this.actionError.set(null);
        this.target.set(row);
        this.waiveVisible = true;
    }

    readonly convertEdited = (overrides: ChargeSuggestionOverrides): Observable<ChargeCreateResultVm> => this.convertRequest(this.target()!, overrides);
    readonly waive = (reason: string) => this.service.waive(this.target()!.id, reason);

    /** Diyalog işlemi başarıyla bitince liste sunucudan yenilenir (kalem artık bekleyen değil). */
    afterAction(): void {
        this.reload();
    }

    private convertRequest(row: ChargeSuggestionVm, overrides: ChargeSuggestionOverrides): Observable<ChargeCreateResultVm> {
        return this.service.convert(row.id, { ...overrides, requestId: this.requestIdFor(row.id, overrides) }).pipe(
            tap((result) => {
                this.attempts.delete(row.id);
                this.converted.update((rows) => [{ charge: result.charge, created: result.created }, ...rows.filter((r) => r.charge.id !== result.charge.id)].slice(0, RECENT_LIMIT));
                this.rows.update((rows) => rows.filter((r) => r.id !== row.id));
                this.totalItems.update((n) => Math.max(0, n - 1));
            })
        );
    }

    private requestIdFor(id: string, overrides: ChargeSuggestionOverrides): string {
        const fields = JSON.stringify(overrides);
        const current = this.attempts.get(id);

        if (current?.fields === fields) {
            return current.requestId;
        }

        const requestId = crypto.randomUUID();

        this.attempts.set(id, { fields, requestId });

        return requestId;
    }

    private setBusy(id: string, busy: boolean): void {
        this.busyIds.update((ids) => {
            const next = new Set(ids);

            if (busy) {
                next.add(id);
            } else {
                next.delete(id);
            }

            return next;
        });
    }
}
