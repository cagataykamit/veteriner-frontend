import type { MockedObject } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { RecordHistoryService } from '@/app/entities/record-history/services/record-history.service';
import { VitalMeasurementsSectionComponent } from '@/app/entities/vital-measurement/components/vital-measurements-section.component';
import type { VitalMeasurementDetailVm, VitalPointVm, VitalSeriesVm } from '@/app/entities/vital-measurement/models/vital-measurement-vm.model';
import { VitalMeasurementsService } from '@/app/entities/vital-measurement/services/vital-measurements.service';
import { toIstanbulDateTimeLocalInputValue } from '@/app/shared/utils/date.utils';

const HOUR = 3_600_000;
/** Kurallar gerçek saate göre çalışır; örnek zamanlar şimdiye göre kurulur. */
const ago = (hours: number) => new Date(Date.now() - hours * HOUR).toISOString().replace(/\.\d{3}Z$/, '.000Z');
const ADMITTED = ago(50);

const point = (id: string, at: string, values: Partial<Pick<VitalPointVm, 'temperatureC' | 'heartRateBpm' | 'respiratoryRatePerMin' | 'weightKg'>>, extra: Partial<VitalPointVm> = {}): VitalPointVm => ({
    key: `VitalMeasurement:${id}`,
    source: 'VitalMeasurement',
    sourceId: id,
    measuredAtUtc: at,
    time: Date.parse(at),
    temperatureC: null,
    heartRateBpm: null,
    respiratoryRatePerMin: null,
    weightKg: null,
    hospitalizationId: 'h1',
    examinationId: null,
    cancelled: false,
    ...values,
    ...extra
});

const examPoint = point('e1', ago(49), { temperatureC: 39.8, heartRateBpm: 132, weightKg: 12.6 }, { key: 'Examination:e1', source: 'Examination', hospitalizationId: null, examinationId: 'e1' });
const m1 = point('m1', ago(24), { temperatureC: 38.9, heartRateBpm: 112, respiratoryRatePerMin: 26 });
const m2 = point('m2', ago(2), { temperatureC: 38.5, heartRateBpm: 96, respiratoryRatePerMin: 22 });
const cancelledPoint = point('m9', ago(30), { temperatureC: 40.3 }, { cancelled: true });

const seriesOf = (points: VitalPointVm[], extra: Partial<VitalSeriesVm> = {}): VitalSeriesVm => ({ points, truncated: false, examinationsOmitted: false, ...extra });

const detailOf = (p: VitalPointVm, extra: Partial<VitalMeasurementDetailVm> = {}): VitalMeasurementDetailVm => ({
    id: p.sourceId,
    measuredAtUtc: p.measuredAtUtc,
    temperatureC: p.temperatureC,
    heartRateBpm: p.heartRateBpm,
    respiratoryRatePerMin: p.respiratoryRatePerMin,
    weightKg: p.weightKg,
    note: null,
    rowVersion: 'v1',
    hospitalizationId: p.hospitalizationId,
    examinationId: p.examinationId,
    cancelledAtUtc: null,
    cancelReason: null,
    addedAfterFinalization: false,
    lateEntryReason: null,
    ...extra
});

const ALL_CLAIMS = ['VitalMeasurements.Read', 'VitalMeasurements.Create', 'VitalMeasurements.Update'];

