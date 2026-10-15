import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, ElementRef, forwardRef, inject, input, signal, viewChild } from '@angular/core';
import { AbstractControl, ControlValueAccessor, FormsModule, NG_VALIDATORS, NG_VALUE_ACCESSOR, ValidationErrors, Validator } from '@angular/forms';
import { DatePicker, DatePickerModule } from 'primeng/datepicker';
import { DateInputLimit, resolveLimitMax } from '@/app/shared/forms/date-input/date-input-limits.utils';
import {
    applyDateMask,
    DateInputType,
    formatDateInputDisplay,
    formatDateInputValue,
    isDateWithoutTime,
    parseDateInputValue
} from '@/app/shared/forms/date-input/date-input-value.utils';

const PLACEHOLDERS: Record<DateInputType, string> = {
    date: 'gg.aa.yyyy',
    'datetime-local': 'gg.aa.yyyy ss:dd',
    time: 'ss:dd'
};

const INVALID_MESSAGES: Record<DateInputType, string> = {
    date: 'Geçerli bir tarih girin (gg.aa.yyyy).',
    'datetime-local': 'Geçerli bir tarih ve saat girin (gg.aa.yyyy ss:dd).',
    time: 'Geçerli bir saat girin (ss:dd).'
};

const TIME_MISSING_MESSAGE = 'Saati de girin (gg.aa.yyyy ss:dd).';

/** PrimeNG DatePicker'ın bu bileşenin kapatma/sorgulama için kullandığı iç alanları (genel API yalnız `hideOverlay` verir, o da odağı girdiye çeker). */
interface PickerInternals {
    overlayVisible: boolean;
    overlay: HTMLElement | null;
    cd: { markForCheck(): void };
}

/** Sayfada aynı anda en çok bir takvim paneli açık kalır: yenisi açılınca öncekini kapatır. */
let openInstance: DateInputComponent | null = null;

/**
 * Ortak tarih / tarih-saat / saat alanı (PrimeNG DatePicker). Alana tıklayınca takvim açılır; klavyeyle yazarken maske
 * uygulanır (`24111991` → `24.11.1991`, saatli: `24.11.1991 14:30`; yalnız rakam, uzunluk biçimle sınırlı); × temizler.
 * Form değeri yerel `<input type="date|datetime-local|time">` ile aynı metindir (`yyyy-MM-dd`, `yyyy-MM-ddTHH:mm`,
 * `HH:mm`; boş = `''`), böylece mevcut doğrulayıcı ve İstanbul/UTC dönüşümleri değişmeden çalışır.
 *
 * Hatalar (blur'dan sonra gösterilir, yazarken değil): çözümlenemeyen yazı (31.02 vb.) → `dateInvalid`; **yazılan** değer
 * `min`/`max` dışındaysa → `dateOutOfRange` (formdan gelen mevcut değerler bu denetime girmez: eski kayıtlar kaydedilebilir).
 * Geçmiş/gelecek sınırı `min`/`max` ile verilir (ör. doğum tarihi için geniş, randevu için dar).
 */
@Component({
    selector: 'app-date-input',
    standalone: true,
    imports: [CommonModule, FormsModule, DatePickerModule],
    providers: [
        { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DateInputComponent), multi: true },
        { provide: NG_VALIDATORS, useExisting: forwardRef(() => DateInputComponent), multi: true }
    ],
    template: `
        <p-datepicker
            [inputId]="inputId()"
            [ngModel]="view()"
            (ngModelChange)="onPickerChange($event)"
            [disabled]="disabled()"
            dateFormat="dd.mm.yy"
            [showTime]="type() === 'datetime-local'"
            [timeOnly]="type() === 'time'"
            hourFormat="24"
            [minDate]="minDate()"
            [maxDate]="maxDate()"
            [placeholder]="placeholder() || defaultPlaceholder()"
            [keepInvalid]="true"
            [showClear]="true"
            [showButtonBar]="true"
            [showIcon]="true"
            iconDisplay="input"
            [fluid]="true"
            appendTo="body"
            (onBlur)="onBlur()"
            (onShow)="onPanelShow()"
            (onClose)="onPanelClose()"
        />
        @if (errorMessage(); as message) {
            <small class="text-red-500 block" role="alert">{{ message }}</small>
        }
    `
})
export class DateInputComponent implements ControlValueAccessor, Validator {
    readonly type = input<DateInputType>('date');
    readonly inputId = input('');
    /** `yyyy-MM-dd` veya `yyyy-MM-ddTHH:mm`; en erken değer (takvimde ve yazılan değerde). */
    readonly min = input<string | null | undefined>(null);
    readonly max = input<string | null | undefined>(null);
    /** Üst sınır politikası (`past` = en geç şimdi, `planned` = bugünden 5 yıl); açık `max` verilirse o geçerlidir. */
    readonly limit = input<DateInputLimit>('none');
    readonly placeholder = input('');

