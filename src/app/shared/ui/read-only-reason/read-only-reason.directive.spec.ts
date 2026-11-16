import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { READ_ONLY_REASON_TEXT, ReadOnlyReasonDirective } from './read-only-reason.directive';

@Component({
    imports: [ReadOnlyReasonDirective],
    template: `<div><button type="submit" appReadOnlyReason>Kaydet</button><button type="button">Vazgeç</button></div>`
})
class HostComponent {}

describe('ReadOnlyReasonDirective', () => {
    const blocked = signal(false);

    const create = () => {
        TestBed.configureTestingModule({ imports: [HostComponent], providers: [{ provide: TenantReadOnlyContextService, useValue: { mutationBlocked: blocked } }] });
        const fixture = TestBed.createComponent(HostComponent);

        fixture.detectChanges();

        return fixture;
    };

    afterEach(() => blocked.set(false));

    it('salt okunurda düğmenin hemen yanına kısa neden yazar ve düğmeye bağlar; mod kalkınca not kaybolur', () => {
        blocked.set(true);
        const fixture = create();
        const el: HTMLElement = fixture.nativeElement;
        const save = el.querySelector('button[type="submit"]') as HTMLButtonElement;
        const note = save.nextElementSibling as HTMLElement;

        expect(note.hasAttribute('data-ro-reason')).toBe(true);
        expect(note.textContent).toBe(READ_ONLY_REASON_TEXT);
        expect(save.getAttribute('aria-describedby')).toBe(note.id);
        expect(note.nextElementSibling?.textContent).toBe('Vazgeç');

        blocked.set(false);
        fixture.detectChanges();

        expect(el.querySelector('[data-ro-reason]')).toBeNull();
        expect(save.hasAttribute('aria-describedby')).toBe(false);
    });

    it('yazma açıkken not yok', () => {
        expect((create().nativeElement as HTMLElement).querySelector('[data-ro-reason]')).toBeNull();
    });
});
