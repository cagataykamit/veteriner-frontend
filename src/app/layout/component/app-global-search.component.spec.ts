import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { GlobalSearchResultVm, GlobalSearchService } from '@/app/features/patients/services/global-search.service';
import { type RecentlyViewedEntry, RecentlyViewedService } from '@/app/entities/patient/services/recently-viewed.service';
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
    let recent: RecentlyViewedEntry[];
    let claims: Set<string>;
    let mutationBlocked: boolean;

    beforeEach(() => {
        recent = [];
        claims = new Set(['Clients.Create', 'Pets.Create']);
        mutationBlocked = false;
    });

    const create = (canSearch = true) => {
        search = {
            search: vi.fn().mockName('GlobalSearchService.search'),
            canSearch: vi.fn().mockName('GlobalSearchService.canSearch')
        } as unknown as MockedObject<GlobalSearchService>;
        search.canSearch.mockReturnValue(canSearch);
        search.search.mockReturnValue(of(result));
        TestBed.configureTestingModule({
            imports: [AppGlobalSearch],
            providers: [
                provideRouter([]),
                { provide: GlobalSearchService, useValue: search },
                { provide: RecentlyViewedService, useValue: { list: () => recent } },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c) } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => mutationBlocked } }
            ]
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

    const groupLabels = () => Array.from(document.querySelectorAll('[role="listbox"] .layout-topbar-panel-group')).map((g) => g.textContent?.trim());
    const optionHrefs = () => Array.from(document.querySelectorAll('[role="option"]')).map((a) => a.getAttribute('href'));

    it('en az 2 karakter yazılınca arar; sonuçlar türe göre gruplu, önce hastalar; müşteri satırında telefon', async () => {
        create();
        key({ key: '/' });
        await typeQuery('a');
        expect(search.search).not.toHaveBeenCalled();
        expect(document.querySelector('.p-dialog')!.textContent).toContain('En az 2 karakter yazın.');
        await typeQuery('pamuk');
        expect(search.search).toHaveBeenCalledTimes(1);
        expect(search.search).toHaveBeenCalledWith('pamuk');
        expect(groupLabels()).toEqual(['Hastalar', 'Müşteriler']);
        expect(optionHrefs()).toEqual(['/panel/pets/p1', '/panel/clients/c1']);
        const [pet, client] = Array.from(document.querySelectorAll('[role="option"]'));
        const sub = (option: Element) => option.querySelector('.block')!.textContent!.trim();

        expect(pet.textContent).toContain('Pamuk · Kedi · Tekir');
        expect(sub(pet)).toBe('Sahip: Ali Veli · +90 532 123 45 67 · Mikroçip: 985112345678901');
        expect(sub(client)).toBe('+90 532 123 45 67 · Hastalar: Pamuk');
    });

    it('sorgu boşken son görüntülenenler listelenir; klavyeyle seçilip detaya gidilir; yazınca sonuçlar yerini alır', async () => {
        recent = [
            { kind: 'pet', id: 'p1', title: 'Pamuk', subtitle: 'Kedi · Ali Veli' },
            { kind: 'examination', id: 'e1', title: 'Pamuk', subtitle: 'Kontrol · 10.10.2026' },
            { kind: 'client', id: 'c1', title: 'Ali Veli', subtitle: '+90 532 123 45 67' }
        ];
        create();
        const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

        key({ key: 'k', ctrlKey: true });
        const list = document.querySelector('[data-testid="recently-viewed"]')!;

        expect(list.getAttribute('aria-label')).toBe('Son görüntülenenler');
        expect(groupLabels()).toEqual(['Hastalar', 'Müşteriler', 'Muayeneler']);
        expect(list.textContent).toContain('Kedi · Ali Veli');
        expect(list.textContent).toContain('+90 532 123 45 67');
        expect(list.textContent).toContain('Kontrol · 10.10.2026');
        expect(optionHrefs()).toEqual(['/panel/pets/p1', '/panel/clients/c1', '/panel/examinations/e1']);

        await typeQuery('a');
        expect(document.querySelector('[data-testid="recently-viewed"]')).toBeNull();
        await typeQuery('pamuk');
        expect(document.querySelector('[data-testid="recently-viewed"]')).toBeNull();
        expect(document.querySelectorAll('[role="option"]').length).toBe(2);
        await typeQuery('');
        expect(document.querySelector('[data-testid="recently-viewed"]')).not.toBeNull();

        const input = document.querySelector<HTMLInputElement>('.p-dialog input')!;

        key({ key: 'ArrowUp' }, input);
        key({ key: 'Enter' }, input);
        expect(navigate).toHaveBeenCalledWith(['/panel/examinations', 'e1']);
        expect(isVisible()).toBe(false);
    });

    it('ilk kullanımda (son görüntülenen yok) yazma ipucu ve listenin ne göstereceği yazılır', () => {
        create();
        key({ key: '/' });

        expect(document.querySelector('[data-testid="recently-viewed"]')).toBeNull();
        expect(document.querySelector('[data-testid="global-search-first-use"]')!.textContent).toContain('Açtığınız kayıtlar burada listelenir.');
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
        expect(navigate).toHaveBeenCalledWith(['/panel/clients', 'c1']);
        expect(isVisible()).toBe(false);
    });

    it('sonuç yoksa boş durum, tam hata olursa uyarı gösterir', async () => {
        create();
        key({ key: '/' });
        search.search.mockReturnValue(of({ clients: [], pets: [], failedKinds: [] }));
        await typeQuery('yok');
        expect(document.querySelector('[data-testid="global-search-no-result"]')!.textContent).toContain('"yok" için müşteri veya hasta bulunamadı.');
        search.search.mockReturnValue(throwError(() => new Error('x')));
        await typeQuery('hata');
        expect(document.querySelector('.p-dialog [role="alert"]')!.textContent).toContain('Arama yapılamadı');
    });

    it('sonuç yoksa Yeni kayıt, Ara sekmesinde aranan metinle ve form açık olarak açılır', async () => {
        create();
        const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

        key({ key: '/' });
        search.search.mockReturnValue(of({ clients: [], pets: [], failedKinds: [] }));
        await typeQuery('Ayşe Kaya');
        const button = document.querySelector<HTMLButtonElement>('[data-testid="global-search-no-result"] button')!;

        expect(button.textContent).toContain('Yeni kayıt: müşteri ve hasta');
        button.click();
        expect(navigate).toHaveBeenCalledWith(['/panel/patients'], { queryParams: { search: 'Ayşe Kaya', register: '1' } });
        expect(isVisible()).toBe(false);
    });

    it('kayıt izni yoksa veya salt okunurken sonuç yok durumunda Yeni kayıt sunulmaz', async () => {
        claims.delete('Pets.Create');
        create();
        key({ key: '/' });
        search.search.mockReturnValue(of({ clients: [], pets: [], failedKinds: [] }));
        await typeQuery('yok');
        expect(document.querySelector('[data-testid="global-search-no-result"] button')).toBeNull();

        TestBed.resetTestingModule();
        document.querySelectorAll('.p-dialog-mask').forEach((el) => el.remove());
        claims.add('Pets.Create');
        mutationBlocked = true;
        create();
        key({ key: '/' });
        search.search.mockReturnValue(of({ clients: [], pets: [], failedKinds: [] }));
        await typeQuery('yok');
        expect(document.querySelector('[data-testid="global-search-no-result"] button')).toBeNull();
    });

    it('alt şeritteki Ara sekmesi bağlantısı yeterince uzun sorguyu taşır', async () => {
        create();
        key({ key: '/' });
        const link = () => document.querySelector('[data-testid="global-search-patients-link"]')!.getAttribute('href');

        expect(link()).toBe('/panel/patients');
        await typeQuery('p');
        expect(link()).toBe('/panel/patients');
        await typeQuery('pamuk');
        expect(link()).toBe('/panel/patients?search=pamuk');
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
