import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, ElementRef, forwardRef, inject, input, signal, viewChild } from '@angular/core';
import { AbstractControl, ControlValueAccessor, FormsModule, NG_VALIDATORS, NG_VALUE_ACCESSOR, ValidationErrors, Validator } from '@angular/forms';
import { DatePicker, DatePickerModule } from 'primeng/datepicker';
import { DateInputType, formatDateInputValue, parseDateInputValue } from '@/app/shared/forms/date-input/date-input-value.utils';

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

/**
 * Ortak tarih / tarih-saat / saat alanı (PrimeNG DatePicker). Alana tıklayınca takvim açılır, klavyeyle `gg.aa.yyyy`
 * (saatli: `gg.aa.yyyy ss:dd`) yazılabilir, × temizler. Form değeri yerel `<input type="date|datetime-local|time">` ile
 * aynı metindir (`yyyy-MM-dd`, `yyyy-MM-ddTHH:mm`, `HH:mm`; boş = `''`), böylece mevcut doğrulayıcı ve İstanbul/UTC
 * dönüşümleri değişmeden çalışır. Çözümlenemeyen yazı için form değeri `''` ve `dateInvalid` hatası olur.
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
            (onBlur)="onTouched()"
        />
        @if (invalid()) {
            <small class="text-red-500 block" role="alert">{{ invalidMessage() }}</small>
        }
    `
})
export class DateInputComponent implements ControlValueAccessor, Validator {
    readonly type = input<DateInputType>('date');
    readonly inputId = input('');
    /** `yyyy-MM-dd` veya `yyyy-MM-ddTHH:mm`; takvimde seçilebilir en erken değer. */
    readonly min = input<string | null | undefined>(null);
    readonly max = input<string | null | undefined>(null);
    readonly placeholder = input('');

    private readonly picker = viewChild(DatePicker);

    constructor() {
        const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
        const onInput = (): void => this.acceptInputWithoutKeydown();
        host.addEventListener('input', onInput, true); // capture: PrimeNG'in kendi dinleyicisinden önce
        inject(DestroyRef).onDestroy(() => host.removeEventListener('input', onInput, true));
    }

    readonly view = signal<Date | null>(null);
    readonly disabled = signal(false);
    readonly invalid = signal(false);

    readonly defaultPlaceholder = computed(() => PLACEHOLDERS[this.type()]);
    readonly invalidMessage = computed(() => INVALID_MESSAGES[this.type()]);
    readonly minDate = computed(() => this.type() === 'time' ? null : parseDateInputValue('datetime-local', this.min()));
    readonly maxDate = computed(() => this.type() === 'time' ? null : parseDateInputValue('datetime-local', this.max()));

    private onChange: (value: string) => void = () => undefined;
    onTouched: () => void = () => undefined;
    private onValidatorChange: () => void = () => undefined;

    /**
     * PrimeNG yazılan metni yalnız `keydown` ile başlayan girdide işler; sağ tık yapıştırma, otomatik doldurma ve dikte
     * `keydown` üretmez ve sessizce yok sayılırdı. `input` olayı (capture, PrimeNG'in kendi dinleyicisinden önce) geldiğinde
     * PrimeNG'in bu iç bayrağı açılır. Davranış testi: yazma + tuşsuz girdi.
     */
    acceptInputWithoutKeydown(): void {
        const picker = this.picker() as unknown as { isKeydown: boolean } | undefined;
        if (picker) {
            picker.isKeydown = true;
        }
    }

    /** Seçici değişimi: `Date` (geçerli giriş/seçim), `null` (temizlendi) veya `string` (çözümlenemeyen yazı; `keepInvalid`). */
    onPickerChange(value: Date | string | null): void {
        const rawInvalid = typeof value === 'string' && value.trim() !== '';
        if (this.invalid() !== rawInvalid) {
            this.invalid.set(rawInvalid);
            this.onValidatorChange();
        }
        // Çözümlenemeyen yazıda görünümü ezme: yazı sürerken PrimeNG girdiyi geri yazarsa kullanıcı yazamaz.
        if (!rawInvalid) {
            this.view.set(value instanceof Date ? value : null);
        }
        this.onChange(value instanceof Date ? formatDateInputValue(this.type(), value) : '');
    }

    writeValue(value: string | null): void {
        const date = parseDateInputValue(this.type(), value);
        const hadInvalidText = this.invalid();
        this.invalid.set(false);
        this.view.set(date);
        if (hadInvalidText) {
            // `view` değişmediyse (null→null) ngModel girdiyi sıfırlamaz; yazı kalıntısını elle temizle.
            this.picker()?.writeValue(date);
            this.onValidatorChange();
        }
    }

    validate(_control: AbstractControl): ValidationErrors | null {
        return this.invalid() ? { dateInvalid: true } : null;
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
}
