import { FormControl } from '@angular/forms';
import { normalizeOneTimeCode, portalFieldError, portalOneTimeCodeValidator, portalStrongPasswordValidator } from './portal-form-rules';

describe('portal form kuralları', () => {
    const password = (value: string) => portalStrongPasswordValidator()(new FormControl(value));
    const code = (value: string) => portalOneTimeCodeValidator()(new FormControl(value));

    it('güçlü parola kuralı backend ile aynı', () => {
        expect(password('Guclu.Parola1')).toBeNull();
        expect(password('kisa1A!')).toEqual(expect.objectContaining({ minlength: true }));
        expect(password('kucukharf1!')).toEqual(expect.objectContaining({ missingUppercase: true }));
        expect(password('BUYUKHARF1!')).toEqual(expect.objectContaining({ missingLowercase: true }));
        expect(password('Rakamsiz!!')).toEqual(expect.objectContaining({ missingDigit: true }));
        expect(password('Ozelsiz123')).toEqual(expect.objectContaining({ missingSpecialChar: true }));
        expect(password(`Aa1!${'x'.repeat(125)}`)).toEqual(expect.objectContaining({ maxlength: true }));
    });

    it('kod 6 hanedir; boşluklar atılır', () => {
        expect(code('123456')).toBeNull();
        expect(code('123 456')).toBeNull();
        expect(code('12345')).toEqual({ oneTimeCode: true });
        expect(code('12a456')).toEqual({ oneTimeCode: true });
        expect(normalizeOneTimeCode(' 123 456 ')).toBe('123456');
    });

    it('alan hataları Türkçe mesaja çevrilir', () => {
        expect(portalFieldError({ required: true }, 'email')).toBe('E-posta adresinizi girin.');
        expect(portalFieldError({ email: true }, 'email')).toBe('Geçerli bir e-posta adresi girin.');
        expect(portalFieldError({ oneTimeCode: true }, 'code')).toBe('Kod 6 haneli bir sayı olmalı.');
        expect(portalFieldError({ missingDigit: true }, 'password')).toBe('Parola en az bir rakam içermeli.');
        expect(portalFieldError(null, 'password')).toBeNull();
    });
});
