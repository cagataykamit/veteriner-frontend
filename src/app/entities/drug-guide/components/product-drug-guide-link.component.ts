import { Component, effect, inject, input, signal, untracked, ChangeDetectionStrategy } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import type { LicensedProductVm } from '@/app/entities/drug-guide/models/drug-guide.model';
import { DrugGuideService } from '@/app/entities/drug-guide/services/drug-guide.service';
import { SearchInputComponent } from '@/app/shared/ui/search-input/search-input.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';

/**
 * Ürün kartında ilaç rehberi bağı (REF-001 Dilim 2, ADR-049 K4): bağlı ruhsatlı ürünün olgu bilgisi, adla arayıp
 * kullanıcı onayıyla bağlama ve bağı kaldırma. Etken madde ve hedef tür karta kopyalanmaz, bağdan okunur.
 */
@Component({
    selector: 'app-product-drug-guide-link',
    standalone: true,
    imports: [ButtonModule, SearchInputComponent, AppStatusTagComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section class="card mb-0" aria-labelledby="product-drug-guide-title" data-testid="product-drug-guide">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h5 id="product-drug-guide-title" class="m-0">İlaç rehberi</h5>
                @if (canEdit() && !picking()) {
                    <div class="flex gap-2">
                        <button pButton type="button" size="small" severity="secondary" data-testid="drug-guide-link-open" (click)="openPicker()"><i class="p-button-icon pi pi-link"></i>{{ linked() ? 'Değiştir' : 'Rehberden bağla' }}</button>
                        @if (linked()) {
                            <button pButton type="button" size="small" severity="danger" [text]="true" [disabled]="saving()" data-testid="drug-guide-unlink" (click)="save(null)"><i class="p-button-icon pi pi-times"></i>Bağı kaldır</button>
                        }
                    </div>
                }
            </div>

            @if (error()) {
                <p class="text-danger text-sm mt-0 mb-2" role="alert">{{ error() }}</p>
            }

            @if (picking()) {
                <div data-testid="drug-guide-picker">
                    <label for="dg-link-search" class="block text-sm font-medium text-muted-color mb-2">Ruhsatlı ürün ara</label>
                    <app-search-input inputId="dg-link-search" placeholder="Ürün adı" [(value)]="term" (searchRequested)="search()" />
                    @if (searching()) {
                        <p class="text-sm text-muted-color mb-0">Aranıyor…</p>
                    } @else if (candidates().length === 0) {
                        <p class="text-sm text-muted-color mb-0">Rehberde eşleşen ürün yok.</p>
                    } @else {
                        <ul class="list-none m-0 mt-2 p-0 flex flex-col gap-2">
                            @for (c of candidates(); track c.id) {
                                <li class="flex flex-wrap items-center justify-between gap-2 border-t border-surface-200 dark:border-surface-700 pt-2">
                                    <span class="text-sm">
                                        <span class="font-medium">{{ c.name }}</span>
                                        <span class="text-muted-color"> · {{ ingredientNames(c) }} · {{ c.licenseHolder }}</span>
                                    </span>
                                    <button pButton type="button" size="small" [disabled]="saving()" data-testid="drug-guide-link-pick" (click)="save(c)"><i class="p-button-icon pi pi-check"></i>Bağla</button>
                                </li>
                            }
                        </ul>
                    }
                    <div class="mt-3">
                        <button pButton type="button" size="small" severity="secondary" [text]="true" (click)="picking.set(false)"><i class="p-button-icon pi pi-times"></i>Vazgeç</button>
                    </div>
                </div>
            } @else if (loading()) {
                <p class="m-0 text-sm text-muted-color">Yükleniyor…</p>
            } @else if (linked(); as l) {
                <div class="text-sm" data-testid="drug-guide-linked">
                    <div class="flex flex-wrap items-center gap-2">
                        <span class="font-semibold">{{ l.name }}</span>
                        @if (!l.isListedInSource) {
                            <app-status-tag label="Ruhsat listesinde artık yok" severity="warn" />
                        }
                    </div>
                    <dl class="mt-1 mb-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                        <dt class="text-muted-color">Etken madde</dt>
                        <dd class="m-0">{{ ingredientNames(l) }}</dd>
                        @if (l.targetSpecies.length > 0) {
                            <dt class="text-muted-color">Hedef tür</dt>
                            <dd class="m-0">{{ l.targetSpecies.join(', ') }}</dd>
                        }
                        <dt class="text-muted-color">Ruhsat sahibi</dt>
                        <dd class="m-0">{{ l.licenseHolder }}</dd>
                        @if (l.licenseNumber) {
                            <dt class="text-muted-color">Ruhsat no</dt>
                            <dd class="m-0 tabular-nums">{{ l.licenseNumber }}</dd>
                        }
                    </dl>
                    @if (l.spcUrl) {
                        <a [href]="l.spcUrl" target="_blank" rel="noopener noreferrer" class="inline-block mt-1">Ürün Özellikleri Özeti <i class="pi pi-external-link text-xs" aria-hidden="true"></i></a>
                    }
                </div>
            } @else {
                <p class="m-0 text-sm text-muted-color" data-testid="drug-guide-unlinked">Bu ürün ilaç rehberine bağlı değil. Bağlanırsa reçete ve uygulamada etken madde ve hedef tür bilgisi görünür.</p>
            }
        </section>
    `
})
export class ProductDrugGuideLinkComponent {
    readonly productId = input.required<string>();
    readonly productName = input('');
    readonly licensedProductId = input<string | null>(null);
    readonly canEdit = input(false);

    private readonly service = inject(DrugGuideService);

    readonly linked = signal<LicensedProductVm | null>(null);
    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly error = signal<string | null>(null);
    readonly picking = signal(false);
    readonly searching = signal(false);
    readonly candidates = signal<LicensedProductVm[]>([]);
    term = '';

    constructor() {
        effect(() => {
            const id = this.licensedProductId();

            untracked(() => this.loadLinked(id));
        });
    }

    openPicker(): void {
        this.error.set(null);
        this.term = this.productName();
        this.picking.set(true);
        this.search();
    }

    search(): void {
        this.searching.set(true);
        this.service.searchProducts({ search: this.term, field: 'Product', pageSize: 8 }).subscribe({
            next: (r) => {
                this.candidates.set(r.items);
                this.searching.set(false);
            },
            error: (e: Error) => {
                this.error.set(e.message);
                this.candidates.set([]);
                this.searching.set(false);
            }
        });
    }

    save(target: LicensedProductVm | null): void {
        this.saving.set(true);
        this.error.set(null);
        this.service.linkProduct(this.productId(), target?.id ?? null).subscribe({
            next: () => {
                this.linked.set(target);
                this.picking.set(false);
                this.saving.set(false);
            },
            error: (e: Error) => {
                this.error.set(e.message);
                this.saving.set(false);
            }
        });
    }

    ingredientNames(p: LicensedProductVm): string {
        return p.activeIngredients.map((a) => a.name).join(', ');
    }

    private loadLinked(id: string | null): void {
        this.linked.set(null);

        if (!id) {
            return;
        }

        this.loading.set(true);
        this.service.getProduct(id).subscribe({
            next: (p) => {
                this.linked.set(p);
                this.loading.set(false);
            },
            error: (e: Error) => {
                this.error.set(e.message);
                this.loading.set(false);
            }
        });
    }
}
