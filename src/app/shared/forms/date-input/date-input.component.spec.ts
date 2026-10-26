import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { providePrimeNG } from 'primeng/config';
import { PRIMENG_TR } from '@/app/core/i18n/primeng-tr';
import { fromIstanbulDateTimeLocalInputToUtcIso } from '@/app/shared/utils/date.utils';
import { DateInputComponent } from './date-input.component';
import type { DateInputType } from './date-input-value.utils';

@Component({
    standalone: true,
    imports: [ReactiveFormsModule, DateInputComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<app-date-input inputId="d" [type]="type()" [min]="min()" [max]="max()" [formControl]="control" />`
})
class HostComponent {
    control = new FormControl<string>('', { nonNullable: true });
    type = signal<DateInputType>('date');
    min = signal<string | null>(null);
    max = signal<string | null>(null);
}

describe('DateInputComponent', () => {
    let fixture: ComponentFixture<HostComponent>;
    let host: HostComponent;

    const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    const input = () => fixture.nativeElement.querySelector('input#d') as HTMLInputElement;
    const panel = () => document.querySelector('.p-datepicker-panel') as HTMLElement | null;

    /** Gerçek kullanıcı gibi: tuş basışı + metin + input olayı (PrimeNG yalnız tuşla gelen girdiyi işler). */
    const typeText = async (text: string) => {
        const el = input();

        el.focus();
        el.dispatchEvent(new KeyboardEvent('keydown', { key: text.slice(-1), bubbles: true }));
        el.value = text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        fixture.detectChanges();
        await wait(50);
    };

    const create = async (type: DateInputType = 'date') => {
        await TestBed.configureTestingModule({ imports: [HostComponent], providers: [providePrimeNG({ translation: PRIMENG_TR })] }).compileComponents();
        fixture = TestBed.createComponent(HostComponent);
        host = fixture.componentInstance;
        host.type.set(type);
        document.body.appendChild(fixture.nativeElement);
        fixture.detectChanges();
        await wait(50);
    };

    afterEach(() => fixture?.destroy());

    it('date: gg.aa.yyyy yazılınca form değeri yyyy-MM-dd olur', async () => {
        await create('date');
        await typeText('11.10.2026');
        expect(host.control.value).toBe('2026-10-11');
        expect(host.control.errors).toBeNull();
    });

    it('datetime-local: gg.aa.yyyy ss:dd yazılınca yyyy-MM-ddTHH:mm olur', async () => {
        await create('datetime-local');
        await typeText('11.10.2026 13:30');
        expect(host.control.value).toBe('2026-10-11T13:30');
    });

    it('tuş olayı olmadan gelen girdi (yapıştırma, otomatik doldurma, dikte) da işlenir', async () => {
        await create('date');
        const el = input();

        el.focus();
        el.value = '11.10.2026';
        el.dispatchEvent(new Event('input', { bubbles: true }));
        fixture.detectChanges();
        await wait(50);
        expect(host.control.value).toBe('2026-10-11');
    });

    it('time: ss:dd yazılınca HH:mm olur', async () => {
        await create('time');
        await typeText('09:05');
        expect(host.control.value).toBe('09:05');
    });

    it('geçersiz yazı: değer boş, dateInvalid hatası ve Türkçe mesaj; düzeltince hata gider', async () => {
        await create('date');
        await typeText('31.02.2026');
        expect(host.control.value).toBe('');
        expect(host.control.hasError('dateInvalid')).toBeTrue();
        expect(fixture.nativeElement.textContent).not.toContain('Geçerli bir tarih girin'); // yazarken gösterilmez
        input().blur();
        fixture.detectChanges();
        await wait(50);
        expect(fixture.nativeElement.textContent).toContain('Geçerli bir tarih girin (gg.aa.yyyy).');
        await typeText('28.02.2026');
        expect(host.control.value).toBe('2026-02-28');
        expect(host.control.hasError('dateInvalid')).toBeFalse();
        expect(fixture.nativeElement.textContent).not.toContain('Geçerli bir tarih girin');
    });

    it('yazarken girdi geri sıfırlanmaz (yarım yazı korunur)', async () => {
        await create('date');
        await typeText('11.1');
        await wait(300);
        expect(input().value).toBe('11.1');
    });

    it('formdan gelen değer gg.aa.yyyy olarak görünür; boş değer temizler (geçersiz yazı kalıntısı dahil)', async () => {
        await create('date');
        host.control.setValue('2026-10-11');
        fixture.detectChanges();
        await wait(50);
        expect(input().value).toBe('11.10.2026');
        await typeText('31.02.2026');
        expect(host.control.hasError('dateInvalid')).toBeTrue();
        host.control.setValue('');
        fixture.detectChanges();
        await wait(50);
        expect(input().value).toBe('');
        expect(host.control.hasError('dateInvalid')).toBeFalse();
    });

    it('tarih-saat: formdan gelen değer gg.aa.yyyy ss:dd görünür', async () => {
        await create('datetime-local');
        host.control.setValue('2026-10-11T13:30');
        fixture.detectChanges();
        await wait(50);
        expect(input().value).toBe('11.10.2026 13:30');
    });

    it('alana tıklayınca takvim açılır ve gün seçimi forma yazılır', async () => {
        await create('date');
        host.control.setValue('2026-10-11');
        fixture.detectChanges();
        await wait(50);
        input().focus();
        input().click();
        fixture.detectChanges();
        await wait(400);
        expect(panel()).not.toBeNull();
        const day = [...document.querySelectorAll('.p-datepicker-day')].find((d) => d.textContent?.trim() === '15' && !d.classList.contains('p-datepicker-other-month')) as HTMLElement;

        expect(day).toBeDefined();
        day.click();
        fixture.detectChanges();
        await wait(100);
        expect(host.control.value).toBe('2026-10-15');
    });

    it('min/max dışındaki günler takvimde seçilemez', async () => {
        await create('date');
        host.control.setValue('2026-10-11');
        host.min.set('2026-10-05');
        host.max.set('2026-10-20');
        fixture.detectChanges();
        await wait(50);
        input().focus();
        input().click();
        fixture.detectChanges();
        await wait(400);
        const dayEl = (n: string) => [...document.querySelectorAll('.p-datepicker-day')].find((d) => d.textContent?.trim() === n && !d.classList.contains('p-datepicker-other-month')) as HTMLElement;
        const disabled = (e: HTMLElement) => e.classList.contains('p-disabled') || e.getAttribute('aria-disabled') === 'true' || e.hasAttribute('data-p-disabled');

        expect(disabled(dayEl('3'))).toBeTrue();
        expect(disabled(dayEl('25'))).toBeTrue();
        expect(disabled(dayEl('12'))).toBeFalse();
    });

    it('× temizler: değer boş olur', async () => {
        await create('date');
        host.control.setValue('2026-10-11');
        fixture.detectChanges();
        await wait(50);
        const clear = fixture.nativeElement.querySelector('.p-datepicker-clear-icon, [data-pc-section="clearicon"]') as Element;

        expect(clear).not.toBeNull();
        clear.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        fixture.detectChanges();
        await wait(50);
        expect(host.control.value).toBe('');
        expect(input().value).toBe('');
    });

    it('devre dışı bırakılabilir', async () => {
        await create('date');
        host.control.disable();
        fixture.detectChanges();
        await wait(50);
        expect(input().disabled).toBeTrue();
    });

    it('İstanbul dönüşümü: bileşen metni değiştirmez, mevcut dönüşüm doğru UTC verir', async () => {
        await create('datetime-local');
        await typeText('11.10.2026 13:30');
        expect(host.control.value).toBe('2026-10-11T13:30');
        expect(fromIstanbulDateTimeLocalInputToUtcIso(host.control.value)).toBe('2026-10-11T10:30:00.000Z');
    });

    describe('takvim paneli kapanma', () => {
        const openPanel = async () => {
            input().focus();
            input().click();
            fixture.detectChanges();
            await wait(400);
            expect(panel()).not.toBeNull();
        };

        const panelOpen = () => {
            const p = panel();

            return !!p && p.isConnected && getComputedStyle(p).visibility !== 'hidden' && getComputedStyle(p).opacity !== '0';
        };

        it('dışarıya (başka düğmeye) basınca panel kapanır', async () => {
            await create('date');
            const btn = document.createElement('button');

            document.body.appendChild(btn);
            await openPanel();
            btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            btn.focus();
            fixture.detectChanges();
            await wait(600);
            expect(panelOpen()).toBeFalse();
            btn.remove();
        });

        it('yazıp Tab ile alandan çıkınca panel kapanır', async () => {
            await create('date');
            const btn = document.createElement('button');

            document.body.appendChild(btn);
            await openPanel();
            await typeText('11.10.2026');
            input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', keyCode: 9, bubbles: true }));
            btn.focus();
            fixture.detectChanges();
            await wait(600);
            expect(panelOpen()).toBeFalse();
            btn.remove();
        });

        it('tarih-saat: gün seçince tarih+saat paneli açık kalır, dışarı basınca kapanır', async () => {
            await create('datetime-local');
            const btn = document.createElement('button');

            document.body.appendChild(btn);
            await openPanel();
            btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            btn.focus();
            fixture.detectChanges();
            await wait(600);
            expect(document.querySelectorAll('.p-datepicker-panel').length).toBe(0);
            btn.remove();
        });

        it('gün seçince (yalnız tarih) panel kapanır', async () => {
            await create('date');
            host.control.setValue('2026-10-11');
            fixture.detectChanges();
            await wait(50);
            await openPanel();
            const day = [...document.querySelectorAll('.p-datepicker-day')].find((d) => d.textContent?.trim() === '15' && !d.classList.contains('p-datepicker-other-month')) as HTMLElement;

            day.click();
            fixture.detectChanges();
            await wait(600);
            expect(panelOpen()).toBeFalse();
        });

        it('yazılan tam tarihten sonra dışarı basınca panel kapanır (maske yolu)', async () => {
            await create('date');
            const btn = document.createElement('button');

            document.body.appendChild(btn);
            await typeText('11.10.2026');
            await wait(400);
            btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            btn.focus();
            fixture.detectChanges();
            await wait(600);
            expect(panelOpen()).toBeFalse();
            btn.remove();
        });

        it('odak dışarıdaki bir düğmeye geçince (mousedown olmadan) panel kapanır', async () => {
            await create('date');
            const btn = document.createElement('button');

            document.body.appendChild(btn);
            await openPanel();
            btn.focus();
            fixture.detectChanges();
            await wait(600);
            expect(panelOpen()).toBeFalse();
            btn.remove();
        });

        it('ikinci takvim açılınca birincinin paneli kapanır (en çok bir panel)', async () => {
            await create('date');
            const second = TestBed.createComponent(HostComponent);

            document.body.appendChild(second.nativeElement);
            second.detectChanges();
            await wait(50);
            await openPanel();
            const secondInput = second.nativeElement.querySelector('input#d') as HTMLInputElement;

            secondInput.focus();
            secondInput.click();
            second.detectChanges();
            fixture.detectChanges();
            await wait(600);
            expect(document.querySelectorAll('.p-datepicker-panel').length).toBe(1);
            second.destroy();
        });
    });
});
