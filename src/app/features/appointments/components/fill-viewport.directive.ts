import { afterEveryRender, DestroyRef, Directive, ElementRef, inject, input } from '@angular/core';

/**
 * Takvim alanı üst konumundan pencerenin alt kenarına kadar uzar; alan kendi içinde kayar. Altındaki kart boşluğu ekranın dışında kalır,
 * sayfa o kadar kayar (kullanıcı tercihi: alt boşluk yerine daha çok takvim). Görünmeyen öğeye (telefonda gizli ızgara) dokunmaz.
 */
@Directive({
    selector: '[appFillViewport]',
    standalone: true
})
export class FillViewportDirective {
    /** En az yükseklik, px (kısa pencerede alan yine kullanılabilir kalsın). */
    readonly fillMin = input(320);

    private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

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
        const height = `${Math.max(this.fillMin(), Math.floor(window.innerHeight - top))}px`;

        if (this.el.style.height !== height) {
            this.el.style.height = height;
        }
    }
}
