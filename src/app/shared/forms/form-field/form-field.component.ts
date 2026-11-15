import { afterEveryRender, ChangeDetectionStrategy, Component, computed, contentChild, DestroyRef, ElementRef, inject, input } from '@angular/core';
import { type AbstractControl, NgControl, Validators } from '@angular/forms';
import { cleanFieldLabel, focusableIn } from '@/app/shared/forms/form-field/form-field.utils';
import { FormSubmitDirective, type RegisteredFormField } from '@/app/shared/forms/form-field/form-submit.directive';

let nextFieldId = 0;

/**
 * Ortak alan sarmalayıcısı (B4): etiket, zorunlu işareti, hata/ipucu metni ve ekran okuyucu bağları tek yerde.
 * Alan `<ng-content>` ile verilir; `aria-required`, `aria-invalid` ve `aria-describedby` alanın odaklanan öğesine yazılır
 * (PrimeNG seçicilerinde içteki combobox). Zorunluluk verilmezse kontroldeki `Validators.required`'dan okunur.
 *
 * ```html
 * <app-form-field label="Telefon" fieldId="phone" [error]="fieldMessage('phone')">
 *     <input id="phone" pInputText formControlName="phone" />
 * </app-form-field>
 * ```
 */
@Component({
    selector: 'app-form-field',
    standalone: true,
    // Doğrulayıcı ve dokunulma durumu dışarıdan değişir; sarmalayıcı her denetimde yeniden okur.
    changeDetection: ChangeDetectionStrategy.Eager,
    host: { class: 'block' },
    template: `
        @if (label()) {
            <label [attr.for]="fieldId() || null" class="block text-sm font-medium text-muted-color mb-2">
                {{ label() }}
                @if (isRequired()) {
                    <span aria-hidden="true">*</span>
                }
            </label>
        }
        <ng-content />
        @if (error(); as message) {
            <small [id]="messageId" class="block text-danger mt-1">{{ message }}</small>
        } @else if (hint(); as text) {
            <small [id]="messageId" class="block text-muted-color mt-1">{{ text }}</small>
        }
    `
})
export class FormFieldComponent implements RegisteredFormField {
    readonly label = input('');
    /** Alanın `id`'si (PrimeNG'de `inputId`): etiket buna bağlanır. */
    readonly fieldId = input('');
    readonly error = input<string | null | undefined>(null);
    readonly hint = input<string | null | undefined>(null);
    /** Verilmezse kontroldeki `Validators.required`'dan okunur. */
    readonly required = input<boolean | undefined>(undefined);

    readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    protected readonly messageId = `form-field-msg-${++nextFieldId}`;

    private readonly ngControl = contentChild(NgControl, { descendants: true });
    private readonly cleanLabel = computed(() => cleanFieldLabel(this.label()));

    constructor() {
        const submit = inject(FormSubmitDirective, { optional: true });

        submit?.register(this);
        inject(DestroyRef).onDestroy(() => submit?.unregister(this));
        afterEveryRender({ write: () => this.syncAria() });
    }

    fieldControl(): AbstractControl | null {
        return this.ngControl()?.control ?? null;
    }

    fieldLabel(): string {
        return this.cleanLabel();
    }

    isRequired(): boolean {
        return this.required() ?? this.fieldControl()?.hasValidator(Validators.required) ?? false;
    }

    private syncAria(): void {
        const id = this.fieldId();
        const target = (id ? this.element.querySelector<HTMLElement>(`#${CSS.escape(id)}`) : null) ?? focusableIn(this.element);

        if (!target) {
            return;
        }

        const hasMessage = !!this.error() || !!this.hint();

        setAttr(target, 'aria-required', this.isRequired() ? 'true' : null);
        setAttr(target, 'aria-invalid', this.error() ? 'true' : null);
        setAttr(target, 'aria-describedby', hasMessage ? this.messageId : null);
    }
}

function setAttr(el: HTMLElement, name: string, value: string | null): void {
    if (el.getAttribute(name) === value) {
        return;
    }

    if (value === null) {
        el.removeAttribute(name);
    } else {
        el.setAttribute(name, value);
    }
}
