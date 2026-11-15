import { Directive, inject, input } from '@angular/core';
import { Dialog } from 'primeng/dialog';
import { UnsavedChangesService } from '@/app/shared/ui/unsaved-changes/unsaved-changes.service';

/**
 * Dolu diyalog Esc, çarpı ya da dışarı tıklamayla sessizce kapanmaz (O2): `[appUnsavedChanges]="form.dirty"`.
 * PrimeNG bu üç yolu da `close()` üzerinden işler; yönerge o çağrıyı ortak sorudan geçirir. "Kaydetmeden çık" kapatır.
 */
@Directive({ selector: 'p-dialog[appUnsavedChanges]', standalone: true })
export class DialogUnsavedChangesDirective {
    readonly appUnsavedChanges = input(false);

    private readonly unsavedChanges = inject(UnsavedChangesService);

    constructor() {
        const dialog = inject(Dialog);
        const close = dialog.close.bind(dialog);

        dialog.close = (event: Event) => {
            event.preventDefault();
            this.unsavedChanges.closeWithCheck(this.appUnsavedChanges(), () => close(event));
        };
    }
}
