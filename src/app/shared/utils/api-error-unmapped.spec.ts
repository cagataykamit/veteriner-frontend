import { HttpErrorResponse } from '@angular/common/http';
import { messageFromHttpError, UNMAPPED_PROBLEM_MESSAGE } from '@/app/shared/utils/api-error.utils';

const problem = (status: number, detail: string | null, code: string | null) =>
    new HttpErrorResponse({ status, error: { title: 'x', ...(detail !== null ? { detail } : {}), ...(code ? { extensions: { code } } : {}) } });

describe('api-error: eşlenmemiş kod (O4)', () => {
    it('kodlu iş kuralı hatasında metin yoksa genel metin ve destek kodu', () => {
        expect(messageFromHttpError(problem(400, null, 'Things.Broken'))).toBe(`${UNMAPPED_PROBLEM_MESSAGE} (Destek kodu: Things.Broken)`);
        expect(messageFromHttpError(problem(409, 'A business rule was violated.', 'Things.Broken'))).toBe(`${UNMAPPED_PROBLEM_MESSAGE} (Destek kodu: Things.Broken)`);
    });

    it('sunucunun açıklayıcı metni varsa o gösterilir', () => {
        expect(messageFromHttpError(problem(409, 'Bu hasta zaten yatışta.', 'Hospitalizations.AlreadyActive'))).toBe('Bu hasta zaten yatışta.');
    });

    it('yetki ve bulunamadı gibi durumlar kendi metniyle; kodsuz hatada ekranın yedek metni', () => {
        expect(messageFromHttpError(problem(403, null, 'Things.Forbidden'))).toBe('Bu işlem için yetkiniz yok.');
        expect(messageFromHttpError(new HttpErrorResponse({ status: 500, error: {} }), 'Kayıt oluşturulamadı.')).toBe('Kayıt oluşturulamadı.');
    });
});
