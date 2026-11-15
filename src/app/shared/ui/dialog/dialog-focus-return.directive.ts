import { DOCUMENT } from '@angular/common';
import { DestroyRef, Directive, effect, inject, untracked } from '@angular/core';
import { Dialog } from 'primeng/dialog';

/**
 * Diyalog kapanınca odak onu açan öğeye döner (O8). Klavyeyle çalışan kullanıcı listede kaldığı yere geri gelir.
 * Açan öğe artık sayfada yoksa (ör. satır silindi) ya da odak bilerek başka yere taşındıysa dokunmaz.
 */
@Directive({ selector: 'p-dialog', standalone: true })
export class DialogFocusReturnDirective {
    private readonly dialog = inject(Dialog);
    private readonly document = inject(DOCUMENT);
    private opener: HTMLElement | null = null;

    constructor() {
        effect(() => {
            if (this.dialog.visible()) {
                untracked(() => {
                    const active = this.document.activeElement;

                    this.opener = active instanceof HTMLElement && active !== this.document.body ? active : null;
                });
            }
        });

        const subscription = this.dialog.onHide.subscribe(() => this.restoreFocus());

        inject(DestroyRef).onDestroy(() => subscription.unsubscribe());
    }

    private restoreFocus(): void {
        const opener = this.opener;
        const active = this.document.activeElement;

        this.opener = null;

        if (!opener?.isConnected || (active instanceof HTMLElement && active !== this.document.body && active.isConnected)) {
            return;
        }

        opener.focus();
    }
}
