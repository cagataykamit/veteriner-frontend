import type { MockedObject } from 'vitest';
import { HttpErrorResponse, HttpParams } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { AuthService } from '@/app/core/auth/auth.service';
import type { TenantPlanFeatureVm } from '@/app/core/tenant/models/tenant-access-state-vm.model';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { CashCountDayDto, CashCountDto } from '@/app/features/reports/end-of-day/models/cash-count.model';
import { CashCountPanelComponent } from './cash-count-panel.component';

const cashRow = { paymentMethod: 'Cash' as const, collectedAmount: 770, collectedCount: 3, voidedAmount: 150, voidedCount: 1, netAmount: 620, salesCollectedAmount: 20 };
const noMovements = (cashNetAmount: number) => ({ cashNetAmount, inAmount: 0, outAmount: 0, transferInAmount: 0, transferOutAmount: 0, netAmount: cashNetAmount });

function count(over: Partial<CashCountDto> = {}): CashCountDto {
    return {
        id: 'cc1',
        clinicId: 'k1',
        cashRegisterId: 'r-main',
        businessDate: '2026-11-08',
        currency: 'TRY',
        openingAmount: 200,
        expectedCashAmount: 620,
        expectedClosingAmount: 820,
        countedAmount: 815,
        differenceAmount: -5,
        note: 'Para üstü eksik',
        correctsCashCountId: null,
        createdByUserId: 'u1',
        createdByName: 'Selin',
        createdAtUtc: '2026-11-08T15:00:00Z',
        isVoided: false,
        voidedAtUtc: null,
        voidedByUserId: null,
        voidedByName: null,
        voidReason: null,
        ...over
    };
}

