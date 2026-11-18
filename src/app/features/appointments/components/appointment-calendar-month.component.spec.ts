import { TestBed } from '@angular/core/testing';
import type { CalendarDaySummaryVm } from '@/app/entities/appointment/models/calendar-day-summary.model';
import { monthGridWeeks } from '@/app/features/appointments/pages/appointments-calendar-page/calendar-grid.utils';
import { AppointmentCalendarMonthComponent } from './appointment-calendar-month.component';

const sum = (dateKey: string, s: Partial<CalendarDaySummaryVm>): [string, CalendarDaySummaryVm] => [
    dateKey,
    { dateKey, total: 0, dueToday: 0, upcoming: 0, overdue: 0, completed: 0, ...s }
];

describe('AppointmentCalendarMonthComponent — doluluk haritası', () => {
    const setup = () => {
        const fixture = TestBed.createComponent(AppointmentCalendarMonthComponent);
        const opened: string[] = [];

        fixture.componentRef.setInput('weeks', monthGridWeeks('2026-11-16'));
        fixture.componentRef.setInput('monthKey', '2026-11');
        fixture.componentRef.setInput('today', '2026-11-16');
        fixture.componentRef.setInput('appointmentSummary', new Map([sum('2026-11-16', { total: 8, dueToday: 6, completed: 1, overdue: 1 })]));
        fixture.componentRef.setInput('vaccineSummary', new Map([sum('2026-11-16', { total: 23, dueToday: 20, overdue: 3 }), sum('2026-11-22', { total: 2, upcoming: 2 })]));
        fixture.componentRef.setInput(
            'capacity',
            new Map([
                ['2026-11-16', 16],
                ['2026-11-17', 16],
                ['2026-11-22', 0]
            ])
        );
        fixture.componentInstance.dayOpen.subscribe((d) => opened.push(d));
        fixture.detectChanges();

        return { el: fixture.nativeElement as HTMLElement, opened };
    };

    it('hücre: büyük randevu sayısı, aşı sayısı, randevu + aşı gecikmiş rozeti; renk doluluğa göre', () => {
        const { el } = setup();
        const cell = el.querySelector<HTMLElement>('[data-testid="calendar-month-day-2026-11-16"]')!;

        expect(cell.textContent).toContain('randevu');
        expect(cell.textContent).toContain('23');
        expect(cell.textContent).toContain('4 gecikmiş');
        expect(cell.getAttribute('aria-label')).toBe('16, 8 randevu, 23 aşı, 4 gecikmiş, yüzde 50 dolu');
        expect(cell.getAttribute('aria-current')).toBe('date');
        expect(cell.getAttribute('style')).toContain('color-mix');
        // Boş açık gün de renklenir (az); kapasitesi bilinmeyen gün renksiz.
        expect(el.querySelector('[data-testid="calendar-month-day-2026-11-17"]')!.getAttribute('style')).toContain('color-mix');
        expect(el.querySelector('[data-testid="calendar-month-day-2026-11-18"]')!.getAttribute('style') ?? '').not.toContain('color-mix');
    });

    it('kapasitesi 0 ve randevusu olmayan gün kapalı (taralı); aşı sayısı yine görünür', () => {
        const { el } = setup();
        const closed = el.querySelector<HTMLElement>('[data-testid="calendar-month-day-2026-11-22"]')!;

        expect(closed.textContent).toContain('kapalı');
        expect(closed.className).toContain('calendar-closed');
        expect(closed.getAttribute('aria-label')).toBe('22, kapalı, 2 aşı');
    });

    it('ay dışı günler soluk; hücreye tıklayınca o gün açılır', () => {
        const { el, opened } = setup();
        const outside = el.querySelector<HTMLButtonElement>('[data-testid="calendar-month-day-2026-10-27"]')!;

        expect(outside.className).toContain('opacity-40');
        expect(el.querySelector('[data-testid="calendar-month-day-2026-11-17"]')!.className).not.toContain('opacity-40');
        outside.click();
        expect(opened).toEqual(['2026-10-27']);
    });
});
