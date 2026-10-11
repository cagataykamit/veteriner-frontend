import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Alan genişliği: `date` ≈ tarih alanı, `select` ≈ açılır kutu, `grow` kalan satırı doldurur. */
export type FilterFieldWidth = 'date' | 'select' | 'grow';

const WIDTH_CLASSES: Record<FilterFieldWidth, string> = {
    date: 'w-full sm:w-[13rem]',
    select: 'w-full sm:w-[16rem]',
    grow: 'w-full sm:flex-1 sm:min-w-[14rem]'
};

/**
 * Liste filtre çubuğu alanı (tüm liste/rapor ekranlarında ortak): etiket + alan, çerçevesiz; etkin filtre etiketi renklendirir ve
 * "Aktif" rozeti gösterir. Çerçeve ve satır düzeni kapsayıcıdadır (tek çerçeve, `flex flex-wrap items-end gap-3`).
 * `labelFor` girdi kimliğine, `labelId` ise `ariaLabelledBy` kullanan seçicilere bağlanır.
 */
@Component({
    selector: 'app-filter-field',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { '[class]': 'hostClass()' },
    template: `
        @if (labelFor(); as target) {
            <label [attr.for]="target" class="flex items-center gap-2 text-xs font-medium mb-1" [class]="labelTone()">
                {{ label() }}
                @if (active()) {
                    <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-primary-100 text-primary-800 dark:bg-primary-800/70 dark:text-primary-100">Aktif</span>
                }
            </label>
        } @else {
            <span [attr.id]="labelId() || null" class="flex items-center gap-2 text-xs font-medium mb-1" [class]="labelTone()">
                {{ label() }}
                @if (active()) {
                    <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-primary-100 text-primary-800 dark:bg-primary-800/70 dark:text-primary-100">Aktif</span>
                }
            </span>
        }
        <ng-content />
    `
})
export class FilterFieldComponent {
    readonly label = input.required<string>();
    readonly labelFor = input<string>('');
    readonly labelId = input<string>('');
    readonly active = input(false);
    readonly width = input<FilterFieldWidth>('grow');

    protected readonly hostClass = computed(() => `block min-w-0 ${WIDTH_CLASSES[this.width()]}`);
    protected readonly labelTone = computed(() => (this.active() ? 'text-primary-800 dark:text-primary-200' : 'text-muted-color'));
}
