import { afterNextRender, Directive, ElementRef, inject } from '@angular/core';

/** Yazılabilir, açık ve görünür metin alanı (seçim kutuları ve onay kutuları hariç). */
const TEXT_FIELD = 'input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly])';

/**
 * Sayfa formu açılınca odak ilk boş metin alanına gider (H14); bağlamdan dolu gelen alan atlanır.
 * Klavyeyle çalışan sekreter Tab'larla forma inmek zorunda kalmaz. Form sonradan çiziliyorsa (yükleniyor) dokunmaz.
 */
@Directive({ selector: '[appFocusFirstField]', standalone: true })
export class FocusFirstFieldDirective {
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

    constructor() {
        afterNextRender(() => {
            const field = Array.from(this.host.nativeElement.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(TEXT_FIELD)).find((f) => !f.value && f.offsetParent !== null);

            field?.focus();
        });
    }
}
