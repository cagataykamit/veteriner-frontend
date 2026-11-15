import { Directive, inject, input } from '@angular/core';
import { Router } from '@angular/router';

/** Satır içindeki kendi eylemi olan öğeler: tıklamaları satırı açmaz. */
const INTERACTIVE = 'a, button, input, select, textarea, label, [role="button"], [role="menuitem"], [role="checkbox"]';

/**
 * Liste satırının (tablo satırı ya da telefon kartı) boş yerine tıklamak kaydı açar (H19); ad bağlantısı ve satır
 * düğmeleri kendi işini yapar. Klavye kullanıcısı için ad bağlantısı yerinde kalır. Ctrl/⌘ ile yeni sekmede açar.
 */
@Directive({
    selector: '[appRowLink]',
    standalone: true,
    host: { '[class.cursor-pointer]': '!!appRowLink()', '(click)': 'onClick($event)' }
})
export class RowLinkDirective {
    readonly appRowLink = input<readonly unknown[] | null>(null);

    private readonly router = inject(Router);

    onClick(event: MouseEvent): void {
        const link = this.appRowLink();

        if (!link || (event.target instanceof Element && event.target.closest(INTERACTIVE)) || window.getSelection()?.toString()) {
            return;
        }

        if (event.ctrlKey || event.metaKey) {
            window.open(this.router.serializeUrl(this.router.createUrlTree([...link])), '_blank', 'noopener');

            return;
        }

        void this.router.navigate([...link]);
    }
}
