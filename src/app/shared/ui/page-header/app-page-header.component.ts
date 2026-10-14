import { CommonModule } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink, UrlTree } from '@angular/router';
import { TooltipModule } from 'primeng/tooltip';
import { categoryForUrl, listLabelForUrl, MENU_GROUPS } from '@/app/core/routing/panel-navigation';

@Component({
    selector: 'app-page-header',
    standalone: true,
    imports: [CommonModule, RouterLink, TooltipModule],
    template: `
        <div class="mb-6">
            @if (categoryLink() && categoryText()) {
                <a
                    [routerLink]="categoryLink()"
                    class="block w-fit text-muted-color hover:text-primary font-medium no-underline mb-2"
                    [pTooltip]="categoryLinkLabel()"
                    tooltipPosition="bottom"
                    [attr.aria-label]="categoryLinkAriaLabel()"
                    data-testid="page-header-category-link"
                >{{ categoryText() }}</a>
            } @else if (categoryText()) {
                <span class="block text-muted-color font-medium mb-2">{{ categoryText() }}</span>
            }
            <div class="flex flex-wrap gap-4 items-center justify-between">
                <div>
                    <div class="text-surface-900 dark:text-surface-0 text-xl font-medium">{{ title() }}</div>
                    @if (description()) {
                        <p class="text-muted-color mt-2 mb-0">{{ description() }}</p>
                    }
                </div>
                <div class="flex flex-wrap gap-2 items-center">
                    <ng-content select="[actions]" />
                </div>
            </div>
        </div>
    `
})
export class AppPageHeaderComponent {
    readonly title = input.required<string>();
    /** Menüde karşılığı olmayan sayfalar için kategori adı; yoksa menü grubundan türetilir. Bağlantının liste adı önce gelir. */
    readonly subtitle = input<string>();
    readonly description = input<string>();
    /**
     * Verilirse kategori satırı bu listeye götüren bağlantı olur ve yazısı hedef listenin menü/sekme adıdır
     * (`listLabelForUrl`); `categoryLinkLabel` ipucu ve erişilebilir ad olur.
     */
    readonly categoryLink = input<string | readonly unknown[] | UrlTree>();
    readonly categoryLinkLabel = input<string>();

    private readonly router = inject(Router);
    private readonly menuCategory = categoryForUrl(MENU_GROUPS, this.router.url);
    private readonly linkListLabel = computed(() => {
        const link = this.categoryLink();
        if (link == null) {
            return undefined;
        }
        const url = typeof link === 'string' ? link : this.router.serializeUrl(link instanceof UrlTree ? link : this.router.createUrlTree([...link]));
        return listLabelForUrl(url);
    });
    private readonly category = computed(() => this.linkListLabel() ?? this.subtitle() ?? this.menuCategory);
    /** Bağlantı varken kategori adı bulunamazsa geri dönüş yolu kaybolmasın diye bağlantı etiketi yazılır. */
    protected readonly categoryText = computed(() => this.category() || (this.categoryLink() ? this.categoryLinkLabel() : undefined));
    /** Erişilebilir ad görünen metni içerir (WCAG 2.5.3); hedef açıklaması ardından gelir. */
    protected readonly categoryLinkAriaLabel = computed(() => {
        const text = this.categoryText();
        const label = this.categoryLinkLabel();
        return label && label !== text ? `${text}: ${label}` : null;
    });
}
