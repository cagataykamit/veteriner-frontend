import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { GlobalSearchResultVm, GlobalSearchService } from '@/app/shared/global-search/global-search.service';
import { AppGlobalSearch } from './app-global-search.component';

const result: GlobalSearchResultVm = {
    clients: [{ id: 'c1', fullName: 'Ali Veli', phone: '+90 532 123 45 67', petNames: ['Pamuk'], label: 'Ali Veli' }],
    pets: [{ id: 'p1', name: 'Pamuk', clientId: 'c1', summary: 'Kedi · Tekir', ownerName: 'Ali Veli', ownerPhone: '+90 532 123 45 67', microchip: '985112345678901', deceased: false }],
    failedKinds: []
};

describe('AppGlobalSearch', () => {
    let fixture: ComponentFixture<AppGlobalSearch>;
    let search: MockedObject<GlobalSearchService>;
    let router: Router;

    const create = (canSearch = true) => {
        search = {
            search: vi.fn().mockName('GlobalSearchService.search'),
            canSearch: vi.fn().mockName('GlobalSearchService.canSearch')
        } as unknown as MockedObject<GlobalSearchService>;
        search.canSearch.mockReturnValue(canSearch);
        search.search.mockReturnValue(of(result));
        TestBed.configureTestingModule({
            imports: [AppGlobalSearch],
            providers: [provideRouter([]), { provide: GlobalSearchService, useValue: search }]
        });
        router = TestBed.inject(Router);
        fixture = TestBed.createComponent(AppGlobalSearch);
        fixture.detectChanges();
    };

    const key = (init: KeyboardEventInit, target: EventTarget = document.body) => {
        const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });

        target.dispatchEvent(event);
        fixture.detectChanges();

        return event;
    };

    const dialogOpen = () => !!document.querySelector('.p-dialog');
    // Kapanış animasyonu bitene kadar DOM'da kalabilir; açık/kapalı durumu bileşenden okunur.
    const isVisible = () =>
        (
            fixture.componentInstance as unknown as {
                visible: () => boolean;
            }
        ).visible();

    const settle = async () => {
        await fixture.whenStable();
        fixture.detectChanges();
    };

    const typeQuery = async (value: string) => {
        const input = document.querySelector<HTMLInputElement>('.p-dialog input')!;

        input.value = value;
        input.dispatchEvent(new Event('input'));
        await new Promise((resolve) => setTimeout(resolve, 350));
        await settle();
    };

    afterEach(() => document.querySelectorAll('.p-dialog-mask').forEach((el) => el.remove()));

    it('okuma izni yoksa düğme de kısayol da yoktur', () => {
        create(false);
        expect(fixture.nativeElement.querySelector('button')).toBeNull();
        key({ key: 'k', ctrlKey: true });
        expect(dialogOpen()).toBe(false);
    });

    it('Ctrl+K ve / pencereyi açar; yazı alanında / açmaz', async () => {
        create();
        const slash = key({ key: '/' });

        expect(slash.defaultPrevented).toBe(true);
        expect(dialogOpen()).toBe(true);

        TestBed.resetTestingModule();
        document.querySelectorAll('.p-dialog-mask').forEach((el) => el.remove());
        create();
        const field = document.body.appendChild(document.createElement('input'));

        key({ key: '/' }, field);
        field.remove();
        expect(dialogOpen()).toBe(false);
        key({ key: 'k', ctrlKey: true });
        expect(dialogOpen()).toBe(true);
    });

    it('açılır açılmaz giriş alanına odaklanır (animasyon beklenmez)', () => {
        create();
        key({ key: 'k', ctrlKey: true });
        fixture.detectChanges();
        expect(document.activeElement).toBe(document.querySelector('.p-dialog input'));
    });

    it('en az 2 karakter yazılınca arar ve müşteri/hayvan gruplarını gösterir', async () => {
        create();
        key({ key: '/' });
        await typeQuery('a');
        expect(search.search).not.toHaveBeenCalled();
        await typeQuery('pamuk');
        expect(search.search).toHaveBeenCalledTimes(1);
        expect(search.search).toHaveBeenCalledWith('pamuk');
        const text = document.querySelector('.p-dialog')!.textContent!;

        expect(text).toContain('Müşteriler');
        expect(text).toContain('Hastalar');
        expect(text).toContain('Sahip: Ali Veli');
        expect(text).toContain('Mikroçip: 985112345678901');
        expect(document.querySelectorAll('[role="option"]').length).toBe(2);
    });

    it('ok tuşları seçimi gezdirir, Enter seçili kaydın detayına gider', async () => {
        create();
        const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

        key({ key: '/' });
        await typeQuery('pamuk');
        const input = document.querySelector<HTMLInputElement>('.p-dialog input')!;

        key({ key: 'ArrowDown' }, input);
        expect(input.getAttribute('aria-activedescendant')).toBe('global-search-listbox-option-1');
        key({ key: 'Enter' }, input);
        expect(navigate).toHaveBeenCalledWith(['/panel/pets', 'p1']);
        expect(isVisible()).toBe(false);
    });

    it('sonuç yoksa boş durum, tam hata olursa uyarı gösterir', async () => {
        create();
        key({ key: '/' });
        search.search.mockReturnValue(of({ clients: [], pets: [], failedKinds: [] }));
        await typeQuery('yok');
        expect(document.querySelector('.p-dialog')!.textContent).toContain('Sonuç bulunamadı.');
        search.search.mockReturnValue(throwError(() => new Error('x')));
        await typeQuery('hata');
        expect(document.querySelector('.p-dialog [role="alert"]')!.textContent).toContain('Arama yapılamadı');
    });

    it('yükleniyor durumunu gösterir ve kapanınca sıfırlanır', async () => {
        create();
        key({ key: '/' });
        const pending = new Subject<GlobalSearchResultVm>();

        search.search.mockReturnValue(pending);
        await typeQuery('pamuk');
        expect(document.querySelector('.p-dialog')!.textContent).toContain('Aranıyor');
        pending.next(result);
        pending.complete();
        await settle();
        expect(document.querySelector('.p-dialog')!.textContent).toContain('Müşteriler');
    });

    it('Esc pencereyi kapatır', async () => {
        create();
        key({ key: '/' });
        key({ key: 'Escape' }, document.querySelector('.p-dialog')!);
        await settle();
        expect(isVisible()).toBe(false);
    });
});
