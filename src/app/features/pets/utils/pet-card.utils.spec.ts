import type { ChargeSuggestionVm } from '@/app/features/charges/models/charge-suggestion-vm.model';
import type { ClientBalanceVm } from '@/app/features/clients/models/client-balance-vm.model';
import type { LabResultListItemVm } from '@/app/features/lab-results/models/lab-result-vm.model';
import type { PetDetailVm, PetHistoryAppointmentItemVm, PetHistoryLabResultItemVm } from '@/app/features/pets/models/pet-vm.model';
import type { TreatmentListItemVm } from '@/app/features/treatments/models/treatment-vm.model';
import type { VaccinationListItemVm } from '@/app/features/vaccinations/models/vaccination-vm.model';
import { NO_PET_ALERTS } from '@/app/shared/pet-alerts/pet-alerts.utils';
import {
    activeFollowUpTreatments,
    buildPetTodo,
    examinationAssessmentText,
    examinationVitalsLine,
    nextScheduledAppointment,
    petAgeLabel,
    petCardEmphasis,
    petIdentityParts,
    type PetTodoContext,
    type PetTodoSources
} from './pet-card.utils';

const NOW = new Date('2026-10-14T09:00:00Z');

const vaccine = (id: string, dueAtUtc: string | null, name = 'Karma'): VaccinationListItemVm => ({
    id,
    appliedAtUtc: null,
    dueAtUtc,
    vaccineName: name,
    petId: 'p1',
    petName: 'Pamuk',
    clientId: 'c1',
    clientName: 'Ali',
    status: 0,
    notes: '',
    administrationId: null
});

const lab = (id: string): LabResultListItemVm => ({
    id,
    clinicId: 'k1',
    petId: 'p1',
    petName: 'Pamuk',
    clientId: 'c1',
    clientName: 'Ali',
    resultDateUtc: null,
    requestedAtUtc: '2026-10-12T08:00:00Z',
    status: 'Requested',
    awaitingInterpretation: false,
    testName: 'Hemogram',
    examinationId: null
});

const historyLab = (id: string, awaitingInterpretation: boolean): PetHistoryLabResultItemVm => ({
    id,
    resultDateUtc: '2026-10-13T08:00:00Z',
    testName: 'Biyokimya',
    status: 'Resulted',
    requestedAtUtc: '2026-10-12T08:00:00Z',
    awaitingInterpretation,
    clinicName: null
});

const charge = (id: string, description: string): ChargeSuggestionVm => ({
    id,
    sourceType: 'Administration',
    sourceId: 's' + id,
    clientId: 'c1',
    clientName: 'Ali',
    petId: 'p1',
    petName: 'Pamuk',
    examinationId: 'e1',
    visitId: null,
    description,
    quantity: 1,
    unit: 'adet',
    suggestedUnitPrice: 100,
    currency: 'TRY',
    occurredAtUtc: '2026-10-13T08:00:00Z'
});

const balance = (outstanding: number, petPart: number): ClientBalanceVm => ({
    clientId: 'c1',
    clientName: 'Ali',
    currency: 'TRY',
    chargedAmount: outstanding,
    allocatedAmount: 0,
    outstandingAmount: outstanding,
    openCharges:
        petPart > 0
            ? [
                  {
                      chargeId: 'ch1',
                      clinicId: 'k1',
                      petId: 'p1',
                      petName: 'Pamuk',
                      visitId: null,
                      visitArrivedAtUtc: null,
                      examinationId: null,
                      description: 'Muayene',
                      amount: petPart,
                      allocatedAmount: 0,
                      outstandingAmount: petPart,
                      createdAtUtc: '2026-10-13T08:00:00Z'
                  }
              ]
            : []
});

const emptySources = (): PetTodoSources => ({
    scheduledVaccinations: { state: 'ok', data: [] },
    requestedLabs: { state: 'ok', data: [] },
    recentLabs: { state: 'ok', data: [] },
    pendingCharges: { state: 'ok', data: [] },
    balance: { state: 'ok', data: balance(0, 0) }
});

const ctx = (claims: string[], over: Partial<PetTodoContext> = {}): PetTodoContext => ({
    petId: 'p1',
    clientId: 'c1',
    hasClaim: (c) => claims.includes(c),
    mutationBlocked: false,
    emphasis: 'clinical',
    now: NOW,
    ...over
});

describe('petAgeLabel', () => {
    const now = new Date(2026, 9, 14);

    it('bir yaş ve üstü tam yıl, altı ay, bir aydan küçük ayrı metin', () => {
        expect(petAgeLabel('2023-10-14', now)).toBe('3 yaş');
        expect(petAgeLabel('2023-10-15', now)).toBe('2 yaş');
        expect(petAgeLabel('2026-05-01', now)).toBe('5 ay');
        expect(petAgeLabel('2026-10-01', now)).toBe('1 aydan küçük');
    });

    it('boş, geçersiz ve gelecek tarih için null', () => {
        expect(petAgeLabel(null, now)).toBeNull();
        expect(petAgeLabel('—', now)).toBeNull();
        expect(petAgeLabel('2027-01-01', now)).toBeNull();
    });
});

