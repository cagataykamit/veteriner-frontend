import { TestBed } from '@angular/core/testing';
import type { TodayItemVm } from '@/app/entities/visit/models/visit-vm.model';
import { TodayMoneyComponent } from './today-money.component';

describe('TodayMoneyComponent — müşteri borcu (H2)', () => {
    const create = (canPay: boolean) => {
        TestBed.configureTestingModule({ imports: [TodayMoneyComponent] });
        const fixture = TestBed.createComponent(TodayMoneyComponent);

        fixture.componentRef.setInput('item', { clientOutstandingAmount: 1600, chargedAmount: 0 } as unknown as TodayItemVm);
        fixture.componentRef.setInput('canPay', canPay);
        fixture.detectChanges();

        return fixture;
    };

    it('ödeme yetkisi varsa borç yazısı ödeme ekranını açar', () => {
        const fixture = create(true);
        let paid = 0;

        fixture.componentInstance.pay.subscribe(() => paid++);
        (fixture.nativeElement.querySelector('[data-testid="today-client-debt-pay"]') as HTMLButtonElement).click();

        expect(paid).toBe(1);
    });

    it('yetki yoksa borç yalnız yazı olarak görünür', () => {
        const el = create(false).nativeElement as HTMLElement;

        expect(el.querySelector('[data-testid="today-client-debt-pay"]')).toBeNull();
        expect(el.textContent).toContain('Müşteri borcu');
    });
});
