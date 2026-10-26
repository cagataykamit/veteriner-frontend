import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { providePrimeNG } from 'primeng/config';
import { PRIMENG_TR } from '@/app/core/i18n/primeng-tr';
import { DateInputComponent } from './date-input.component';
import { type DateInputLimit, PLANNED_MAX_YEARS, resolveLimitMax } from './date-input-limits.utils';
import { formatDateInputValue, type DateInputType } from './date-input-value.utils';

describe('resolveLimitMax (üst sınır politikası)', () => {
    // 2026-10-11 12:00 UTC = 15:00 İstanbul
    const now = new Date('2026-10-11T12:00:00Z');

    it('sınır yoksa ve saat alanında null', () => {
        expect(resolveLimitMax('date', 'none', now)).toBeNull();
        expect(resolveLimitMax('time', 'past', now)).toBeNull();
    });

    it('past/date: bugün (İstanbul); past/datetime: şimdi (İstanbul duvar saati)', () => {
        expect(formatDateInputValue('date', resolveLimitMax('date', 'past', now))).toBe('2026-10-11');
        expect(formatDateInputValue('datetime-local', resolveLimitMax('datetime-local', 'past', now))).toBe('2026-10-11T15:00');
    });

    it('İstanbul gün sınırı: UTC 22:30 İstanbul’da ertesi gün 01:30', () => {
        const lateUtc = new Date('2026-10-11T22:30:00Z');

        expect(formatDateInputValue('date', resolveLimitMax('date', 'past', lateUtc))).toBe('2026-10-12');
    });

    it('planned: bugünden 5 yıl sonrası', () => {
        expect(PLANNED_MAX_YEARS).toBe(5);
        expect(formatDateInputValue('date', resolveLimitMax('date', 'planned', now))).toBe('2031-10-11');
        expect(formatDateInputValue('datetime-local', resolveLimitMax('datetime-local', 'planned', now))).toBe('2031-10-11T15:00');
    });
});

@Component({
    standalone: true,
    imports: [ReactiveFormsModule, DateInputComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<app-date-input inputId="d" [type]="type()" [limit]="limit()" [max]="max()" [formControl]="control" />`
})
class HostComponent {
    control = new FormControl<string>('', { nonNullable: true });
    type = signal<DateInputType>('date');
    limit = signal<DateInputLimit>('none');
    max = signal<string | null>(null);
}

describe('DateInputComponent — limit', () => {
    let fixture: ComponentFixture<HostComponent>;
    let host: HostComponent;
    const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    const input = () => fixture.nativeElement.querySelector('input#d') as HTMLInputElement;

    const typeText = async (text: string) => {
        const el = input();

        el.focus();
        el.dispatchEvent(new KeyboardEvent('keydown', { key: text.slice(-1), bubbles: true }));
        el.value = text;
        el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
        fixture.detectChanges();
        await wait(50);
        el.blur();
        fixture.detectChanges();
        await wait(50);
    };

    const ymd = (offsetYears: number, offsetDays = 0): string => {
        const d = new Date();

        d.setFullYear(d.getFullYear() + offsetYears);
        d.setDate(d.getDate() + offsetDays);

        return `${String(d.getDate()).padStart(2, '0')}${String(d.getMonth() + 1).padStart(2, '0')}${d.getFullYear()}`;
    };

    const create = async (type: DateInputType, limit: DateInputLimit, max: string | null = null) => {
        await TestBed.configureTestingModule({ imports: [HostComponent], providers: [providePrimeNG({ translation: PRIMENG_TR })] }).compileComponents();
        fixture = TestBed.createComponent(HostComponent);
        host = fixture.componentInstance;
        host.type.set(type);
        host.limit.set(limit);
        host.max.set(max);
        document.body.appendChild(fixture.nativeElement);
        fixture.detectChanges();
        await wait(50);
    };

    afterEach(() => fixture?.destroy());

    it('past: geçmiş tarih serbest, gelecek tarih (5555) Türkçe hatayla reddedilir', async () => {
        await create('date', 'past');
        await typeText('24111991');
        expect(host.control.errors).toBeNull();
        await typeText('21055555');
        expect(host.control.hasError('dateOutOfRange')).toBeTrue();
        expect(fixture.nativeElement.textContent).toMatch(/Tarih \d{2}\.\d{2}\.\d{4} veya öncesi olmalıdır\./);
    });

    it('past: yarın reddedilir', async () => {
        await create('date', 'past');
        await typeText(ymd(0, 2));
        expect(host.control.hasError('dateOutOfRange')).toBeTrue();
    });

    it('past/datetime: gelecekteki saat reddedilir (mesajda sınır saati de görünür), geçmiş serbest', async () => {
        await create('datetime-local', 'past');
        await typeText('241119911430');
        expect(host.control.errors).toBeNull();
        await typeText(ymd(1) + '1000');
        expect(host.control.hasError('dateOutOfRange')).toBeTrue();
        expect(fixture.nativeElement.textContent).toMatch(/Tarih ve saat \d{2}\.\d{2}\.\d{4} \d{2}:\d{2} veya öncesi olmalıdır\./);
    });

    it('planned: 5 yıl içi serbest, ötesi (5555) reddedilir', async () => {
        await create('date', 'planned');
        await typeText(ymd(4));
        expect(host.control.errors).toBeNull();
        await typeText(ymd(6));
        expect(host.control.hasError('dateOutOfRange')).toBeTrue();
        await typeText('21055555');
        expect(host.control.hasError('dateOutOfRange')).toBeTrue();
    });

    it('açık max, limit politikasının önüne geçer', async () => {
        await create('date', 'past', '2026-10-31');
        await typeText('01112026');
        expect(host.control.hasError('dateOutOfRange')).toBeTrue();
        expect(fixture.nativeElement.textContent).toContain('Tarih 31.10.2026 veya öncesi olmalıdır.');
    });

    it('formdan gelen mevcut ileri tarih (eski kayıt) hata saymaz', async () => {
        await create('date', 'past');
        host.control.setValue('2099-01-01');
        fixture.detectChanges();
        await wait(50);
        expect(host.control.errors).toBeNull();
    });
});
