import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppDetailSeeAllLinkComponent } from './app-detail-see-all-link.component';

@Component({
    standalone: true,
    imports: [AppDetailSeeAllLinkComponent],
    template: `<app-detail-see-all-link link="/panel/payments" [queryParams]="{ petId: 'pet-1' }" [itemCount]="itemCount()" [total]="total()" />`
})
class HostComponent {
    readonly itemCount = input(0);
    readonly total = input<number | null>(null);
}

describe('AppDetailSeeAllLinkComponent', () => {
    const render = async (itemCount: number, total: number | null = null) => {
        await TestBed.configureTestingModule({ imports: [HostComponent], providers: [provideRouter([])] }).compileComponents();
        const fixture = TestBed.createComponent(HostComponent);

        fixture.componentRef.setInput('itemCount', itemCount);
        fixture.componentRef.setInput('total', total);
        fixture.detectChanges();

        return (fixture.nativeElement as HTMLElement).querySelector('[data-testid="see-all-link"]');
    };

    it('liste boşken bağlantı çizilmez', async () => {
        expect(await render(0)).toBeNull();
    });

    it('kayıt varsa listenin altında bağlam parametresiyle "Tümünü gör →" yazar; sayı yoksa parantez yok', async () => {
        const a = await render(3);

        expect(a?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Tümünü gör →');
        expect(a?.getAttribute('href')).toBe('/panel/payments?petId=pet-1');
    });

    it('sunucu toplamı biliniyorsa sayı parantezde', async () => {
        expect((await render(5, 12))?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Tümünü gör (12) →');
    });
});
