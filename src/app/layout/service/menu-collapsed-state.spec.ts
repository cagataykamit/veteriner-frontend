import { readMenuCollapsed, writeMenuCollapsed } from './menu-collapsed-state';

describe('menu-collapsed-state', () => {
    afterEach(() => {
        localStorage.removeItem('vetinity.menu.collapsed.u1');
        localStorage.removeItem('vetinity.menu.collapsed.u2');
    });

    it('kayıt yokken menü açık sayılır', () => {
        expect(readMenuCollapsed('u1')).toBeFalse();
    });

    it('tercih kullanıcı bazında saklanır', () => {
        writeMenuCollapsed('u1', true);
        expect(readMenuCollapsed('u1')).toBeTrue();
        expect(readMenuCollapsed('u2')).toBeFalse();
        writeMenuCollapsed('u1', false);
        expect(readMenuCollapsed('u1')).toBeFalse();
    });

    it('kullanıcı bilinmiyorsa okunmaz ve yazılmaz', () => {
        writeMenuCollapsed(null, true);
        expect(readMenuCollapsed(null)).toBeFalse();
        expect(localStorage.length === 0 || !Object.keys(localStorage).some((k) => k.endsWith('.null'))).toBeTrue();
    });

    it('depo hata fırlatırsa okuma ve yazma sessizce geçer', () => {
        spyOn(Storage.prototype, 'getItem').and.throwError('engelli');
        spyOn(Storage.prototype, 'setItem').and.throwError('engelli');
        expect(readMenuCollapsed('u1')).toBeFalse();
        expect(() => writeMenuCollapsed('u1', true)).not.toThrow();
    });
});
