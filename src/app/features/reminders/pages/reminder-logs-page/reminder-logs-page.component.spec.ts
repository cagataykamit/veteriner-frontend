import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ClinicsService } from '@/app/entities/clinic/services/clinics.service';
import { RemindersService } from '@/app/features/reminders/services/reminders.service';
import { ReminderLogsPageComponent } from './reminder-logs-page.component';

const STATE_KEY = 'reminderLogs:listState';
const NO_RECORDS = 'Henüz gönderilmiş hatırlatma bulunmuyor.';
const NO_MATCH = 'Seçili filtrelere uygun hatırlatma kaydı bulunamadı.';

describe('ReminderLogsPageComponent — boş liste mesajı', () => {
    const create = () => {
        const getLogs = vi
            .fn()
            .mockName('getLogs')
            .mockReturnValue(of({ items: [], page: 1, pageSize: 20, totalItems: 0, totalPages: 0 }));

        TestBed.configureTestingModule({
            imports: [ReminderLogsPageComponent],
            providers: [provideRouter([]), { provide: RemindersService, useValue: { getLogs } }, { provide: ClinicsService, useValue: { listClinics: () => of([]) } }]
        });
        const fixture = TestBed.createComponent(ReminderLogsPageComponent);

        fixture.detectChanges();

        return { fixture, getLogs, cmp: fixture.componentInstance, text: () => (fixture.nativeElement as HTMLElement).textContent ?? '' };
    };

    beforeEach(() => sessionStorage.removeItem(STATE_KEY));
    afterEach(() => sessionStorage.removeItem(STATE_KEY));

    it('filtre yokken kayıt yok mesajı gösterilir', () => {
        const { text } = create();

        expect(text()).toContain(NO_RECORDS);
        expect(text()).not.toContain(NO_MATCH);
    });

    it('yalnız tarih filtresi uygulanınca filtre mesajı gösterilir; temizleyince kayıt yok mesajına döner', () => {
        const { fixture, getLogs, cmp, text } = create();

        cmp.fromDateInput = '2026-10-01';
        cmp.applyFilters();
        fixture.detectChanges();

        expect(vi.mocked(getLogs).mock.lastCall![0].fromUtc).toBeDefined();
        expect(text()).toContain(NO_MATCH);

        cmp.clearFilters();
        fixture.detectChanges();

        expect(text()).toContain(NO_RECORDS);
    });

    it('saklanan süzgeç ve sayfayla yükler', () => {
        sessionStorage.setItem(STATE_KEY, JSON.stringify({ reminderType: 'Vaccination', status: 'Failed', clinicId: '', fromDateInput: '', toDateInput: '', fromUtc: null, toUtc: null, page: 3, pageSize: 50 }));

        const { getLogs, cmp } = create();

        expect(getLogs).toHaveBeenCalledTimes(1);
        expect(vi.mocked(getLogs).mock.lastCall![0]).toEqual({ page: 3, pageSize: 50, reminderType: 'Vaccination', status: 'Failed', clinicId: undefined, fromUtc: undefined, toUtc: undefined });
        expect(cmp.statusFilter).toBe('Failed');
    });

    it('süzgeç yokken "Temizle" listeyi yeniden getirir ve kaydı ilk sayfaya alır', () => {
        const { getLogs, cmp } = create();

        cmp.clearFilters();

        expect(getLogs).toHaveBeenCalledTimes(2);
        expect(vi.mocked(getLogs).mock.lastCall![0].page).toBe(1);
        expect(JSON.parse(sessionStorage.getItem(STATE_KEY)!)).toMatchObject({ reminderType: '', page: 1, pageSize: 20 });
    });
});
