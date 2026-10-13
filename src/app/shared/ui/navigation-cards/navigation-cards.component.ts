import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { CardEntry } from '@/app/core/routing/panel-navigation';

/** Ayarlar, Tanımlar ve Rapor Merkezi sayfalarında ortak kart ızgarası. */
@Component({
    selector: 'app-navigation-cards',
    standalone: true,
    imports: [RouterLink],
    template: `
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            @for (entry of entries(); track entry.route) {
                <a
                    [routerLink]="entry.route"
                    class="card !mb-0 flex items-start gap-4 no-underline text-color hover:bg-emphasis transition-colors"
                >
                    <i [class]="entry.icon + ' text-2xl text-primary'"></i>
                    <div class="min-w-0">
                        <div class="font-medium">{{ entry.label }}</div>
                        <p class="text-muted-color mt-1 mb-0">{{ entry.description }}</p>
                    </div>
                </a>
            }
        </div>
    `
})
export class NavigationCardsComponent {
    readonly entries = input.required<readonly CardEntry[]>();
}
