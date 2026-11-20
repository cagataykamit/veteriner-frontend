import type { MockedObject } from 'vitest';
import { HttpParams } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ReportPreferencesService, reportKeyFromRoute } from './report-preferences.service';

describe('reportKeyFromRoute', () => {
    it('Rapor Merkezi adresinden kararlı anahtar türetir; sorgu ve sondaki eğik çizgi yok sayılır', () => {
        expect(reportKeyFromRoute('/panel/reports/payments')).toBe('payments');
        expect(reportKeyFromRoute('/panel/reports/end-of-day?from=2026-10-01')).toBe('end-of-day');
        expect(reportKeyFromRoute('/panel/reports/registers/examinations/')).toBe('registers.examinations');
        expect(reportKeyFromRoute('/panel/reports/registers/controlled-substances#top')).toBe('registers.controlled-substances');
    });

    it('Rapor Merkezi dışı ya da merkezin kendisi için null döner', () => {
        expect(reportKeyFromRoute('/panel/reports')).toBeNull();
        expect(reportKeyFromRoute('/panel/clients')).toBeNull();
        expect(reportKeyFromRoute('/')).toBeNull();
        expect(reportKeyFromRoute('/panel/reports/Payments')).toBeNull();
    });
});

describe('ReportPreferencesService', () => {
    let api: MockedObject<ApiClient>;
    let service: ReportPreferencesService;

    beforeEach(() => {
        api = {
            get: vi.fn().mockName('ApiClient.get'),
            put: vi.fn().mockName('ApiClient.put'),
            post: vi.fn().mockName('ApiClient.post'),
            delete: vi.fn().mockName('ApiClient.delete')
        } as unknown as MockedObject<ApiClient>;
        api.put.mockReturnValue(of(undefined));
        api.delete.mockReturnValue(of(undefined));
        TestBed.configureTestingModule({ providers: [{ provide: ApiClient, useValue: api }] });
        service = TestBed.inject(ReportPreferencesService);
    });

    it('favorileri anahtar listesine çevirir; ekle/çıkar anahtarı adreste gönderir', () => {
        api.get.mockReturnValue(
            of([
                { reportKey: 'payments', createdAtUtc: '' },
                { reportKey: 'registers.vaccines', createdAtUtc: '' }
            ])
        );
        let keys: string[] = [];

        service.listFavoriteKeys().subscribe((k) => (keys = k));
        service.addFavorite('registers.vaccines').subscribe();
        service.removeFavorite('payments').subscribe();

        expect(api.get).toHaveBeenCalledWith('/api/v1/reports/favorites');
        expect(keys).toEqual(['payments', 'registers.vaccines']);
        expect(api.put).toHaveBeenCalledWith('/api/v1/reports/favorites/registers.vaccines', null);
        expect(api.delete).toHaveBeenCalledWith('/api/v1/reports/favorites/payments');
    });

    it('kayıtlı filtreleri rapor anahtarıyla listeler, oluşturur ve siler', () => {
        api.get.mockReturnValue(of([]));
        api.post.mockReturnValue(of({ id: 'f1' }));

        service.listSavedFilters('payments').subscribe();
        service.createSavedFilter('payments', 'Nakit', { method: 'Cash' }).subscribe();
        service.deleteSavedFilter('f1').subscribe();

        const [path, params] = vi.mocked(api.get).mock.lastCall as [string, HttpParams];

        expect(path).toBe('/api/v1/reports/saved-filters');
        expect(params.get('reportKey')).toBe('payments');
        expect(api.post).toHaveBeenCalledWith('/api/v1/reports/saved-filters', { reportKey: 'payments', name: 'Nakit', filters: { method: 'Cash' } });
        expect(api.delete).toHaveBeenCalledWith('/api/v1/reports/saved-filters/f1');
    });
});
