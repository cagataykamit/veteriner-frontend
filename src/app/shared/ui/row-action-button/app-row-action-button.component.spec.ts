import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { Tooltip } from 'primeng/tooltip';
import { AppRowActionButtonComponent, type RowActionKind } from './app-row-action-button.component';

@Component({
    imports: [AppRowActionButtonComponent],
    template: `<app-row-action-button [action]="action" [label]="label" [link]="link" [disabled]="disabled" [loading]="loading" (pressed)="presses = presses + 1" />`
})
class HostComponent {
    action: RowActionKind = 'detail';
    label?: string;
    link?: string | readonly unknown[];
    disabled = false;
    loading = false;
    presses = 0;
}

describe('AppRowActionButtonComponent', () => {
    function create(setup: (host: HostComponent) => void = () => {}) {
        TestBed.configureTestingModule({ providers: [provideRouter([])] });
        const fixture = TestBed.createComponent(HostComponent);

        setup(fixture.componentInstance);
        fixture.detectChanges();
        const control = () => fixture.nativeElement.querySelector('.row-action-button') as HTMLElement;
        const tooltip = () => fixture.debugElement.query(By.css('.row-action-button')).injector.get(Tooltip);

        return { fixture, host: fixture.componentInstance, control, tooltip };
    }

    it('her eylem Font Awesome Solid simgesi, Türkçe aria-label ve aynı metinli ipucu taşır; metin çizilmez', () => {
        const cases: [RowActionKind, string, string][] = [
            ['detail', 'fa-eye', 'Detay'],
            ['edit', 'fa-pen-to-square', 'Düzenle'],
            ['delete', 'fa-trash-can', 'Sil'],
            ['void', 'fa-ban', 'İptal et']
        ];

        for (const [action, icon, label] of cases) {
            TestBed.resetTestingModule();
            const { control, tooltip } = create((h) => (h.action = action));
            const i = control().querySelector('i')!;

            expect(i.classList).withContext(action).toContain('fa-solid');
            expect(i.classList).withContext(action).toContain(icon);
            expect(i.getAttribute('aria-hidden')).toBe('true');
            expect(control().getAttribute('aria-label')).withContext(action).toBe(label);
            expect(tooltip().content).withContext(action).toBe(label);
            expect(tooltip().tooltipPosition).toBe('top');
            expect(control().textContent!.trim()).toBe('');
        }
    });

    it('yalnız Sil ve İptal tehlike rengi sınıfını alır', () => {
        for (const [action, danger] of [
            ['detail', false],
            ['edit', false],
            ['delete', true],
            ['void', true]
        ] as const) {
            TestBed.resetTestingModule();
            const { control } = create((h) => (h.action = action));

            expect(control().classList.contains('row-action-button--danger')).withContext(action).toBe(danger);
        }
    });

    it('label verilirse aria-label ve ipucu onu kullanır, simge türü değişmez', () => {
        const { control, tooltip } = create((h) => {
            h.action = 'edit';
            h.label = 'Düzelt';
        });

        expect(control().getAttribute('aria-label')).toBe('Düzelt');
        expect(tooltip().content).toBe('Düzelt');
        expect(control().querySelector('i')!.classList).toContain('fa-pen-to-square');
    });

    it('link verilirse bağlantı olarak çizilir', () => {
        const { control } = create((h) => (h.link = ['/panel/clients', 'c1']));

        expect(control().tagName).toBe('A');
        expect(control().getAttribute('href')).toBe('/panel/clients/c1');
    });

    it('link yoksa tıklamada pressed yayar', () => {
        const { control, host } = create((h) => (h.action = 'void'));

        expect(control().tagName).toBe('BUTTON');
        expect(control().getAttribute('type')).toBe('button');
        control().click();
        expect(host.presses).toBe(1);
    });

    it('devre dışıyken aria-disabled taşır, pressed yaymaz; bağlantı yönlendirmez ama ipucu kalır', () => {
        const { control, host, tooltip } = create((h) => {
            h.action = 'edit';
            h.label = 'Düzenle (salt okunur)';
            h.link = ['/panel/x'];
            h.disabled = true;
        });

        expect(control().tagName).toBe('BUTTON');
        expect(control().getAttribute('aria-disabled')).toBe('true');
        expect(tooltip().content).toBe('Düzenle (salt okunur)');
        control().click();
        expect(host.presses).toBe(0);
    });

    it('işlem sürerken dönen simge ve aria-busy gösterir, pressed yaymaz', () => {
        const { control, host } = create((h) => {
            h.action = 'void';
            h.loading = true;
        });

        expect(control().querySelector('i')!.classList).toContain('fa-spinner');
        expect(control().getAttribute('aria-busy')).toBe('true');
        control().click();
        expect(host.presses).toBe(0);
    });

    it('tıklanabilir alan en az 32×32 px', () => {
        const { control } = create();
        const rect = control().getBoundingClientRect();

        expect(rect.width).toBeGreaterThanOrEqual(32);
        expect(rect.height).toBeGreaterThanOrEqual(32);
    });
});