describe('petIdentityParts', () => {
    const pet = {
        petAlerts: NO_PET_ALERTS,
        speciesName: 'Kedi',
        breed: 'Tekir',
        gender: 'female',
        birthDate: '2023-10-01',
        weight: '4.2',
        microchipNumber: '900000000000001'
    } as PetDetailVm;

    it('muayene kilosu varsa onu, yoksa profil kilosunu kullanır; boş alanları atlar', () => {
        expect(petIdentityParts(pet, 4.4, NOW)).toEqual(['Kedi', 'Tekir', 'Dişi', '3 yaş', '4.4 kg', 'Çip 900000000000001']);
        expect(petIdentityParts({ ...pet, breed: '—', microchipNumber: '—', weight: '—', gender: '—' }, null, NOW)).toEqual(['Kedi', '3 yaş']);
        expect(petIdentityParts(pet, null, NOW)).toContain('4.2 kg');
    });
});

describe('nextScheduledAppointment', () => {
    const appt = (id: string, scheduledAtUtc: string, status: number): PetHistoryAppointmentItemVm => ({
        id,
        scheduledAtUtc,
        status,
        appointmentType: null,
        appointmentTypeName: null,
        notes: null,
        clinicName: null
    });

    it('ileri tarihli en yakın Planlandı randevuyu seçer; iptal ve geçmiş sayılmaz', () => {
        const rows = [
            appt('a1', '2026-10-30T09:00:00Z', 0),
            appt('a2', '2026-10-20T09:00:00Z', 2),
            appt('a3', '2026-10-22T09:00:00Z', 0),
            appt('a4', '2026-10-10T09:00:00Z', 0)
        ];
        expect(nextScheduledAppointment(rows, NOW)?.id).toBe('a3');
        expect(nextScheduledAppointment([rows[1], rows[3]], NOW)).toBeNull();
    });
});

describe('activeFollowUpTreatments', () => {
    const t = (id: string, followUpDateUtc: string | null) => ({ id, followUpDateUtc }) as TreatmentListItemVm;

    it('takip tarihi bugün veya ileride olanları en yakın önce döndürür', () => {
        const now = new Date(2026, 9, 14, 15, 0);
        const result = activeFollowUpTreatments([t('t1', '2026-10-20T00:00:00Z'), t('t2', null), t('t3', '2026-10-01T00:00:00Z'), t('t4', '2026-10-15T00:00:00Z')], now);
        expect(result.map((x) => x.id)).toEqual(['t4', 't1']);
    });
});

describe('examinationVitalsLine / examinationAssessmentText', () => {
    it('ölçülen vitalleri birimleriyle birleştirir; hiç yoksa null', () => {
        expect(examinationVitalsLine({ temperatureC: 38.5, heartRateBpm: 120, respiratoryRatePerMin: null })).toBe('38.5 °C · 120 atım/dk');
        expect(examinationVitalsLine({ temperatureC: null, heartRateBpm: null, respiratoryRatePerMin: null })).toBeNull();
    });

    it('boş veya — değerlendirme null; metin aynen', () => {
        expect(examinationAssessmentText({ assessment: '—' })).toBeNull();
        expect(examinationAssessmentText({ assessment: '  ' })).toBeNull();
        expect(examinationAssessmentText({ assessment: 'Otitis externa' })).toBe('Otitis externa');
    });
});

describe('petCardEmphasis', () => {
    it('muayene açabilen klinik, yalnız ücret/ödeme alan resepsiyon vurgusu alır', () => {
        expect(petCardEmphasis((c) => ['Examinations.Create', 'Payments.Create'].includes(c))).toBe('clinical');
        expect(petCardEmphasis((c) => c === 'Payments.Create')).toBe('frontDesk');
        expect(petCardEmphasis((c) => c === 'Charges.Create')).toBe('frontDesk');
        expect(petCardEmphasis(() => false)).toBe('clinical');
    });
});

