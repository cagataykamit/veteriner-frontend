import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { providePrimeNG } from 'primeng/config';
import { SelectModule } from 'primeng/select';
import { PRIMENG_TR } from './primeng-tr';

@Component({
    standalone: true,
    imports: [ReactiveFormsModule, SelectModule],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <p-select inputId="sel" [formControl]="control" [options]="options" optionLabel="label" optionValue="value" placeholder="Aşı seçin" [filter]="true" filterBy="label" filterPlaceholder="Ara…" [showClear]="true" />
        <button id="outside" type="button">dışarısı</button>
    `
})
class HostComponent {
    control = new FormControl<string>('');
    options = [
        { label: 'Kuduz', value: 'k' },
        { label: 'Karma', value: 'm' }
    ];
}

/** Küçük sabit listelerde (aşı tanımı, muayene vb.) ortak filtreli açılır kutu davranışı; PrimeNG + global Türkçe metinler. */
describe('Filtreli p-select ortak davranışı', () => {
    let fixture: ComponentFixture<HostComponent>;
    const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    const overlay = () => document.querySelector('.p-select-overlay') as HTMLElement | null;
    const filterInput = () => overlay()?.querySelector('input') as HTMLInputElement | null;

    const open = async () => {
        (fixture.nativeElement.querySelector('.p-select') as HTMLElement).click();
        fixture.detectChanges();
        await wait(400);
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [HostComponent], providers: [providePrimeNG({ translation: PRIMENG_TR })] }).compileComponents();
        fixture = TestBed.createComponent(HostComponent);
        document.body.appendChild(fixture.nativeElement);
        fixture.detectChanges();
    });

    afterEach(() => {
        fixture.destroy();
    });

    it('açılınca filtre kutusu açık, "Ara…" yer tutuculu ve odakta', async () => {
        await open();
        const input = filterInput();

        expect(input).not.toBeNull();
        expect(input!.placeholder).toBe('Ara…');
        expect(document.activeElement).toBe(input);
    });

    it('eşleşme yoksa Türkçe "Sonuç bulunamadı" gösterir', async () => {
        await open();
        const input = filterInput()!;

        input.value = 'zzzz';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        fixture.detectChanges();
        await wait(200);
        expect(overlay()!.textContent).toContain('Sonuç bulunamadı');
        expect(overlay()!.textContent).not.toContain('No results');
    });

    it('seçim yapılınca × görünür ve temizler', async () => {
        fixture.componentInstance.control.setValue('k');
        fixture.detectChanges();
        const clear = fixture.nativeElement.querySelector('.p-select-clear-icon, [data-pc-section="clearicon"]') as Element;

        expect(clear).not.toBeNull();
        clear.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        fixture.detectChanges();
        expect(fixture.componentInstance.control.value).toBeNull();
    });

    it('panel dışına tıklayınca kapanır', async () => {
        await open();
        expect(overlay()).not.toBeNull();
        (document.querySelector('#outside') as HTMLElement).click();
        fixture.detectChanges();
        await wait(500);
        expect(overlay()).toBeNull();
    });
});
