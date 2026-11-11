import { Component, inject, input, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import type { ImportedClinicalRecordDto } from '@/app/entities/imported-history/models/imported-history.model';
import { ImportedHistoryService } from '@/app/entities/imported-history/services/imported-history.service';
import { formatImportedDate, importedRecordFields, importedRecordSummary, importedRecordTypeLabel } from '@/app/entities/imported-history/utils/imported-history.utils';

const PAGE_SIZE = 10;

/**
 * Hasta kartında eski programdan aktarılan klinik kayıtlar (ADR-048 T1). Salt okunurdur; kayıt yoksa bölüm hiç görünmez
 * (çoğu hastada yoktur). Okuma yetkisi (`Examinations.Read`) denetimi çağırandadır.
 */
@Component({
    selector: 'app-pet-imported-records-section',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (items().length > 0) {
            <section class="card mb-0" aria-labelledby="pet-imported-title" data-testid="pet-imported-records">
                <h5 id="pet-imported-title" class="mt-0 mb-1">Eski program kayıtları</h5>
                <p class="text-sm text-muted-color mt-0 mb-3">Önceki programdan aktarıldı; salt okunurdur ve muayene defterine girmez.</p>
                <ul class="list-none m-0 p-0">
                    @for (r of items(); track r.id) {
                        <li class="py-3 border-b border-surface-200 dark:border-surface-700 last:border-b-0">
                            <button
                                type="button"
                                class="w-full p-0 border-0 bg-transparent text-left text-color cursor-pointer flex flex-wrap items-baseline gap-x-2"
                                [attr.aria-expanded]="open() === r.id"
                                (click)="toggle(r.id)"
                                data-testid="imported-record-toggle"
                            >
                                <span class="text-sm text-muted-color">{{ date(r.recordedOn) }}</span>
                                <span class="font-medium">{{ typeLabel(r) }}</span>
                                @if (r.veterinarianName) {
                                    <span class="text-sm text-muted-color">· {{ r.veterinarianName }}</span>
                                }
                                @if (summary(r); as s) {
                                    <span class="text-sm text-muted-color basis-full break-words line-clamp-2">{{ s }}</span>
                                }
                            </button>
                            @if (open() === r.id) {
                                <dl class="m-0 mt-2 flex flex-col gap-2 text-sm" data-testid="imported-record-detail">
                                    @for (f of fields(r); track f.label) {
                                        <div>
                                            <dt class="text-muted-color">{{ f.label }}</dt>
                                            <dd class="m-0 whitespace-pre-wrap break-words">{{ f.value }}</dd>
                                        </div>
                                    }
                                    @if (r.weightKg !== null || r.temperatureC !== null) {
                                        <div>
                                            <dt class="text-muted-color">Ölçümler</dt>
                                            <dd class="m-0">
                                                @if (r.weightKg !== null) {
                                                    <span>Kilo {{ r.weightKg }} kg</span>
                                                }
                                                @if (r.weightKg !== null && r.temperatureC !== null) {
                                                    <span> · </span>
                                                }
                                                @if (r.temperatureC !== null) {
                                                    <span>Ateş {{ r.temperatureC }} °C</span>
                                                }
                                            </dd>
                                        </div>
                                    }
                                </dl>
                            }
                        </li>
                    }
                </ul>
                @if (error()) {
                    <p class="text-sm text-danger mt-3 mb-0" role="alert">{{ error() }}</p>
                }
                @if (items().length < total()) {
                    <button type="button" class="mt-3 p-0 border-0 bg-transparent text-primary text-sm font-medium cursor-pointer" [disabled]="loading()" (click)="loadMore()" data-testid="imported-records-more">
                        {{ loading() ? 'Yükleniyor…' : 'Daha fazla göster (' + (total() - items().length) + ')' }}
                    </button>
                }
            </section>
        }
    `
})
export class PetImportedRecordsSectionComponent implements OnInit {
    readonly petId = input.required<string>();

    private readonly service = inject(ImportedHistoryService);

    readonly items = signal<ImportedClinicalRecordDto[]>([]);
    readonly total = signal(0);
    readonly loading = signal(false);
    readonly error = signal<string | null>(null);
    readonly open = signal<string | null>(null);

    readonly date = formatImportedDate;
    readonly typeLabel = importedRecordTypeLabel;
    readonly summary = importedRecordSummary;
    readonly fields = importedRecordFields;

    private page = 0;

    ngOnInit(): void {
        this.loadMore();
    }

    toggle(id: string): void {
        this.open.set(this.open() === id ? null : id);
    }

    loadMore(): void {
        this.loading.set(true);
        this.service.getPetClinicalRecords(this.petId(), this.page + 1, PAGE_SIZE).subscribe({
            next: (r) => {
                this.page = r.page;
                this.items.update((cur) => [...cur, ...r.items]);
                this.total.set(r.totalItems);
                this.loading.set(false);
            },
            error: (e: Error) => {
                // İlk okuma başarısızsa bölüm gizli kalır (ek bölümdür; hasta kartının geri kalanını bozmaz).
                this.error.set(this.items().length > 0 ? e.message : null);
                this.loading.set(false);
            }
        });
    }
}
