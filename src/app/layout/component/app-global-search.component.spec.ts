import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { GlobalSearchResultVm, GlobalSearchService } from '@/app/features/patients/services/global-search.service';
import { AppGlobalSearch } from './app-global-search.component';

const result: GlobalSearchResultVm = {
    clients: [{ id: 'c1', fullName: 'Ali Veli', phone: '+90 532 123 45 67', petNames: ['Pamuk'], label: 'Ali Veli' }],
    pets: [{ id: 'p1', name: 'Pamuk', clientId: 'c1', summary: 'Kedi · Tekir', ownerName: 'Ali Veli', ownerPhone: '+90 532 123 45 67', microchip: '985112345678901', deceased: false }],
    failedKinds: []
};

describe('AppGlobalSearch', () => {
    let fixture: ComponentFixture<AppGlobalSearch>;
    let search: jasmine.SpyObj<GlobalSearchService>;
    let router: Router;

    const create = (canSearch = true) => {
        search = jasmine.createSpyObj<GlobalSearchService>('GlobalSearchService', ['search', 'canSearch']);
        search.canSearch.and.returnValue(canSearch);
        search.search.and.returnValue(of(result));
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
    const isVisible = () => (fixture.componentInstance as unknown as { visible: () => boolean }).visible();

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
        expect(dialogOpen()).toBeFalse();
    });

    it('Ctrl+K ve / pencereyi açar; yazı alanında / açmaz', async () => {
        create();
        const slash = key({ key: '/' });

        expect(slash.defaultPrevented).toBeTrue();
        expect(dialogOpen()).toBeTrue();

        TestBed.resetTestingModule();
        document.querySelectorAll('.p-dialog-mask').forEach((el) => el.remove());
        create();
        const field = document.body.appendChild(document.createElement('input'));

        key({ key: '/' }, field);
        field.remove();
        expect(dialogOpen()).toBeFalse();
        key({ key: 'k', ctrlKey: true });
        expect(dialogOpen()).toBeTrue();
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
        expect(search.search).toHaveBeenCalledOnceWith('pamuk');
        const text = document.querySelector('.p-dialog')!.textContent!;

        expect(text).toContain('Müşteriler');
        expect(text).toContain('Hastalar');
        expect(text).toContain('Sahip: Ali Veli');
        expect(text).toContain('Mikroçip: 985112345678901');
        expect(document.querySelectorAll('[role="option"]').length).toBe(2);
    });

    it('ok tuşları seçimi gezdirir, Enter seçili kaydın detayına gider', async () => {
        create();
        const navigate = spyOn(router, 'navigate').and.resolveTo(true);

        key({ key: '/' });
        await typeQuery('pamuk');
        const input = document.querySelector<HTMLInputElement>('.p-dialog input')!;

        key({ key: 'ArrowDown' }, input);
        expect(input.getAttribute('aria-activedescendant')).toBe('global-search-listbox-option-1');
        key({ key: 'Enter' }, input);
        expect(navigate).toHaveBeenCalledWith(['/panel/pets', 'p1']);
        expect(isVisible()).toBeFalse();
    });

    it('sonuç yoksa boş durum, tam hata olursa uyarı gösterir', async () => {
        create();
        key({ key: '/' });
        search.search.and.returnValue(of({ clients: [], pets: [], failedKinds: [] }));
        await typeQuery('yok');
        expect(document.querySelector('.p-dialog')!.textContent).toContain('Sonuç bulunamadı.');
        search.search.and.returnValue(throwError(() => new Error('x')));
        await typeQuery('hata');
        expect(document.querySelector('.p-dialog [role="alert"]')!.textContent).toContain('Arama yapılamadı');
    });

    it('yükleniyor durumunu gösterir ve kapanınca sıfırlanır', async () => {
        create();
        key({ key: '/' });
        const pending = new Subject<GlobalSearchResultVm>();

        search.search.and.returnValue(pending);
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
        expect(isVisible()).toBeFalse();
    });
});
