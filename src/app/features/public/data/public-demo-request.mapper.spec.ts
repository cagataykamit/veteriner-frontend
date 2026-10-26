import { mapPublicDemoRequestFormToRequest, validatePublicDemoRequestForm } from '@/app/features/public/data/public-demo-request.mapper';
import { emptyPublicDemoRequestForm, type PublicDemoRequestForm } from '@/app/features/public/models/public-demo-request.model';

function validForm(overrides: Partial<PublicDemoRequestForm> = {}): PublicDemoRequestForm {
    return {
        ...emptyPublicDemoRequestForm(),
        contactName: ' Ayşe Yılmaz ',
        clinicName: 'Işık Veteriner',
        email: ' ayse@example.com ',
        clinicSize: 'MultiBranch',
        privacyNoticeAccepted: true,
        ...overrides
    };
}

describe('public-demo-request.mapper (TRIAL-005)', () => {
    it('geçerli formda hata yok', () => {
        expect(validatePublicDemoRequestForm(validForm())).toEqual({});
    });

    it('zorunlu alanlar ve onay eksikse alan bazında hata verir', () => {
        const errors = validatePublicDemoRequestForm(emptyPublicDemoRequestForm());

        expect(Object.keys(errors).sort()).toEqual(['clinicName', 'clinicSize', 'contactName', 'email', 'privacyNoticeAccepted']);
    });

    it('kırpılmış uzunluk ve e-posta biçimini denetler', () => {
        const errors = validatePublicDemoRequestForm(validForm({ contactName: ' A ', email: 'gecersiz', message: 'm'.repeat(2001) }));

        expect(errors.contactName).toBeTruthy();
        expect(errors.email).toBeTruthy();
        expect(errors.message).toBeTruthy();
    });

    it('tuzak alan doluysa doğrulama yapılmaz', () => {
        expect(validatePublicDemoRequestForm({ ...emptyPublicDemoRequestForm(), website: 'http://spam' })).toEqual({});
    });

    it('gövdeyi kırpar, boş isteğe bağlı alanları null yapar', () => {
        expect(mapPublicDemoRequestFormToRequest(validForm({ city: ' İzmir ', phone: '  ' }))).toEqual({
            contactName: 'Ayşe Yılmaz',
            clinicName: 'Işık Veteriner',
            city: 'İzmir',
            email: 'ayse@example.com',
            phone: null,
            clinicSize: 'MultiBranch',
            currentSoftware: null,
            message: null,
            privacyNoticeAccepted: true,
            website: null
        });
    });
});
