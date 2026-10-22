import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, convertToParamMap, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { referralCodeRedirect } from '@/app/features/sales-partners/routes/referral-code.redirect';
import {
    clearPendingDiscountCode,
    discountNoteText,
    normalizeDiscountCodeInput,
    PENDING_DISCOUNT_CODE_KEY,
    readPendingDiscountCode,
    storePendingDiscountCode
} from './discount-code.utils';

describe('discount-code.utils (ADR-037)', () => {
    afterEach(() => sessionStorage.removeItem(PENDING_DISCOUNT_CODE_KEY));

    it('kodu büyük harfe çevirir, boşlukları ve Türkçe harfleri sunucuyla aynı biçimde indirger', () => {
        expect(normalizeDiscountCodeInput(' ışık 10 ')).toBe('ISIK10');
        expect(normalizeDiscountCodeInput('şeker-ğüöç')).toBe('SEKER-GUOC');
        expect(normalizeDiscountCodeInput('İzmir2026')).toBe('IZMIR2026');
        expect(normalizeDiscountCodeInput(null)).toBe('');
        expect(normalizeDiscountCodeInput('A'.repeat(40)).length).toBe(32);
    });

    it('indirim notu yüzde ve ay sayısını yazar', () => {
        expect(discountNoteText(10, 12)).toBe('%10 indirim, ilk 12 ay');
        expect(discountNoteText(12.5, 12)).toBe('%12,5 indirim, ilk 12 ay');
    });

    it('kod yalnız oturum belleğinde tutulur (çerez/localStorage yok)', () => {
        const localBefore = localStorage.length;
        const cookieBefore = document.cookie;

        storePendingDiscountCode('ISIK10');

        expect(readPendingDiscountCode()).toBe('ISIK10');
        expect(localStorage.length).toBe(localBefore);
        expect(document.cookie).toBe(cookieBefore);

        clearPendingDiscountCode();

        expect(readPendingDiscountCode()).toBeNull();
    });

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
