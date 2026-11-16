import { TestBed } from '@angular/core/testing';
import { AppointmentSlotPickerComponent, groupSlotTimes, toSlotPickerDays, type SlotPick } from './appointment-slot-picker.component';

describe('toSlotPickerDays / groupSlotTimes', () => {
    const slot = (startUtc: string, vets: string[]) => ({ startUtc, endUtc: startUtc, freeVeterinarianUserIds: vets });
    const days = [
        { date: '2026-11-16', slots: [slot('2026-11-16T06:00:00Z', ['v1']), slot('2026-11-16T12:00:00Z', ['v2'])] },
        { date: '2026-11-17', slots: [slot('2026-11-17T06:00:00Z', ['v2'])] }
    ];

    it('hekim seçiliyse yalnız onun boş saatleri; boş kalan gün düşer', () => {
        expect(toSlotPickerDays(days, null)).toEqual([
            { date: '2026-11-16', times: ['09:00', '15:00'] },
            { date: '2026-11-17', times: ['09:00'] }
        ]);
        expect(toSlotPickerDays(days, 'v1')).toEqual([{ date: '2026-11-16', times: ['09:00'] }]);
    });

    it('saatler sabah / öğleden sonra / akşam gruplanır, boş grup düşer', () => {
        expect(groupSlotTimes(['09:00', '11:45', '12:00', '16:30', '17:00'])).toEqual([
            { label: 'Sabah', times: ['09:00', '11:45'] },
            { label: 'Öğleden sonra', times: ['12:00', '16:30'] },
            { label: 'Akşam', times: ['17:00'] }
        ]);
        expect(groupSlotTimes(['13:00'])).toEqual([{ label: 'Öğleden sonra', times: ['13:00'] }]);
    });
});

describe('AppointmentSlotPickerComponent', () => {
    const create = (date: string, time = '') => {
        const fixture = TestBed.createComponent(AppointmentSlotPickerComponent);

        fixture.componentRef.setInput('days', [
            { date: '2026-11-16', times: ['09:00', '14:00'] },
            { date: '2026-11-17', times: ['10:00'] }
        ]);
        fixture.componentRef.setInput('date', date);
        fixture.componentRef.setInput('time', time);
        fixture.detectChanges();

        return fixture;
    };

    it('seçili günün saatlerini gruplu düğme olarak çizer; dokunuş gün ve saati yayar', () => {
        const fixture = create('2026-11-16', '14:00');
        const el: HTMLElement = fixture.nativeElement;
        const picks: SlotPick[] = [];

        fixture.componentInstance.timePick.subscribe((p) => picks.push(p));
        const times = Array.from(el.querySelectorAll<HTMLButtonElement>('[data-testid="slot-time"]'));

        expect(times.map((b) => b.textContent?.trim())).toEqual(['09:00', '14:00']);
        expect(times.map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'true']);
        expect(el.querySelector('[data-testid="slot-day"][aria-pressed="true"]')?.getAttribute('aria-label')).toContain('2 boş saat');

        times[0].click();
        expect(picks).toEqual([{ date: '2026-11-16', time: '09:00' }]);
    });

    it('seçili gün listede yoksa saat yerine gün seçme notu; gün düğmesi günü yayar', () => {
        const fixture = create('2026-11-20');
        const el: HTMLElement = fixture.nativeElement;
        const dates: string[] = [];

        fixture.componentInstance.dateChange.subscribe((d) => dates.push(d));

        expect(el.querySelector('[data-testid="slot-picker-day-full"]')).not.toBeNull();
        el.querySelectorAll<HTMLButtonElement>('[data-testid="slot-day"]')[1].click();
        expect(dates).toEqual(['2026-11-17']);
    });
});
