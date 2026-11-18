import { TestBed } from '@angular/core/testing';
import type { TodayItemVm } from '@/app/entities/visit/models/visit-vm.model';
import { TodayMoneyComponent } from './today-money.component';

describe('TodayMoneyComponent — tek "Kalan" ve açık iş çipleri', () => {
    const create = (item: Partial<TodayItemVm>, canPay = false) => {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({ imports: [TodayMoneyComponent] });
        const fixture = TestBed.createComponent(TodayMoneyComponent);

        fixture.componentRef.setInput('item', { chargeIndicator: null, chargeableWorkCount: null, awaitingLabCount: null, pendingChargeCount: null, ...item } as TodayItemVm);
        fixture.componentRef.setInput('canPay', canPay);
        fixture.detectChanges();

        return fixture.nativeElement as HTMLElement;
    };

    it('kalan varsa satırda yalnız "Kalan ₺…"; ücret ve ödenen ipucunda', () => {
        const el = create({ chargedAmount: 1000, allocatedAmount: 400, outstandingAmount: 600 });
        const remaining = el.querySelector('[data-testid="today-remaining"]')!;

        expect(remaining.textContent?.trim()).toBe('Kalan ₺600,00');
        expect(remaining.getAttribute('title')).toBe('Ücret ₺1.000,00 · Ödenen ₺400,00');
        expect(el.textContent).not.toContain('Ödenen');
    });

    it('kalan yoksa (ödenmiş ya da yetkisiz) tutar yazılmaz; müşteri borcu bu bileşende değildir', () => {
        expect(create({ chargedAmount: 500, allocatedAmount: 500, outstandingAmount: 0, clientOutstandingAmount: 1600 }).textContent?.trim()).toBe('');
        expect(create({ chargedAmount: null, outstandingAmount: null }).querySelector('[data-testid="today-remaining"]')).toBeNull();
    });

    it('ödeme çipi yetki varsa ödemeye götürür', () => {
        TestBed.configureTestingModule({ imports: [TodayMoneyComponent] });
        const fixture = TestBed.createComponent(TodayMoneyComponent);
        let paid = 0;

        fixture.componentRef.setInput('item', { chargeIndicator: 'PaymentPending', outstandingAmount: 100 } as TodayItemVm);
        fixture.componentRef.setInput('canPay', true);
        fixture.componentInstance.pay.subscribe(() => paid++);
        fixture.detectChanges();
        (fixture.nativeElement.querySelector('button[aria-label="Ödeme bekliyor, ödeme al"]') as HTMLButtonElement).click();

        expect(paid).toBe(1);
    });
});
