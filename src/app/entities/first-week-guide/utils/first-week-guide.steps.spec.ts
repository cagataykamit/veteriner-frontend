import { FIRST_WEEK_GUIDE_STEPS, firstWeekGuideKeysForRequest, firstWeekGuideRole, firstWeekGuideSteps, type FirstWeekGuideRole } from '@/app/entities/first-week-guide/utils/first-week-guide.steps';

/** Backend varsayılan rol-izin tablosundan (`RolePermissionBindings`) rehberi ilgilendiren izinler. */
const SECRETARY = ['Visits.Read', 'Visits.Create', 'Visits.Update', 'Clients.Create', 'Appointments.Create', 'Charges.Create', 'Payments.Create', 'Payments.Read', 'Reminders.Read', 'Examinations.Read'];
const VETERINARIAN = [
    'Visits.Read',
    'Visits.Create',
    'Visits.Update',
    'Appointments.Create',
    'Examinations.Create',
    'Examinations.Finalize',
    'Vaccinations.Create',
    'Prescriptions.Create',
    'ClinicalSnippets.Create',
    'Reminders.Read'
];
const MANAGER = [...VETERINARIAN, ...SECRETARY, 'Visits.Correct', 'Tenants.InviteCreate', 'Clinics.Update', 'Products.Create', 'Imports.Read'];

const has = (claims: readonly string[]) => (claim: string) => claims.includes(claim);
const keys = (role: FirstWeekGuideRole, claims: readonly string[]) => firstWeekGuideSteps(role, has(claims)).map((s) => s.key);

describe('ilk hafta rehberi adımları', () => {
    it('rolü izinlerden çıkarır: yönetici düzeyi, sonra kesinleştirme, sonra ön büro; Bugün’ü okumayana rehber yok', () => {
        expect(firstWeekGuideRole(has(MANAGER))).toBe('manager');
        expect(firstWeekGuideRole(has(VETERINARIAN))).toBe('veterinarian');
        expect(firstWeekGuideRole(has(SECRETARY))).toBe('frontDesk');
        expect(firstWeekGuideRole(has(['Clients.Read']))).toBeNull();
    });

    it('her rolde 5–8 tek cümlelik adım vardır ve her adımın panel içi bağlantısı vardır', () => {
        for (const steps of Object.values(FIRST_WEEK_GUIDE_STEPS)) {
            expect(steps.length).toBeGreaterThanOrEqual(5);
            expect(steps.length).toBeLessThanOrEqual(8);

            for (const step of steps) {
                expect(step.route.startsWith('/panel/')).toBe(true);
                expect(step.text.trim().endsWith('.')).toBe(true);
                expect(step.text.slice(0, -1)).not.toContain('. ');
            }
        }
    });

    it('ön büro: kayıt, randevu, geliş, ücret, ödeme, hatırlatma ve gün sonu', () => {
        expect(keys('frontDesk', SECRETARY)).toEqual(['client', 'appointment', 'visit', 'charge', 'payment', 'reminderLogs', 'endOfDay']);
    });

    it('hekim: bakımı başlatma, muayene, metin parçası, kesinleştirme, aşı, reçete ve gün sonu', () => {
        expect(keys('veterinarian', VETERINARIAN)).toEqual(['visitStart', 'examination', 'snippet', 'finalize', 'vaccination', 'prescription', 'visitComplete']);
    });

    it('yönetici: davet, çalışma saatleri, hizmet ve fiyat, içe aktarma, hatırlatma, geliş ve gün sonu', () => {
        expect(keys('manager', MANAGER)).toEqual(['invite', 'workingHours', 'services', 'import', 'reminderSettings', 'visit', 'endOfDay']);
    });

    it('ekranına izni olmayan adım listede görünmez (ör. gün sonu iki izin birlikte ister)', () => {
        const withoutPaymentsRead = SECRETARY.filter((c) => c !== 'Payments.Read' && c !== 'Reminders.Read');

        expect(keys('frontDesk', withoutPaymentsRead)).toEqual(['client', 'appointment', 'visit', 'charge', 'payment']);
    });

    describe('isteğe göre yapıldı', () => {
        it('kayıt oluşturan POST adımı işaretler; taban adres ve sorgu yok sayılır', () => {
            expect(firstWeekGuideKeysForRequest('POST', 'https://api.test/api/v1/appointments?x=1', {})).toEqual(['appointment']);
            expect(firstWeekGuideKeysForRequest('POST', '/api/v1/clients/quick-register', {})).toEqual(['client']);
            expect(firstWeekGuideKeysForRequest('POST', '/api/v1/visits', {})).toEqual(['visit']);
            expect(firstWeekGuideKeysForRequest('POST', '/api/v1/visits/v-1/start', {})).toEqual(['visitStart']);
            expect(firstWeekGuideKeysForRequest('POST', '/api/v1/examinations/e-1/finalize', {})).toEqual(['finalize']);
            expect(firstWeekGuideKeysForRequest('POST', '/api/v1/tenants/t-1/invites', {})).toEqual(['invite']);
            expect(firstWeekGuideKeysForRequest('POST', '/api/v1/imports/batches/b-1/commit', {})).toEqual(['import']);
            expect(firstWeekGuideKeysForRequest('PUT', '/api/v1/clinics/c-1/working-hours', {})).toEqual(['workingHours']);
        });

        it('hizmet adımını yalnız türü Hizmet olan ürün işaretler', () => {
            expect(firstWeekGuideKeysForRequest('POST', '/api/v1/products', { kind: 'Service' })).toEqual(['services']);
            expect(firstWeekGuideKeysForRequest('POST', '/api/v1/products', { kind: 'Medicine' })).toEqual([]);
        });

        it('okuma, başka yöntem ya da ilgisiz yol işaret koymaz', () => {
            expect(firstWeekGuideKeysForRequest('GET', '/api/v1/appointments', null)).toEqual([]);
            expect(firstWeekGuideKeysForRequest('PUT', '/api/v1/appointments/a-1', {})).toEqual([]);
            expect(firstWeekGuideKeysForRequest('POST', '/api/v1/examinations/e-1/addenda', {})).toEqual([]);
            expect(firstWeekGuideKeysForRequest('POST', '/api/v1/appointments/a-1/cancel', {})).toEqual([]);
            expect(firstWeekGuideKeysForRequest('POST', '/Auth/login', {})).toEqual([]);
        });
    });
});
