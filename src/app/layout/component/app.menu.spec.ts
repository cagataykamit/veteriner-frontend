import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { PLATFORM_ADMIN_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { LayoutService } from '@/app/layout/service/layout.service';
import { MenuBadgeService } from '@/app/layout/service/menu-badge.service';
import { MENU_FLYOUT_CLOSE_DELAY_MS } from '@/app/layout/service/menu-flyout.service';
import { AppMenu } from './app.menu';

describe('AppMenu', () => {
    const rail = signal(false);
    const clinicLabel = signal<string | null>(null);
    let counts: Record<string, number | null>;

    // Varsayılan: tüm izinleri olan klinik kullanıcısı; platform yöneticisi claim'i izin değildir (ADR-037).
    const create = (hasClaim: (claim: string) => boolean = (c) => c !== PLATFORM_ADMIN_CLAIM): ComponentFixture<AppMenu> => {
        TestBed.configureTestingModule({
            imports: [AppMenu],
            providers: [
                provideRouter([{ path: '**', children: [] }]),
                { provide: AuthService, useValue: { hasOperationClaim: hasClaim, activeClinicLabel: clinicLabel } },
                { provide: LayoutService, useValue: { isMenuRail: rail, layoutState: signal({ activePath: null }) } },
                { provide: MenuBadgeService, useValue: { count: (key: string) => counts[key] ?? null, connect: () => undefined } }
            ]
        });
        const fixture = TestBed.createComponent(AppMenu);

        fixture.detectChanges();

        return fixture;
    };

    const root = (fixture: ComponentFixture<AppMenu>) => fixture.nativeElement as HTMLElement;
    const labels = (fixture: ComponentFixture<AppMenu>) => Array.from(root(fixture).querySelectorAll('.layout-menuitem-text')).map((el) => el.textContent?.trim());
    const link = (fixture: ComponentFixture<AppMenu>, label: string) => Array.from(root(fixture).querySelectorAll('a')).find((a) => a.querySelector('.layout-menuitem-text')?.textContent?.trim() === label)!;
    const badges = (fixture: ComponentFixture<AppMenu>) => Array.from(root(fixture).querySelectorAll('.layout-menuitem-badge')).map((el) => el.firstChild?.textContent);

    beforeEach(() => {
        localStorage.clear();
        rail.set(false);
        clinicLabel.set(null);
        counts = {};
    });

    afterEach(() => localStorage.clear());

    /** Başlık ve öğe sırası: başlık "# Ad", öğe adı düz; simge şeridinde ayırıcı "—". */
    const outline = (fixture: ComponentFixture<AppMenu>) =>
        Array.from(root(fixture).querySelectorAll('.layout-menu-heading, .layout-menu-divider, li[appMenuitem]')).map((el) =>
            el.classList.contains('layout-menu-heading') ? `# ${el.textContent?.trim()}` : el.classList.contains('layout-menu-divider') ? '—' : el.querySelector('.layout-menuitem-text')?.textContent?.trim()
        );

    it('menü ADR-023 bölüm başlıklarıyla gruplanır; başlıklar açılıp kapanmaz, Yönetim bölümü alta sabittir', () => {
        const fixture = create();

        expect(outline(fixture)).toEqual(['# Günlük iş', 'Bugün', 'Randevular', '# Müşteri ve hasta', 'Müşteri ve Hasta', '# Klinik', 'Kayıtlar', '# Para ve stok', 'Para', 'Stok', '# Yönetim', 'Raporlar', 'Özet', 'Ayarlar', 'WhatsApp destek']);
        expect(root(fixture).querySelector('.layout-menu-group-toggle')).toBeNull();
        expect(root(fixture).querySelector('.layout-menu-divider')).toBeNull();
        const pinned = root(fixture).querySelector('.layout-menu-pinned')!;

        expect(pinned.querySelector('.layout-menu-heading')?.textContent?.trim()).toBe('Yönetim');
        expect(Array.from(pinned.querySelectorAll('.layout-menuitem-text')).map((el) => el.textContent?.trim())).toEqual(['Raporlar', 'Özet', 'Ayarlar', 'WhatsApp destek']);
    });

    it('tüm girişleri izinle gizlenen bölümün başlığı da görünmez', () => {
        expect(outline(create((claim) => claim === 'Pets.Read'))).toEqual(['# Müşteri ve hasta', 'Müşteri ve Hasta', '# Yönetim', 'Ayarlar', 'WhatsApp destek']);
    });

    it('simge şeridinde bölüm başlıkları yerine ince ayırıcı çıkar', () => {
        rail.set(true);
        const fixture = create();

        expect(root(fixture).querySelector('.layout-menu-heading')).toBeNull();
        expect(outline(fixture)).toEqual(['—', 'Bugün', 'Randevular', '—', 'Müşteri ve Hasta', '—', 'Kayıtlar', '—', 'Para', 'Stok', '—', 'Raporlar', 'Özet', 'Ayarlar', 'WhatsApp destek']);
    });

    it('simge şeridinde aynı öğeler görünür ve her biri tek bağlantıdır; simge ve ad aynı tıklanabilir satırın içindedir', () => {
        rail.set(true);
        const fixture = create();

        expect(labels(fixture)).toContain('Kayıtlar');
        const items = Array.from(root(fixture).querySelectorAll('li[appMenuitem]'));

        expect(items.length).toBe(10);

        for (const li of items) {
            const links = li.querySelectorAll('a');

            expect(links.length).toBe(1);
            expect(links[0].querySelector('.layout-menuitem-icon')).not.toBeNull();
            expect(links[0].querySelector('.layout-menuitem-text')?.textContent?.trim()).toBeTruthy();
        }
    });

    it('izinsiz sekme görünmez: bağlantı yetkili ilk sekmeye gider, hiç yetkili sekme yoksa öğe çıkmaz', () => {
        const fixture = create((claim) => claim === 'StockMovements.Read');

        expect(labels(fixture)).toEqual(['Stok', 'Raporlar', 'Ayarlar', 'WhatsApp destek']);
        expect(link(fixture, 'Stok').getAttribute('href')).toBe('/panel/stock-movements');
    });

    it('WhatsApp destek yetkiye bağlı değildir: izni olmayan kullanıcıda da sabit bölümün en altında, yeni sekmede açılır', () => {
        clinicLabel.set('Patiler Kliniği');
        const fixture = create(() => false);
        const support = link(fixture, 'WhatsApp destek');

        expect(labels(fixture)).toEqual(['Ayarlar', 'WhatsApp destek']);
        expect(root(fixture).querySelector('.layout-menu-pinned li[appMenuitem]:last-child a')).toBe(support);
        expect(support.getAttribute('href')).toBe('https://wa.me/905439580091?text=Merhaba%2C%20Vetinity%20panelinden%20yaz%C4%B1yorum.%20Klinik%3A%20Patiler%20Klini%C4%9Fi');
        expect(support.getAttribute('target')).toBe('_blank');
        expect(support.getAttribute('rel')).toBe('noopener');
        expect(support.querySelector('.layout-menuitem-icon')?.classList).toContain('pi-whatsapp');
        expect(support.getAttribute('aria-label')).toBeNull();

        clinicLabel.set(null);
        fixture.detectChanges();
        expect(new URL(support.getAttribute('href')!).searchParams.get('text')).toBe('Merhaba, Vetinity panelinden yazıyorum.');
    });

    it('simge şeridinde WhatsApp destek bağlantısı adını aria-label ile verir', () => {
        rail.set(true);

        expect(link(create(), 'WhatsApp destek').getAttribute('aria-label')).toBe('WhatsApp destek');
    });

    it('tüm sekmeler yetkiliyse bağlantı ilk sekmeye gider', () => {
        expect(link(create(), 'Müşteri ve Hasta').getAttribute('href')).toBe('/panel/patients');
    });

    it('öğe, sekmelerinden herhangi birindeki sayfada vurgulanır', async () => {
        const fixture = create();

        await TestBed.inject(Router).navigateByUrl('/panel/pets?clientId=c1');
        fixture.detectChanges();
        expect(link(fixture, 'Müşteri ve Hasta').classList).toContain('active-route');
        expect(link(fixture, 'Müşteri ve Hasta').getAttribute('aria-current')).toBe('page');
        expect(link(fixture, 'Randevular').classList).not.toContain('active-route');

        await TestBed.inject(Router).navigateByUrl('/panel/administrations');
        fixture.detectChanges();
        expect(link(fixture, 'Kayıtlar').classList).toContain('active-route');
        expect(link(fixture, 'Müşteri ve Hasta').classList).not.toContain('active-route');
    });

    it('sayaç bekleyen sayıyı gösterir; 0 gizli, 99 üstü 99+; Kayıtlar sayacının metni neyi saydığını söyler', () => {
        counts = { waitingVisits: 3, requestedLabResults: 250 };
        const fixture = create();

        expect(badges(fixture)).toEqual(['3', '99+']);
        expect(link(fixture, 'Kayıtlar').querySelector('.sr-only')?.textContent?.trim()).toBe('sonuç bekleyen lab istemi');
        expect(link(fixture, 'Bugün').querySelector('.sr-only')?.textContent?.trim()).toBe('bekleyen');
        // Oku olmayan öğede görünmez ok yeri: rozet oklu öğelerinkiyle aynı sütunda.
        expect(link(fixture, 'Bugün').querySelector('[data-testid="menu-badge-arrow-spacer"]')?.classList).toContain('invisible');
        expect(link(fixture, 'Kayıtlar').querySelector('[data-testid="menu-badge-arrow-spacer"]')).toBeNull();

        counts = { waitingVisits: 0, requestedLabResults: null };
        const hidden = TestBed.createComponent(AppMenu);

        hidden.detectChanges();
        expect(badges(hidden)).toEqual([]);
    });

    describe('alt sayfa paneli (flyout)', () => {
        const row = (fixture: ComponentFixture<AppMenu>, label: string) => link(fixture, label).closest('li') as HTMLElement;
        const pointer = (el: Element, type: 'pointerenter' | 'pointerleave', pointerType = 'mouse') => el.dispatchEvent(new PointerEvent(type, { pointerType }));

        const hover = (fixture: ComponentFixture<AppMenu>, label: string, pointerType = 'mouse') => {
            pointer(row(fixture, label), 'pointerenter', pointerType);
            fixture.detectChanges();
        };

        const panels = () => Array.from(document.querySelectorAll<HTMLElement>('.layout-menu-flyout'));
        const panel = () => panels()[0];
        const items = () => Array.from(panel()?.querySelectorAll<HTMLAnchorElement>('[role="menuitem"]') ?? []);
        const itemLabels = () => items().map((a) => a.querySelector('.layout-menu-flyout-text')?.textContent?.trim());
        const key = (el: Element, k: string) => el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
        const tabbed = ['Randevular', 'Müşteri ve Hasta', 'Kayıtlar', 'Para', 'Stok'];

        afterEach(() => {
            vi.useRealTimers();
            panels().forEach((p) => p.remove());
        });

        it('açık menüde ok ve açılır işaret yalnız sekmeli satırlardadır; sekmesiz satırda panel açılmaz', () => {
            const fixture = create();

            for (const label of ['Bugün', ...tabbed, 'Raporlar', 'Özet', 'Ayarlar']) {
                const hasFlyout = tabbed.includes(label);

                expect(link(fixture, label).querySelector('.layout-menuitem-flyout-toggler') !== null, label).toBe(hasFlyout);
                expect(link(fixture, label).getAttribute('aria-haspopup'), label).toBe(hasFlyout ? 'menu' : null);
                expect(link(fixture, label).getAttribute('aria-expanded'), label).toBe(hasFlyout ? 'false' : null);
            }

            hover(fixture, 'Bugün');
            hover(fixture, 'Ayarlar');
            expect(panels()).toEqual([]);
        });

        it('fareyle üzerine gelince sekmeler body altındaki panelde açılır (kenar çubuğu kırpmaz); panele geçerken kapanmaz, çıkınca kapanır', () => {
            vi.useFakeTimers();
            const fixture = create();

            hover(fixture, 'Kayıtlar');
            expect(panels().length).toBe(1);
            expect(panel().parentElement).toBe(document.body);
            expect(panel().getAttribute('role')).toBe('menu');
            expect(panel().getAttribute('aria-label')).toBe('Kayıtlar alt sayfaları');
            expect(link(fixture, 'Kayıtlar').getAttribute('aria-expanded')).toBe('true');
            expect(link(fixture, 'Kayıtlar').getAttribute('aria-controls')).toBe(panel().id);
            expect(itemLabels()).toEqual(['Muayeneler', 'Tedaviler', 'Reçeteler', 'Aşılar', 'Lab sonuçları', 'Görüntüleme', 'Yatışlar', 'Uygulamalar']);
            expect(panel().textContent, 'panelde başlık yok').not.toContain('Kayıtlar');

            pointer(row(fixture, 'Kayıtlar'), 'pointerleave');
            vi.advanceTimersByTime(100);
            pointer(panel(), 'pointerenter');
            vi.advanceTimersByTime(500);
            fixture.detectChanges();
            expect(panels().length).toBe(1);

            pointer(panel(), 'pointerleave');
            vi.advanceTimersByTime(MENU_FLYOUT_CLOSE_DELAY_MS);
            fixture.detectChanges();
            expect(panels()).toEqual([]);
            expect(link(fixture, 'Kayıtlar').getAttribute('aria-expanded')).toBe('false');
        });

        it('panelin oku satırın ortasını gösterir; panel pencere kenarına kaysa da', () => {
            const fixture = create();
            const rowCenter = () => panel().style.getPropertyValue('--layout-menu-flyout-row-center');
            const anchorAt = (label: string, top: number) => vi.spyOn(link(fixture, label), 'getBoundingClientRect').mockReturnValue(new DOMRect(0, top, 200, 38));

            anchorAt('Para', 300);
            hover(fixture, 'Para');
            expect(panel().style.top).toBe('300px');
            expect(rowCenter()).toBe('19px');

            anchorAt('Stok', 2);
            hover(fixture, 'Stok');
            expect(panel().style.top, 'pencere kenarından 8 px içeride').toBe('8px');
            expect(rowCenter()).toBe('13px');
        });

        it('aynı anda tek panel açıktır', () => {
            const fixture = create();

            hover(fixture, 'Para');
            hover(fixture, 'Stok');
            expect(panels().length).toBe(1);
            expect(itemLabels()).toEqual(['Ürünler', 'Stok durumu', 'Stok hareketleri', 'Mal kabul']);
        });

        it('dokunmatikte panel açılmaz; dokunuş satırın mevcut gezinmesini yapar', () => {
            const fixture = create();

            hover(fixture, 'Para', 'touch');
            expect(panels()).toEqual([]);
            expect(link(fixture, 'Para').getAttribute('href')).toBe('/panel/charges');
        });

        it('yalnız yetkili sekmeler görünür; tek sekme kalırsa ok ve panel yoktur', () => {
            const fixture = create((claim) => claim === 'Products.Read');

            hover(fixture, 'Stok');
            expect(itemLabels()).toEqual(['Ürünler', 'Stok durumu']);

            TestBed.resetTestingModule();
            panels().forEach((p) => p.remove());
            const single = create((claim) => claim === 'StockMovements.Read');

            expect(link(single, 'Stok').querySelector('.layout-menuitem-flyout-toggler')).toBeNull();
            expect(link(single, 'Stok').getAttribute('aria-haspopup')).toBeNull();
            hover(single, 'Stok');
            expect(panels()).toEqual([]);
        });

        it('etkin sekme vurgulanır (aria-current); sayaçlı sekme panelde de sayacı gösterir', async () => {
            counts = { requestedLabResults: 4 };
            const fixture = create();

            await TestBed.inject(Router).navigateByUrl('/panel/charges/pending');
            fixture.detectChanges();
            hover(fixture, 'Para');
            const active = items().filter((a) => a.classList.contains('active-route'));

            expect(active.map((a) => a.textContent?.trim())).toEqual(['Ücret bekleyenler']);
            expect(active[0].getAttribute('aria-current')).toBe('page');

            hover(fixture, 'Kayıtlar');
            expect(items().filter((a) => a.classList.contains('active-route'))).toEqual([]);
            const lab = items().find((a) => a.textContent?.includes('Lab sonuçları'))!;

            expect(lab.querySelector('.layout-menuitem-badge')?.firstChild?.textContent).toBe('4');
            expect(items().filter((a) => a.querySelector('.layout-menuitem-badge'))).toHaveLength(1);
        });

        it('sekmeye tıklamak o sayfaya gider ve paneli kapatır', async () => {
            const fixture = create();

            hover(fixture, 'Randevular');
            const calendar = items().find((a) => a.textContent?.trim() === 'Takvim')!;

            expect(calendar.getAttribute('href')).toBe('/panel/appointments/calendar');
            calendar.click();
            await fixture.whenStable();
            fixture.detectChanges();
            expect(TestBed.inject(Router).url).toBe('/panel/appointments/calendar');
            expect(panels()).toEqual([]);
        });

        it('klavye: Sağ ok açıp ilk sekmeye odaklanır, Aşağı/Yukarı gezinir, Escape kapatıp odağı satıra verir', () => {
            const fixture = create();
            const para = link(fixture, 'Para');

            para.focus();
            key(para, 'ArrowRight');
            fixture.detectChanges();
            expect(itemLabels()).toEqual(['Ücretler', 'Ücret bekleyenler', 'Ödemeler', 'Satışlar']);
            expect(document.activeElement).toBe(items()[0]);

            key(items()[0], 'ArrowDown');
            expect(document.activeElement).toBe(items()[1]);
            key(items()[1], 'ArrowUp');
            key(items()[0], 'ArrowUp');
            expect(document.activeElement).toBe(items()[3]);

            key(items()[3], 'Escape');
            fixture.detectChanges();
            expect(panels()).toEqual([]);
            expect(document.activeElement).toBe(para);
            expect(para.getAttribute('aria-expanded')).toBe('false');
        });

        it('klavye: odaklanmak paneli açmaz; Enter açıp kapatır, odak satırda kalır; odak başka satıra geçince açık panel kapanır', () => {
            const fixture = create();
            const stok = link(fixture, 'Stok');

            stok.focus();
            fixture.detectChanges();
            expect(panels()).toEqual([]);

            const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });

            stok.dispatchEvent(enter);
            fixture.detectChanges();
            expect(enter.defaultPrevented, 'satırın gezinmesi yapılmaz').toBe(true);
            expect(itemLabels()).toEqual(['Ürünler', 'Stok durumu', 'Stok hareketleri', 'Mal kabul']);
            expect(stok.getAttribute('aria-expanded')).toBe('true');
            expect(stok.getAttribute('aria-controls')).toBe(panel().id);
            expect(document.activeElement).toBe(stok);

            key(stok, 'Enter');
            fixture.detectChanges();
            expect(panels()).toEqual([]);
            expect(stok.getAttribute('aria-expanded')).toBe('false');

            key(stok, 'Enter');
            fixture.detectChanges();
            link(fixture, 'Raporlar').focus();
            fixture.detectChanges();
            expect(panels()).toEqual([]);
        });

        it('klavye: Boşluk açıp kapatır; Aşağı ok açıp ilk sekmeye odaklanır, açık panelde de ilk sekmeye geçer', () => {
            const fixture = create();
            const para = link(fixture, 'Para');

            para.focus();
            const space = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });

            para.dispatchEvent(space);
            fixture.detectChanges();
            expect(space.defaultPrevented).toBe(true);
            expect(panels().length).toBe(1);
            expect(document.activeElement).toBe(para);
            key(para, ' ');
            fixture.detectChanges();
            expect(panels()).toEqual([]);

            key(para, 'ArrowDown');
            fixture.detectChanges();
            expect(document.activeElement).toBe(items()[0]);

            key(items()[0], 'Escape');
            fixture.detectChanges();
            key(para, 'Enter');
            fixture.detectChanges();
            key(para, 'ArrowDown');
            expect(document.activeElement).toBe(items()[0]);
        });

        it('klavye: sekmede Enter o sayfaya gider ve paneli kapatır', async () => {
            const fixture = create();
            const randevular = link(fixture, 'Randevular');

            randevular.focus();
            key(randevular, 'ArrowDown');
            fixture.detectChanges();
            const calendar = items().find((a) => a.textContent?.trim() === 'Takvim')!;

            calendar.focus();
            // Bağlantıda Enter'in varsayılan eylemi tıklamadır; olay sentetik olduğundan tıklama elle tetiklenir.
            const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });

            calendar.dispatchEvent(enter);
            expect(enter.defaultPrevented, 'panel Enter tuşunu engellemez').toBe(false);
            calendar.click();
            await fixture.whenStable();
            fixture.detectChanges();
            expect(TestBed.inject(Router).url).toBe('/panel/appointments/calendar');
            expect(panels()).toEqual([]);
        });

        it('klavye: değiştirici tuşlu Enter satırın kendi gezinmesine bırakılır; sekmesiz satırda Enter engellenmez', () => {
            const fixture = create();
            const ctrlEnter = new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true, cancelable: true });

            link(fixture, 'Para').dispatchEvent(ctrlEnter);
            fixture.detectChanges();
            expect(ctrlEnter.defaultPrevented).toBe(false);
            expect(panels()).toEqual([]);

            const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });

            link(fixture, 'Bugün').dispatchEvent(enter);
            expect(enter.defaultPrevented).toBe(false);
        });

        it('klavye: Tab panelden çıkarken paneli kapatır ve odağı satıra verir (tarayıcı oradan devam eder)', () => {
            const fixture = create();
            const para = link(fixture, 'Para');

            para.focus();
            key(para, 'ArrowRight');
            fixture.detectChanges();
            const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });

            items()[0].dispatchEvent(tab);
            fixture.detectChanges();
            expect(tab.defaultPrevented).toBe(false);
            expect(document.activeElement).toBe(para);
            expect(panels()).toEqual([]);
        });

        it('klavye: fareyle açık panel satırda Escape ile kapanır, odak satırda kalır; fare tıklaması satırın gezinmesini yapar', async () => {
            const fixture = create();
            const para = link(fixture, 'Para');

            para.focus();
            hover(fixture, 'Para');
            key(para, 'Escape');
            fixture.detectChanges();
            expect(panels()).toEqual([]);
            expect(document.activeElement).toBe(para);

            para.click();
            await fixture.whenStable();
            expect(TestBed.inject(Router).url).toBe('/panel/charges');
        });

        it('daraltılmış menüde ad ipucu yerine başlıksız panel açılır (ad yalnız ekran okuyucu etiketinde); sekmesiz satırda panel yoktur', () => {
            rail.set(true);
            const fixture = create();

            hover(fixture, 'Özet');
            expect(panels()).toEqual([]);
            expect(link(fixture, 'Özet').getAttribute('aria-haspopup')).toBeNull();

            hover(fixture, 'Müşteri ve Hasta');
            expect(panel().textContent).not.toContain('Müşteri ve Hasta');
            expect(panel().getAttribute('aria-label')).toBe('Müşteri ve Hasta alt sayfaları');
            expect(itemLabels()).toEqual(['Ara', 'Müşteriler', 'Hastalar', 'Portal gelen kutusu']);
            expect(link(fixture, 'Müşteri ve Hasta').getAttribute('aria-haspopup')).toBe('menu');
        });

        it('sayfa değişince açık panel kapanır', async () => {
            const fixture = create();

            hover(fixture, 'Stok');
            await TestBed.inject(Router).navigateByUrl('/panel/today');
            fixture.detectChanges();
            expect(panels()).toEqual([]);
        });
    });
});
