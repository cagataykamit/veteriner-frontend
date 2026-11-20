import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { providePrimeNG } from 'primeng/config';
import { userEvent } from 'vitest/browser';
import { PRIMENG_TR } from '@/app/core/i18n/primeng-tr';
import { DateInputComponent } from './date-input.component';

@Component({
    standalone: true,
    imports: [ReactiveFormsModule, DateInputComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<app-date-input type="time" [formControl]="control" [defaultTime]="defaultTime()" />`
})
class HostComponent {
    control = new FormControl<string>('09:30', { nonNullable: true });
    readonly defaultTime = signal('12:00');
}

/** Uygulama gibi (zoneless + OnPush, otomatik değişiklik algılama) ve gerçek fare/klavye olaylarıyla. */
describe('DateInputComponent — saat alanı (klinik çalışma saatleri, bekleme listesi)', () => {
    let fixture: ComponentFixture<HostComponent>;
    const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    const input = () => fixture.nativeElement.querySelector('input') as HTMLInputElement;
    const panel = () => document.querySelector('.p-datepicker-panel') as HTMLElement | null;
    const control = () => fixture.componentInstance.control;

    // Olumlu beklentiler koşulla beklenir (yükte kararlı); kısa sabit bekleme yalnız "değişmemeli" denetimlerinde kalır.
    const open = async (value: string) => {
        control().setValue(value);
        await fixture.whenStable();
        await userEvent.click(input());
        await expect.poll(() => input().getAttribute('aria-expanded')).toBe('true');
        await expect.poll(() => panel()).not.toBeNull();
    };

    const arrow = async (label: string, expected: string) => {
        await userEvent.click(panel()!.querySelector(`button[aria-label="${label}"]`) as HTMLElement);
        await expect.poll(() => control().value).toBe(expected);
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [HostComponent], providers: [providePrimeNG({ translation: PRIMENG_TR })] }).compileComponents();
        fixture = TestBed.createComponent(HostComponent);
        document.body.appendChild(fixture.nativeElement);
        fixture.autoDetectChanges();
    });
    afterEach(() => fixture.destroy());

    it('mevcut saati çizer', async () => {
        await fixture.whenStable();
        expect(input().value).toBe('09:30');
    });

    it('devre dışı bırakılıp açılınca çizilmeye devam eder', async () => {
        control().disable({ emitEvent: false });
        control().enable({ emitEvent: false });
        await fixture.whenStable();
        expect(fixture.nativeElement.querySelector('input')).not.toBeNull();
    });

    it('boş alanda panel o anki saatten değil varsayılan saatten açılır; "Bugün" yok (00:00 yazıyordu), "Temizle" var', async () => {
        await open('');
        const buttons = [...panel()!.querySelectorAll('button')].map((b) => b.textContent?.trim()).filter((t) => !!t);
        const today = [...panel()!.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Bugün');

        expect(panel()!.textContent).toContain('12');
        expect(panel()!.textContent).toContain('00');
        expect(buttons).toContain('Temizle');
        // Testte Tailwind yüklenmez: gizleme sınıfı denetlenir.
        expect(today === undefined || today.classList.contains('!hidden')).toBe(true);
    });

    it('alana özgü varsayılan saat verilebilir', async () => {
        fixture.componentInstance.defaultTime.set('09:00');
        await open('');
        await userEvent.keyboard('{Enter}');
        await expect.poll(() => control().value).toBe('09:00');
    });

    it('boş alanda Enter panelde görünen saati seçer ve paneli kapatır', async () => {
        await open('');
        await userEvent.keyboard('{Enter}');
        await expect.poll(() => control().value).toBe('12:00');
        await expect.poll(() => input().value).toBe('12:00');
        // Kapanma animasyonu yük altında sürebilir: panel ya kalkmış ya da çıkış hâlinde.
        await expect.poll(() => panel() === null || panel()!.hasAttribute('data-leave-active')).toBe(true);
    });

    it('oklarla ayarlanan saat her tıklamada forma ve alana yazılır; Enter onu korur', async () => {
        await open('');
        await arrow('Sonraki saat', '13:00');
        await arrow('Sonraki dakika', '13:01');
        await expect.poll(() => input().value).toBe('13:01');
        await userEvent.keyboard('{Enter}');
        await wait(50);
        expect(control().value).toBe('13:01');
    });

    it('dolu alanda Enter değeri değiştirmez', async () => {
        await open('09:30');
        await userEvent.keyboard('{Enter}');
        await wait(50);
        expect(control().value).toBe('09:30');
    });

    it('elle "1300" yazılınca 13:00 olur; alandan çıkınca kalır', async () => {
        control().setValue('');
        await fixture.whenStable();
        await userEvent.click(input());
        await userEvent.keyboard('1300');
        await expect.poll(() => input().value).toBe('13:00');
        await userEvent.tab();
        await expect.poll(() => control().value).toBe('13:00');
        expect(input().value).toBe('13:00');
    });

    it('boş alana girip Enter\'sız çıkmak değer yazmaz (isteğe bağlı mola alanı kendiliğinden dolmasın)', async () => {
        await open('');
        await userEvent.tab();
        await wait(50);
        expect(control().value).toBe('');
    });
});
