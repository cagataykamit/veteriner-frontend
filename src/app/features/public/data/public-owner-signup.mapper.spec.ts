import type { PublicOwnerSignupFormValue } from '@/app/features/public/models/public-owner-signup-form.model';
import { mapPublicOwnerSignupFormToRequest } from './public-owner-signup.mapper';

const FORM: PublicOwnerSignupFormValue = {
    planCode: 'Basic',
    tenantName: ' Pati Kurum ',
    clinicName: 'Pati Klinik',
    clinicCity: 'Ankara',
    email: ' sahip@example.com ',
    password: 'Abc12345!',
    acceptedLegalDocuments: [{ documentType: 'Terms', version: '0.1' }],
    discountCode: '',
    startMode: 'example'
};

describe('public-owner-signup.mapper (TRIAL-002)', () => {
    it('örnek klinik seçimini startWithExampleClinic=true olarak gönderir ve metinleri kırpar', () => {
        const body = mapPublicOwnerSignupFormToRequest(FORM);

        expect(body.startWithExampleClinic).toBe(true);
        expect(body.tenantName).toBe('Pati Kurum');
        expect(body.email).toBe('sahip@example.com');
        expect(body.password).toBe('Abc12345!');
        expect(body.acceptedLegalDocuments).toEqual(FORM.acceptedLegalDocuments);
        expect('discountCode' in body).toBe(false);
    });

    it('boş klinik seçiminde bayrak false; ortak kodu varsa gövdeye eklenir', () => {
        const body = mapPublicOwnerSignupFormToRequest({ ...FORM, startMode: 'empty', discountCode: ' ISIK10 ' });

        expect(body.startWithExampleClinic).toBe(false);
        expect(body.discountCode).toBe('ISIK10');
    });
});
