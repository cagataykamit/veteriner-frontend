import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { AppPageHeaderComponent } from './app-page-header.component';

@Component({
    imports: [AppPageHeaderComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<app-page-header title="Başlık" [categoryLink]="categoryLink" [categoryLinkLabel]="categoryLinkLabel" />`
})
class HostComponent {
    categoryLink?: string | readonly unknown[] | UrlTree;
    categoryLinkLabel?: string;
}

describe('AppPageHeaderComponent', () => {
    async function create(url: string, setup: (host: HostComponent) => void = () => {}): Promise<HTMLElement> {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({ providers: [provideRouter([{ path: '**', children: [] }])] });
        await TestBed.inject(Router).navigateByUrl(url);
        const fixture = TestBed.createComponent(HostComponent);

        setup(fixture.componentInstance);
        fixture.detectChanges();

        return fixture.nativeElement as HTMLElement;
    }

    const categoryLink = (el: HTMLElement) => el.querySelector<HTMLAnchorElement>('[data-testid="page-header-category-link"]');
    /** Başlık bloğunun ilk satırı başlık değilse kategori satırıdır. */
    const firstLine = (el: HTMLElement) => el.querySelector('app-page-header > div')!.firstElementChild!.textContent?.trim();

    it('categoryLink yoksa menüdeki kategori (Panel, Ayarlar) düz yazı olarak çizilmez; ilk satır başlıktır', async () => {
        for (const url of ['/panel/today', '/panel/dashboard', '/panel/settings/clinics', '/panel/appointments', '/panel/yok']) {
            const el = await create(url);

            expect(categoryLink(el)).withContext(url).toBeNull();
            expect(el.querySelector('span')).withContext(url).toBeNull();
            expect(firstLine(el)).withContext(url).toBe('Başlık');
        }
    });

    it('categoryLink verilirse kategori aynı satırda listeye giden bağlantı olur', async () => {
        const el = await create('/panel/appointments/a1', (host) => {
            host.categoryLink = ['/panel/appointments'];
            host.categoryLinkLabel = 'Randevu listesine dön';
        });
        const link = categoryLink(el)!;

        expect(link.getAttribute('href')).toBe('/panel/appointments');
        expect(link.textContent?.trim()).toBe('Randevular');
        expect(link.getAttribute('aria-label')).toBe('Randevular: Randevu listesine dön');
        expect(el.querySelector('span')).toBeNull();
    });

    it('bağlantı yazısı menü grubu değil hedef listenin adıdır (sekme, menü öğesi, Ayarlar kartı)', async () => {
        const text = async (url: string, link: string | readonly unknown[]) => categoryLink(await create(url, (host) => (host.categoryLink = link)))!.textContent?.trim();

        expect(await text('/panel/pets/p1', '/panel/pets')).toBe('Hastalar');
        expect(await text('/panel/clients/c1', '/panel/clients')).toBe('Müşteriler');
        expect(await text('/panel/examinations/e1', '/panel/examinations')).toBe('Muayeneler');
        expect(await text('/panel/charges/new', ['/panel/charges'])).toBe('Ücretler');
        expect(await text('/panel/settings/clinics/k1', '/panel/settings/clinics')).toBe('Klinikler');
        expect(await text('/panel/settings/definitions/species/new', '/panel/settings/definitions/species')).toBe('Türler');
        expect(await text('/panel/reports/payments', '/panel/reports')).toBe('Raporlar');
    });

    it('UrlTree bağlantısında sorgu yok sayılır', async () => {
        const el = await create('/panel/appointments/a1', (host) => {
            host.categoryLink = TestBed.inject(Router).parseUrl('/panel/today?visit=v1');
        });

        expect(categoryLink(el)!.textContent?.trim()).toBe('Bugün');
    });

    it('hedef bir liste değilse menü grubunu, o da yoksa bağlantı etiketini yazar', async () => {
        const detail = await create('/panel/pets/p1/timeline', (host) => {
            host.categoryLink = ['/panel/pets', 'p1'];
            host.categoryLinkLabel = 'Hasta kartına dön';
        });

        expect(categoryLink(detail)!.textContent?.trim()).toBe('Müşteri ve Hasta');

        const unknown = await create('/panel/yok', (host) => {
            host.categoryLink = '/panel/yok/1';
            host.categoryLinkLabel = 'Geri dön';
        });
        const link = categoryLink(unknown)!;

        expect(link.textContent?.trim()).toBe('Geri dön');
        expect(link.getAttribute('aria-label')).toBeNull();
    });
});
