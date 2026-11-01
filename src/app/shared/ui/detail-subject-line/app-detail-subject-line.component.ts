import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { speciesEmoji } from '@/app/shared/utils/species-icon.utils';

const EM = '—';

/**
 * Kimlik kartındaki "Hasta: 🐈 Pamuk · Kedi   Sahip: Ayşe Yılmaz" satırı (randevu, tedavi, reçete, aşı …).
 * Kimlik varsa bağlantı, yoksa düz ad; ad boşsa "—". Tür adı verilirse simge ve tür yazılır.
 */
@Component({
    selector: 'app-detail-subject-line',
    standalone: true,
    imports: [RouterLink],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <p class="m-0 mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 wrap-anywhere [&>*]:min-w-0" aria-label="Hasta ve sahip" data-testid="detail-subject-line">
            @if (showPet()) {
                <span class="min-w-0">
                    <span class="text-muted-color">Hasta:</span>
                    @if (speciesName()) {
                        <span class="ml-1" [title]="speciesName()" aria-hidden="true">{{ speciesIcon() }}</span>
                    }
                    @if (petId()) {
                        <a [routerLink]="['/panel/pets', petId()]" class="text-primary font-semibold no-underline ml-1">{{ petLabel() }}</a>
                    } @else {
                        <span class="ml-1 font-medium">{{ petLabel() }}</span>
                    }
                    @if (speciesName()) {
                        <span class="text-muted-color text-sm"> · {{ speciesName() }}</span>
                    }
                </span>
            }
            <span class="min-w-0">
                <span class="text-muted-color">Sahip:</span>
                @if (clientId()) {
                    <a [routerLink]="['/panel/clients', clientId()]" class="text-primary font-medium no-underline ml-1">{{ clientLabel() }}</a>
                } @else {
                    <span class="ml-1">{{ clientLabel() }}</span>
                }
            </span>
            <ng-content />
        </p>
    `
})
export class AppDetailSubjectLineComponent {
    readonly petId = input<string | null | undefined>(null);
    readonly petName = input<string | null | undefined>(null);
    readonly speciesName = input<string | null | undefined>(null);
    readonly clientId = input<string | null | undefined>(null);
    readonly clientName = input<string | null | undefined>(null);
    /** Hasta bölümü yalnız ad ya da kimlik varsa çizilir (ör. satış: yalnız müşteri). */
    readonly showPet = computed(() => !!this.petId() || !!this.petName()?.trim());

    readonly petLabel = computed(() => this.petName()?.trim() || EM);
    readonly clientLabel = computed(() => this.clientName()?.trim() || EM);
    readonly speciesIcon = computed(() => speciesEmoji(this.speciesName()));
}
