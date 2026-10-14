import { HttpErrorResponse } from '@angular/common/http';
import { messageFromHttpError } from './api-error.utils';

const problem = (code: string, status = 409) => new HttpErrorResponse({ status, error: { title: 'x', extensions: { code } } });

describe('ücret önerisi ve hizmet hata kodları', () => {
    const cases: Array<[string, string]> = [
        ['ChargeSuggestions.NotFound', 'artık listede değil'],
        ['ChargeSuggestions.AlreadyConverted', 'zaten ücrete çevrilmiş'],
        ['ChargeSuggestions.AlreadyWaived', 'ücretsiz sayılmış'],
        ['ChargeSuggestions.SourceAlreadyVoided', 'iptal edilmiş'],
        ['ChargeSuggestions.DuplicateRequestId', 'istek kimliği'],
        ['ChargeSuggestions.ConcurrencyConflict', 'aynı anda'],
        ['ChargeSuggestions.ClinicScopeRequired', 'klinik seçmelisiniz'],
        ['ChargeSuggestions.ClinicContextMismatch', 'aktif klinik'],
        ['Products.NotStockTracked', 'stok takipli değildir'],
        ['Products.KindChangeNotAllowed', 'türü hizmete veya hizmetten'],
        ['Administrations.ConcurrencyConflict', 'aynı anda']
    ];

    for (const [code, fragment] of cases) {
        it(`${code} sade Türkçe mesaja çevrilir`, () => {
            const msg = messageFromHttpError(problem(code), 'Genel hata');
            expect(msg).toContain(fragment);
            expect(msg).not.toBe('Genel hata');
        });
    }
});