    private readonly picker = viewChild(DatePicker);

    readonly view = signal<Date | null>(null);
    readonly disabled = signal(false);
    private readonly unparsable = signal(false);
    /** Çözümlenemeyen yazı yalnız tam bir tarih (saat yazılmamış): mesaj saati ister. */
    private readonly timeMissing = signal(false);
    private readonly outOfRange = signal(false);
    /** Odak içinde yazılıyor: hata mesajı blur'dan sonra gösterilir (yazarken "geçersiz" yanıp sönmesin). */
    private readonly editing = signal(false);

    readonly defaultPlaceholder = computed(() => PLACEHOLDERS[this.type()]);
    readonly minDate = computed(() => (this.type() === 'time' ? null : parseDateInputValue('datetime-local', this.min())));
    readonly maxDate = computed(() => this.resolveMax());

    readonly errorMessage = computed<string | null>(() => {
        if (this.editing()) {
            return null;
        }

        if (this.unparsable()) {
            return this.timeMissing() ? TIME_MISSING_MESSAGE : INVALID_MESSAGES[this.type()];
        }

        return this.outOfRange() ? this.rangeMessage() : null;
    });

    private onChange: (value: string) => void = () => undefined;
    onTouched: () => void = () => undefined;
    private onValidatorChange: () => void = () => undefined;
    private lastMasked = '';

    constructor() {
        const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
        // Capture: PrimeNG'in kendi `input` dinleyicisinden önce çalışır; maskelenmiş metni PrimeNG çözümler.
        const onInput = (event: Event): void => this.onRawInput(event);

        const onFocus = (event: Event): void => {
            if (event.target instanceof HTMLInputElement) {
                this.lastMasked = event.target.value;
            }
        };

        // Odak, alanın ve panelin dışındaki bir kontrole (Filtrele, sonraki alan vb.) geçince panel kapanır; panel içi tıklamalar (odak panelde) kapatmaz.
        const onFocusOut = (event: FocusEvent): void => {
            const next = event.relatedTarget;
            const panel = (this.picker() as unknown as PickerInternals | undefined)?.overlay;

            if (next instanceof Node && !host.contains(next) && !panel?.contains(next)) {
                this.closePanel();
            }
        };

        host.addEventListener('input', onInput, true);
        host.addEventListener('focusin', onFocus, true);
        host.addEventListener('focusout', onFocusOut, true);
        inject(DestroyRef).onDestroy(() => {
            host.removeEventListener('input', onInput, true);
            host.removeEventListener('focusin', onFocus, true);
            host.removeEventListener('focusout', onFocusOut, true);
            this.onPanelClose();
        });
    }

    /**
     * Ham girdiyi maskeler. PrimeNG yazılan metni yalnız `keydown` ile başlayan girdide işler; sağ tık yapıştırma, otomatik
     * doldurma ve dikte `keydown` üretmez ve sessizce yok sayılırdı: PrimeNG'in bu iç bayrağı burada açılır.
     */
    private onRawInput(event: Event): void {
        const el = event.target;

        if (!(el instanceof HTMLInputElement)) {
            return;
        }

        const masked = applyDateMask(this.type(), el.value, el.selectionStart ?? el.value.length, this.lastMasked, (event as InputEvent).inputType ?? '');

        if (masked.text !== el.value) {
            el.value = masked.text;
            el.setSelectionRange(masked.caret, masked.caret);
        }

        this.lastMasked = masked.text;
        this.editing.set(true);
        const picker = this.picker() as unknown as { isKeydown: boolean } | undefined;

        if (picker) {
            picker.isKeydown = true;
        }
    }

    onPanelShow(): void {
        if (openInstance && openInstance !== this) {
            openInstance.closePanel();
        }

        // eslint-disable-next-line @typescript-eslint/no-this-alias -- takma ad değil: modül düzeyindeki tek açık panel kaydı
        openInstance = this;
    }

