import { TestBed } from '@angular/core/testing';
import type { CalendarDaySummaryVm } from '@/app/entities/appointment/models/calendar-day-summary.model';
import { monthGridWeeks } from '@/app/features/appointments/pages/appointments-calendar-page/calendar-grid.utils';
import { AppointmentCalendarMonthComponent } from './appointment-calendar-month.component';

const sum = (dateKey: string, s: Partial<CalendarDaySummaryVm>): [string, CalendarDaySummaryVm] => [
    dateKey,
    { dateKey, total: 0, dueToday: 0, upcoming: 0, overdue: 0, completed: 0, ...s }
];

describe('AppointmentCalendarMonthComponent', () => {
    const setup = () => {
        const fixture = TestBed.createComponent(AppointmentCalendarMonthComponent);
        const opened: string[] = [];

        fixture.componentRef.setInput('weeks', monthGridWeeks('2026-11-16'));
        fixture.componentRef.setInput('monthKey', '2026-11');
        fixture.componentRef.setInput('today', '2026-11-16');
        fixture.componentRef.setInput('appointmentSummary', new Map([sum('2026-11-16', { total: 8, dueToday: 6, completed: 2 })]));
        fixture.componentRef.setInput('vaccineSummary', new Map([sum('2026-11-16', { total: 23, dueToday: 20, overdue: 3 }), sum('2026-10-27', { total: 1, overdue: 1 })]));
        fixture.componentInstance.dayOpen.subscribe((d) => opened.push(d));
        fixture.detectChanges();

        return { el: fixture.nativeElement as HTMLElement, opened };
    };

    it('gün hücresi özet gösterir: randevu ve aşı sayısı, durum işaretleri (randevu + aşı)', () => {
        const { el } = setup();
        const cell = el.querySelector('[data-testid="calendar-month-day-2026-11-16"]')!;

        expect(cell.textContent).toContain('8 randevu');
        expect(cell.textContent).toContain('23 aşı');
        expect(cell.getAttribute('aria-label')).toBe('16, 8 randevu, 23 aşı, 26 bugün, 3 gecikmiş, 2 tamamlanan');
        expect(cell.getAttribute('aria-current')).toBe('date');
    });

    it('ay dışı günler soluk; hücreye tıklayınca o gün açılır', () => {
        const { el, opened } = setup();
        const outside = el.querySelector<HTMLButtonElement>('[data-testid="calendar-month-day-2026-10-27"]')!;

        expect(outside.className).toContain('opacity-50');
        expect(el.querySelector('[data-testid="calendar-month-day-2026-11-17"]')!.className).not.toContain('opacity-50');
        outside.click();
        expect(opened).toEqual(['2026-10-27']);
    });
});
