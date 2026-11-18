import { afterEveryRender, DestroyRef, Directive, ElementRef, inject, input } from '@angular/core';

/**
 * Takvim alanı en az üst konumundan pencerenin alt kenarına kadar uzar (altta boşluk kalmasın); içerik daha uzunsa büyür ve sayfa kayar,
 * iç kaydırma yok (kullanıcı kararı 2026-11-18). Görünmeyen öğeye (telefonda gizli ızgara) dokunmaz.
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
        const minHeight = `${Math.max(this.fillMin(), Math.floor(window.innerHeight - top))}px`;

        if (this.el.style.minHeight !== minHeight) {
            this.el.style.minHeight = minHeight;
        }
    }
}
