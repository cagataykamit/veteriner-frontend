import { DestroyRef, Directive, effect, ElementRef, inject, Renderer2 } from '@angular/core';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';

/** Düğmenin yanındaki kısa neden; ayrıntı ve abonelik bağlantısı sayfanın üstündeki salt okunur bandındadır. */
export const READ_ONLY_REASON_TEXT = 'Salt okunur modda kapalı';

let nextId = 0;

/**
 * Salt okunur kiracıda pasif düğmenin hemen yanına kısa neden yazar (O7): kullanıcı düğmenin neden basılmadığını banda
 * bakmadan görür. Not düğmeye `aria-describedby` ile bağlanır. Yalnız sayfa ve form düzeyindeki eylem düğmelerine konur;
 * tablo satırı simge düğmelerinde neden üstteki banttadır.
 */
@Directive({ selector: '[appReadOnlyReason]', standalone: true })
export class ReadOnlyReasonDirective {
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly renderer = inject(Renderer2);
    private readonly ro = inject(TenantReadOnlyContextService);
    private readonly noteId = `app-read-only-reason-${++nextId}`;
    private note: HTMLElement | null = null;

    constructor() {
        effect(() => (this.ro.mutationBlocked() ? this.show() : this.hide()));
        inject(DestroyRef).onDestroy(() => this.hide());
    }

    private show(): void {
        const button = this.host.nativeElement;
        const parent = button.parentNode;

        if (this.note || !parent) {
            return;
        }

        const note = this.renderer.createElement('span') as HTMLElement;
        const icon = this.renderer.createElement('i') as HTMLElement;

        this.renderer.setAttribute(note, 'id', this.noteId);
        this.renderer.setAttribute(note, 'data-ro-reason', '');
        this.renderer.setAttribute(note, 'class', 'inline-flex items-center gap-1 text-sm text-amber-700 dark:text-amber-300');
        this.renderer.setAttribute(icon, 'class', 'pi pi-lock');
        this.renderer.setAttribute(icon, 'aria-hidden', 'true');
        this.renderer.appendChild(note, icon);
        this.renderer.appendChild(note, this.renderer.createText(READ_ONLY_REASON_TEXT));
        this.renderer.insertBefore(parent, note, button.nextSibling);
        this.renderer.setAttribute(button, 'aria-describedby', this.noteId);
        this.note = note;
    }

    private hide(): void {
        if (!this.note) {
            return;
        }

        this.note.remove();
        this.renderer.removeAttribute(this.host.nativeElement, 'aria-describedby');
        this.note = null;
    }
}
