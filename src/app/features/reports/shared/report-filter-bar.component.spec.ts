import type { MockedObject } from 'vitest';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { AuthService } from '@/app/core/auth/auth.service';
import { ReportFilterBarComponent } from './report-filter-bar.component';
import { ReportListQueryBase, ReportListResultBase, ReportListSource, ReportListState } from './report-list-state';

const KEY = 'panel:reports:filter-bar-test:listState';

describe('ReportFilterBarComponent — müşteri/hasta seçicisi yok, yalnız arama', () => {
    let source: MockedObject<ReportListSource<ReportListQueryBase, ReportListResultBase>>;

    function create(
        config: {
            snapshot?: boolean;
            dateRangeOnly?: boolean;
        } = {}
    ): HTMLElement {
        const state = TestBed.runInInjectionContext(() => new ReportListState<ReportListQueryBase, ReportListResultBase>({ source, stateKey: KEY, readClaim: 'Test.Read', exportFilePrefix: 'test', ...config }));

        state.init();
        const fixture = TestBed.createComponent(ReportFilterBarComponent);

        fixture.componentRef.setInput('state', state);
        fixture.componentRef.setInput('idPrefix', 'tRep');
        fixture.componentRef.setInput('periodHint', '');
        fixture.componentRef.setInput('searchPlaceholder', 'Müşteri, hasta veya not ile ara…');
        fixture.componentRef.setInput('dateLimit', 'past');
        fixture.detectChanges();

        return fixture.nativeElement;
    }

    beforeEach(() => {
        sessionStorage.removeItem(KEY);
        source = {
            loadReport: vi.fn().mockName('source.loadReport'),
            exportCsvBlob: vi.fn().mockName('source.exportCsvBlob'),
            exportXlsxBlob: vi.fn().mockName('source.exportXlsxBlob')
        };
        source.loadReport.mockImplementation((q) => of({ page: q.page ?? 1, pageSize: q.pageSize ?? 25, totalCount: 0, items: [] }));
        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
                { provide: API_BASE_URL, useValue: 'http://api.test' },
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

    it('dönem raporunda Arama var; Müşteri ve Hasta seçicileri yok', () => {
        const el = create();

        expect(el.querySelector<HTMLInputElement>('#tRepSearch')?.placeholder).toBe('Müşteri, hasta veya not ile ara…');
        expect(el.querySelector('app-client-search, app-pet-search')).toBeNull();
        expect(el.textContent).not.toContain('Müşteri seç');
    });

    it('anlık görüntü raporunda da yalnız Arama var; yalnız tarih aralığı raporunda arama da yok', () => {
        expect(create({ snapshot: true }).querySelector('app-search-input')).not.toBeNull();
        expect(create({ dateRangeOnly: true }).querySelector('app-search-input, app-client-search, app-pet-search')).toBeNull();
    });
});
