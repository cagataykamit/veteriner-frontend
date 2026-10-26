import { HttpErrorResponse, provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { AuthService } from '@/app/core/auth/auth.service';
import { VaccinationsReportService } from '@/app/features/reports/vaccinations/services/vaccinations-report.service';
import { userErrorFromHttp } from '@/app/shared/utils/api-error.utils';
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
                provideHttpClient(withXhr()),
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

    it('yalnız Arama alanı var (müşteri/hasta seçicisi yok); sonuçta Müşteri sütunu görünür', () => {
        const el: HTMLElement = create().nativeElement;

        expect(el.querySelector('app-search-input')).not.toBeNull();
        expect(el.querySelector('app-client-search, app-pet-search')).toBeNull();
        expect(Array.from(el.querySelectorAll('th')).map((th) => th.textContent?.trim())).toContain('Müşteri');
        expect(el.textContent).toContain('Ayşe');
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

    it('arama metni sorguya gider; clientId/petId gönderilmez', () => {
        const fixture = create();

        fixture.componentInstance.state.searchInput = 'Pamuk';
        fixture.componentInstance.state.applyFilters();
        const q = source.loadReport.calls.mostRecent().args[0] as unknown as Record<string, unknown>;

        expect(q['search']).toBe('Pamuk');
        expect('clientId' in q || 'petId' in q).toBeFalse();
    });

    it('422 Trial.ExportLimitExceeded: sunucunun detail metni ve "Aboneliğe geç" bağlantısı gösterilir (TRIAL-004)', () => {
        const detail = 'Deneme sürümünde dışa aktarma en fazla 1000 satır sınırı; abonelikle kalkar. Filtreyi daraltın.';
        const http = new HttpErrorResponse({ status: 422, error: { status: 422, title: 'İş kuralı ihlali', detail, code: 'Trial.ExportLimitExceeded' } });

        source.exportCsvBlob.and.returnValue(throwError(() => userErrorFromHttp(http, 'Dışa aktarma işlemi tamamlanamadı.')));
        const fixture = create();

        fixture.componentInstance.state.exportCsv();
        fixture.detectChanges();
        const el: HTMLElement = fixture.nativeElement;
        const notice = el.querySelector('[data-testid="trial-limit-notice"]');
        const link = el.querySelector<HTMLAnchorElement>('[data-testid="trial-limit-subscription-link"]');

        expect(notice?.textContent).toContain(detail);
        expect(link?.textContent).toContain('Aboneliğe geç');
        expect(link?.getAttribute('href')).toBe('/panel/settings/subscription');
    });

    it('ücretli kiracı dışa aktarma hatası (400 ReportExportTooManyRows) düz hata metni kalır, abonelik bağlantısı çıkmaz', () => {
        const http = new HttpErrorResponse({ status: 400, error: { detail: 'Dışa aktarma için çok fazla satır.', code: 'Vaccinations.ReportExportTooManyRows' } });

        source.exportCsvBlob.and.returnValue(throwError(() => userErrorFromHttp(http, 'Dışa aktarma işlemi tamamlanamadı.')));
        const fixture = create();

        fixture.componentInstance.state.exportCsv();
        fixture.detectChanges();
        const el: HTMLElement = fixture.nativeElement;

        expect(el.querySelector('[data-testid="trial-limit-notice"]')).toBeNull();
        expect(el.querySelector('[role="alert"]')?.textContent).toContain('çok fazla satır');
    });
});
