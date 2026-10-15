import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { debouncedAction } from './debounced-action';
import { SearchInputComponent } from './search-input.component';

@Component({
    standalone: true,
    imports: [SearchInputComponent],
    template: `<app-search-input inputId="q" [(value)]="text" (searchRequested)="searches.push(text())" />`
})
class HostComponent {
    text = signal('');
    searches: string[] = [];
}

@Component({
    standalone: true,
    template: ``
})
class DebounceHostComponent {
    calls = 0;
    readonly schedule = debouncedAction(() => this.calls++, 60);
}

describe('SearchInputComponent (ortak arama kutusu)', () => {
    let fixture: ComponentFixture<HostComponent>;
    let host: HostComponent;
    const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    const input = () => fixture.nativeElement.querySelector('input#q') as HTMLInputElement;

    const type = async (text: string) => {
        const el = input();

        el.value = text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        fixture.detectChanges();
        await wait(0);
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
        fixture = TestBed.createComponent(HostComponent);
        host = fixture.componentInstance;
        document.body.appendChild(fixture.nativeElement); // odak denetimi için
        fixture.detectChanges();
    });

    it('en az 2 karakter yazılınca bekleme süresinden sonra tek kez arar (350 ms)', async () => {
        await type('al');
        expect(host.searches.length).toBe(0);
        await wait(500);
        expect(host.searches).toEqual(['al']);
    });

    it('hızlı yazılan karakterler tek aramaya toplanır (son değerle)', async () => {
        await type('al');
        await wait(100);
        await type('ali');
        await wait(100);
        await type('ali v');
        await wait(500);
        expect(host.searches).toEqual(['ali v']);
    });

    it('tek karakterde otomatik arama yapılmaz', async () => {
        await type('a');
        await wait(500);
        expect(host.searches).toEqual([]);
    });

    it('Enter anında arar (bekleme olmadan), tek karakterde de', async () => {
        await type('a');
        input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        expect(host.searches).toEqual(['a']);
    });

    it('× yalnız metin varken görünür; tıklayınca temizler ve hemen arar (liste geri gelir)', async () => {
        expect(fixture.nativeElement.querySelector('button[aria-label="Aramayı temizle"]')).toBeNull();
        await type('ali');
        const clear = fixture.nativeElement.querySelector('button[aria-label="Aramayı temizle"]') as HTMLButtonElement;

        expect(clear).not.toBeNull();
        clear.click();
        fixture.detectChanges();
        expect(host.text()).toBe('');
        expect(host.searches).toEqual(['']);
        expect(document.activeElement).toBe(input()); // odak kutuda kalır
        expect(fixture.nativeElement.querySelector('button[aria-label="Aramayı temizle"]')).toBeNull();
    });

    it('metin tamamen silinince listeyi geri getirmek için arar', async () => {
        await type('ali');
        await wait(500);
        await type('');
        await wait(500);
        expect(host.searches).toEqual(['ali', '']);
    });

    afterEach(() => fixture.destroy());

    it('"Ara" düğmesi yoktur', () => {
        expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Ara');
    });
});

describe('debouncedAction', () => {
    const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

    it('art arda çağrılar tek eylemde toplanır', async () => {
        await TestBed.configureTestingModule({ imports: [DebounceHostComponent] }).compileComponents();
        const f = TestBed.createComponent(DebounceHostComponent);
        const c = f.componentInstance;

        c.schedule();
        await wait(20);
        c.schedule();
        await wait(20);
        c.schedule();
        await wait(150);
        expect(c.calls).toBe(1);
    });
});
