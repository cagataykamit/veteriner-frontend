import { TestBed } from '@angular/core/testing';
import type { VaccinationCalendarItemVm } from '@/app/entities/vaccination/models/vaccination-calendar.model';
import { AppointmentCalendarGridComponent, type DayBoardVaccines } from './appointment-calendar-grid.component';

const vaccine = (key: string, state: VaccinationCalendarItemVm['state'] = 'DueToday'): VaccinationCalendarItemVm => ({
    key,
    vaccinationId: key,
    kind: state === 'Completed' ? 'Applied' : 'NextDue',
    state,
    dateKey: '2026-11-02',
    atUtc: null,
    petId: null,
    petName: `Hasta ${key}`,
    clientId: null,
    clientName: 'Sahip',
    vaccineDefinitionId: null,
    vaccineName: 'Kedi Lösemisi (FeLV)',
    notes: null,
    timeSpecified: false
});

describe('AppointmentCalendarGridComponent', () => {
    const setup = (vaccines: DayBoardVaccines) => {
        const fixture = TestBed.createComponent(AppointmentCalendarGridComponent);

        fixture.componentRef.setInput('dateKey', '2026-11-02');
        fixture.componentRef.setInput('columns', []);
        fixture.componentRef.setInput('vaccines', vaccines);
        fixture.componentRef.setInput('start', 9 * 60);
        fixture.componentRef.setInput('end', 18 * 60);
        fixture.detectChanges();

        return { fixture, el: fixture.nativeElement as HTMLElement };
    };

    it('saatsiz liste satırları büzülmez, liste kendi içinde kayar (uzun listede yazı kesilmesin)', () => {
        const untimed = Array.from({ length: 9 }, (_, i) => vaccine(`u${i}`));
        const applied = Array.from({ length: 4 }, (_, i) => vaccine(`a${i}`, 'Completed'));
        const { fixture, el } = setup({ timed: [], untimed, afterHours: [], applied, waiting: 9 });

        const toggle = el.querySelector<HTMLButtonElement>('[data-testid="calendar-vaccine-list-toggle"]')!;

        expect(toggle.textContent).toContain('9 saatsiz');
        toggle.click();
        fixture.detectChanges();

        const list = el.querySelector<HTMLElement>('[data-testid="calendar-vaccine-list"]')!;
        const rows = Array.from(list.querySelectorAll<HTMLElement>('[data-testid^="calendar-vaccine-list-item-"]'));

        expect(list.classList).toContain('overflow-y-auto');
        expect(list.textContent).toContain('Saatsiz · 9');
        expect(list.textContent).toContain('Uygulandı · 4');
        expect(rows.length).toBe(13);
        // `truncate` overflow'u gizler, flex öğesinin min-height:auto'su 0 olur; shrink-0 olmadan satırlar max-height'e sığmak için ezilir.
        expect(rows.every((r) => r.classList.contains('shrink-0') && r.classList.contains('truncate'))).toBe(true);
        // Durum rengi sınıfı ([class] bağlaması) sabit sınıfları silmemeli.
        expect(rows.every((r) => r.classList.contains('border-l-[3px]'))).toBe(true);
        expect(Array.from(list.querySelectorAll('p')).every((p) => p.classList.contains('shrink-0'))).toBe(true);
    });
});
