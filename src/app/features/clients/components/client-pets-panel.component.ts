import { Component, computed, input, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ClientPetRow } from '@/app/features/clients/utils/client-card.utils';
import type { PetCardSection } from '@/app/entities/patient/utils/pet-card.utils';
import { formatMoney } from '@/app/shared/utils/money.utils';
import { TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';

/**
 * Müşteri kartındaki hayvanlar (ADR-020 karar 6): her satırda hasta kartına bağlantı, kimlik ve hayvana düşen borç,
 * ücret bekleyen işlem ve sonraki randevu. Durum süzgeci: varsayılan "Aktif"; vefat eden varsa "Tümü" ile soluk satır ve rozetle görünür.
 * Liste bir kez (durum süzgeçsiz) okunur; süzgeç istemcide uygulanır (müşteri başına hayvan sayısı küçük).
 */
@Component({
    selector: 'app-client-pets-panel',
    standalone: true,
    imports: [RouterLink, TrDateTimePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section class="card mb-0 h-full" aria-labelledby="client-pets-title" data-testid="client-pets">
            <div class="flex flex-wrap items-center gap-2 mb-3">
                <h5 id="client-pets-title" class="m-0">Hastalar</h5>
                @if (rows()?.state === 'ok') {
                    <span class="text-sm font-medium text-muted-color" data-testid="pets-count">({{ visibleRows().length }})</span>
                    @if (deceasedCount() > 0) {
                        <div class="flex gap-1 text-sm" role="group" aria-label="Hasta durumu süzgeci">
                            <button
                                type="button"
                                class="px-2 py-0.5 rounded-border border cursor-pointer"
                                [class]="showAll() ? 'border-transparent bg-transparent text-muted-color' : 'border-primary text-primary bg-transparent font-medium'"
                                [attr.aria-pressed]="!showAll()"
                                data-testid="pets-filter-active"
                                (click)="showAll.set(false)"
                            >
                                Aktif ({{ okRows().length - deceasedCount() }})
                            </button>
                            <button
                                type="button"
                                class="px-2 py-0.5 rounded-border border cursor-pointer"
                                [class]="showAll() ? 'border-primary text-primary bg-transparent font-medium' : 'border-transparent bg-transparent text-muted-color'"
                                [attr.aria-pressed]="showAll()"
                                data-testid="pets-filter-all"
                                (click)="showAll.set(true)"
                            >
                                Tümü ({{ okRows().length }})
                            </button>
                        </div>
                    }
                }
                <a routerLink="/panel/pets" [queryParams]="{ clientId: clientId() }" class="ml-auto text-primary font-medium no-underline text-sm">Tümü →</a>
            </div>

            @switch (rows()?.state) {
                @case ('ok') {
                    @if (visibleRows().length > 0) {
                        <ul class="list-none m-0 p-0">
                            @for (row of visibleRows(); track row.pet.id) {
                                <li class="py-2 border-b border-surface-200 dark:border-surface-700 last:border-b-0 min-w-0" [class.opacity-70]="row.pet.status === 'Deceased'" data-testid="client-pet-row">
                                    <div class="flex flex-wrap items-baseline gap-x-2">
                                        <a [routerLink]="['/panel/pets', row.pet.id]" class="text-primary font-medium no-underline break-words">{{ row.pet.name }}</a>
                                        @if (row.pet.status === 'Deceased') {
                                            <span class="text-xs font-medium text-muted-color border border-surface-300 dark:border-surface-600 rounded-border px-1.5 py-0.5" data-testid="pet-deceased">Vefat</span>
                                        }
                                        <span class="text-muted-color text-sm break-words">{{ identity(row) }}</span>
                                    </div>
                                    @if (hasHints(row)) {
                                        <div class="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm">
                                            @if (row.outstandingAmount) {
                                                <span class="font-medium text-red-600 dark:text-red-400 tabular-nums" data-testid="pet-outstanding">Borç {{ money(row.outstandingAmount) }}</span>
                                            }
                                            @if (row.pendingChargeCount) {
                                                <span class="font-medium text-amber-700 dark:text-amber-400" data-testid="pet-pending">{{ row.pendingChargeCount }} işlem ücret bekliyor</span>
                                            }
                                            @if (row.nextAppointment; as a) {
                                                <a [routerLink]="['/panel/appointments', a.id]" class="text-primary no-underline" data-testid="pet-next-appointment"
                                                    ><i class="pi pi-calendar text-xs mr-1" aria-hidden="true"></i>{{ a.scheduledAtUtc | trDateTime }}</a
                                                >
                                            }
                                        </div>
                                    }
                                </li>
                            }
                        </ul>
                    } @else if (deceasedCount() > 0) {
                        <p class="m-0 text-muted-color" data-testid="pets-no-active">Aktif hasta yok; vefat eden hastalar "Tümü" altında.</p>
                    } @else {
                        <p class="m-0 text-muted-color" data-testid="pets-empty">Bu müşteriye kayıtlı hasta yok.</p>
                    }
                }
                @case ('error') {
                    <p class="m-0 text-orange-600 dark:text-orange-400 text-sm" data-testid="pets-failed"><i class="pi pi-exclamation-triangle mr-1" aria-hidden="true"></i>Hasta listesi alınamadı.</p>
                }
                @case ('loading') {
                    <p class="m-0 text-muted-color text-sm">Yükleniyor…</p>
                }
                @default {
                    <p class="m-0 text-muted-color text-sm"><i class="pi pi-lock mr-1" aria-hidden="true"></i>Hastaları görme yetkiniz yok.</p>
                }
            }
        </section>
    `
})
export class ClientPetsPanelComponent {
    readonly rows = input.required<PetCardSection<ClientPetRow[]>>();
    readonly clientId = input.required<string>();
    readonly currency = input('TRY');

    /** Varsayılan "Aktif" (sözleşme §5.3); vefat eden yoksa süzgeç gösterilmez. */
    readonly showAll = signal(false);

    readonly okRows = computed(() => {
        const r = this.rows();

        return r?.state === 'ok' ? r.data : [];
    });
    readonly deceasedCount = computed(() => this.okRows().filter((r) => r.pet.status === 'Deceased').length);
    readonly visibleRows = computed(() => (this.showAll() ? this.okRows() : this.okRows().filter((r) => r.pet.status !== 'Deceased')));

    readonly money = (amount: number) => formatMoney(amount, this.currency());

    identity(row: ClientPetRow): string {
        const filled = (v: string | null | undefined): v is string => !!v && !!v.trim() && v.trim() !== '—';

        return [row.pet.speciesName, row.pet.breed, row.pet.colorName].filter(filled).join(' · ');
    }

    hasHints(row: ClientPetRow): boolean {
        return !!row.outstandingAmount || !!row.pendingChargeCount || !!row.nextAppointment;
    }
}
