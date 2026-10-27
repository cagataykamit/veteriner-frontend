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
});
