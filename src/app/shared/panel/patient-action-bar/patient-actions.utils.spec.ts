import { buildPatientActions } from './patient-actions.utils';

const ALL = new Set([
    'Visits.Create',
    'Examinations.Create',
    'Appointments.Create',
    'Vaccinations.Create',
    'LabResults.Create',
    'Hospitalizations.Create',
    'Charges.Create',
    'Payments.Create',
    'Pets.Create'
]);

describe('buildPatientActions', () => {
    it('hayvan sayfasında tüm yetkilerle eylemler sırayla gelir; Yeni hayvan yoktur', () => {
        const actions = buildPatientActions({ clientId: 'cl1', petId: 'p1' }, (c) => ALL.has(c));
        expect(actions.map((a) => a.label)).toEqual(['Geldi', 'Muayene başlat', 'Randevu al', 'Aşı', 'Lab', 'Yatış', 'Ücret ekle', 'Ödeme al']);
    });

    it('her eylem müşteri ve hayvanı taşır; Geldi rota değil diyalogdur; ödeme yalnız müşteri taşır', () => {
        const actions = buildPatientActions({ clientId: 'cl1', petId: 'p1' }, (c) => ALL.has(c));
        const byKey = (k: string) => actions.find((a) => a.key === k)!;
        expect(byKey('arrive').route).toBeNull();
        expect(byKey('examination')).toEqual(jasmine.objectContaining({ route: '/panel/examinations/new', queryParams: { clientId: 'cl1', petId: 'p1' } }));
        expect(byKey('charge').queryParams).toEqual({ clientId: 'cl1', petId: 'p1' });
        expect(byKey('payment').queryParams).toEqual({ clientId: 'cl1' });
    });

    it('müşteri sayfasında yalnız Yeni hayvan, Ücret ekle ve Ödeme al gelir', () => {
        const actions = buildPatientActions({ clientId: 'cl1', petId: null }, (c) => ALL.has(c));
        expect(actions.map((a) => a.label)).toEqual(['Yeni hayvan', 'Ücret ekle', 'Ödeme al']);
        expect(actions[0]).toEqual(jasmine.objectContaining({ route: '/panel/pets/new', queryParams: { clientId: 'cl1' } }));
    });

    it('yetkisi olmayan eylem gizlenir (Veteriner: ücret/ödeme yok, Sekreter: muayene yok)', () => {
        const vet = buildPatientActions({ clientId: 'cl1', petId: 'p1' }, (c) => !['Charges.Create', 'Payments.Create'].includes(c) && ALL.has(c));
        expect(vet.map((a) => a.key)).not.toContain('charge');
        expect(vet.map((a) => a.key)).not.toContain('payment');
        const secretary = buildPatientActions({ clientId: 'cl1', petId: 'p1' }, (c) => ['Visits.Create', 'Appointments.Create', 'Payments.Create'].includes(c));
        expect(secretary.map((a) => a.key)).toEqual(['arrive', 'appointment', 'payment']);
        expect(buildPatientActions({ clientId: 'cl1', petId: 'p1' }, () => false)).toEqual([]);
    });
});