    onPanelClose(): void {
        if (openInstance === this) {
            openInstance = null;
        }
    }

    /** Paneli odağı girdiye çekmeden kapatır (`hideOverlay` odağı geri alıp sonraki alanı bölerdi). */
    private closePanel(): void {
        const picker = this.picker() as unknown as PickerInternals | undefined;

        if (picker?.overlayVisible) {
            picker.overlayVisible = false;
            picker.cd.markForCheck();
        }
    }

    onBlur(): void {
        this.editing.set(false);
        this.onTouched();
    }

    /** Seçici değişimi: `Date` (geçerli giriş/seçim), `null` (temizlendi) veya `string` (çözümlenemeyen yazı; `keepInvalid`). */
    onPickerChange(value: Date | string | null): void {
        const unparsable = typeof value === 'string' && value.trim() !== '';
        const outOfRange = value instanceof Date && this.isOutOfRange(value);
        const changed = this.unparsable() !== unparsable || this.outOfRange() !== outOfRange;

        this.unparsable.set(unparsable);
        this.timeMissing.set(unparsable && this.type() === 'datetime-local' && isDateWithoutTime(value as string));
        this.outOfRange.set(outOfRange);

        if (changed) {
            this.onValidatorChange();
        }

        // Çözümlenemeyen yazıda görünümü ezme: yazı sürerken PrimeNG girdiyi geri yazarsa kullanıcı yazamaz.
        if (!unparsable) {
            this.view.set(value instanceof Date ? value : null);
        }

        this.onChange(value instanceof Date ? formatDateInputValue(this.type(), value) : '');
    }

    writeValue(value: string | null): void {
        const date = parseDateInputValue(this.type(), value);
        const hadError = this.unparsable() || this.outOfRange();

        this.unparsable.set(false);
        this.timeMissing.set(false);
        this.outOfRange.set(false);
        this.view.set(date);

        if (hadError) {
            // `view` değişmediyse (null→null) ngModel girdiyi sıfırlamaz; yazı kalıntısını elle temizle.
            this.picker()?.writeValue(date);
            this.onValidatorChange();
        }
    }

    validate(_control: AbstractControl): ValidationErrors | null {
        if (this.unparsable()) {
            return { dateInvalid: true };
        }

        return this.outOfRange() ? { dateOutOfRange: true } : null;
    }

    registerOnValidatorChange(fn: () => void): void {
        this.onValidatorChange = fn;
    }

    registerOnChange(fn: (value: string) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.disabled.set(isDisabled);
    }

    private isOutOfRange(value: Date): boolean {
        if (this.type() === 'time') {
            return false;
        }

        const min = this.minDate();
        const max = this.resolveMax(); // taze: "şimdi" sınırı zamanla ilerler

        // Tarih türünde gün başı (00:00), tarih-saatte dakika karşılaştırılır.
        return (!!min && value.getTime() < min.getTime()) || (!!max && value.getTime() > max.getTime());
    }

    private resolveMax(): Date | null {
        if (this.type() === 'time') {
            return null;
        }

        return parseDateInputValue('datetime-local', this.max()) ?? resolveLimitMax(this.type(), this.limit());
    }

    private rangeMessage(): string {
        // Tarih-saat alanında sınır saati de gösterilir (aynı gün içindeki hata "tarih doğru" gibi görünmesin).
        const withTime = this.type() === 'datetime-local';
        const type: DateInputType = withTime ? 'datetime-local' : 'date';
        const subject = withTime ? 'Tarih ve saat' : 'Tarih';
        const min = this.minDate();
        const max = this.resolveMax();
        // 1900 / 9999 gibi uç sınırlar kullanıcıya anlamlı değil; yalnız gerçek (dar) sınırlar mesaja girer.
        const useMin = !!min && min.getFullYear() > 1900;
        const useMax = !!max && max.getFullYear() < 9999;

        if (useMin && useMax) {
            return `${subject} ${formatDateInputDisplay(type, min)} ile ${formatDateInputDisplay(type, max)} arasında olmalıdır.`;
        }

        if (useMin) {
            return `${subject} ${formatDateInputDisplay(type, min)} veya sonrası olmalıdır.`;
        }

        if (useMax) {
            return `${subject} ${formatDateInputDisplay(type, max)} veya öncesi olmalıdır.`;
        }

        return 'Tarih izin verilen aralığın dışında.';
    }
}
