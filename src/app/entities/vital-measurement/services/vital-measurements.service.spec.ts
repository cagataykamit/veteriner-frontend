import { HttpErrorResponse, provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { AuthService } from '@/app/core/auth/auth.service';
import { VitalMeasurementsService } from '@/app/entities/vital-measurement/services/vital-measurements.service';

const BASE = 'http://api.test/api/v1/vital-measurements';

describe('VitalMeasurementsService', () => {
    let service: VitalMeasurementsService;
    let http: HttpTestingController;
    let clinicId: string | null;

    beforeEach(() => {
        clinicId = 'c1';
        TestBed.configureTestingModule({
            providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: 'http://api.test' }, { provide: AuthService, useValue: { getClinicId: () => clinicId } }]
        });
        service = TestBed.inject(VitalMeasurementsService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('eğilim: hasta ve yatışla istenir, klinik süzgeci gönderilmez; iki kaynak tek listede döner', () =>
        new Promise<void>((done) => {
            service.getSeries({ petId: 'p1', hospitalizationId: 'h1' }).subscribe((series) => {
                expect(series.truncated).toBe(false);
                expect(series.examinationsOmitted).toBe(true);
                expect(series.points.map((p) => p.key)).toEqual(['Examination:e1', 'VitalMeasurement:m1']);
                expect(series.points[0]).toMatchObject({ source: 'Examination', temperatureC: 39.1, heartRateBpm: null, weightKg: 12.6, examinationId: 'e1', hospitalizationId: null, cancelled: false });
                expect(series.points[1].time).toBe(Date.parse('2026-11-19T15:00:00Z'));
                done();
            });
            const req = http.expectOne((r) => r.url === `${BASE}/series`);

            expect(req.request.params.get('petId')).toBe('p1');
            expect(req.request.params.get('hospitalizationId')).toBe('h1');
            expect(req.request.params.has('clinicId')).toBe(false);
            expect(req.request.params.has('fromUtc')).toBe(false);
            req.flush({
                points: [
                    { source: 'Examination', sourceId: 'e1', clinicId: 'c1', measuredAtUtc: '2026-11-19T09:00:00Z', temperatureC: 39.1, heartRateBpm: null, respiratoryRatePerMin: null, weightKg: 12.6, hospitalizationId: null, examinationId: 'e1' },
                    { source: 'VitalMeasurement', sourceId: 'm1', clinicId: 'c1', measuredAtUtc: '2026-11-19T15:00:00Z', temperatureC: 38.6, heartRateBpm: 120, respiratoryRatePerMin: 24, weightKg: null, hospitalizationId: 'h1', examinationId: null }
                ],
                truncated: false,
                omittedSources: ['Examination']
            });
        }));

    it('sunucu zamanı Z olmadan döndürürse UTC kabul edilir (yerel saat sanılıp 3 saat kaymaz)', () =>
        new Promise<void>((done) => {
            service.getSeries({ petId: 'p1' }).subscribe((series) => {
                expect(series.points[0].time).toBe(Date.parse('2026-11-21T10:49:12Z'));
                expect(series.points[0].measuredAtUtc).toBe('2026-11-21T10:49:12.000Z');
                done();
            });
            http.expectOne((r) => r.url === `${BASE}/series`).flush({ points: [{ source: 'VitalMeasurement', sourceId: 'm1', clinicId: 'c1', measuredAtUtc: '2026-11-21T10:49:12', temperatureC: 39.1 }], truncated: false, omittedSources: [] });
        }));

    it('iptal edilenler: listeden includeCancelled ile okunur, yalnız iptal edilmişler alınır', () =>
        new Promise<void>((done) => {
            service.getCancelled({ petId: 'p1', dateFromUtc: '2026-11-18T06:00:00Z' }).subscribe((points) => {
                expect(points).toHaveLength(1);
                expect(points[0]).toMatchObject({ key: 'VitalMeasurement:m2', cancelled: true, temperatureC: 40.3 });
                done();
            });
            const req = http.expectOne((r) => r.url === BASE);

            expect(req.request.params.get('petId')).toBe('p1');
            expect(req.request.params.get('includeCancelled')).toBe('true');
            expect(req.request.params.get('dateFromUtc')).toBe('2026-11-18T06:00:00Z');
            expect(req.request.params.get('pageSize')).toBe('200');
            req.flush({
                items: [
                    { id: 'm1', clinicId: 'c1', petId: 'p1', measuredAtUtc: '2026-11-19T15:00:00Z', temperatureC: 38.6, isCancelled: false, addedAfterFinalization: false },
                    { id: 'm2', clinicId: 'c1', petId: 'p1', measuredAtUtc: '2026-11-19T09:15:00Z', temperatureC: 40.3, isCancelled: true, addedAfterFinalization: false }
                ],
                page: 1,
                pageSize: 200,
                totalItems: 2,
                totalPages: 1
            });
        }));

    it('oluşturma: aktif klinik ve bağ gövdeye yazılır, not kırpılır', () =>
        new Promise<void>((done) => {
            service
                .create({ petId: 'p1', hospitalizationId: 'h1', examinationId: null, measuredAtUtc: '2026-11-20T09:00:00Z', temperatureC: 38.5, heartRateBpm: 96, respiratoryRatePerMin: null, weightKg: null, note: '  sakin  ', lateEntryReason: null })
                .subscribe((res) => {
                    expect(res).toEqual({ id: 'new1' });
                    done();
                });
            const req = http.expectOne(BASE);

            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({ clinicId: 'c1', petId: 'p1', hospitalizationId: 'h1', examinationId: null, measuredAtUtc: '2026-11-20T09:00:00Z', temperatureC: 38.5, heartRateBpm: 96, respiratoryRatePerMin: null, weightKg: null, note: 'sakin', lateEntryReason: null });
            req.flush('new1');
        }));

    it('oluşturma: aktif klinik yoksa istek atılmaz', () =>
        new Promise<void>((done) => {
            clinicId = null;
            service.create({ petId: 'p1', hospitalizationId: null, examinationId: null, measuredAtUtc: '2026-11-20T09:00:00Z', temperatureC: 38.5, heartRateBpm: null, respiratoryRatePerMin: null, weightKg: null, note: null, lateEntryReason: null }).subscribe({
                error: (e: Error) => {
                    expect(e.message).toContain('Aktif klinik');
                    done();
                }
            });
        }));

    it('güncelleme: rowVersion gövdede gider, 409 ham HttpErrorResponse olarak iletilir', () =>
        new Promise<void>((done) => {
            service.update('m1', { measuredAtUtc: '2026-11-20T09:00:00Z', temperatureC: 38.4, heartRateBpm: null, respiratoryRatePerMin: null, weightKg: null, note: null }, 'v1').subscribe({
                error: (e: unknown) => {
                    expect(e).toBeInstanceOf(HttpErrorResponse);
                    expect((e as HttpErrorResponse).status).toBe(409);
                    done();
                }
            });
            const req = http.expectOne(`${BASE}/m1`);

            expect(req.request.method).toBe('PUT');
            expect(req.request.body).toEqual({ measuredAtUtc: '2026-11-20T09:00:00Z', temperatureC: 38.4, heartRateBpm: null, respiratoryRatePerMin: null, weightKg: null, note: null, rowVersion: 'v1' });
            req.flush({ extensions: { code: 'VitalMeasurements.ConcurrencyConflict' } }, { status: 409, statusText: 'Conflict' });
        }));

    it('iptal: gerekçe kırpılır ve sürümle gönderilir', () =>
        new Promise<void>((done) => {
            service.cancel('m1', '  yanlış hasta  ', 'v2').subscribe((res) => {
                expect(res).toEqual({ id: 'm1', rowVersion: 'v3' });
                done();
            });
            const req = http.expectOne(`${BASE}/m1/cancel`);

            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({ reason: 'yanlış hasta', rowVersion: 'v2' });
            req.flush({ id: 'm1', rowVersion: 'v3' });
        }));

    it('detay: not, sürüm ve iptal bilgisi taşınır', () =>
        new Promise<void>((done) => {
            service.getById('m1').subscribe((d) => {
                expect(d).toMatchObject({ id: 'm1', note: 'sakin', rowVersion: 'v1', cancelledAtUtc: null, cancelReason: null, addedAfterFinalization: true, lateEntryReason: 'unutuldu', examinationId: 'e1' });
                done();
            });
            http.expectOne(`${BASE}/m1`).flush({ id: 'm1', clinicId: 'c1', petId: 'p1', examinationId: 'e1', measuredAtUtc: '2026-11-19T15:00:00Z', temperatureC: 38.6, note: ' sakin ', rowVersion: 'v1', addedAfterFinalization: true, lateEntryReason: 'unutuldu' });
        }));
});
