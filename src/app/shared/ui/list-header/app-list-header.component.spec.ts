import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AppListHeaderComponent } from './app-list-header.component';

@Component({
    imports: [AppListHeaderComponent],
    template: `
        <app-list-header title="Müşteriler" [count]="count">
            <input data-testid="search" />
            <button actions data-testid="clear">Temizle</button>
            <a actions data-testid="create">Yeni Müşteri</a>
        </app-list-header>
    `
})
class HostComponent {
    count: number | null = 16;
}

describe('AppListHeaderComponent', () => {
    function create(count: number | null = 16): HTMLElement {
        const fixture = TestBed.createComponent(HostComponent);

        fixture.componentInstance.count = count;
        fixture.detectChanges();

        return fixture.nativeElement as HTMLElement;
    }

    it('başlığı sayfanın tek h1 başlığı olarak yazar ve kayıt sayısını gösterir', () => {
        const el = create();
        const headings = el.querySelectorAll('h1');

        expect(headings.length).toBe(1);
        expect(headings[0].textContent?.trim()).toBe('Müşteriler');
        expect(el.textContent).toContain('16 kayıt');
    });

    it('kayıt yokken sayı satırını göstermez', () => {
        expect(create(0).textContent).not.toContain('kayıt');
        expect(create(null).textContent).not.toContain('kayıt');
    });

    it('arama alanı ve eylem düğmeleri aynı sağ blokta, düğmeler aramanın ardından gelir', () => {
        const el = create();
        const search = el.querySelector('[data-testid="search"]')!;
        const createLink = el.querySelector('[data-testid="create"]')!;
        const clear = el.querySelector('[data-testid="clear"]')!;

        expect(clear.parentElement).toBe(createLink.parentElement);
        expect(search.parentElement).toBe(clear.parentElement!.parentElement);
        expect(search.compareDocumentPosition(createLink) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(el.querySelector('h1')!.compareDocumentPosition(search) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
});
