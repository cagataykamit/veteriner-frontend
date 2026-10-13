import { CommonModule } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { categoryForUrl, MENU_GROUPS } from '@/app/core/routing/panel-navigation';

@Component({
    selector: 'app-page-header',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="mb-6">
            @if (category()) {
                <span class="block text-muted-color font-medium mb-2">{{ category() }}</span>
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
    /** Menüde karşılığı olmayan sayfalar için kategori adı; yoksa menü grubundan türetilir. */
    readonly subtitle = input<string>();
    readonly description = input<string>();

    private readonly router = inject(Router);
    private readonly menuCategory = categoryForUrl(MENU_GROUPS, this.router.url);
    protected readonly category = computed(() => this.subtitle() ?? this.menuCategory);
}
