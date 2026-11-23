import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, throwError } from 'rxjs';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';
import { deleteBlockReasonItems, RecordDeletionError, restoreErrorLink, toRecordDeletionError } from './record-deletion-error.utils';

const problem = (status: number, body: Record<string, unknown>) => new HttpErrorResponse({ status, error: body });

const fail = async (err: HttpErrorResponse, fallback = 'Silinemedi.'): Promise<RecordDeletionError> => {
    try {
        await firstValueFrom(throwError(() => err).pipe(toRecordDeletionError(fallback)));
    } catch (e) {
        return e as RecordDeletionError;
    }

    throw new Error('hata bekleniyordu');
};

describe('record-deletion-error.utils (ADR-054)', () => {
    it('409 DeleteBlocked: nedenler ve sayılar gövde kökünden okunur, bilinmeyen neden atılır; metin sunucunun Türkçe detail\'i', async () => {
        const detail = 'Müşteri silinemez: açık hesabı var; 2 gelecek randevusu var; önce randevuları iptal edin.';
        const e = await fail(
            problem(409, { code: 'Clients.DeleteBlocked', detail, reasons: ['OpenAccount', 'FutureAppointments', 'Bilinmeyen'], activeHospitalizationCount: 0, openVisitCount: 0, futureAppointmentCount: 2 })
        );

        expect(e).toBeInstanceOf(RecordDeletionError);
        expect(e.code).toBe('Clients.DeleteBlocked');
        expect(e.message).toBe(detail);
        expect(e.blocked).toEqual({ reasons: ['OpenAccount', 'FutureAppointments'], activeHospitalizationCount: 0, openVisitCount: 0, futureAppointmentCount: 2 });
        expect(e.conflictingClientId).toBeNull();
    });

    it('ekler `extensions` altında da okunur (eski biçim)', async () => {
        const e = await fail(problem(409, { extensions: { code: 'Pets.DeleteBlocked', reasons: ['ActiveHospitalization'], activeHospitalizationCount: 1 } }));

        expect(e.blocked?.reasons).toEqual(['ActiveHospitalization']);
        expect(e.blocked?.activeHospitalizationCount).toBe(1);
    });

    it('RestoreConflict: çakışan müşteri kimliği ve tek yerdeki Türkçe metin', async () => {
        const e = await fail(problem(409, { code: 'Clients.RestoreConflict', conflictingClientId: 'c9' }), 'Geri yüklenemedi.');

        expect(e.message).toBe('Aynı bilgilerle aktif bir müşteri var; o kaydı kullanın ya da bilgileri düzenleyin.');
        expect(e.conflictingClientId).toBe('c9');
        expect(e.blocked).toBeNull();
        expect(restoreErrorLink(e, null)).toEqual({ label: 'Aktif müşteriyi aç', route: ['/panel/clients', 'c9'] });
    });

    it('Pets.ClientDeleted: müşteri kartına bağlantı; başka hatada bağlantı yok', async () => {
        const e = await fail(problem(409, { code: 'Pets.ClientDeleted' }));

        expect(e.message).toBe('Hastanın müşterisi silinmiş; önce müşteriyi geri yükleyin.');
        expect(restoreErrorLink(e, 'c1')).toEqual({ label: 'Müşteri kartı', route: ['/panel/clients', 'c1'] });
        expect(restoreErrorLink(new Error('x'), 'c1')).toBeNull();
    });

    it('peşin müşteri silme metni satıştaki "düzenlenemez" metnini ezer', async () => {
        const e = await fail(problem(400, { code: 'Clients.WalkInReadOnly' }));

        expect(e.message).toBe('Peşin müşteri (doğrudan satış kaydı) silinemez.');
    });

    it('silinen kayda yazma kodları panel genelinde Türkçe eşlenir (problem-messages kaydı)', () => {
        expect(messageFromHttpError(problem(409, { code: 'Clients.Deleted' }))).toContain('Bu müşteri silinmiş');
        expect(messageFromHttpError(problem(409, { code: 'Pets.Deleted' }))).toContain('Bu hasta silinmiş');
        expect(messageFromHttpError(problem(409, { code: 'Pets.DuplicatePet' }))).toContain('aynı ad ve türde');
    });

    describe('deleteBlockReasonItems', () => {
        const blocked = { reasons: ['OpenAccount', 'ActiveHospitalization', 'OpenVisit', 'FutureAppointments'] as const, activeHospitalizationCount: 2, openVisitCount: 1, futureAppointmentCount: 3 };

        it('müşteri: her neden ilgili yere bağlanır (hesap → ücretler, yatış, randevular müşteri süzgeçli, açık geliş → Bugün)', () => {
            const items = deleteBlockReasonItems(blocked, { kind: 'client', clientId: 'c1', petId: null });

            expect(items.map((i) => [i.reason, i.link.route[0], i.link.queryParams])).toEqual([
                ['OpenAccount', '/panel/charges', { clientId: 'c1' }],
                ['ActiveHospitalization', '/panel/hospitalizations', undefined],
                ['OpenVisit', '/panel/today', undefined],
                ['FutureAppointments', '/panel/appointments', { clientId: 'c1' }]
            ]);
            expect(items[1].text).toBe('2 aktif yatışı var; önce taburcu edin ya da yatışı iptal edin.');
            expect(items[3].text).toBe('3 gelecek randevusu var; önce randevuları iptal edin.');
        });

        it('hasta: yatış ve randevu bağlantıları hasta süzgeçli', () => {
            const items = deleteBlockReasonItems({ ...blocked, reasons: ['ActiveHospitalization', 'FutureAppointments'], activeHospitalizationCount: 1 }, { kind: 'pet', clientId: 'c1', petId: 'p1' });

            expect(items.map((i) => i.link.queryParams)).toEqual([{ petId: 'p1' }, { petId: 'p1' }]);
            expect(items[0].text).toBe('Aktif yatışı var; önce taburcu edin ya da yatışı iptal edin.');
        });
    });
});
