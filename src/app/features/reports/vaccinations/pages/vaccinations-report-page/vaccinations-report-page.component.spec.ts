import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { AuthService } from '@/app/core/auth/auth.service';
import { VaccinationsReportService } from '@/app/features/reports/vaccinations/services/vaccinations-report.service';
import { VaccinationsReportPageComponent } from './vaccinations-report-page.component';

describe('VaccinationsReportPageComponent — sade filtre alanı', () => {
    let source: jasmine.SpyObj<VaccinationsReportService>;

    function create() {
        const fixture = TestBed.createComponent(VaccinationsReportPageComponent);
        fixture.detectChanges();
        return fixture;
    }

    beforeEach(() => {
        sessionStorage.clear();
        source = jasmine.createSpyObj<VaccinationsReportService>('VaccinationsReportService', ['loadReport', 'exportCsvBlob', 'exportXlsxBlob']);
        source.loadReport.and.callFake(((q: { page?: number; pageSize?: number }) =>
            of({
                page: q.page ?? 1,
                pageSize: q.pageSize ?? 10,
                totalCount: 7,
                items: [{ id: 'v1', clientName: 'Ayşe', petName: 'Pamuk', vaccineName: 'Karma', status: 1, appliedAtUtc: null, dueAtUtc: null }]
            })) as never);
        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: API_BASE_URL, useValue: 'http://api.test' },
                { provide: VaccinationsReportService, useValue: source },
                {
                    provide: AuthService,
                    useValue: {
                        hasOperationClaim: () => true,
                        getMyClinics: () => of([{ id: 'c1', name: 'Klinik 1' }]),
                        getJwtClinicId: () => null,
                        getClinicId: () => null
                    }
                }
            ]
        });
    });

    it('Hayvan seçim kutusu yok; Müşteri ve Arama alanları var', () => {
        const el: HTMLElement = create().nativeElement;
        expect(el.querySelector('app-pet-search')).toBeNull();
        expect(el.querySelector('app-client-search')).not.toBeNull();
        expect(el.querySelector('app-search-input')).not.toBeNull();
    });

    it('"Aktif" rozeti çıkmaz', () => {
        const fixture = create();
        fixture.componentInstance.state.fromDateInput = '2026-10-01';
        fixture.componentInstance.state.applyFilters();
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).not.toContain('Aktif');
    });

    it('toplam kayıt büyük kart yerine tek satır sayaçtır', () => {
        const el: HTMLElement = create().nativeElement;
        expect(el.querySelector('.report-summary')).toBeNull();
        expect(el.textContent).toContain('7 kayıt');
    });

    it('petId sorgu alanı desteklenmeye devam eder (süzgeç durumundan sorguya gider)', () => {
        const fixture = create();
        fixture.componentInstance.state.petIdFilter = 'pet-1';
        fixture.componentInstance.state.applyFilters();
        expect(source.loadReport.calls.mostRecent().args[0].petId).toBe('pet-1');
    });
});
