import { HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { AuthService } from '@/app/core/auth/auth.service';
import { localDateYyyyMmDd } from '@/app/shared/utils/date.utils';
import { EndOfDayPageComponent } from './end-of-day-page.component';

const STATE_KEY = 'panel:reports:end-of-day:listState';

const zeroAmounts = { collectedAmount: 0, collectedCount: 0, voidedAmount: 0, voidedCount: 0, netAmount: 0, salesCollectedAmount: 0 };

describe('EndOfDayPageComponent', () => {
    let api: jasmine.SpyObj<ApiClient>;
    let claims: Set<string>;
    let openItems: Record<string, number | null>;

    function create(): ComponentFixture<EndOfDayPageComponent> {
        const fixture = TestBed.createComponent(EndOfDayPageComponent);
        fixture.detectChanges();
        return fixture;
    }

    const calls = (suffix: string) => api.get.calls.allArgs().filter(([path]) => (path as string).endsWith(suffix));

    beforeEach(() => {
        sessionStorage.clear();
        claims = new Set(['Payments.Read', 'Charges.Read', 'Visits.Read', 'LabResults.Read']);
        openItems = { unchargedVisitCount: 2, outstandingVisitCount: 1, outstandingAmount: 350, awaitingLabCount: 3, incompleteVisitCount: 4 };
        api = jasmine.createSpyObj<ApiClient>('ApiClient', ['get', 'getBlob']);
        api.get.and.callFake(((path: string) => {
            if (path.endsWith('/daily-transactions')) {
                return of({
                    currency: 'TRY',
                    from: '2026-10-14',
                    to: '2026-10-14',
                    totalCount: 2,
                    totals: {
                        grossChargeAmount: 600,
                        grossChargeCount: 1,
                        salesChargeAmount: 100,
                        voidedChargeAmount: 0,
                        voidedChargeCount: 0,
                        netChargeAmount: 600,
                        collectedAmount: 600,
                        collectedCount: 1,
                        salesCollectedAmount: 0,
                        voidedCollectionAmount: 600,
                        voidedCollectionCount: 1,
                        netCollectedAmount: 0,
                        correctionCount: 0
                    },
                    items: [
                        { occurredAtUtc: '2026-10-14T07:00:00Z', kind: 'Payment', referenceId: 'p1', clientId: 'c1', clientName: 'Ayşe Demir', petId: 'pt1', petName: 'Pamuk', amount: 600, paymentMethod: 'Cash', isDirectSale: false, isVoided: true, performedByName: 'Sema', clinicId: 'k1' },
                        { occurredAtUtc: '2026-10-14T13:00:00Z', kind: 'PaymentVoid', referenceId: 'p1', clientId: 'c1', clientName: 'Ayşe Demir', amount: 600, paymentMethod: 'Cash', isDirectSale: false, isVoided: true, reason: 'Hatalı giriş', performedByName: 'Yönetici', clinicId: 'k1' }
                    ]
                });
            }
            if (path.endsWith('/cash-summary')) {
                return of({
                    currency: 'TRY',
                    from: '2026-10-14',
                    to: '2026-10-14',
                    totals: { ...zeroAmounts, collectedAmount: 600, voidedAmount: 600, salesCollectedAmount: 50 },
                    byMethod: [
                        { paymentMethod: 'Cash', ...zeroAmounts, collectedAmount: 600, voidedAmount: 600 },
                        { paymentMethod: 'Card', ...zeroAmounts },
                        { paymentMethod: 'Transfer', ...zeroAmounts }
                    ],
                    byDay: [],
                    byUser: [{ userId: 'u1', userName: 'Sema', ...zeroAmounts }]
                });
            }
            return of({ from: '2026-10-14', to: '2026-10-14', clinicId: 'k1', openItems });
        }) as never);
        api.getBlob.and.returnValue(of(new HttpResponse({ body: new Blob(['x']), headers: new HttpHeaders() })));
        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                { provide: ApiClient, useValue: api },
                {
                    provide: AuthService,
                    useValue: {
                        hasOperationClaim: (c: string) => claims.has(c),
                        getMyClinics: () => of([{ id: 'k1', name: 'Klinik 1' }]),
                        getJwtClinicId: () => null,
                        getClinicId: () => 'k1'
                    }
                }
            ]
        });
    });

    afterEach(() => document.body.classList.remove('register-page-active'));

    it('varsayılan tek gün (bugün): from = to, aktif klinik ve üç uç çağrılır', () => {
        create();
        const today = localDateYyyyMmDd();
        const params = calls('/daily-transactions')[0][1] as HttpParams;
        expect(params.get('from')).toBe(today);
        expect(params.get('to')).toBe(today);
        expect(params.get('clinicId')).toBe('k1');
        expect(calls('/cash-summary').length).toBe(1);
        expect(calls('/end-of-day/open-items').length).toBe(1);
    });

    it('özet kartları, açık işler ve dökümdeki iptal/düzeltme işaretleri görünür', () => {
        const text = create().nativeElement.textContent as string;
        for (const label of ['Brüt ücret', 'İptal edilen ücret', 'Net ücret', 'İptal edilen tahsilat', 'Net tahsilat', 'Doğrudan satış tahsilatı', 'Ücretlenmemiş ziyaret', 'Bekleyen lab', 'Borçlu çıkan', 'Tamamlanmamış geliş']) {
            expect(text).toContain(label);
        }
        expect(text).toContain('1 ziyaret');
        expect(text).toContain('Tahsilat iptali');
        expect(text).toContain('Gerekçe: Hatalı giriş');
        expect(text).toContain('Ayşe Demir');
        expect(text).not.toContain('Açık işler şu anki durumu gösterir');
    });

    it('geçmiş gün seçilince açık işlerde şu anki durum notu görünür', () => {
        sessionStorage.setItem(STATE_KEY, JSON.stringify({ fromDate: '2026-01-05', toDate: '2026-01-05', clinicId: '', page: 1, pageSize: 50 }));
        const text = create().nativeElement.textContent as string;
        expect(text).toContain('Açık işler şu anki durumu gösterir');
    });

    it('alanı null olan açık iş (yetki yok) gizlenir', () => {
        openItems = { unchargedVisitCount: null, outstandingVisitCount: null, outstandingAmount: null, awaitingLabCount: 0, incompleteVisitCount: 1 };
        const text = create().nativeElement.textContent as string;
        expect(text).not.toContain('Ücretlenmemiş ziyaret');
        expect(text).not.toContain('Borçlu çıkan');
        expect(text).toContain('Bekleyen lab');
        expect(text).toContain('Tamamlanmamış geliş');
    });

    it('yalnız Visits.Read: ücret, tahsilat ve döküm bölümleri gizli, bu uçlara istek atılmaz', () => {
        claims = new Set(['Visits.Read']);
        const text = create().nativeElement.textContent as string;
        expect(text).toContain('Açık işler');
        expect(text).not.toContain('Brüt ücret');
        expect(text).not.toContain('Net tahsilat');
        expect(calls('/daily-transactions').length).toBe(0);
        expect(calls('/cash-summary').length).toBe(0);
    });

    it('Payments.Read tek başına: tahsilat var, ücret toplamı ve döküm yok (döküm Charges.Read ister)', () => {
        claims = new Set(['Payments.Read']);
        const text = create().nativeElement.textContent as string;
        expect(text).toContain('Net tahsilat');
        expect(text).not.toContain('Brüt ücret');
        expect(text).not.toContain('Açık işler');
        expect(calls('/daily-transactions').length).toBe(0);
        expect(calls('/end-of-day/open-items').length).toBe(0);
    });

    it('Excel/CSV indirme aynı süzgeçlerle döküm uçlarını çağırır, sayfalama göndermez', () => {
        const fixture = create();
        fixture.componentInstance.state.exportCsv();
        fixture.componentInstance.state.exportXlsx();
        const [csvPath, csvParams] = api.getBlob.calls.argsFor(0) as [string, HttpParams];
        expect(csvPath).toBe('/api/v1/reports/daily-transactions/export');
        expect(api.getBlob.calls.argsFor(1)[0]).toBe('/api/v1/reports/daily-transactions/export-xlsx');
        expect(csvParams.has('page')).toBeFalse();
        expect(csvParams.get('from')).toBe(localDateYyyyMmDd());
    });

    it('yazdırma sınıfını ekler ve sayfadan çıkınca kaldırır', () => {
        const fixture = create();
        expect(document.body.classList).toContain('register-page-active');
        fixture.destroy();
        expect(document.body.classList).not.toContain('register-page-active');
    });
});
