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
            exportXlsxBlob: vi.fn().mockName('source.exportXlsxBlob'),
            exportPdfBlob: vi.fn().mockName('source.exportPdfBlob')
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

        // R-06: yer tutucu kısa, neyin arandığı ipucunda.
        expect(el.querySelector<HTMLInputElement>('#tRepSearch')?.placeholder).toBe('Ara…');
        expect(el.querySelector<HTMLInputElement>('#tRepSearch')?.title).toBe('Müşteri, hasta veya not ile ara…');
        expect(el.querySelector('app-client-search, app-pet-search')).toBeNull();
        expect(el.textContent).not.toContain('Müşteri seç');
    });

    it('G-10 tek desen: solda Filtrele ve Temizle, sağda tek Dışa aktar menüsü (PDF, Excel, CSV, Yazdır); kayıtlı filtreler tarihlerin altında', () => {
        const state = TestBed.runInInjectionContext(() => new ReportListState<ReportListQueryBase, ReportListResultBase>({ source, stateKey: KEY, readClaim: 'Test.Read', exportFilePrefix: 'test' }));

        state.init();
        const fixture = TestBed.createComponent(ReportFilterBarComponent);
        const printed: number[] = [];

        fixture.componentRef.setInput('state', state);
        fixture.componentRef.setInput('idPrefix', 'tRep');
        fixture.componentRef.setInput('periodHint', '');
        fixture.componentRef.setInput('searchPlaceholder', 'Müşteri');
        fixture.componentRef.setInput('dateLimit', 'past');
        fixture.componentRef.setInput('printable', true);
        fixture.componentInstance.print.subscribe(() => printed.push(1));
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;
        const actions = Array.from(el.querySelectorAll<HTMLButtonElement>('[data-testid="report-filter-actions"] > button')).map((b) => b.textContent?.trim());

        expect(actions).toEqual(['Filtrele', 'Temizle', 'Dışa aktar']);
        expect(el.textContent).not.toContain('PDF indir');
        const panel = el.querySelector('[data-testid="list-filters-panel"]')!;

        expect(panel.querySelector('#tRepFrom')).not.toBeNull();
        expect(panel.querySelector('app-report-saved-filters')).not.toBeNull();
        expect(el.querySelector('[data-testid="list-filter-toggle"]')).not.toBeNull();

        el.querySelector<HTMLButtonElement>('[data-testid="report-export"]')!.click();
        const items = fixture.componentInstance.exportItems();

        expect(items.map((i) => i.label)).toEqual(['PDF indir', 'Excel indir', 'CSV indir', 'Yazdır']);
        items[3].command!({});
        expect(printed).toEqual([1]);
    });

    it('varsayılan tarih aralığı etkin filtre sayılmaz; kullanıcının değiştirdiği tarih sayılır (G-02)', () => {
        const state = TestBed.runInInjectionContext(() => new ReportListState<ReportListQueryBase, ReportListResultBase>({ source, stateKey: KEY, readClaim: 'Test.Read', exportFilePrefix: 'test' }));

        state.init();
        expect([state.isFromDateActive(), state.isToDateActive()]).toEqual([false, false]);

        state.fromDateInput = '2020-01-01';
        state.applyFilters();
        expect([state.isFromDateActive(), state.isToDateActive()]).toEqual([true, false]);

        state.resetFilters();
        expect(state.isFromDateActive()).toBe(false);
    });
    it('anlık görüntü raporunda da yalnız Arama var; yalnız tarih aralığı raporunda arama da yok', () => {
        expect(create({ snapshot: true }).querySelector('app-search-input')).not.toBeNull();
        expect(create({ dateRangeOnly: true }).querySelector('app-search-input, app-client-search, app-pet-search')).toBeNull();
    });
});
