import { ChangeDetectionStrategy, Component, computed, contentChild, effect, input, signal } from '@angular/core';
import { NgModel } from '@angular/forms';
import { Select } from 'primeng/select';
import { SelectButton } from 'primeng/selectbutton';
import { formatDateDisplay } from '@/app/shared/utils/date.utils';

/** Alan genişliği: `date` ≈ tarih alanı, `select` ≈ açılır kutu, `grow` kalan satırı doldurur. */
export type FilterFieldWidth = 'date' | 'select' | 'grow';

const WIDTH_CLASSES: Record<FilterFieldWidth, string> = {
    date: 'w-full sm:w-[13rem]',
    select: 'w-full sm:w-[16rem]',
    grow: 'w-full sm:flex-1 sm:min-w-[14rem]'
};

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Seçenekli denetim (açılır kutu, seçim düğmeleri): seçili değerin görünen adı buradan okunur. */
type OptionControl = Pick<Select, 'options' | 'getOptionLabel' | 'getOptionValue'> | Pick<SelectButton, 'options' | 'getOptionLabel' | 'getOptionValue'>;

/** Alanın değerinin kısa yazımı (kapalı filtre panelindeki özet için): seçenek adı, gün.ay.yıl ya da düz metin; boşsa `null`. */
function displayValue(value: unknown, control: OptionControl | undefined): string | null {
    if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) {
        return null;
    }

    if (control) {
        const option = (control.options() ?? []).find((o: unknown) => control.getOptionValue(o) === value);

        return option == null ? null : String(control.getOptionLabel(option));
    }

    if (typeof value === 'string') {
        return ISO_DAY.test(value) ? formatDateDisplay(value) : value;
    }

    return typeof value === 'number' ? String(value) : null;
}

/**
 * Liste filtre çubuğu alanı (tüm liste/rapor ekranlarında ortak): etiket + alan, çerçevesiz; etkin filtre etiketi renklendirir ve
 * "Aktif" rozeti gösterir. Çerçeve ve satır düzeni kapsayıcıdadır (`app-list-filters`).
 * `labelFor` girdi kimliğine, `labelId` ise `ariaLabelledBy` kullanan seçicilere bağlanır.
 * Telefondaki kapalı filtre paneli etkin alanları tek satırda özetler (G-02): `summaryText` ("Durum: Planlandı"); değer alanın
 * `ngModel`'inden okunur, seçenekli denetimde seçeneğin adı yazılır, okunamıyorsa yalnız etiket.
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
                @if (showBadge()) {
                    <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-primary-100 text-primary-800 dark:bg-primary-800/70 dark:text-primary-100">Aktif</span>
                }
            </label>
        } @else {
            <span [attr.id]="labelId() || null" class="flex items-center gap-2 text-xs font-medium mb-1" [class]="labelTone()">
                {{ label() }}
                @if (showBadge()) {
                    <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-primary-100 text-primary-800 dark:bg-primary-800/70 dark:text-primary-100">Aktif</span>
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
    /** Alan varsayılan değerinden farklı: filtre sayısına ve özete girer. */
    readonly active = input(false);
    /** "Aktif" rozeti ve etiket rengi (sade ekranlarda kapatılır; sayım ve özet yine `active`'e bakar). */
    readonly badge = input(true);
    readonly width = input<FilterFieldWidth>('grow');

    private readonly model = contentChild(NgModel, { descendants: true });
    private readonly select = contentChild(Select, { descendants: true });
    private readonly selectButton = contentChild(SelectButton, { descendants: true });
    private readonly value = signal<unknown>(null);

    protected readonly showBadge = computed(() => this.active() && this.badge());
    protected readonly hostClass = computed(() => `block min-w-0 ${WIDTH_CLASSES[this.width()]}`);
    protected readonly labelTone = computed(() => (this.showBadge() ? 'text-primary-800 dark:text-primary-200' : 'text-muted-color'));

    /** Kapalı paneldeki özet parçası: "Durum: Planlandı", değer okunamazsa "Durum". */
    readonly summaryText = computed(() => {
        const shown = displayValue(this.value(), this.select() ?? this.selectButton());

        return shown ? `${this.label()}: ${shown}` : this.label();
    });

    constructor() {
        effect((onCleanup) => {
            const model = this.model();

            if (!model) {
                return;
            }

            this.value.set(model.value);
            const sub = model.valueChanges?.subscribe((v: unknown) => this.value.set(v));

            onCleanup(() => sub?.unsubscribe());
        });
    }
}
