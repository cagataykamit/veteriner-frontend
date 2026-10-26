import { readMenuCollapsed, writeMenuCollapsed } from './menu-collapsed-state';

describe('menu-collapsed-state', () => {
    afterEach(() => {
        localStorage.removeItem('vetinity.menu.collapsed.u1');
        localStorage.removeItem('vetinity.menu.collapsed.u2');
    });

    it('kayıt yokken menü açık sayılır', () => {
        expect(readMenuCollapsed('u1')).toBe(false);
    });

    it('tercih kullanıcı bazında saklanır', () => {
        writeMenuCollapsed('u1', true);
        expect(readMenuCollapsed('u1')).toBe(true);
        expect(readMenuCollapsed('u2')).toBe(false);
        writeMenuCollapsed('u1', false);
        expect(readMenuCollapsed('u1')).toBe(false);
    });

    it('kullanıcı bilinmiyorsa okunmaz ve yazılmaz', () => {
        writeMenuCollapsed(null, true);
        expect(readMenuCollapsed(null)).toBe(false);
        expect(localStorage.length === 0 || !Object.keys(localStorage).some((k) => k.endsWith('.null'))).toBe(true);
    });

    it('depo hata fırlatırsa okuma ve yazma sessizce geçer', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('engelli');
        });
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('engelli');
        });
        expect(readMenuCollapsed('u1')).toBe(false);
        expect(() => writeMenuCollapsed('u1', true)).not.toThrow();
    });
});
