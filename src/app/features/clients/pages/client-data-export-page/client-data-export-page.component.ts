import { Component, computed, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import type { ClientDataExportDto } from '@/app/features/clients/models/client-data-export-api.model';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import { clientDataExportBalanceFacts, clientDataExportClientFacts, clientDataExportFileName, clientDataExportJson, clientDataExportKvkkFacts, clientDataExportTables } from '@/app/features/clients/utils/client-data-export.utils';
import { printKvkkForm } from '@/app/features/kvkk/utils/kvkk-form.utils';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { triggerBlobDownload } from '@/app/shared/utils/file-download.utils';

/**
 * Müşteri kartından "Veri kopyası" (ADR-032 madde 2, KVKK bilgi talebi): sunucunun salt okunur kopyası tek belge olarak gösterilir,
 * KVKK belgeleriyle aynı A4 dikey düzende yazdırılır veya olduğu gibi JSON indirilir. Kopya bir kez istenir (sunucu her isteği
 * audit'e yazar); JSON indirme yeni istek atmaz.
 */
@Component({
    selector: 'app-client-data-export-page',
    standalone: true,
    imports: [ButtonModule, AppPageHeaderComponent, AppLoadingStateComponent, AppErrorStateComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        @if (loading()) {
            <app-loading-state message="Veri kopyası hazırlanıyor…" />
        } @else if (error()) {
            <div class="card">
                <app-error-state [detail]="error()!" (retry)="load()" />
            </div>
        } @else if (data(); as d) {
            <div class="kvkk-screen-only">
                <app-page-header [categoryLink]="['/panel/clients', clientId]" categoryLinkLabel="Müşteri kartına dön" [title]="title()" [description]="generatedLine()">
                    <ng-container actions>
                        <p-button type="button" label="JSON indir" icon="pi pi-download" severity="secondary" (onClick)="downloadJson()" data-testid="data-export-json" />
                        <p-button type="button" label="Yazdır" icon="pi pi-print" (onClick)="print()" data-testid="data-export-print" />
                    </ng-container>
                </app-page-header>
            </div>

            <article class="kvkk-form mx-auto max-w-5xl p-6 md:p-8 bg-surface-0 dark:bg-surface-900 border border-surface rounded-border" aria-label="Veri kopyası">
                <header class="mb-6">
                    <h2 class="m-0 text-xl font-semibold" data-testid="data-export-title">{{ title() }}</h2>
                    <p class="m-0 mt-1 text-sm text-muted-color" data-testid="data-export-generated">{{ generatedLine() }}</p>
                </header>

                @for (group of factGroups(); track group.title) {
                    <section class="kvkk-form-block mb-6" [attr.aria-label]="group.title">
                        <h3 class="m-0 mb-2 text-base font-semibold">{{ group.title }}</h3>
                        <dl class="grid grid-cols-[14rem_minmax(0,1fr)] gap-x-4 gap-y-1 m-0 text-sm">
                            @for (f of group.facts; track f.label) {
                                <dt class="text-muted-color">{{ f.label }}</dt>
                                <dd class="m-0 break-words">{{ f.value }}</dd>
                            }
                        </dl>
                    </section>
                }

                @for (t of tables(); track t.key) {
                    <section class="data-export-section mb-6" [attr.aria-label]="t.title" [attr.data-testid]="'data-export-' + t.key">
                        <h3 class="m-0 mb-2 text-base font-semibold">{{ t.title }} ({{ t.rows.length }})</h3>
                        @if (t.isTruncated) {
                            <p class="m-0 mb-2 text-sm font-medium text-amber-800 dark:text-amber-300" role="note" data-testid="data-export-truncated">
                                Kayıt sayısı üst sınırı ({{ d.maxRowsPerSection }}) aştı; yalnız en yeni {{ d.maxRowsPerSection }} kayıt gösteriliyor.
                            </p>
                        }
                        @if (t.rows.length) {
                            <div class="overflow-x-auto">
                                <table class="data-export-table w-full text-sm border-collapse">
                                    <thead>
                                        <tr>
                                            @for (col of t.columns; track col) {
                                                <th class="text-left font-semibold px-2 py-1 border-b border-surface">{{ col }}</th>
                                            }
                                        </tr>
                                    </thead>
                                    <tbody>
                                        @for (row of t.rows; track $index) {
                                            <tr>
                                                @for (cell of row; track $index) {
                                                    <td class="align-top px-2 py-1 border-b border-surface break-words">{{ cell }}</td>
                                                }
                                            </tr>
                                        }
                                    </tbody>
                                </table>
                            </div>
                        } @else {
                            <p class="m-0 text-sm text-muted-color">Kayıt yok.</p>
                        }
                    </section>
                }
            </article>
        }
    `
})
export class ClientDataExportPageComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly clientsService = inject(ClientsService);

    readonly clientId = this.route.snapshot.paramMap.get('id') ?? '';

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly data = signal<ClientDataExportDto | null>(null);

    readonly title = computed(() => `Veri kopyası — ${this.data()?.client.fullName ?? ''}`);
    readonly generatedLine = computed(() => {
        const d = this.data();

        return d ? `Üretim tarihi: ${formatUtcIsoAsLocalDateTimeDisplay(d.generatedAtUtc)}` : '';
    });
    readonly factGroups = computed(() => {
        const d = this.data();

        return d
            ? [
                  { title: 'Müşteri bilgileri', facts: clientDataExportClientFacts(d) },
                  { title: 'KVKK açık rıza', facts: clientDataExportKvkkFacts(d) },
                  { title: 'Bakiye', facts: clientDataExportBalanceFacts(d) }
              ]
            : [];
    });
    readonly tables = computed(() => {
        const d = this.data();

        return d ? clientDataExportTables(d) : [];
    });

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        if (!this.clientId) {
            this.error.set('Geçersiz müşteri.');
            this.loading.set(false);

            return;
        }

        this.loading.set(true);
        this.error.set(null);
        this.clientsService.getClientDataExport(this.clientId).subscribe({
            next: (dto) => {
                this.data.set(dto);
                this.loading.set(false);
            },
            error: (e: Error) => {
                this.error.set(e.message || 'Veri kopyası hazırlanamadı.');
                this.loading.set(false);
            }
        });
    }

    print(): void {
        printKvkkForm();
    }

    downloadJson(): void {
        const d = this.data();

        if (d) {
            triggerBlobDownload(new Blob([clientDataExportJson(d)], { type: 'application/json' }), clientDataExportFileName());
        }
    }
}
