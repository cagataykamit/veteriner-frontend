import { HttpErrorResponse } from '@angular/common/http';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

const problem = (code: string) => new HttpErrorResponse({ status: 409, error: { title: 'Conflict', detail: 'Backend detail.', extensions: { code } } });

describe('api-error: alan tablolarının kod → mesaj eşlemesi', () => {
    it.each([
        ['Tenants.DuplicateName', 'Bu kurum adı zaten kullanılıyor. Lütfen farklı bir ad deneyin.'],
        ['RemindersAccessDenied', 'Bu hatırlatma kayıtlarına erişim yetkiniz yok.'],
        ['Vaccinations.AppliedAtMustNotBeFuture', 'Uygulama tarihi gelecek bir tarih olamaz.'],
        ['Clinics.DuplicateName', 'Bu isimde bir klinik zaten kayıtlı. Lütfen farklı bir klinik adı kullanın.'],
        ['Visits.NotOpen', 'Bu geliş tamamlanmış veya yanlış geliş olarak işaretlenmiş; muayene açılamaz.'],
        ['Charges.AlreadyVoided', 'Bu ücret zaten iptal edilmiş. Listeyi yenileyin.'],
        ['Administrations.AlreadyVoided', 'Bu uygulama zaten iptal edilmiş. Listeyi yenileyin.'],
        ['Sales.ProductInactive', 'Pasif ürün satılamaz. Ürünü sepetten çıkarın.'],
        ['LabResults.AlreadyCancelled', 'Bu lab kaydı zaten iptal edilmiş. Sayfayı yenileyin.'],
        ['CareInstructions.NotFound', 'Bakım talimatı bulunamadı.'],
        ['Examinations.NotFinalized', 'Ek not yalnızca kesinleşmiş muayeneye eklenebilir.'],
        ['OwnerPortal.AlreadyLinked', 'Bu müşterinin portal erişimi zaten açık; yeni davet gerekmez.']
    ])('%s', (code, message) => {
        expect(messageFromHttpError(problem(code))).toBe(message);
    });

    it.each([
        ['StockBatches.NotFound', 'Seçilen parti bulunamadı. Formu yeniden açıp partiyi tekrar seçin.'],
        ['StockMovements.ConcurrencyConflict', 'Stok aynı anda başka bir işlemle değişti. Tekrar deneyin; aynı kayıt iki kez düşülmez.'],
        ['Examinations.NotFound', 'Muayene kaydı bulunamadı.'],
        ['Clients.NotFound', 'Müşteri kaydı bulunamadı.'],
        ['Products.NotFound', 'Ürün bulunamadı.']
    ])('birden çok tabloda olan %s ilk tablonun metnini alır', (code, message) => {
        expect(messageFromHttpError(problem(code))).toBe(message);
    });

    it('tabloda olmayan kodda backend detail gösterilir', () => {
        expect(messageFromHttpError(problem('Unknown.Code'))).toBe('Backend detail.');
    });
});
