import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { AuthService } from '@/app/core/auth/auth.service';
import { ReportFilterBarComponent } from './report-filter-bar.component';
import { ReportListQueryBase, ReportListResultBase, ReportListSource, ReportListState } from './report-list-state';

const KEY = 'panel:reports:filter-bar-test:listState';

describe('ReportFilterBarComponent — arama birincil, müşteri/hasta katlanır', () => {
    let source: jasmine.SpyObj<ReportListSource<ReportListQueryBase, ReportListResultBase>>;

    function createState(config: { snapshot?: boolean; dateRangeOnly?: boolean } = {}) {
        const state = TestBed.runInInjectionContext(
            () => new ReportListState<ReportListQueryBase, ReportListResultBase>({ source, stateKey: KEY, readClaim: 'Test.Read', exportFilePrefix: 'test', ...config })
        );

        state.init();

        return state;
    }

    function create(state = createState(), petFilter = true) {
        const fixture = TestBed.createComponent(ReportFilterBarComponent);

        fixture.componentRef.setInput('state', state);
        fixture.componentRef.setInput('idPrefix', 'tRep');
        fixture.componentRef.setInput('periodHint', '');
        fixture.componentRef.setInput('searchPlaceholder', 'Ara…');
        fixture.componentRef.setInput('dateLimit', 'past');
        fixture.componentRef.setInput('petFilter', petFilter);
        fixture.detectChanges();

        return fixture;
    }

    const toggle = (el: HTMLElement) => el.querySelector<HTMLButtonElement>('button[aria-controls="tRepEntityFilters"]');

    beforeEach(() => {
        sessionStorage.removeItem(KEY);
        source = jasmine.createSpyObj('source', ['loadReport', 'exportCsvBlob', 'exportXlsxBlob']);
        source.loadReport.and.callFake((q) => of({ page: q.page ?? 1, pageSize: q.pageSize ?? 25, totalCount: 0, items: [] }));
        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                provideHttpClient(),
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

    it('ilk açılışta yalnız Arama görünür; seçiciler "Müşteri veya hasta seç" düğmesiyle açılır ve ne yaptıkları yazar', () => {
        const fixture = create();
        const el: HTMLElement = fixture.nativeElement;

        expect(el.querySelector('app-search-input')).not.toBeNull();
        expect(el.querySelector('app-client-search, app-pet-search')).toBeNull();
        expect(toggle(el)!.textContent).toContain('Müşteri veya hasta seç');
        expect(toggle(el)!.getAttribute('aria-expanded')).toBe('false');

        toggle(el)!.click();
        fixture.detectChanges();

        expect(toggle(el)!.getAttribute('aria-expanded')).toBe('true');
        expect(el.querySelector('#tRepEntityFilters app-client-search')).not.toBeNull();
        expect(el.querySelector('#tRepEntityFilters app-pet-search')).not.toBeNull();
        expect(el.textContent).toContain('Yalnız seçtiğiniz müşterinin veya hastanın kayıtları listelenir');
    });

    it('oturumdan seçili müşteriyle dönülünce bölüm açık başlar ve düğme seçim sayısını gösterir', () => {
        sessionStorage.setItem(KEY, JSON.stringify({ clientId: 'cl-1', page: 1, pageSize: 25 }));
        const fixture = create();
        const el: HTMLElement = fixture.nativeElement;

        expect(el.querySelector('#tRepEntityFilters app-client-search')).not.toBeNull();
        expect(toggle(el)!.textContent).toContain('Müşteri veya hasta seç (1)');

        toggle(el)!.click();
        fixture.detectChanges();

        expect(el.querySelector('app-client-search')).toBeNull();
        expect(toggle(el)!.textContent).toContain('(1)');
    });

    it('anlık görüntü ve yalnız tarih aralığı raporlarında müşteri/hasta düğmesi yoktur', () => {
        expect(toggle(create(createState({ snapshot: true })).nativeElement)).toBeNull();
        sessionStorage.removeItem(KEY);
        expect(toggle(create(createState({ dateRangeOnly: true })).nativeElement)).toBeNull();
    });
});
