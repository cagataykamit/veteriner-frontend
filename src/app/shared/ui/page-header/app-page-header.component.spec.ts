import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AppPageHeaderComponent } from './app-page-header.component';

@Component({
    imports: [AppPageHeaderComponent],
    template: `<app-page-header title="Başlık" [subtitle]="subtitle" [categoryLink]="categoryLink" [categoryLinkLabel]="categoryLinkLabel" />`
})
class HostComponent {
    subtitle?: string;
    categoryLink?: string | readonly unknown[];
    categoryLinkLabel?: string;
}

describe('AppPageHeaderComponent', () => {
    async function create(url: string, setup: (host: HostComponent) => void = () => {}): Promise<HTMLElement> {
        TestBed.configureTestingModule({ providers: [provideRouter([{ path: '**', children: [] }])] });
        await TestBed.inject(Router).navigateByUrl(url);
        const fixture = TestBed.createComponent(HostComponent);
        setup(fixture.componentInstance);
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    }

    async function render(url: string, subtitle?: string): Promise<string | null> {
        const el = await create(url, (host) => (host.subtitle = subtitle));
        return el.querySelector('span')?.textContent?.trim() ?? null;
    }

    const categoryLink = (el: HTMLElement) => el.querySelector<HTMLAnchorElement>('[data-testid="page-header-category-link"]');

    it('kategori etiketini adresin menü grubundan türetir', async () => {
        expect(await render('/panel/appointments')).toBe('Randevular');
    });

    it('menüde karşılığı olmayan adreste etiket göstermez', async () => {
        expect(await render('/panel/yok')).toBeNull();
    });

    it('verilen subtitle türetilmiş etiketin yerine geçer', async () => {
        expect(await render('/panel/appointments', 'Özel')).toBe('Özel');
    });

    it('categoryLink yoksa kategori düz yazı kalır', async () => {
        const el = await create('/panel/appointments');
        expect(categoryLink(el)).toBeNull();
        expect(el.querySelector('span')?.textContent?.trim()).toBe('Randevular');
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

    it('kategori adı bulunamazsa bağlantı etiketini yazar', async () => {
        const el = await create('/panel/yok', (host) => {
            host.categoryLink = '/panel/reports';
            host.categoryLinkLabel = 'Raporlar';
        });
        const link = categoryLink(el)!;
        expect(link.textContent?.trim()).toBe('Raporlar');
        expect(link.getAttribute('aria-label')).toBeNull();
    });
});
