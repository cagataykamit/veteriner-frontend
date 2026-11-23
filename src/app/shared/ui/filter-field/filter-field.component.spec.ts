import { Component, signal, viewChildren, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { FilterFieldComponent, type FilterFieldWidth } from './filter-field.component';

@Component({
    standalone: true,
    imports: [FilterFieldComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
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

    it('sade ekranda rozet kapatılır (badge=false); özet metni ngModel değerinden: gün tarihi gün.ay.yıl, okunamazsa yalnız etiket', async () => {
        const fixture = TestBed.createComponent(ModelHostComponent);

        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
        const [dated, plain] = fixture.componentInstance.fields();

        expect((fixture.nativeElement as HTMLElement).querySelector('app-filter-field')!.textContent).not.toContain('Aktif');
        expect(dated.summaryText()).toBe('Bitiş: 30.11.2026');
        expect(plain.summaryText()).toBe('Hasta');
    });
});

@Component({
    standalone: true,
    imports: [FilterFieldComponent, FormsModule],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <app-filter-field label="Bitiş" labelFor="to" [active]="true" [badge]="false" width="date"><input id="to" [(ngModel)]="to" /></app-filter-field>
        <app-filter-field label="Hasta" labelFor="pet" [active]="true"><input id="pet" /></app-filter-field>
    `
})
class ModelHostComponent {
    to = '2026-11-30';
    readonly fields = viewChildren(FilterFieldComponent);
}
