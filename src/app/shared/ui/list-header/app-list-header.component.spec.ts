import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { FilterFieldComponent } from '@/app/shared/ui/filter-field/filter-field.component';
import { AppListFiltersComponent } from '@/app/shared/ui/list-filters/app-list-filters.component';
import { AppListHeaderComponent } from './app-list-header.component';

@Component({
    imports: [AppListHeaderComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <app-list-header title="Müşteriler" [count]="count">
            <input data-testid="search" />
            <button actions data-testid="clear">Temizle</button>
            <a actions data-testid="create">Yeni müşteri</a>
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
        const tools = el.querySelector('[data-testid="list-header-tools"]')!;
        const search = el.querySelector('[data-testid="search"]')!;
        const createLink = el.querySelector('[data-testid="create"]')!;
        const clear = el.querySelector('[data-testid="clear"]')!;

        expect(clear.parentElement).toBe(createLink.parentElement);
        expect(tools.contains(search) && tools.contains(createLink)).toBe(true);
        expect(search.compareDocumentPosition(createLink) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(el.querySelector('h1')!.compareDocumentPosition(search) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('telefonda (G-02) 1. satır ad ve eylemler, 2. satır arama; filtre yoksa arama iki sütunu kaplar ve "Filtre" düğmesi yok', () => {
        const el = create();

        expect(el.querySelector('[data-testid="list-header-actions"]')!.className).toContain('max-sm:row-start-1');
        expect(el.querySelector('[data-testid="search"]')!.parentElement!.className).toContain('max-sm:*:col-span-2');
        expect(el.querySelector('[data-testid="list-filter-toggle"]')).toBeNull();
    });
});

@Component({
    imports: [AppListHeaderComponent, AppListFiltersComponent, FilterFieldComponent, FormsModule, SelectModule],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <app-list-header title="Randevular" [count]="3">
            <input data-testid="search" />
            <app-list-filters (clear)="cleared = cleared + 1">
                <app-filter-field label="Durum" labelId="lblStatus" [active]="!!status" width="select">
                    <p-select ariaLabelledBy="lblStatus" [options]="options" optionLabel="label" optionValue="value" [(ngModel)]="status" />
                </app-filter-field>
                <app-filter-field label="Bitiş" labelFor="to" [active]="!!to" width="date">
                    <input id="to" [(ngModel)]="to" />
                </app-filter-field>
                <app-filter-field label="Dönem" labelFor="period" width="select">
                    <input id="period" [(ngModel)]="period" />
                </app-filter-field>
            </app-list-filters>
        </app-list-header>
    `
})
class FilteredHostComponent {
    options = [
        { label: 'Planlandı', value: 'Scheduled' },
        { label: 'Tamamlandı', value: 'Completed' }
    ];
    status: string | null = 'Scheduled';
    to = '2026-11-30';
    period = 'upcoming';
    cleared = 0;
}

describe('AppListHeaderComponent + AppListFiltersComponent (G-02)', () => {
    it('telefonda "Filtre (n)" etkin filtreleri sayar (varsayılan değerdeki alan sayılmaz); kapalıyken özet, açınca panel', async () => {
        const fixture = TestBed.createComponent(FilteredHostComponent);

        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;
        const toggle = el.querySelector<HTMLButtonElement>('[data-testid="list-filter-toggle"]')!;
        const panel = el.querySelector('[data-testid="list-filters-panel"]')!;

        expect(toggle.textContent?.replace(/\s+/g, ' ').trim()).toBe('Filtre 2');
        expect(toggle.getAttribute('aria-expanded')).toBe('false');
        expect(panel.className).toContain('max-sm:hidden');
        expect(el.querySelector('[data-testid="list-filters-summary"]')?.textContent).toContain('Durum: Planlandı · Bitiş: 30.11.2026');

        toggle.click();
        fixture.detectChanges();

        expect(toggle.getAttribute('aria-expanded')).toBe('true');
        expect(panel.className).not.toContain('max-sm:hidden');
        expect(el.querySelector('[data-testid="list-filters-summary"]')).toBeNull();

        el.querySelector<HTMLButtonElement>('[data-testid="list-filters-clear"]')!.click();
        expect(fixture.componentInstance.cleared).toBe(1);
    });
});
