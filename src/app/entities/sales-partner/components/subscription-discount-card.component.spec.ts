import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import type { SubscriptionDiscountDto } from '@/app/entities/sales-partner/models/sales-partner.model';
import { DiscountCodesService } from '@/app/entities/sales-partner/services/discount-codes.service';
import { SubscriptionDiscountCardComponent } from './subscription-discount-card.component';

const NONE: SubscriptionDiscountDto = {
    applied: false,
    code: null,
    discountPercent: null,
    discountMonths: null,
    windowStartsAtUtc: null,
    windowEndsAtUtc: null,
    canApply: true
};
const APPLIED: SubscriptionDiscountDto = { ...NONE, applied: true, code: 'ISIK10', discountPercent: 10, discountMonths: 12, canApply: false };

describe('SubscriptionDiscountCardComponent (ADR-037)', () => {
    let codes: MockedObject<DiscountCodesService>;

    const create = async (state: SubscriptionDiscountDto | null, canManage: boolean): Promise<ComponentFixture<SubscriptionDiscountCardComponent>> => {
        codes = {
            getSubscriptionDiscount: vi.fn().mockName('DiscountCodesService.getSubscriptionDiscount'),
            applySubscriptionDiscount: vi.fn().mockName('DiscountCodesService.applySubscriptionDiscount'),
            validate: vi.fn().mockName('DiscountCodesService.validate')
        } as unknown as MockedObject<DiscountCodesService>;
        codes.getSubscriptionDiscount.mockReturnValue(state ? of(state) : throwError(() => new Error('x')));
        await TestBed.configureTestingModule({
            imports: [SubscriptionDiscountCardComponent],
            providers: [{ provide: DiscountCodesService, useValue: codes }]
        }).compileComponents();
        const fixture = TestBed.createComponent(SubscriptionDiscountCardComponent);

        fixture.componentRef.setInput('canManage', canManage);
        fixture.detectChanges();

        return fixture;
    };

    const host = (f: ComponentFixture<SubscriptionDiscountCardComponent>) => f.nativeElement as HTMLElement;

    it('uygulanmış kodu ve indirim notunu gösterir; ortak bilgisi yoktur', async () => {
        const f = await create(APPLIED, false);

        expect(host(f).querySelector('[data-testid="subscription-discount-applied"]')?.textContent).toContain('ISIK10: %10 indirim, ilk 12 ay');
    });

    it('kod girilebiliyorsa ve yönetme yetkisi varsa alanı gösterir; geçerli kodla uygular', async () => {
        const f = await create(NONE, true);

        codes.applySubscriptionDiscount.mockReturnValue(of(APPLIED));

        expect(host(f).querySelector('[data-testid="subscription-discount-apply"]')).not.toBeNull();

        f.componentInstance.code.set('ISIK10');
        f.componentInstance.valid.set(true);
        f.componentInstance.apply();
        f.detectChanges();

        expect(codes.applySubscriptionDiscount).toHaveBeenCalledTimes(1);

        expect(codes.applySubscriptionDiscount).toHaveBeenCalledWith('ISIK10');
        expect(host(f).querySelector('[data-testid="subscription-discount-applied"]')).not.toBeNull();
    });

    it('yetki yoksa ya da bilgi alınamazsa hiçbir şey göstermez ve gizlenir', async () => {
        const f = await create(NONE, false);

        expect(host(f).textContent?.trim()).toBe('');
        expect(host(f).classList).toContain('hidden');

        TestBed.resetTestingModule();
        const failed = await create(null, true);

        expect(host(failed).textContent?.trim()).toBe('');
    });
});
