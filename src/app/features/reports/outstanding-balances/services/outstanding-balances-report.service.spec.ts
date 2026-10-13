import { HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { AuthService } from '@/app/core/auth/auth.service';
import { OutstandingBalancesReportService } from './outstanding-balances-report.service';

describe('OutstandingBalancesReportService', () => {
    let api: jasmine.SpyObj<ApiClient>;
    let service: OutstandingBalancesReportService;
    let authClinicId: string | null;

    beforeEach(() => {
        authClinicId = null;
        api = jasmine.createSpyObj<ApiClient>('ApiClient', ['get', 'getBlob']);
        api.get.and.returnValue(of({ totalCount: 0, totalOutstandingAmount: 0, items: [] }));
        api.getBlob.and.returnValue(of(new HttpResponse({ body: new Blob(['x']), headers: new HttpHeaders() })));
        TestBed.configureTestingModule({
            providers: [
                { provide: ApiClient, useValue: api },
                { provide: AuthService, useValue: { getClinicId: () => authClinicId } }
            ]
        });
        service = TestBed.inject(OutstandingBalancesReportService);
    });

    const keys = (p: HttpParams) => p.keys().sort();

    it('liste sözleşmedeki süzgeçleri ve sayfalamayı gönderir; tarih/müşteri/hayvan göndermez', () => {
        service.loadReport({ minAmount: '250', search: 'ayşe', clinicId: 'c1', page: 2, pageSize: 50 }).subscribe();
        const [path, params] = api.get.calls.mostRecent().args as [string, HttpParams];
        expect(path).toBe('/api/v1/reports/outstanding-balances');
        expect(params.get('minAmount')).toBe('250');
        expect(params.get('search')).toBe('ayşe');
        expect(params.get('clinicId')).toBe('c1');
        expect(params.get('page')).toBe('2');
        expect(params.get('pageSize')).toBe('50');
        expect(keys(params)).toEqual(['clinicId', 'minAmount', 'page', 'pageSize', 'search']);
    });

    it('CSV ve XLSX dışa aktarma, sayfalama dışında listeyle aynı süzgeç kümesini gönderir', () => {
        const q = { minAmount: '100', search: 'ali', clinicId: 'c1', page: 3, pageSize: 10 };
        service.loadReport(q).subscribe();
        const listParams = api.get.calls.mostRecent().args[1] as HttpParams;

        service.exportCsvBlob(q).subscribe();
        const [csvPath, csvParams] = api.getBlob.calls.mostRecent().args as [string, HttpParams];
        service.exportXlsxBlob(q).subscribe();
        const [xlsxPath, xlsxParams] = api.getBlob.calls.mostRecent().args as [string, HttpParams];

        expect(csvPath).toBe('/api/v1/reports/outstanding-balances/export');
        expect(xlsxPath).toBe('/api/v1/reports/outstanding-balances/export-xlsx');
        for (const p of [csvParams, xlsxParams]) {
            expect(p.has('page')).toBeFalse();
            expect(p.has('pageSize')).toBeFalse();
            expect(keys(p)).toEqual(keys(listParams).filter((k) => k !== 'page' && k !== 'pageSize'));
            for (const k of p.keys()) {
                expect(p.get(k)).toBe(listParams.get(k));
            }
        }
    });

    it('süzgeçte klinik yoksa JWT klinik bağlamı kullanılır; boş süzgeçler gönderilmez', () => {
        authClinicId = 'jwt-clinic';
        service.loadReport({ minAmount: ' ', search: '' }).subscribe();
        const params = api.get.calls.mostRecent().args[1] as HttpParams;
        expect(params.get('clinicId')).toBe('jwt-clinic');
        expect(params.has('minAmount')).toBeFalse();
        expect(params.has('search')).toBeFalse();
    });
});
