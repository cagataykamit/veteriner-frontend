import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AppPageHeaderComponent } from './app-page-header.component';

@Component({
    imports: [AppPageHeaderComponent],
    template: `<app-page-header title="Başlık" [subtitle]="subtitle" />`
})
class HostComponent {
    subtitle?: string;
}

describe('AppPageHeaderComponent', () => {
    async function render(url: string, subtitle?: string): Promise<string | null> {
        TestBed.configureTestingModule({ providers: [provideRouter([{ path: '**', children: [] }])] });
        await TestBed.inject(Router).navigateByUrl(url);
        const fixture = TestBed.createComponent(HostComponent);
        fixture.componentInstance.subtitle = subtitle;
        fixture.detectChanges();
        return (fixture.nativeElement as HTMLElement).querySelector('span')?.textContent?.trim() ?? null;
    }

    it('kategori etiketini adresin menü grubundan türetir', async () => {
        expect(await render('/panel/appointments')).toBe('Randevular');
    });

    it('menüde karşılığı olmayan adreste etiket göstermez', async () => {
        expect(await render('/panel/yok')).toBeNull();
    });

    it('verilen subtitle türetilmiş etiketin yerine geçer', async () => {
        expect(await render('/panel/appointments', 'Özel')).toBe('Özel');
    });
});