describe('CashCountPanelComponent', () => {
    let api: MockedObject<ApiClient>;
    let claims: Set<string>;
    let day: CashCountDayDto;
    const locked = signal<TenantPlanFeatureVm | null>(null);

    function create(): ComponentFixture<CashCountPanelComponent> {
        const fixture = TestBed.createComponent(CashCountPanelComponent);

        fixture.componentRef.setInput('date', '2026-11-08');
        fixture.componentRef.setInput('clinicId', 'k1');
        fixture.detectChanges();

        return fixture;
    }

    const el = (f: ComponentFixture<CashCountPanelComponent>) => f.nativeElement as HTMLElement;
    const byId = (f: ComponentFixture<CashCountPanelComponent>, id: string) => el(f).querySelector(`[data-testid="${id}"]`);

    beforeEach(() => {
        claims = new Set(['CashCounts.Read', 'CashCounts.Create', 'CashCounts.Correct']);
        locked.set(null);
        day = {
            clinicId: 'k1',
            businessDate: '2026-11-08',
            currency: 'TRY',
            cashRegisterId: 'r-main',
            cashRegisterName: 'Ana kasa',
            cash: cashRow,
            movements: noMovements(620),
            expectedCashAmount: 620,
            current: null,
            expectedChangedSinceCount: false,
            previous: { businessDate: '2026-11-07', countedAmount: 200 },
            history: []
        };
        api = {
            get: vi.fn().mockName('ApiClient.get'),
            post: vi.fn().mockName('ApiClient.post')
        } as unknown as MockedObject<ApiClient>;
        api.get.mockImplementation(((path: string) => (path.endsWith('/day') ? of(day) : of({ items: day.current ? [day.current] : [], page: 1, pageSize: 30, totalItems: 0, totalPages: 0 }))) as never);
        api.post.mockReturnValue(of(count()) as never);
        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                { provide: ApiClient, useValue: api },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c) } },
                { provide: TenantReadOnlyContextService, useValue: { lockedPlanFeature: () => locked(), mutationBlocked: () => false } }
            ]
        });
    });

    it('günü ve son 30 günü seçilen klinikle okur; beklenen nakit kasa özetinin nakit satırıdır', () => {
        const f = create();
        const [dayPath, dayParams] = api.get.mock.calls[0] as [string, HttpParams];
        const [listPath, listParams] = api.get.mock.calls[1] as [string, HttpParams];

        expect(dayPath).toBe('/api/v1/cash-counts/day');
        expect(dayParams.get('date')).toBe('2026-11-08');
        expect(dayParams.get('clinicId')).toBe('k1');
        expect(listPath).toBe('/api/v1/cash-counts');
        expect(listParams.get('from')).toBe('2026-10-10');
        expect(listParams.get('to')).toBe('2026-11-08');
        const expected = byId(f, 'cash-count-expected')?.textContent ?? '';

        expect(expected).toContain('Günün kasa neti');
        expect(expected).toContain('620,00');
        expect(expected).not.toContain('Kredi iadesi');
    });

    it('açılış önceki sayımdan önerilir, fark canlı hesaplanır ve fark varken açıklama zorunludur', () => {
        const f = create();
        const c = f.componentInstance;

        expect(c.opening()).toBe(200);
        c.counted.set(815);
        f.detectChanges();

        expect(byId(f, 'cash-count-preview-closing')?.textContent).toContain('820,00');
        expect(byId(f, 'cash-count-preview-difference')?.textContent).toContain('-₺5,00');
        expect(el(f).textContent).toContain('Kasa açığı');
        expect(c.canSubmit()).toBe(false);
        c.note.set('Para üstü eksik');
        expect(c.canSubmit()).toBe(true);
    });

    it('kaydederken ekrandaki beklenen nakdi ve tek kliniği gönderir, sonra günü yeniden okur', () => {
        const f = create();
        const c = f.componentInstance;

        c.counted.set(820);
        c.submit();

        expect(api.post).toHaveBeenCalledWith('/api/v1/cash-counts', { clinicId: 'k1', businessDate: '2026-11-08', openingAmount: 200, countedAmount: 820, expectedCashAmount: 620, note: null });
        expect(api.get.mock.calls.filter(([p]) => (p as string).endsWith('/day')).length).toBe(2);
    });

    it('beklenen nakit değiştiyse (409) hata gösterir, günü yeniden okur ve girilen değerleri korur', () => {
        const f = create();
        const c = f.componentInstance;

        api.post.mockReturnValue(
            throwError(() => new HttpErrorResponse({ status: 409, error: { code: 'CashCounts.ExpectedChanged', detail: 'Günün nakit hareketi değişti (beklenen nakit şimdi 700,00); güncel rakamı kontrol edip yeniden kaydedin.' } })) as never
        );
        c.counted.set(900);
        c.note.set('Geç tahsilat');
        c.submit();
        f.detectChanges();

        expect(api.get.mock.calls.filter(([p]) => (p as string).endsWith('/day')).length).toBe(2);
        expect(c.counted()).toBe(900);
        expect(c.saveError()).toBeTruthy();
    });

    it('kayıtlı sayım: özet, sonraki hareket uyarısı; düzeltme gerekçeyle eski kaydın yerine geçer', () => {
        day = { ...day, current: count(), expectedChangedSinceCount: true, cash: { ...cashRow, netAmount: 700 }, movements: noMovements(700), expectedCashAmount: 700 };
        const f = create();

        expect(byId(f, 'cash-count-form')).toBeNull();
        expect(byId(f, 'cash-count-difference')?.textContent).toContain('-₺5,00');
        expect(byId(f, 'cash-count-changed')).not.toBeNull();
        expect(el(f).textContent).toContain('Kaydeden Selin');

        (byId(f, 'cash-count-correct') as HTMLButtonElement).click();
        f.detectChanges();
        const c = f.componentInstance;

        expect(c.opening()).toBe(200);
        expect(c.counted()).toBe(815);
        expect(c.canSubmit()).toBe(false);
        c.counted.set(900);
        c.note.set('');
        c.reason.set('Geç gelen nakit tahsilat');
        c.submit();

        expect(api.post).toHaveBeenCalledWith('/api/v1/cash-counts/cc1/correct', {
            openingAmount: 200,
            countedAmount: 900,
            expectedCashAmount: 700,
            note: null,
            reason: 'Geç gelen nakit tahsilat'
        });
    });

    it('iptal gerekçe ister; düzeltme izi iptal edilen kayıtları gösterir', () => {
        day = { ...day, current: count({ id: 'cc2', correctsCashCountId: 'cc1' }), history: [count({ id: 'cc2' }), count({ isVoided: true, voidReason: 'Geç gelen nakit', voidedByName: 'Yönetici', voidedAtUtc: '2026-11-08T16:00:00Z' })] };
        const f = create();

        expect(byId(f, 'cash-count-trail')?.textContent).toContain('Gerekçe: Geç gelen nakit');
        (byId(f, 'cash-count-void') as HTMLButtonElement).click();
        f.detectChanges();
        expect((byId(f, 'cash-count-void-confirm') as HTMLButtonElement).disabled).toBe(true);
        f.componentInstance.reason.set('Yanlış klinik seçildi');
        f.componentInstance.submitVoid();

        expect(api.post).toHaveBeenCalledWith('/api/v1/cash-counts/cc2/void', { reason: 'Yanlış klinik seçildi' });
    });

    it('kasa yönetimi paketinde değilse form yerine üst paket kutusu; düzeltme düğmeleri de yok', () => {
        locked.set({ feature: 'CashManagement', isEnabled: false, requiredPlanCode: 'Pro' });
        const f = create();

        expect(byId(f, 'plan-upgrade-notice')).not.toBeNull();
        expect(byId(f, 'cash-count-form')).toBeNull();
        expect(byId(f, 'cash-count-expected')).not.toBeNull();
    });

    it('birden fazla kasada kasa seçilir; giriş/çıkış ve aktarım beklenen nakde ayrı satırda girer, kayıt kasayla gider', () => {
        claims.add('CashRegisters.Read');
        const registers = [
            { id: 'r-main', clinicId: 'k1', code: 'ANA', name: 'Ana kasa', isMain: true, isActive: true },
            { id: 'r2', clinicId: 'k1', code: 'K2', name: 'Arka kasa', isMain: false, isActive: true }
        ];

        api.get.mockImplementation(((path: string, params?: HttpParams) => {
            if (path === '/api/v1/cash-registers') {
                return of(registers);
            }

            if (path.endsWith('/day')) {
                return params?.get('cashRegisterId') === 'r2'
                    ? of({ ...day, cashRegisterId: 'r2', cashRegisterName: 'Arka kasa', movements: { ...noMovements(620), outAmount: 50, transferInAmount: 100, netAmount: 670 }, expectedCashAmount: 670 })
                    : of(day);
            }

            return of({ items: [], page: 1, pageSize: 30, totalItems: 0, totalPages: 0 });
        }) as never);
        const f = create();
        const c = f.componentInstance;

        expect(byId(f, 'cash-count-register')).not.toBeNull();
        expect(c.registerId()).toBe('r-main');
        c.selectRegister('r2');
        f.detectChanges();

        const dayCall = api.get.mock.calls.filter(([p]) => (p as string).endsWith('/day')).at(-1) as [string, HttpParams];

        expect(dayCall[1].get('cashRegisterId')).toBe('r2');
        const expected = byId(f, 'cash-count-expected')?.textContent ?? '';

        expect(expected).toContain('Kasa çıkışı');
        expect(expected).toContain('Gelen aktarım');
        expect(byId(f, 'cash-count-expected-total')?.textContent).toContain('670,00');

        c.opening.set(0);
        c.counted.set(670);
        c.submit();

        expect(api.post).toHaveBeenCalledWith('/api/v1/cash-counts', {
            clinicId: 'k1',
            businessDate: '2026-11-08',
            openingAmount: 0,
            countedAmount: 670,
            expectedCashAmount: 670,
            note: null,
            cashRegisterId: 'r2'
        });
    });

    it('yalnız okuma izni: form ve düzeltme yok', () => {
        claims = new Set(['CashCounts.Read']);
        day = { ...day, current: count() };
        const f = create();

        expect(byId(f, 'cash-count-form')).toBeNull();
        expect(byId(f, 'cash-count-current')).not.toBeNull();
        expect(byId(f, 'cash-count-correct')).toBeNull();
    });
});
