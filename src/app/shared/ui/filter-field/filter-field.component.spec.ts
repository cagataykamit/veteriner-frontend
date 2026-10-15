import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FilterFieldComponent, type FilterFieldWidth } from './filter-field.component';

@Component({
    standalone: true,
    imports: [FilterFieldComponent],
    template: `<app-filter-field label="Başlangıç" labelFor="x" [active]="active()" [width]="width()"><input id="x" /></app-filter-field>`
})
class HostComponent {
    active = signal(false);
    width = signal<FilterFieldWidth>('date');
}

describe('FilterFieldComponent', () => {
    it('etiketi girdiye bağlar; çerçeve yok; tarih alanı dar', () => {
        const fixture = TestBed.createComponent(HostComponent);

        fixture.detectChanges();
        const el = fixture.nativeElement.querySelector('app-filter-field') as HTMLElement;
        const label = el.querySelector('label') as HTMLLabelElement;

        expect(label.getAttribute('for')).toBe('x');
        expect(label.textContent).toContain('Başlangıç');
        expect(el.className).not.toContain('border');
        expect(el.className).toContain('sm:w-[13rem]');
        expect(el.textContent).not.toContain('Aktif');
    });

    it('etkin filtre "Aktif" rozetini gösterir', () => {
        const fixture = TestBed.createComponent(HostComponent);

        fixture.componentInstance.active.set(true);
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('Aktif');
    });
});
