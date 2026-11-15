import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { formatCount } from '@/app/features/imports/utils/import-review.utils';

/**
 * Aktarılacak / bilerek atlanacak / aktarılamayacak oranını gösteren çubuk (Adım 3).
 * Renkler sonuç noktalarıyla aynıdır; çok küçük dilim de görünür kalsın diye en az 6 px.
 */
@Component({
    selector: 'app-import-outcome-bar',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'block' },
    template: `
        <div class="flex w-full overflow-hidden rounded-full gap-[2px]" [class]="thin() ? 'h-1.5' : 'h-3'" role="img" [attr.aria-label]="label()">
            @if (importable() > 0) {
                <span class="bg-primary min-w-[6px] basis-0" [style.flex-grow]="importable()"></span>
            }
            @if (skipped() > 0) {
                <span class="bg-surface-300 dark:bg-surface-600 min-w-[6px] basis-0" [style.flex-grow]="skipped()"></span>
            }
            @if (errors() > 0) {
                <span class="bg-amber-500 min-w-[6px] basis-0" [style.flex-grow]="errors()"></span>
            }
        </div>
    `
})
export class ImportOutcomeBarComponent {
    readonly importable = input.required<number>();
    readonly skipped = input.required<number>();
    readonly errors = input.required<number>();
    readonly thin = input(false);

    protected readonly label = computed(() => `${formatCount(this.importable())} aktarılacak, ${formatCount(this.skipped())} bilerek atlanacak, ${formatCount(this.errors())} aktarılamayacak`);
}
