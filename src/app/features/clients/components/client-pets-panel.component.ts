import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ClientPetRow } from '@/app/features/clients/utils/client-card.utils';
import type { PetCardSection } from '@/app/features/pets/utils/pet-card.utils';
import { formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { formatMoney } from '@/app/shared/utils/money.utils';

/**
 * Müşteri kartındaki hayvanlar (ADR-020 karar 6): her satırda hasta kartına bağlantı, kimlik ve hayvana düşen borç,
 * ücret bekleyen işlem ve sonraki randevu. Hayvan durumu (aktif/vefat) sözleşmede yok; durum süzgeci o alan gelince eklenir.
 */
@Component({
    selector: 'app-client-pets-panel',
    standalone: true,
    imports: [RouterLink],
    template: `
        <section class="card mb-0 h-full" aria-labelledby="client-pets-title" data-testid="client-pets">
            <div class="flex items-center gap-2 mb-3">
                <h5 id="client-pets-title" class="m-0">Hayvanlar</h5>
                @if (rows()?.state === 'ok') {
                    <span class="text-sm font-medium text-muted-color" data-testid="pets-count">({{ okRows().length }})</span>
                }
                <a routerLink="/panel/pets" [queryParams]="{ clientId: clientId() }" class="ml-auto text-primary font-medium no-underline text-sm">Tümü →</a>
            </div>

            @switch (rows()?.state) {
                @case ('ok') {
                    @if (okRows().length > 0) {
                        <ul class="list-none m-0 p-0">
                            @for (row of okRows(); track row.pet.id) {
                                <li class="py-2 border-b border-surface-200 dark:border-surface-700 last:border-b-0 min-w-0" data-testid="client-pet-row">
                                    <div class="flex flex-wrap items-baseline gap-x-2">
                                        <a [routerLink]="['/panel/pets', row.pet.id]" class="text-primary font-medium no-underline break-words">{{ row.pet.name }}</a>
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
                                                    ><i class="pi pi-calendar text-xs mr-1" aria-hidden="true"></i>{{ formatDt(a.scheduledAtUtc) }}</a
                                                >
                                            }
                                        </div>
                                    }
                                </li>
                            }
                        </ul>
                    } @else {
                        <p class="m-0 text-muted-color" data-testid="pets-empty">Bu müşteriye kayıtlı hayvan yok.</p>
                    }
                }
                @case ('error') {
                    <p class="m-0 text-orange-600 dark:text-orange-400 text-sm" data-testid="pets-failed">
                        <i class="pi pi-exclamation-triangle mr-1" aria-hidden="true"></i>Hayvan listesi alınamadı.
                    </p>
                }
                @case ('loading') {
                    <p class="m-0 text-muted-color text-sm">Yükleniyor…</p>
                }
                @default {
                    <p class="m-0 text-muted-color text-sm"><i class="pi pi-lock mr-1" aria-hidden="true"></i>Hayvanları görme yetkiniz yok.</p>
                }
            }
        </section>
    `
})
export class ClientPetsPanelComponent {
    readonly rows = input.required<PetCardSection<ClientPetRow[]>>();
    readonly clientId = input.required<string>();
    readonly currency = input('TRY');

    readonly formatDt = (v: string | null) => formatUtcIsoAsLocalDateTimeDisplay(v);
    readonly money = (amount: number) => formatMoney(amount, this.currency());

    okRows(): ClientPetRow[] {
        const r = this.rows();
        return r?.state === 'ok' ? r.data : [];
    }

    identity(row: ClientPetRow): string {
        const filled = (v: string | null | undefined): v is string => !!v && !!v.trim() && v.trim() !== '—';
        return [row.pet.speciesName, row.pet.breed, row.pet.colorName].filter(filled).join(' · ');
    }

    hasHints(row: ClientPetRow): boolean {
        return !!row.outstandingAmount || !!row.pendingChargeCount || !!row.nextAppointment;
    }
}
