import { TestBed } from '@angular/core/testing';
import type { CalendarFilters } from '@/app/features/appointments/pages/appointments-calendar-page/calendar-layer.utils';
import { AppointmentCalendarFiltersComponent } from './appointment-calendar-filters.component';

describe('AppointmentCalendarFiltersComponent', () => {
    const setup = (filters: CalendarFilters, canSeeVaccines = true) => {
        const fixture = TestBed.createComponent(AppointmentCalendarFiltersComponent);
        const emitted: CalendarFilters[] = [];

        fixture.componentRef.setInput('filters', filters);
        fixture.componentRef.setInput('vets', [{ userId: 'v1', name: 'Dr. Ayşe' }]);
        fixture.componentRef.setInput('canSeeVaccines', canSeeVaccines);
        fixture.componentInstance.filtersChange.subscribe((f) => emitted.push(f));
        fixture.detectChanges();

        return { fixture, el: fixture.nativeElement as HTMLElement, emitted };
    };

    it('durum çipleri renk açıklamasıyla aynı dil; seçim anında uygulanır, sıra sabit', () => {
        const { el, emitted } = setup({ vet: null, types: [], states: ['Completed'] });
        const labels = Array.from(el.querySelectorAll('[data-testid^="calendar-filter-state-"]')).map((b) => b.textContent?.trim());

        expect(labels).toEqual(['Bugün', 'Gelecek', 'Gecikmiş', 'Tamamlanan']);
        el.querySelector<HTMLButtonElement>('[data-testid="calendar-filter-state-DueToday"]')!.click();
        expect(emitted.at(-1)?.states).toEqual(['DueToday', 'Completed']);
        el.querySelector<HTMLButtonElement>('[data-testid="calendar-filter-state-Completed"]')!.click();
        expect(emitted.at(-1)?.states).toEqual([]);
    });

    it('etkin filtre varken "Filtreleri temizle" hepsini sıfırlar; yokken görünmez', () => {
        const { el, emitted } = setup({ vet: 'v1', types: ['asi'], states: [] });

        el.querySelector<HTMLButtonElement>('[data-testid="calendar-filters-clear"]')!.click();
        expect(emitted.at(-1)).toEqual({ vet: null, types: [], states: [] });
        expect(setup({ vet: null, types: [], states: [] }).el.querySelector('[data-testid="calendar-filters-clear"]')).toBeNull();
    });

    it('ekranda "süzgeç" değil "filtre" yazar', () => {
        const { el } = setup({ vet: 'v1', types: [], states: [] });

        expect(el.textContent).toContain('Filtreleri temizle');
        expect(el.textContent?.toLocaleLowerCase('tr')).not.toContain('süzgeç');
    });
});
