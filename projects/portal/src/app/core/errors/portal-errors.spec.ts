import { HttpErrorResponse } from '@angular/common/http';
import { problem } from '@portal/app/testing/portal-testing';
import {
    PORTAL_ERROR_CODES,
    PORTAL_ERROR_MESSAGES,
    PORTAL_GENERIC_ERROR_MESSAGE,
    PORTAL_NETWORK_ERROR_MESSAGE,
    PORTAL_RATE_LIMIT_MESSAGE,
    PORTAL_SERVER_ERROR_MESSAGE,
    portalErrorMessage,
    portalProblemCode
} from './portal-errors';

describe('portal hata eşleme', () => {
    it('sözleşme kodunu extensions.code veya üst düzey code alanından okur', () => {
        expect(portalProblemCode(problem(404, 'Portal.Invites.NotFound'))).toBe('Portal.Invites.NotFound');
        expect(portalProblemCode(new HttpErrorResponse({ status: 409, error: { code: 'OwnerPortal.AlreadyLinked' } }))).toBe('OwnerPortal.AlreadyLinked');
        expect(portalProblemCode(new HttpErrorResponse({ status: 500, error: 'metin' }))).toBeNull();
    });

    it('sözleşmedeki her kod için Türkçe mesaj vardır', () => {
        Object.values(PORTAL_ERROR_CODES).forEach((code) => expect(PORTAL_ERROR_MESSAGES[code]).toBeTruthy());
    });

    it('kod → mesaj; bağlam metni varsayılanın üzerine yazar', () => {
        const err = problem(401, PORTAL_ERROR_CODES.invalidCredentials);

        expect(portalErrorMessage(err)).toBe(PORTAL_ERROR_MESSAGES[PORTAL_ERROR_CODES.invalidCredentials]);
        expect(portalErrorMessage(err, { [PORTAL_ERROR_CODES.invalidCredentials]: 'Kod yanlış.' })).toBe('Kod yanlış.');
    });

    it('ağ hatası, hız sınırı, sunucu hatası ve kodsuz 400 için genel mesajlar', () => {
        expect(portalErrorMessage(problem(0))).toBe(PORTAL_NETWORK_ERROR_MESSAGE);
        expect(portalErrorMessage(problem(429))).toBe(PORTAL_RATE_LIMIT_MESSAGE);
        expect(portalErrorMessage(problem(503))).toBe(PORTAL_SERVER_ERROR_MESSAGE);
        expect(portalErrorMessage(problem(400))).toBe(PORTAL_ERROR_MESSAGES[PORTAL_ERROR_CODES.validation]);
        expect(portalErrorMessage(new Error('x'))).toBe(PORTAL_GENERIC_ERROR_MESSAGE);
    });
});