describe('VitalMeasurementsSectionComponent', () => {
    let fixture: ComponentFixture<VitalMeasurementsSectionComponent>;
    let service: MockedObject<VitalMeasurementsService>;
    let claims: Set<string>;
    let mutationBlocked: boolean;

    const settle = async () => {
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    };

    const setup = async (inputs: Record<string, unknown> = { hospitalizationId: 'h1', admittedAtUtc: ADMITTED }) => {
        await TestBed.configureTestingModule({
            imports: [VitalMeasurementsSectionComponent],
            providers: [
                provideRouter([]),
                { provide: VitalMeasurementsService, useValue: service },
                { provide: RecordHistoryService, useValue: { getHistory: vi.fn().mockReturnValue(of([])) } },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c) } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => mutationBlocked } }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(VitalMeasurementsSectionComponent);
        fixture.componentRef.setInput('petId', 'p1');

        for (const [name, value] of Object.entries(inputs)) {
            fixture.componentRef.setInput(name, value);
        }

        await settle();
    };

    const component = () => fixture.componentInstance;
    const root = () => fixture.nativeElement as HTMLElement;
    const el = (testId: string) => root().querySelector<HTMLElement>(`[data-testid="${testId}"]`);
    const has = (testId: string) => !!el(testId);
    const text = (testId: string) => el(testId)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

    const fillAndSubmit = async (values: Record<string, string>) => {
        component().form.patchValue(values);
        component().onSubmit();
        await settle();
    };

    const selectPoint = async (p: VitalPointVm) => {
        component().select(p.key);
        await settle();
    };

    beforeEach(() => {
        service = {
            getSeries: vi.fn().mockName('getSeries'),
            getCancelled: vi.fn().mockName('getCancelled'),
            getById: vi.fn().mockName('getById'),
            create: vi.fn().mockName('create'),
            update: vi.fn().mockName('update'),
            cancel: vi.fn().mockName('cancel')
        } as unknown as MockedObject<VitalMeasurementsService>;
        service.getSeries.mockReturnValue(of(seriesOf([examPoint, m1, m2])));
        service.getCancelled.mockReturnValue(of([cancelledPoint]));
        service.getById.mockImplementation((id: string) => of(detailOf([m1, m2, cancelledPoint].find((p) => p.sourceId === id)!)));
        service.create.mockReturnValue(of({ id: 'new1' }));
        service.update.mockReturnValue(of({ id: 'm2', rowVersion: 'v2' }));
        service.cancel.mockReturnValue(of({ id: 'm2', rowVersion: 'v2' }));
        claims = new Set(ALL_CLAIMS);
        mutationBlocked = false;
    });

    it('okuma izni yoksa hiçbir şey çizmez ve istek atmaz', async () => {
        claims.clear();
        await setup();

        expect(has('vital-measurements-section')).toBe(false);
        expect(service.getSeries).not.toHaveBeenCalled();
    });

    it('yatışta eğilimi yatış süzgeciyle okur; dört grafik, son değer ve fark görünür', async () => {
        await setup();

        expect(service.getSeries).toHaveBeenCalledWith({ petId: 'p1', hospitalizationId: 'h1', fromUtc: null });
        expect(root().querySelectorAll('app-vital-trend-chart')).toHaveLength(4);
        expect(text('vital-panel-temperatureC')).toContain('38,5');
        expect(text('vital-panel-temperatureC')).toContain('−0,4');
        expect(text('vital-panel-heartRateBpm')).toContain('96');
        expect(text('vital-panel-weightKg')).toContain('12,6');
        expect(has('vital-form')).toBe(true);
    });

    it('sekreter (yalnız okuma): giriş satırı, düzenle ve iptal çizilmez; ayrıntı görünür', async () => {
        claims = new Set(['VitalMeasurements.Read']);
        await setup();
        await selectPoint(m2);

        expect(has('vital-form')).toBe(false);
        expect(text('vital-selection')).toContain('38,5 °C · Nabız 96/dk · Solunum 22/dk');
        expect(has('vital-edit')).toBe(false);
        expect(has('vital-cancel')).toBe(false);
    });

    it('salt okunur kiracıda ve kapalı yatışta giriş satırı çizilmez', async () => {
        mutationBlocked = true;
        await setup();

        expect(has('vital-form')).toBe(false);

        TestBed.resetTestingModule();
        mutationBlocked = false;
        await setup({ hospitalizationId: 'h1', admittedAtUtc: ADMITTED, entryClosed: true });

        expect(has('vital-form')).toBe(false);
    });

    it('hiç değer girilmezse kaydetmez ve uyarır', async () => {
        await setup();
        await fillAndSubmit({});

        expect(has('vital-value-required')).toBe(true);
        expect(service.create).not.toHaveBeenCalled();
    });

    it('aralık dışı değerde kaydetmez; hata alanın altında görünür', async () => {
        await setup();
        await fillAndSubmit({ temperatureC: '52' });

        expect(service.create).not.toHaveBeenCalled();
        expect(root().textContent).toContain('Ateş 25,0–45,0 °C arasında olmalı.');
    });

    it('geçerli ölçümü yatışa bağlı kaydeder: değerler yuvarlanır, boş zaman şimdidir; yeni ölçüm seçilir', async () => {
        await setup();
        const before = Date.now();

        await fillAndSubmit({ temperatureC: '38,25', heartRateBpm: '92', note: '  iştahlı ' });

        const req = service.create.mock.calls[0][0];

        expect(req).toMatchObject({ petId: 'p1', hospitalizationId: 'h1', examinationId: null, temperatureC: 38.3, heartRateBpm: 92, respiratoryRatePerMin: null, weightKg: null, note: 'iştahlı', lateEntryReason: null });
        expect(Date.parse(req.measuredAtUtc)).toBeGreaterThanOrEqual(before);
        expect(Date.parse(req.measuredAtUtc)).toBeLessThanOrEqual(Date.now());
        expect(service.getSeries).toHaveBeenCalledTimes(2);
        expect(component().selectedKey()).toBe('VitalMeasurement:new1');
        expect(component().form.controls.temperatureC.value).toBe('');
    });

    it('yatıştan önceki ya da 7 günden eski zamanı kaydetmez', async () => {
        await setup();
        await fillAndSubmit({ temperatureC: '38,5', measuredAtLocal: toIstanbulDateTimeLocalInputValue(ago(60)) });

        expect(text('vital-time-error')).toBe('Ölçüm zamanı yatıştan önce olamaz.');

        await fillAndSubmit({ measuredAtLocal: toIstanbulDateTimeLocalInputValue(ago(24 * 8)) });

        expect(text('vital-time-error')).toBe('Ölçüm zamanı en çok 7 gün geriye girilebilir.');
        expect(service.create).not.toHaveBeenCalled();
    });

    it('sunucu hatası giriş satırında gösterilir', async () => {
        service.create.mockReturnValue(throwError(() => new Error('Bu yatış iptal edilmiş.')));
        await setup();
        await fillAndSubmit({ temperatureC: '38,5' });

        expect(text('vital-submit-error')).toBe('Bu yatış iptal edilmiş.');
    });

    it('seçilen ölçümün detayı okunur; düzenleme kaydın sürümüyle gönderilir', async () => {
        service.getById.mockReturnValue(of(detailOf(m2, { note: 'sakin', rowVersion: 'v7' })));
        await setup();
        await selectPoint(m2);

        expect(service.getById).toHaveBeenCalledWith('m2');
        expect(text('vital-detail-note')).toBe('Not: sakin');

        el('vital-edit')!.click();
        await settle();

        expect(text('vital-editing')).toContain('ölçümünü düzenliyorsunuz');
        expect(component().form.getRawValue()).toMatchObject({ temperatureC: '38,5', heartRateBpm: '96', respiratoryRatePerMin: '22', weightKg: '', note: 'sakin' });

        await fillAndSubmit({ respiratoryRatePerMin: '' });

        expect(service.update).toHaveBeenCalledWith('m2', { temperatureC: 38.5, heartRateBpm: 96, respiratoryRatePerMin: null, weightKg: null, measuredAtUtc: m2.measuredAtUtc, note: 'sakin' }, 'v7');
        expect(component().editing()).toBeNull();
        expect(component().selectedKey()).toBe('VitalMeasurement:m2');
    });

    it('eski sürümle güncellemede (409) çakışma kutusu çıkar; yazılanlar atılıp güncel kayıt yüklenir', async () => {
        service.update.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { extensions: { code: 'VitalMeasurements.ConcurrencyConflict' } } })));
        await setup();
        await selectPoint(m2);
        component().startEdit();
        await fillAndSubmit({ heartRateBpm: '90' });

        expect(has('vital-conflict')).toBe(true);
        expect(el('vital-save')!.hasAttribute('disabled')).toBe(true);

        component().discardAndReload();
        await settle();

        expect(has('vital-conflict')).toBe(false);
        expect(component().editing()).toBeNull();
        expect(service.getSeries).toHaveBeenCalledTimes(2);
        expect(service.getById).toHaveBeenCalledTimes(2);
    });

    it('kesinleşmiş muayeneye bağlı ölçümün güncellenmesi reddedilirse (409) iptal yolu söylenir', async () => {
        service.update.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { extensions: { code: 'Examinations.Finalized' } } })));
        await setup();
        await selectPoint(m2);
        component().startEdit();
        await fillAndSubmit({ heartRateBpm: '90' });

        expect(has('vital-conflict')).toBe(false);
        expect(text('vital-submit-error')).toContain('iptal edip yeniden girin');
    });

    it('iptal seçili kaydın sürümüyle ve gerekçeyle gönderilir; sonra seçim kapanır', async () => {
        service.getById.mockReturnValue(of(detailOf(m2, { rowVersion: 'v4' })));
        await setup();
        await selectPoint(m2);

        expect(has('vital-cancel')).toBe(true);

        (component() as unknown as { cancelMeasurement: (reason: string) => unknown }).cancelMeasurement('Yanlış hasta');
        (component() as unknown as { onCancelled: () => void }).onCancelled();
        await settle();

        expect(service.cancel).toHaveBeenCalledWith('m2', 'Yanlış hasta', 'v4');
        expect(component().selectedKey()).toBeNull();
        expect(service.getSeries).toHaveBeenCalledTimes(2);
    });

    it('iptal edilenler istenince yatış başlangıcından itibaren okunur ve tabloda görünür; iptal kaydında düzenle/iptal yoktur', async () => {
        service.getById.mockReturnValue(of(detailOf(cancelledPoint, { cancelledAtUtc: ago(29), cancelReason: 'Yanlış hasta' })));
        await setup();

        expect(root().querySelectorAll('[data-testid="vital-row"]')).toHaveLength(3);

        component().setShowCancelled(true);
        await settle();

        expect(service.getCancelled).toHaveBeenCalledWith({ petId: 'p1', dateFromUtc: ADMITTED });
        expect(root().querySelectorAll('[data-testid="vital-row"]')).toHaveLength(4);

        await selectPoint(cancelledPoint);

        expect(text('vital-detail-cancelled')).toContain('Gerekçe: Yanlış hasta');
        expect(has('vital-edit')).toBe(false);
        expect(has('vital-cancel')).toBe(false);
    });

    it('muayeneden gelen değer burada düzenlenmez; muayeneye bağlantı verir', async () => {
        await setup();
        await selectPoint(examPoint);

        expect(service.getById).not.toHaveBeenCalled();
        expect(text('vital-selection')).toContain('Muayeneden');
        expect(el('vital-open-exam')?.getAttribute('href')).toBe('/panel/examinations/e1');
        expect(has('vital-edit')).toBe(false);
    });

    it('kesinleşmiş muayenede yeni ölçüm gerekçe ister ve muayeneye bağlanır; bağlı ölçüm düzenlenemez, iptal edilebilir', async () => {
        const linked = point('m5', ago(3), { temperatureC: 39.7 }, { hospitalizationId: null, examinationId: 'e1' });

        service.getSeries.mockReturnValue(of(seriesOf([examPoint, linked])));
        service.getById.mockReturnValue(of(detailOf(linked)));
        await setup({ examinationId: 'e1', examinationFinalized: true });

        expect(service.getSeries).toHaveBeenCalledWith({ petId: 'p1', hospitalizationId: null, fromUtc: null });
        expect(has('vital-late-reason')).toBe(true);

        await fillAndSubmit({ temperatureC: '39,2' });

        expect(service.create).not.toHaveBeenCalled();
        expect(root().textContent).toContain('Gerekçe 5–500 karakter olmalı.');

        await fillAndSubmit({ lateEntryReason: 'Kayıt sırasında unutuldu' });

        expect(service.create.mock.calls[0][0]).toMatchObject({ hospitalizationId: null, examinationId: 'e1', temperatureC: 39.2, lateEntryReason: 'Kayıt sırasında unutuldu' });

        await selectPoint(linked);

        expect(has('vital-locked')).toBe(true);
        expect(has('vital-edit')).toBe(false);
        expect(has('vital-cancel')).toBe(true);
        // Bu muayenenin kendi değeri seçilince aynı sayfaya bağlantı verilmez.
        await selectPoint(examPoint);
        expect(has('vital-open-exam')).toBe(false);
    });

    it('hasta kartında dönem süzgeciyle okur; eklenen ölçüm serbesttir', async () => {
        const free = point('m7', ago(5), { weightKg: 12.5 }, { hospitalizationId: null });

        service.getSeries.mockReturnValue(of(seriesOf([free])));
        service.getById.mockReturnValue(of(detailOf(free)));
        await setup({});

        const firstFrom = Date.parse(service.getSeries.mock.calls[0][0].fromUtc as string);

        expect(Date.now() - firstFrom).toBeGreaterThan(364 * 24 * HOUR);
        expect(Date.now() - firstFrom).toBeLessThan(366 * 24 * HOUR);
        expect(has('vital-range')).toBe(true);

        component().range.set('all');
        await settle();

        expect(service.getSeries).toHaveBeenLastCalledWith({ petId: 'p1', hospitalizationId: null, fromUtc: null });

        await selectPoint(free);
        expect(text('vital-selection')).toContain('Serbest ölçüm');

        component().select(free.key);
        await fillAndSubmit({ weightKg: '12,7' });

        expect(service.create.mock.calls[0][0]).toMatchObject({ hospitalizationId: null, examinationId: null, weightKg: 12.7 });
    });

    it('ölçüm yoksa boş durum metni; kırpılmış ve muayenesiz eğilimde açıklama görünür', async () => {
        service.getSeries.mockReturnValue(of(seriesOf([])));
        await setup();

        expect(text('vital-empty')).toBe('Vital ölçümü yok.');
        expect(root().querySelectorAll('app-vital-trend-chart')).toHaveLength(0);

        TestBed.resetTestingModule();
        service.getSeries.mockReturnValue(of(seriesOf([m1, m2], { truncated: true, examinationsOmitted: true })));
        await setup();

        expect(has('vital-truncated')).toBe(true);
        expect(has('vital-exams-omitted')).toBe(true);
    });

    it('eğilim yüklenemezse hata ve yeniden deneme gösterir', async () => {
        service.getSeries.mockReturnValue(throwError(() => new Error('Vital ölçümleri yüklenemedi.')));
        await setup();

        expect(root().textContent).toContain('Vital ölçümleri yüklenemedi.');
        expect(root().querySelectorAll('app-vital-trend-chart')).toHaveLength(0);
    });
});
