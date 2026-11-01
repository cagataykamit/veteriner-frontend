import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppDetailRowLinkComponent } from './app-detail-row-link.component';

@Component({
    standalone: true,
    imports: [AppDetailRowLinkComponent],
    template: `<app-detail-row-link [link]="['/panel/appointments', 'a1']" ariaLabel="Randevu detayı: 12.10.2026" />`
})
class HostComponent {}

describe('AppDetailRowLinkComponent', () => {
    it('hap biçiminde "Detay" bağlantısı; adres ve erişilebilir ad taşır', async () => {
        await TestBed.configureTestingModule({ imports: [HostComponent], providers: [provideRouter([])] }).compileComponents();
        const fixture = TestBed.createComponent(HostComponent);

        fixture.detectChanges();
        const a = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="detail-row-link"]')!;

        expect(a.textContent?.trim()).toBe('Detay');
        expect(a.getAttribute('href')).toBe('/panel/appointments/a1');
        expect(a.getAttribute('aria-label')).toBe('Randevu detayı: 12.10.2026');
        expect(a.classList).toContain('rounded-full');
        expect(a.querySelector('i.pi-angle-right')).not.toBeNull();
    });
});