describe('buildPetTodo', () => {
    it('gecikmiş aşı (gün sayısıyla) ve 30 gün içindeki yaklaşan aşı listelenir; daha ileri vadeli ve vadesiz atlanır', () => {
        const sources = emptySources();
        sources.scheduledVaccinations = {
            state: 'ok',
            data: [vaccine('v1', '2026-10-04T09:00:00Z'), vaccine('v2', '2026-11-01T09:00:00Z', 'Kuduz'), vaccine('v3', '2027-01-01T09:00:00Z'), vaccine('v4', null)]
        };

        const view = buildPetTodo(sources, ctx(['Vaccinations.Update']));

        expect(view.items.map((i) => i.kind)).toEqual(['overdueVaccine', 'upcomingVaccine']);
        expect(view.items[0].detail).toContain('10 gün geçti');
        expect(view.items[0].action).toEqual({ label: 'Uygula', route: ['/panel/vaccinations', 'v1', 'edit'] });
        expect(view.items[1].title).toContain('Kuduz');
    });

    it('yazma izni yoksa veya kiracı salt okunursa eylem kaydın detayını açar', () => {
        const sources = emptySources();
        sources.scheduledVaccinations = { state: 'ok', data: [vaccine('v1', '2026-10-04T09:00:00Z')] };
        sources.requestedLabs = { state: 'ok', data: [lab('l1')] };

        expect(buildPetTodo(sources, ctx([])).items.map((i) => i.action)).toEqual([
            { label: 'Aç', route: ['/panel/vaccinations', 'v1'] },
            { label: 'Aç', route: ['/panel/lab-results', 'l1'] }
        ]);
        const blocked = buildPetTodo(sources, ctx(['Vaccinations.Update', 'LabResults.Update'], { mutationBlocked: true }));
        expect(blocked.items.every((i) => i.action.label === 'Aç')).toBeTrue();
    });

    it('bekleyen lab "Sonuç gir", yorumu bekleyen sonuçlu lab "Yorum yaz" ile gelir', () => {
        const sources = emptySources();
        sources.requestedLabs = { state: 'ok', data: [lab('l1')] };
        sources.recentLabs = { state: 'ok', data: [historyLab('l2', true), historyLab('l3', false)] };

        const view = buildPetTodo(sources, ctx(['LabResults.Update']));

        expect(view.items.map((i) => [i.kind, i.action.label])).toEqual([
            ['labInterpretation', 'Yorum yaz'],
            ['pendingLab', 'Sonuç gir']
        ]);
        expect(view.items[1].action.route).toEqual(['/panel/lab-results', 'l1', 'edit']);
    });

    it('ücret bekleyen işlemler tek satırda toplanır ve hayvana süzülmüş Ücretlendir sayfasını açar', () => {
        const sources = emptySources();
        sources.pendingCharges = { state: 'ok', data: [charge('1', 'Kuduz aşısı'), charge('2', 'Serum'), charge('3', 'Enjeksiyon'), charge('4', 'Pansuman')] };

        const [item] = buildPetTodo(sources, ctx(['Charges.Create'])).items;

        expect(item.title).toBe('4 işlem ücret bekliyor');
        expect(item.detail).toBe('Kuduz aşısı, Serum, Enjeksiyon ve 1 işlem daha');
        expect(item.action).toEqual({ label: 'Ücretlendir', route: ['/panel/charges/pending'], queryParams: { petId: 'p1' } });
        expect(buildPetTodo(sources, ctx([])).items[0].action.label).toBe('Gör');
    });

    it('açık borç sahibin toplamıdır; bu hayvanın payı ayrıca yazılır; ödeme alma izni yoksa müşteri bakiyesine gider', () => {
        const sources = emptySources();
        sources.balance = { state: 'ok', data: balance(1250, 400) };

        const [item] = buildPetTodo(sources, ctx(['Payments.Create'])).items;
        expect(item.kind).toBe('openBalance');
        expect(item.title).toContain('1.250');
        expect(item.detail).toContain('Bu hasta');
        expect(item.action).toEqual({ label: 'Ödeme al', route: ['/panel/payments/new'], queryParams: { clientId: 'c1' } });

        expect(buildPetTodo(sources, ctx([])).items[0].action).toEqual({ label: 'Bakiyeyi gör', route: ['/panel/clients', 'c1'] });
        expect(buildPetTodo(emptySources(), ctx([])).items).toEqual([]);
    });

    it('rol vurgusu sıralamayı değiştirir: klinik önce aşı/lab, resepsiyon önce borç/ücret', () => {
        const sources = emptySources();
        sources.scheduledVaccinations = { state: 'ok', data: [vaccine('v1', '2026-10-04T09:00:00Z')] };
        sources.pendingCharges = { state: 'ok', data: [charge('1', 'Serum')] };
        sources.balance = { state: 'ok', data: balance(100, 0) };

        expect(buildPetTodo(sources, ctx([])).items.map((i) => i.kind)).toEqual(['overdueVaccine', 'pendingCharge', 'openBalance']);
        expect(buildPetTodo(sources, ctx([], { emphasis: 'frontDesk' })).items.map((i) => i.kind)).toEqual(['openBalance', 'pendingCharge', 'overdueVaccine']);
    });

    it('yükleniyor ve alınamadı durumları ayrı raporlanır; yetkisiz (null) kaynak ikisine de girmez', () => {
        const view = buildPetTodo(
            { ...emptySources(), scheduledVaccinations: { state: 'loading' }, requestedLabs: { state: 'error' }, pendingCharges: null, balance: null },
            ctx([])
        );
        expect(view.loading).toBeTrue();
        expect(view.failed).toEqual(['Lab']);
    });
});
