import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, convertToParamMap, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { PENDING_DISCOUNT_CODE_KEY, readPendingDiscountCode } from '@/app/features/sales-partners/utils/discount-code.utils';
import { referralCodeRedirect } from './referral-code.redirect';

describe('referral-code.redirect (ADR-037)', () => {
    afterEach(() => sessionStorage.removeItem(PENDING_DISCOUNT_CODE_KEY));

    describe('/r/:kod yönlendirmesi', () => {
        beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

        const run = (code: string | null): UrlTree => {
            const route = { paramMap: convertToParamMap(code === null ? {} : { code }) } as ActivatedRouteSnapshot;

            return TestBed.runInInjectionContext(() => referralCodeRedirect(route, {} as RouterStateSnapshot)) as UrlTree;
        };

        it('kodu normalize edip oturum belleğine alır ve kayıt sayfasına kod parametresiyle gönderir', () => {
            const tree = run('ışık10');
            const router = TestBed.inject(Router);

            expect(router.serializeUrl(tree)).toBe('/auth/signup?kod=ISIK10');
            expect(readPendingDiscountCode()).toBe('ISIK10');
        });

        it('boş kodda yalnız kayıt sayfasına gider', () => {
            expect(TestBed.inject(Router).serializeUrl(run('   '))).toBe('/auth/signup');
            expect(readPendingDiscountCode()).toBeNull();
        });
    });
});
