import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { providePrimeNG } from 'primeng/config';
import { userEvent } from 'vitest/browser';
import { PRIMENG_TR } from '@/app/core/i18n/primeng-tr';
import { formatDateInputValue } from './date-input-value.utils';
import { DateInputComponent } from './date-input.component';

@Component({
    standalone: true,
    imports: [ReactiveFormsModule, DateInputComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<app-date-input type="datetime-local" [formControl]="control" limit="past" />`
})
class HostComponent {
    control = new FormControl<string>('', { nonNullable: true });
}

/**
 * Aşı formundaki "Uygulama tarihi / saati" gibi tarih-saat alanı: saat alanı (528aabcf) ile aynı davranış. Uygulama gibi (zoneless +
 * OnPush) ve gerçek fare/klavye olaylarıyla.
 */
describe('DateInputComponent — tarih-saat alanı (aşı formu)', () => {
    let fixture: ComponentFixture<HostComponent>;
    const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    const input = () => fixture.nativeElement.querySelector('input') as HTMLInputElement;
    /** Bu alanın paneli (girdinin `aria-controls`'u): sayfada kapanmakta olan başka bir panel seçilmez. */
    let panelId = '';
    const panel = () => (panelId ? document.getElementById(panelId) : null);
    const control = () => fixture.componentInstance.control;
    const button = (label: string) => panel()!.querySelector(`button[aria-label="${label}"]`) as HTMLElement;
    const todayPrefix = () => formatDateInputValue('date', new Date());

    // Olumlu beklentiler koşulla beklenir (yükte kararlı); kısa sabit bekleme yalnız "değişmemeli" denetimlerinde kalır.
    /** Panel açık, gövdeye taşınmış ve giriş animasyonu bitmiş: içindeki düğmeler yerinde durur. */
    const shown = async () => {
        await expect.poll(() => input().getAttribute('aria-expanded')).toBe('true');
        panelId = input().getAttribute('aria-controls') ?? '';
        await expect.poll(() => panel()?.parentElement === document.body && !panel()!.hasAttribute('data-enter-active')).toBe(true);
    };

    /** Panel kapandı ve DOM'dan kalktı (kapanma animasyonu yük altında sürebilir). */
    const closed = async () => {
        await expect.poll(() => input().getAttribute('aria-expanded')).not.toBe('true');
        await expect.poll(() => panel()).toBeNull();
    };

    const open = async (value: string) => {
        control().setValue(value);
        await fixture.whenStable();
        await userEvent.click(input());
        await shown();
    };

    beforeEach(async () => {
        panelId = '';
        await TestBed.configureTestingModule({ imports: [HostComponent], providers: [providePrimeNG({ translation: PRIMENG_TR })] }).compileComponents();
        fixture = TestBed.createComponent(HostComponent);
        document.body.appendChild(fixture.nativeElement);
        fixture.autoDetectChanges();
    });
    afterEach(() => fixture.destroy());

    it('elle yazılan tarih ve saat forma geçer', async () => {
        await userEvent.click(input());
        await userEvent.keyboard('101120261430');
        await userEvent.tab();
        await expect.poll(() => control().value).toBe('2026-11-10T14:30');
        expect(input().value).toBe('10.11.2026 14:30');
    });

    it('dolu alanda saat kısmının üzerine yazmak yalnız saati değiştirir', async () => {
        await open('2026-11-10T09:00');
        input().setSelectionRange(11, 16);
        await userEvent.keyboard('1430');
        await userEvent.tab();
        await expect.poll(() => control().value).toBe('2026-11-10T14:30');
    });

    it('oklarla ayarlanan saat ve dakika her tıklamada forma yazılır', async () => {
        await open('2026-11-10T09:00');
        await userEvent.click(button('Önceki saat'));
        await expect.poll(() => control().value).toBe('2026-11-10T08:00');
        await userEvent.click(button('Sonraki dakika'));
        await expect.poll(() => control().value).toBe('2026-11-10T08:01');
        expect(input().value).toBe('10.11.2026 08:01');
    });

    it('gün seçilip saat okla ayarlanınca Enter seçimi korur ve paneli kapatır', async () => {
        await open('');
        // Ayın 1'i her gün geçmiş ya da bugündür ("geçmiş" sınırında seçilebilir); ızgaranın ilk "1"i bu ayındır.
        await userEvent.click([...panel()!.querySelectorAll('td span')].find((s) => s.textContent?.trim() === '1') as HTMLElement);
        await expect.poll(() => control().value.startsWith(`${todayPrefix().slice(0, 8)}01T`)).toBe(true);
        // PrimeNG gün seçiminden 150 ms sonra paneli kendisi kapatır (hideOnDateTimeSelect). Ok bu zamanlayıcıyla yarışmasın:
        // kapanma beklenir, panel yeniden açılır.
        await closed();
        await userEvent.click(input());
        await shown();
        const before = control().value;

        await userEvent.click(button('Önceki saat'));
        await expect.poll(() => control().value).not.toBe(before);
        const picked = control().value;

        await userEvent.keyboard('{Enter}');
        await closed();
        expect(control().value).toBe(picked);
    });

    it('boş alanda Enter panelde görünen tarih ve saati seçer (önceden hiçbir şey yazmıyordu)', async () => {
        await open('');
        await userEvent.keyboard('{Enter}');
        await expect.poll(() => control().value).toMatch(new RegExp(`^${todayPrefix()}T\\d{2}:\\d{2}$`));
        expect(input().value).not.toBe('');
    });

    it('dolu alanda Enter değeri değiştirmez', async () => {
        await open('2026-11-10T09:00');
        await userEvent.keyboard('{Enter}');
        await wait(50);
        expect(control().value).toBe('2026-11-10T09:00');
    });

    it('"Bugün" bugünün tarihini o anki saatle yazar (00:00 değil)', async () => {
        await open('');
        await userEvent.click([...panel()!.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Bugün') as HTMLElement);
        await expect.poll(() => control().value.startsWith(`${todayPrefix()}T`)).toBe(true);
    });
});
