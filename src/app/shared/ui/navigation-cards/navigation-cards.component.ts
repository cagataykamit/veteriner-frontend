import { NgTemplateOutlet } from '@angular/common';
import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { CardEntry } from '@/app/core/routing/panel-navigation';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';

/**
 * Ayarlar, Tanımlar ve Rapor Merkezi sayfalarında ortak kart ızgarası. `favoriteRoutes` verilirse (Rapor Merkezi) her kartın
 * köşesinde yıldız düğmesi görünür ve `favoriteToggle` kartın adresini yayar; düğme bağlantının dışındadır (iç içe etkileşim yok).
 */
@Component({
    selector: 'app-navigation-cards',
    standalone: true,
    imports: [RouterLink, NgTemplateOutlet],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <ng-template #card let-entry let-padded="padded">
            <a [routerLink]="entry.route" class="card !mb-0 flex items-start gap-4 no-underline text-color hover:bg-emphasis transition-colors" [class.h-full]="padded" [class.pr-12]="padded">
                <i [class]="entry.icon + ' text-2xl text-primary'"></i>
                <div class="min-w-0">
                    <div class="font-medium">{{ entry.label }}</div>
                    <p class="text-muted-color mt-1 mb-0">{{ entry.description }}</p>
                </div>
            </a>
        </ng-template>

        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            @for (entry of entries(); track entry.route) {
                @if (favoriteRoutes(); as favorites) {
                    @let isFavorite = favorites.has(entry.route);
                    <div class="relative">
                        <ng-container [ngTemplateOutlet]="card" [ngTemplateOutletContext]="{ $implicit: entry, padded: true }" />
                        <button
                            type="button"
                            class="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full border-0 bg-transparent cursor-pointer hover:bg-emphasis"
                            [class.text-amber-500]="isFavorite"
                            [class.text-muted-color]="!isFavorite"
                            [attr.aria-pressed]="isFavorite"
                            [attr.aria-label]="(isFavorite ? favoriteRemoveLabel : favoriteAddLabel) + ': ' + entry.label"
                            [title]="isFavorite ? favoriteRemoveLabel : favoriteAddLabel"
                            data-testid="favorite-toggle"
                            (click)="favoriteToggle.emit(entry.route)"
                        >
                            <i [class]="isFavorite ? 'pi pi-star-fill' : 'pi pi-star'" aria-hidden="true"></i>
                        </button>
                    </div>
                } @else {
                    <ng-container [ngTemplateOutlet]="card" [ngTemplateOutletContext]="{ $implicit: entry, padded: false }" />
                }
            }
        </div>
    `
})
export class NavigationCardsComponent {
    readonly entries = input.required<readonly CardEntry[]>();

    /** Favori kartların adresleri; `null` ise yıldız düğmesi yok (Ayarlar, Tanımlar). */
    readonly favoriteRoutes = input<ReadonlySet<string> | null>(null);

    readonly favoriteToggle = output<string>();

    protected readonly favoriteAddLabel = PANEL_COPY.reportsFavoriteAdd;
    protected readonly favoriteRemoveLabel = PANEL_COPY.reportsFavoriteRemove;
}
