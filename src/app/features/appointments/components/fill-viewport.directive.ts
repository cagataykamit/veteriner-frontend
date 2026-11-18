import { afterEveryRender, DestroyRef, Directive, ElementRef, inject, input } from '@angular/core';

const PROBE_PX = 10_000;

/**
 * Takvim alanı ekranın kalanını doldurur; sayfa dikey kaymaz, alan kendi içinde kayar. Yükseklik = pencere yüksekliği − öğenin üst konumu −
 * öğenin altında kalan sayfa (kart iç boşluğu, düzenin alt boşluğu, altbilgi). Alttaki pay, öğe geçici olarak çok uzun yapılıp ölçülür;
 * yalnız öğenin konumu ya da pencere boyu değişince yeniden ölçülür. Görünmeyen öğeye (telefonda gizli ızgara) dokunmaz.
 */
@Directive({
    selector: '[appFillViewport]',
    standalone: true
})
export class FillViewportDirective {
    /** En az yükseklik, px (kısa pencerede alan yine kullanılabilir kalsın; sayfa o zaman kayar). */
    readonly fillMin = input(320);

    private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    private measuredKey = '';
    private below = 0;

    constructor() {
        const onResize = () => this.apply();

        window.addEventListener('resize', onResize);
        inject(DestroyRef).onDestroy(() => window.removeEventListener('resize', onResize));
        afterEveryRender({ write: () => this.apply() });
    }

    private apply(): void {
        if (this.el.getClientRects().length === 0) {
            return;
        }

        const top = Math.ceil(this.el.getBoundingClientRect().top + window.scrollY);
        const key = `${top}:${window.innerWidth}x${window.innerHeight}`;

        if (key !== this.measuredKey) {
            this.measuredKey = key;
            this.el.style.height = `${PROBE_PX}px`;
            this.below = Math.max(0, Math.ceil(document.documentElement.scrollHeight - (top + PROBE_PX)));
        }

        const height = `${Math.max(this.fillMin(), Math.floor(window.innerHeight - top - this.below))}px`;

        if (this.el.style.height !== height) {
            this.el.style.height = height;
        }
    }
}
