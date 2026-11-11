import { Component, inject, input, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import type { ImportedAccountEntryDto } from '@/app/entities/imported-history/models/imported-history.model';
import { ImportedHistoryService } from '@/app/entities/imported-history/services/imported-history.service';
import { formatImportedDate, IMPORTED_ENTRY_KIND_LABELS } from '@/app/entities/imported-history/utils/imported-history.utils';
import { formatMoney } from '@/app/shared/utils/money.utils';

const PAGE_SIZE = 20;

/**
 * Müşteri kartında eski programdan aktarılan hesap hareketleri (ADR-048 T4). Bilgi amaçlıdır: bakiyeyi, kasayı ve raporları
 * etkilemez (bakiyeye yalnız devir ücreti girer). Hareket yoksa panel hiç görünmez. `Charges.Read` denetimi çağırandadır.
 */
@Component({
    selector: 'app-client-imported-account-entries-panel',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (items().length > 0) {
            <section class="card mb-0 min-w-0" aria-labelledby="client-imported-entries-title" data-testid="client-imported-entries">
                <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-1">
                    <h5 id="client-imported-entries-title" class="m-0">Eski program hareketleri</h5>
                    @if (totals(); as t) {
                        <span class="text-sm text-muted-color ml-auto" data-testid="client-imported-entries-totals">Borç {{ money(t.debit) }} · Tahsilat {{ money(t.credit) }}</span>
                    }
                </div>
                <p class="text-sm text-muted-color mt-0 mb-3">Önceki programdan aktarıldı; yalnız bilgi amaçlıdır, bakiyeyi ve kasayı etkilemez. Açık borç varsa "Devir" ücreti olarak ücretlerde görünür.</p>
                <ul class="list-none m-0 p-0">
                    @for (e of items(); track e.id) {
                        <li class="flex gap-3 items-baseline justify-between py-2 border-b border-surface-200 dark:border-surface-700 last:border-b-0 last:pb-0 min-w-0 text-sm">
                            <div class="min-w-0 break-words">
                                <span class="text-muted-color">{{ date(e.occurredOn) }}</span>
                                <span> · {{ kindLabels[e.kind] ?? e.kind }}</span>
                                @if (e.description) {
                                    <span> · {{ e.description }}</span>
                                }
                                @if (e.petName) {
                                    <span class="text-muted-color"> · {{ e.petName }}</span>
                                }
                                @if (e.paymentMethod) {
                                    <span class="text-muted-color"> · {{ e.paymentMethod }}</span>
                                }
                                @if (e.documentNumber) {
                                    <span class="text-muted-color"> · No {{ e.documentNumber }}</span>
                                }
                            </div>
                            <span class="shrink-0 font-semibold tabular-nums" [class]="e.kind === 'Credit' ? 'text-green-700 dark:text-green-400' : ''">{{ money(e.amount, e.currency) }}</span>
                        </li>
                    }
                </ul>
                @if (error()) {
                    <p class="text-sm text-danger mt-3 mb-0" role="alert">{{ error() }}</p>
                }
                @if (items().length < total()) {
                    <button type="button" class="mt-3 p-0 border-0 bg-transparent text-primary text-sm font-medium cursor-pointer" [disabled]="loading()" (click)="loadMore()" data-testid="client-imported-entries-more">
                        {{ loading() ? 'Yükleniyor…' : 'Daha fazla göster (' + (total() - items().length) + ')' }}
                    </button>
                }
            </section>
        }
    `
})
export class ClientImportedAccountEntriesPanelComponent implements OnInit {
    readonly clientId = input.required<string>();

    private readonly service = inject(ImportedHistoryService);

    readonly items = signal<ImportedAccountEntryDto[]>([]);
    readonly total = signal(0);
    readonly totals = signal<{ debit: number; credit: number } | null>(null);
    readonly loading = signal(false);
    readonly error = signal<string | null>(null);

    readonly kindLabels = IMPORTED_ENTRY_KIND_LABELS;
    readonly date = formatImportedDate;
    readonly money = (amount: number, currency = 'TRY') => formatMoney(amount, currency);

    private page = 0;

    ngOnInit(): void {
        this.loadMore();
    }

    loadMore(): void {
        this.loading.set(true);
        this.service.getClientAccountEntries(this.clientId(), this.page + 1, PAGE_SIZE).subscribe({
            next: (r) => {
                this.page = r.page;
                this.items.update((cur) => [...cur, ...r.items]);
                this.total.set(r.totalItems);
                this.totals.set(r.totals ?? null);
                this.loading.set(false);
            },
            error: (e: Error) => {
                // İlk okuma başarısızsa panel gizli kalır (ek bölümdür; müşteri kartını bozmaz).
                this.error.set(this.items().length > 0 ? e.message : null);
                this.loading.set(false);
            }
        });
    }
}
