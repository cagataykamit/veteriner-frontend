import { HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { AuthService } from '@/app/core/auth/auth.service';
import { RegisterReportSource } from './register-report.source';

describe('RegisterReportSource', () => {
    let api: jasmine.SpyObj<ApiClient>;
    let authClinicId: string | null;
    let source: RegisterReportSource<{ rowNumber: number }>;

    beforeEach(() => {
        authClinicId = null;
        api = jasmine.createSpyObj<ApiClient>('ApiClient', ['get', 'getBlob']);
        api.get.and.returnValue(of({ totalCount: 1, items: [{ rowNumber: 1 }] }));
        api.getBlob.and.returnValue(of(new HttpResponse({ body: new Blob(['x']), headers: new HttpHeaders() })));
        source = new RegisterReportSource(api, { getClinicId: () => authClinicId } as unknown as AuthService, 'examinations');
    });

    const keys = (p: HttpParams) => p.keys().sort();
    const query = { from: '2026-10-01', to: '2026-10-13', clinicId: 'c1', page: 2, pageSize: 50 };

    it('liste yalnız tarih aralığı, klinik ve sayfalamayı gönderir; sayfa bilgisini isteğe göre ekler', () => {
        let result: unknown;

        source.loadReport({ ...query, search: 'x', clientId: 'k', petId: 'p' }).subscribe((r) => (result = r));
        const [path, params] = api.get.calls.mostRecent().args as [string, HttpParams];

        expect(path).toBe('/api/v1/reports/registers/examinations');
        expect(params.get('from')).toBe('2026-10-01');
        expect(params.get('to')).toBe('2026-10-13');
        expect(keys(params)).toEqual(['clinicId', 'from', 'page', 'pageSize', 'to']);
        expect(result).toEqual({ totalCount: 1, items: [{ rowNumber: 1 }], page: 2, pageSize: 50 });
    });

    it('CSV ve XLSX, sayfalama dışında listeyle aynı süzgeci gönderir', () => {
        source.loadReport(query).subscribe();
        const listParams = api.get.calls.mostRecent().args[1] as HttpParams;

        source.exportCsvBlob(query).subscribe();
        const [csvPath, csvParams] = api.getBlob.calls.mostRecent().args as [string, HttpParams];

        source.exportXlsxBlob(query).subscribe();
        const [xlsxPath, xlsxParams] = api.getBlob.calls.mostRecent().args as [string, HttpParams];

        expect(csvPath).toBe('/api/v1/reports/registers/examinations/export');
        expect(xlsxPath).toBe('/api/v1/reports/registers/examinations/export-xlsx');

        for (const p of [csvParams, xlsxParams]) {
            expect(keys(p)).toEqual(keys(listParams).filter((k) => k !== 'page' && k !== 'pageSize'));

            for (const k of p.keys()) {
                expect(p.get(k)).toBe(listParams.get(k));
            }
        }
    });

    it('süzgeçte klinik yoksa JWT klinik bağlamı kullanılır', () => {
        authClinicId = 'jwt-clinic';
        source.loadReport({ from: '2026-10-01', to: '2026-10-13' }).subscribe();
        expect((api.get.calls.mostRecent().args[1] as HttpParams).get('clinicId')).toBe('jwt-clinic');
    });

    it('defter süzgeçleri (includeVoided, productId, veterinarianId) liste ve dışa aktarmada gider; boşlar gitmez', () => {
        const extra = { ...query, includeVoided: 'true', productId: 'pr1', veterinarianId: '' };

        source.loadReport(extra).subscribe();
        const listParams = api.get.calls.mostRecent().args[1] as HttpParams;

        expect(listParams.get('includeVoided')).toBe('true');
        expect(listParams.get('productId')).toBe('pr1');
        expect(listParams.has('veterinarianId')).toBeFalse();
        source.exportXlsxBlob(extra).subscribe();
        const xlsxParams = api.getBlob.calls.mostRecent().args[1] as HttpParams;

        expect(xlsxParams.get('includeVoided')).toBe('true');
        expect(xlsxParams.get('productId')).toBe('pr1');
    });

    it('reçete defteri kendi ucunu kullanır', () => {
        new RegisterReportSource(api, { getClinicId: () => null } as unknown as AuthService, 'prescriptions').loadReport(query).subscribe();
        expect(api.get.calls.mostRecent().args[0]).toBe('/api/v1/reports/registers/prescriptions');
    });
});
