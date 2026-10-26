import { HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { TrialLimitError } from '@/app/shared/utils/api-error.utils';
import { ReportListQueryBase, ReportListResultBase, ReportListSource, ReportListState } from './report-list-state';

type Query = ReportListQueryBase & { status?: string; minAmount?: string };
type Result = ReportListResultBase;

const KEY = 'panel:reports:test:listState';

function result(page = 1, pageSize = 25, totalCount = 3): Result {
    return { page, pageSize, totalCount, items: [{}, {}, {}] };
}

describe('ReportListState', () => {
    let source: jasmine.SpyObj<ReportListSource<Query, Result>>;
    let claims: Set<string>;
    let jwtClinic: string | null;

    function create(extraFilterKey?: 'status' | 'minAmount', snapshot = false): ReportListState<Query, Result> {
        return TestBed.runInInjectionContext(
            () => new ReportListState<Query, Result>({ source, stateKey: KEY, readClaim: 'Test.Read', exportFilePrefix: 'test-raporu', extraFilterKey, snapshot })
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

    it('extraKeys: ek defter süzgeçleri sorguya girer, oturumda saklanır, Temizle ile kalkar; dizi izni hepsi gerekir', () => {
        const make = () =>
            TestBed.runInInjectionContext(
                () =>
                    new ReportListState<Query, Result>({
                        source,
                        stateKey: KEY,
                        readClaim: ['Test.Read', 'Other.Read'],
                        exportFilePrefix: 'defter',
                        dateRangeOnly: true,
                        extraKeys: ['includeVoided', 'productId']
                    })
            );
        const state = make();

        state.init();
        expect(source.loadReport.calls.mostRecent().args[0].includeVoided).toBeUndefined();
        expect(state.canExport()).toBeFalse();
        claims.add('Other.Read');
        expect(make().canExport()).toBeTrue();

        state.extraInputs = { includeVoided: 'true', productId: 'pr1' };
        state.applyFilters();
        const q = source.loadReport.calls.mostRecent().args[0];

        expect(q.includeVoided).toBe('true');
        expect(q.productId).toBe('pr1');

        const restored = make();

        restored.init();
        expect(restored.extraInputs['productId']).toBe('pr1');
        expect(source.loadReport.calls.mostRecent().args[0].includeVoided).toBe('true');

        restored.resetFilters();
        expect(source.loadReport.calls.mostRecent().args[0].includeVoided).toBeUndefined();
    });

    it('dateRangeOnly: from/to takvim günü (yyyy-MM-dd) gider; sayfa boyutu seçenekleri yapılandırılır', () => {
        const state = TestBed.runInInjectionContext(
            () =>
                new ReportListState<Query, Result>({
                    source,
                    stateKey: KEY,
                    readClaim: 'Test.Read',
                    exportFilePrefix: 'defter',
                    dateRangeOnly: true,
                    rowsPerPageOptions: [25, 200]
                })
        );

        state.init();
        const q = source.loadReport.calls.mostRecent().args[0];

        expect(q.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(q.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(state.dateRangeOnly).toBeTrue();
        expect(state.rowsPerPageOptions).toEqual([25, 200]);
        expect(create().rowsPerPageOptions).toEqual([10, 20, 25, 50]);
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

    it('eski oturumda kalan müşteri/hasta seçimi (clientId/petId) sorguya ve yeni kayda girmez', () => {
        sessionStorage.setItem(KEY, JSON.stringify({ search: 'pamuk', clientId: 'cl-1', petId: 'pet-1', page: 1, pageSize: 25 }));
        const state = create();

        state.init();
        const q = source.loadReport.calls.mostRecent().args[0] as Record<string, unknown>;

        expect(q['search']).toBe('pamuk');
        expect('clientId' in q || 'petId' in q).toBeFalse();
        expect(Object.keys(JSON.parse(sessionStorage.getItem(KEY)!))).not.toContain('clientId');
    });

    it('sayfa boyutu değişince ilk sayfaya döner', () => {
        const state = create();

        state.init();
        state.onTableLazyLoad({ first: 0, rows: 25 }); // init sonrası ilk olay yutulur
        source.loadReport.calls.reset();
        state.onTableLazyLoad({ first: 50, rows: 10 });
        const q = source.loadReport.calls.mostRecent().args[0];

        expect(q.page).toBe(1);
        expect(q.pageSize).toBe(10);
    });

    it('mobil sayfalayıcıdan sonra tablonun sayfa olayı yutulmaz (tablo yenilemede yeniden kurulmaz)', () => {
        const state = create();

        state.init();
        state.onTableLazyLoad({ first: 0, rows: 25 }); // init sonrası ilk olay yutulur
        state.onMobilePageChange({ first: 25, rows: 25 });
        expect(source.loadReport.calls.mostRecent().args[0].page).toBe(2);
        source.loadReport.calls.reset();
        state.onTableLazyLoad({ first: 50, rows: 25 });

        expect(source.loadReport).toHaveBeenCalledTimes(1);
        expect(source.loadReport.calls.mostRecent().args[0].page).toBe(3);
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
        expect(state.exportTrialLimited()).toBeFalse();
        expect(state.exportKind()).toBeNull();
    });

    it('deneme kısıtı (Trial.ExportLimitExceeded): sunucu metni ve abonelik eylemi bayrağı; sonraki denemede bayrak sıfırlanır', () => {
        const state = create();
        const detail = 'Deneme sürümünde dışa aktarma en fazla 1000 satır sınırı; abonelikle kalkar. Filtreyi daraltın.';

        state.init();
        source.exportXlsxBlob.and.returnValue(throwError(() => new TrialLimitError(detail, 'Trial.ExportLimitExceeded')));
        state.exportXlsx();
        expect(state.exportError()).toBe(detail);
        expect(state.exportTrialLimited()).toBeTrue();

        source.exportCsvBlob.and.returnValue(throwError(() => new Error('Sunucu hatası')));
        state.exportCsv();
        expect(state.exportTrialLimited()).toBeFalse();
    });

    it('yükleme hatasında hata mesajı gösterir', () => {
        source.loadReport.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
        const state = create();

        state.init();
        expect(state.error()).toBeTruthy();
        expect(state.loading()).toBeFalse();
    });

    it('anlık görüntü raporu tarih göndermez; tutar süzgeci liste ve dışa aktarmada aynıdır', () => {
        const state = create('minAmount', true);

        state.init();
        const first = source.loadReport.calls.mostRecent().args[0];

        expect(first.from).toBeUndefined();
        expect(first.to).toBeUndefined();
        expect(state.fromDateInput).toBe('');

        state.extraFilter = '250';
        state.searchInput = 'ayse';
        state.applyFilters();
        const listQ = source.loadReport.calls.mostRecent().args[0];

        expect(listQ.minAmount).toBe('250');
        expect(listQ.search).toBe('ayse');
        expect(state.dateFilterError()).toBeNull();

        source.exportXlsxBlob.and.returnValue(of(new HttpResponse({ body: new Blob(['x']), headers: new HttpHeaders() })));
        spyOn(HTMLAnchorElement.prototype, 'click');
        state.exportXlsx();
        expect(source.exportXlsxBlob.calls.mostRecent().args[0]).toEqual({ ...listQ, page: 1 });

        state.resetFilters();
        const reset = source.loadReport.calls.mostRecent().args[0];

        expect(reset.minAmount).toBeUndefined();
        expect(reset.from).toBeUndefined();
    });
});
