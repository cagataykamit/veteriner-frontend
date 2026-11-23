import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppPhoneListComponent, type PhoneListItem } from './app-phone-list.component';

const item = (id: string, at: string | null, amount: number | null, over: Partial<PhoneListItem> = {}): PhoneListItem => ({
    id,
    at,
    lead: '10:00',
    title: `Müşteri ${id}`,
    amount,
    fields: [
        { label: 'Hasta', value: 'Boncuk' },
        { label: 'Telefon', value: '' },
        { label: 'Kasa', value: '—' },
        { label: 'Not', value: null }
    ],
    ...over
});

describe('AppPhoneListComponent (G-04)', () => {
    function render(items: PhoneListItem[], inputs: Record<string, unknown> = {}) {
        TestBed.configureTestingModule({ providers: [provideRouter([])] });
        const fixture = TestBed.createComponent(AppPhoneListComponent);

        fixture.componentRef.setInput('items', items);
        Object.entries(inputs).forEach(([k, v]) => fixture.componentRef.setInput(k, v));
        fixture.detectChanges();

        return { fixture, el: fixture.nativeElement as HTMLElement };
    }

    const text = (e: Element | null) => e?.textContent?.replace(/\s+/g, ' ').trim();

    it('gün başlığında kayıt sayısı ve tutarlı listede gün toplamı; ardışık aynı gün tek başlık', () => {
        const { el } = render([item('a', '2026-11-20T10:00:00Z', 200), item('b', '2026-11-20T08:00:00Z', 350), item('c', '2026-11-19T09:00:00Z', 650)], { dayTotals: true });
        const days = Array.from(el.querySelectorAll('[data-testid="phone-list-day"]')).map((d) => Array.from(d.children).map(text));

        expect(days).toEqual([
            ['20 Kasım 2026', '2 kayıt', '₺550,00'],
            ['19 Kasım 2026', '1 kayıt', '₺650,00']
        ]);
        expect(el.querySelectorAll('[data-testid="phone-list-row"]').length).toBe(3);
    });

    it('sayfa sınırındaki gün toplamı "bu sayfada" diye işaretlenir; ortadaki gün işaretlenmez', () => {
        const { el } = render([item('a', '2026-11-21T10:00:00Z', 1), item('b', '2026-11-20T10:00:00Z', 2), item('c', '2026-11-19T10:00:00Z', 3)], { dayTotals: true, continuesBefore: true, continuesAfter: true });
        const days = Array.from(el.querySelectorAll('[data-testid="phone-list-day"]')).map((d) => d.textContent?.includes('bu sayfada'));

        expect(days).toEqual([true, false, true]);
    });

    it('tarihsiz listede başlık yok; satıra dokununca yalnız dolu alanlar ve yazılı eylemler açılır, aynı anda tek satır', () => {
        const run = vi.fn();
        const { fixture, el } = render([
            item('a', null, null, { detailLink: ['/panel/clients', 'a'], actions: [{ label: 'İptal et', danger: true, run }] }),
            item('b', null, null)
        ]);
        const rows = el.querySelectorAll<HTMLButtonElement>('[data-testid="phone-list-row"]');

        expect(el.querySelector('[data-testid="phone-list-day"]')).toBeNull();
        expect(el.querySelector('[data-testid="phone-list-detail"]')).toBeNull();

        rows[0].click();
        fixture.detectChanges();
        const detail = el.querySelector('[data-testid="phone-list-detail"]')!;

        expect(rows[0].getAttribute('aria-expanded')).toBe('true');
        expect(Array.from(detail.querySelectorAll('dt')).map(text)).toEqual(['Hasta']);
        expect(detail.querySelector('a[data-testid="phone-list-open"]')?.getAttribute('href')).toBe('/panel/clients/a');
        Array.from(detail.querySelectorAll('button')).find((b) => text(b) === 'İptal et')!.click();
        expect(run).toHaveBeenCalled();

        rows[1].click();
        fixture.detectChanges();
        expect(el.querySelectorAll('[data-testid="phone-list-detail"]').length).toBe(1);
        expect(rows[0].getAttribute('aria-expanded')).toBe('false');
    });
});
