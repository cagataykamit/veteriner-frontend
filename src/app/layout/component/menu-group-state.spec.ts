import { readMenuGroupPreferences, writeMenuGroupPreferences } from './menu-group-state';

const KEY = 'vetinity.menu.groups';

describe('menu-group-state', () => {
    afterEach(() => localStorage.removeItem(KEY));

    it('kayıt yokken boş tercih döner', () => {
        expect(readMenuGroupPreferences()).toEqual({});
    });

    it('yazılan tercih okunur', () => {
        writeMenuGroupPreferences({ Klinik: false, Stok: true });
        expect(readMenuGroupPreferences()).toEqual({ Klinik: false, Stok: true });
    });

    it('bozuk veya beklenmeyen içerikte boş tercih döner, boolean olmayanlar atılır', () => {
        localStorage.setItem(KEY, '{bozuk');
        expect(readMenuGroupPreferences()).toEqual({});
        localStorage.setItem(KEY, '[1]');
        expect(readMenuGroupPreferences()).toEqual({});
        localStorage.setItem(KEY, '{"Klinik":"evet","Para":false}');
        expect(readMenuGroupPreferences()).toEqual({ Para: false });
    });

    it('depo hata fırlatırsa okuma ve yazma sessizce geçer', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('engelli');
        });
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('engelli');
        });
        expect(readMenuGroupPreferences()).toEqual({});
        expect(() => writeMenuGroupPreferences({ Klinik: true })).not.toThrow();
    });
});
