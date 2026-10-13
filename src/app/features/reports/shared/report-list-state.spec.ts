import { HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { ReportListQueryBase, ReportListResultBase, ReportListSource, ReportListState } from './report-list-state';

type Query = ReportListQueryBase & { status?: string };
type Result = ReportListResultBase;

const KEY = 'panel:reports:test:listState';

function result(page = 1, pageSize = 25, totalCount = 3): Result {
    return { page, pageSize, totalCount, items: [{}, {}, {}] };
}

describe('ReportListState', () => {
    let source: jasmine.SpyObj<ReportListSource<Query, Result>>;
    let claims: Set<string>;
    let jwtClinic: string | null;

    function create(extraFilterKey?: 'status'): ReportListState<Query, Result> {
        return TestBed.runInInjectionContext(
            () => new ReportListState<Query, Result>({ source, stateKey: KEY, readClaim: 'Test.Read', exportFilePrefix: 'test-raporu', extraFilterKey })
        );
    }

    beforeEach(() => {
        sessionStorage.removeItem(KEY);
        claims = new Set(['Test.Read']);
        jwtClinic = null;
        source = jasmine.createSpyObj('source', ['loadReport', 'exportCsvBlob', 'exportXlsxBlob']);
        source.loadReport.and.callFake((q) => of(result(q.page ?? 1, q.pageSize ?? 25)));
        TestBed.configureTestingModule({
            providers: [
                {
                    provide: AuthService,
                    useValue: {
                        hasOperationClaim: (c: string) => claims.has(c),
                        getMyClinics: () => of([{ id: 'c1', name: 'Klinik 1' }]),
                        getJwtClinicId: () => jwtClinic
                    }
                }
            ]
        });
    });

    it('ilk açılışta bu ayın başından bugüne varsayılan tarihle yükler ve sonucu yayar', () => {
        const state = create();
        state.init();
        const q = source.loadReport.calls.mostRecent().args[0];
        expect(q.page).toBe(1);
        expect(q.pageSize).toBe(25);
        expect(q.from).toBeTruthy();
        expect(q.to).toBeTruthy();
        expect(state.loading()).toBeFalse();
        expect(state.report()?.totalCount).toBe(3);
        expect(state.clinicOptions().map((o) => o.value)).toEqual(['', 'c1']);
    });

    it('rapora özgü süzgeç yalnız yapılandırılmışsa sorguya girer', () => {
        const withExtra = create('status');
        withExtra.init();
        withExtra.extraFilter = '1';
        withExtra.applyFilters();
        expect(source.loadReport.calls.mostRecent().args[0].status).toBe('1');

        source.loadReport.calls.reset();
        const without = create();
        without.init();
        without.extraFilter = '1';
        without.applyFilters();
        expect('status' in source.loadReport.calls.mostRecent().args[0]).toBeFalse();
    });

    it('tek taraflı tarih seçimi istek atmaz ve uyarı gösterir', () => {
        const state = create();
        state.init();
        source.loadReport.calls.reset();
        state.toDateInput = '';
        state.applyFilters();
        expect(state.dateFilterError()).toBeTruthy();
        expect(source.loadReport).not.toHaveBeenCalled();
    });

    it('ters girilen tarih aralığını yer değiştirir', () => {
        const state = create();
        state.init();
        state.fromDateInput = '2026-03-10';
        state.toDateInput = '2026-03-01';
        state.applyFilters();
        expect(state.fromDateInput).toBe('2026-03-01');
        expect(state.toDateInput).toBe('2026-03-10');
    });

    it('aynı sorguyu tekrar yüklemez; reload zorla yükler', () => {
        const state = create();
        state.init();
        source.loadReport.calls.reset();
        state.applyFilters();
        expect(source.loadReport).not.toHaveBeenCalled();
        state.reload();
        expect(source.loadReport).toHaveBeenCalledTimes(1);
    });

    it('süzgeç ve sayfa konumunu oturumda saklar, yeniden açılışta geri yükler', () => {
        const first = create('status');
        first.init();
        first.extraFilter = '2';
        first.searchInput = 'pamuk';
        first.applyFilters();
        first.onTableLazyLoad({ first: 0, rows: 25 }); // tablonun ilk olayı yutulur
        first.onTableLazyLoad({ first: 25, rows: 25 });

        const second = create('status');
        second.init();
        expect(second.extraFilter).toBe('2');
        expect(second.searchInput).toBe('pamuk');
        expect(second.currentPage()).toBe(2);
    });

    it('sayfa boyutu değişince ilk sayfaya döner; mobil sayfalayıcı sonraki tablo olayını yutar', () => {
        const state = create();
        state.init();
        state.onTableLazyLoad({ first: 0, rows: 25 }); // init sonrası ilk olay yutulur
        source.loadReport.calls.reset();
        state.onTableLazyLoad({ first: 50, rows: 10 });
        const q = source.loadReport.calls.mostRecent().args[0];
        expect(q.page).toBe(1);
        expect(q.pageSize).toBe(10);
    });

    it('resetFilters süzgeçleri ve saklanan durumu temizler', () => {
        const state = create();
        state.init();
        state.searchInput = 'x';
        state.applyFilters();
        state.resetFilters();
        expect(state.searchInput).toBe('');
        expect(state.activeSearch()).toBe('');
        expect(sessionStorage.getItem(KEY)).toBeTruthy(); // yükleme sonrası güncel konum yeniden yazılır
        expect(JSON.parse(sessionStorage.getItem(KEY)!).search).toBe('');
    });

    it('JWT klinikle uyuşmayan klinik süzgeci sorgudan çıkarılır', () => {
        jwtClinic = 'c1';
        const state = create();
        state.init();
        state.clinicIdFilter = 'other';
        state.applyFilters();
        expect(source.loadReport.calls.mostRecent().args[0].clinicId).toBeUndefined();
    });

    it('liste ve dışa aktarma aynı süzgeçleri kullanır; dosya adı başlık yoksa önek+tarih+uzantı', () => {
        const state = create('status');
        state.init();
        state.extraFilter = '1';
        state.searchInput = 'a';
        state.applyFilters();
        const listQ = source.loadReport.calls.mostRecent().args[0];

        const blob = new Blob(['x']);
        source.exportCsvBlob.and.returnValue(of(new HttpResponse({ body: blob, headers: new HttpHeaders() })));
        const click = spyOn(HTMLAnchorElement.prototype, 'click');
        state.exportCsv();
        expect(click).toHaveBeenCalled();
        const exportQ = source.exportCsvBlob.calls.mostRecent().args[0];
        expect(exportQ).toEqual({ ...listQ, page: 1 });
        expect(state.exportKind()).toBeNull();
    });

    it('okuma izni yoksa dışa aktarma çalışmaz', () => {
        claims.clear();
        const state = create();
        state.init();
        state.exportXlsx();
        expect(source.exportXlsxBlob).not.toHaveBeenCalled();
    });

    it('dışa aktarma hatasında mesajı gösterir', () => {
        const state = create();
        state.init();
        source.exportCsvBlob.and.returnValue(throwError(() => new Error('Sunucu hatası')));
        state.exportCsv();
        expect(state.exportError()).toBe('Sunucu hatası');
        expect(state.exportKind()).toBeNull();
    });

    it('yükleme hatasında hata mesajı gösterir', () => {
        source.loadReport.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
        const state = create();
        state.init();
        expect(state.error()).toBeTruthy();
        expect(state.loading()).toBeFalse();
    });
});
