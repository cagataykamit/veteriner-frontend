import { mapPetOpenItemsDtoToVm } from '@/app/features/pets/data/pet-open-items.mapper';
import type { PetOpenItemsDto } from '@/app/features/pets/models/pet-open-items-api.model';
import type { PetOpenItemsVm } from '@/app/features/pets/models/pet-open-items-vm.model';
import type { PetDetailVm, PetHistoryAppointmentItemVm } from '@/app/features/pets/models/pet-vm.model';
import { NO_PET_ALERTS } from '@/app/shared/pet-alerts/pet-alerts.utils';
import {
    buildPetTodo,
    examinationAssessmentText,
    examinationVitalsLine,
    nextScheduledAppointment,
    openItemsSection,
    ownerOutstandingSection,
    petAgeLabel,
    petCardEmphasis,
    petIdentityParts,
    type PetCardSection,
    type PetTodoContext
} from './pet-card.utils';

const NOW = new Date('2026-10-14T09:00:00Z');

const EMPTY = { state: 'Empty', data: null };

/** Sunucu yanıtı (açık iş yok); testler yalnız ilgili bölümü doldurur. */
const openItems = (over: Partial<PetOpenItemsDto> = {}): PetCardSection<PetOpenItemsVm> => ({
    state: 'ok',
    data: mapPetOpenItemsDtoToVm({
        petId: 'p1',
        clientId: 'c1',
        status: 'Active',
        asOfUtc: NOW.toISOString(),
        vaccinations: EMPTY,
        labResults: EMPTY,
        pendingCharges: EMPTY,
        nextAppointment: EMPTY,
        outstanding: EMPTY,
        ...over
    })
});

type DueVaccine = { id: string; dueAtUtc: string; vaccineName?: string };

const vaccinations = (overdue: DueVaccine[], upcoming: DueVaccine[] = []) => ({
    state: 'Ok',
    data: { overdue: overdue.map((v) => ({ vaccineName: 'Karma', ...v })), upcoming: upcoming.map((v) => ({ vaccineName: 'Kuduz', ...v })) }
});

const labs = (awaitingResult: string[], awaitingInterpretation: string[] = []) => ({
    state: 'Ok',
    data: {
        awaitingResult: awaitingResult.map((id) => ({ id, testName: 'Hemogram', requestedAtUtc: '2026-10-12T08:00:00Z', resultDateUtc: null })),
        awaitingInterpretation: awaitingInterpretation.map((id) => ({ id, testName: 'Biyokimya', requestedAtUtc: '2026-10-12T08:00:00Z', resultDateUtc: '2026-10-13T08:00:00Z' }))
    }
});

const pendingCharges = (count: number, totalAmount: number, unpricedCount: number) => ({ state: 'Ok', data: { count, totalAmount, unpricedCount, currency: 'TRY' } });

const outstanding = (client: number, pet: number) => ({
    state: 'Ok',
    data: { petOutstandingAmount: pet, petOpenChargeCount: pet > 0 ? 1 : 0, clientOutstandingAmount: client, currency: 'TRY' }
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

describe('openItemsSection / ownerOutstandingSection', () => {
    it('Forbidden gösterilmez (null), Unavailable alınamadı, Empty ok + veri yok; istek durumu bölüme geçer', () => {
        const items = openItems({ labResults: { state: 'Forbidden', data: null }, pendingCharges: { state: 'Unavailable', data: null } });

        expect(openItemsSection(items, (o) => o.labResults)).toBeNull();
        expect(openItemsSection(items, (o) => o.pendingCharges)).toEqual({ state: 'error' });
        expect(openItemsSection(items, (o) => o.vaccinations)).toEqual({ state: 'ok', data: null });
        expect(openItemsSection({ state: 'loading' }, (o) => o.labResults)).toEqual({ state: 'loading' });
        expect(openItemsSection({ state: 'error' }, (o) => o.labResults)).toEqual({ state: 'error' });
        expect(openItemsSection(null, (o) => o.labResults)).toBeNull();
    });

    it('başlık borcu sahibin toplamıdır; Empty borç yok (0) demektir', () => {
        expect(ownerOutstandingSection(openItems({ outstanding: outstanding(650, 600) }))).toEqual({ state: 'ok', data: { outstandingAmount: 650, currency: 'TRY' } });
        expect(ownerOutstandingSection(openItems())).toEqual({ state: 'ok', data: { outstandingAmount: 0, currency: 'TRY' } });
        expect(ownerOutstandingSection(openItems({ outstanding: { state: 'Forbidden', data: null } }))).toBeNull();
    });
});

describe('buildPetTodo', () => {
    it('gecikmiş (gün sayısıyla) ve yaklaşan aşılar sunucunun ayırdığı gibi listelenir; istemci pencere süzgeci uygulamaz', () => {
        const view = buildPetTodo(
            openItems({ vaccinations: vaccinations([{ id: 'v1', dueAtUtc: '2026-10-04T09:00:00Z' }], [{ id: 'v2', dueAtUtc: '2027-03-01T09:00:00Z' }]) }),
            ctx(['Vaccinations.Update', 'VaccineDefinitions.Read'])
        );

        expect(view.items.map((i) => i.kind)).toEqual(['overdueVaccine', 'upcomingVaccine']);
        expect(view.items[0].detail).toContain('10 gün geçti');
        expect(view.items[0].action).toEqual({ label: 'Uygula', route: ['/panel/vaccinations', 'v1', 'edit'] });
        expect(view.items[1].title).toContain('Kuduz');
    });

    it('geçen gün sayısı İstanbul takvim günüdür, saat farkı değil (ADR-028)', () => {
        // Vade İstanbul 2026-10-13 23:00; şimdi İstanbul 2026-10-14 12:00 → 13 saat ama 1 takvim günü.
        const view = buildPetTodo(openItems({ vaccinations: vaccinations([{ id: 'v1', dueAtUtc: '2026-10-13T20:00:00Z' }]) }), ctx([]));

        expect(view.items[0].detail).toContain('1 gün geçti');
    });

    it('yazma izni yoksa veya kiracı salt okunursa eylem kaydın detayını açar', () => {
        const items = openItems({ vaccinations: vaccinations([{ id: 'v1', dueAtUtc: '2026-10-04T09:00:00Z' }]), labResults: labs(['l1']) });

        expect(buildPetTodo(items, ctx([])).items.map((i) => i.action)).toEqual([
            { label: 'Aç', route: ['/panel/vaccinations', 'v1'] },
            { label: 'Aç', route: ['/panel/lab-results', 'l1'] }
        ]);
        const blocked = buildPetTodo(items, ctx(['Vaccinations.Update', 'VaccineDefinitions.Read', 'LabResults.Update'], { mutationBlocked: true }));

        expect(blocked.items.every((i) => i.action.label === 'Aç')).toBeTrue();
    });

    it('aşı kataloğu okuma izni yoksa Uygula gösterilmez (düzenleme rotası /notfound verirdi), kayıt açılır', () => {
        const items = openItems({ vaccinations: vaccinations([{ id: 'v1', dueAtUtc: '2026-10-04T09:00:00Z' }]) });

        expect(buildPetTodo(items, ctx(['Vaccinations.Update'])).items[0].action).toEqual({ label: 'Aç', route: ['/panel/vaccinations', 'v1'] });
    });

    it('sonucu bekleyen lab "Sonuç gir", yorumu bekleyen lab "Yorum yaz" ile gelir (sunucu listesi, sınır yok)', () => {
        const view = buildPetTodo(openItems({ labResults: labs(['l1'], ['l2', 'l3']) }), ctx(['LabResults.Update']));

        expect(view.items.map((i) => [i.kind, i.action.label])).toEqual([
            ['labInterpretation', 'Yorum yaz'],
            ['labInterpretation', 'Yorum yaz'],
            ['pendingLab', 'Sonuç gir']
        ]);
        expect(view.items[2].action.route).toEqual(['/panel/lab-results', 'l1', 'edit']);
    });

    it('ücret bekleyenler tek satır: sayı, sunucu toplamı ve fiyat bekleyen kalem; hayvana süzülmüş Ücretlendir sayfası', () => {
        const items = openItems({ pendingCharges: pendingCharges(3, 360, 1) });
        const [item] = buildPetTodo(items, ctx(['Charges.Create'])).items;

        expect(item.title).toBe('3 işlem ücret bekliyor');
        expect(item.detail).toContain('360');
        expect(item.detail).toContain('1 kalem fiyat bekliyor');
        expect(item.action).toEqual({ label: 'Ücretlendir', route: ['/panel/charges/pending'], queryParams: { petId: 'p1' } });
        expect(buildPetTodo(items, ctx([])).items[0].action.label).toBe('Gör');

        expect(buildPetTodo(openItems({ pendingCharges: pendingCharges(2, 0, 2) }), ctx([])).items[0].detail).toBe('2 kalem fiyat bekliyor');
    });

    it('açık borç sahibin toplamıdır; bu hayvanın payı ayrıca yazılır; ödeme alma izni yoksa müşteri bakiyesine gider', () => {
        const items = openItems({ outstanding: outstanding(1250, 400) });

        const [item] = buildPetTodo(items, ctx(['Payments.Create'])).items;

        expect(item.kind).toBe('openBalance');
        expect(item.title).toContain('1.250');
        expect(item.detail).toContain('Bu hasta');
        expect(item.detail).toContain('400');
        expect(item.action).toEqual({ label: 'Ödeme al', route: ['/panel/payments/new'], queryParams: { clientId: 'c1' } });

        expect(buildPetTodo(items, ctx([])).items[0].action).toEqual({ label: 'Bakiyeyi gör', route: ['/panel/clients', 'c1'] });
        expect(buildPetTodo(openItems({ outstanding: outstanding(100, 0) }), ctx([])).items[0].detail).toContain('Sahibin toplam borcu');
        expect(buildPetTodo(openItems(), ctx([])).items).toEqual([]);
    });

    it('rol vurgusu sıralamayı değiştirir: klinik önce aşı/lab, resepsiyon önce borç/ücret', () => {
        const items = openItems({
            vaccinations: vaccinations([{ id: 'v1', dueAtUtc: '2026-10-04T09:00:00Z' }]),
            pendingCharges: pendingCharges(1, 100, 0),
            outstanding: outstanding(100, 0)
        });

        expect(buildPetTodo(items, ctx([])).items.map((i) => i.kind)).toEqual(['overdueVaccine', 'pendingCharge', 'openBalance']);
        expect(buildPetTodo(items, ctx([], { emphasis: 'frontDesk' })).items.map((i) => i.kind)).toEqual(['openBalance', 'pendingCharge', 'overdueVaccine']);
    });

    it('Unavailable bölüm adıyla "alınamadı" raporlanır; Forbidden bölüm satır da hata da üretmez', () => {
        const view = buildPetTodo(
            openItems({
                vaccinations: vaccinations([{ id: 'v1', dueAtUtc: '2026-10-04T09:00:00Z' }]),
                labResults: { state: 'Unavailable', data: null },
                outstanding: { state: 'Forbidden', data: null }
            }),
            ctx([])
        );

        expect(view.items.map((i) => i.kind)).toEqual(['overdueVaccine']);
        expect(view.loading).toBeFalse();
        expect(view.failed).toEqual(['Lab']);
        expect(view.forbidden).toBeFalse();
    });

    it('bütün bölümler Forbidden ise (veya uç yetkisizse) liste bilinmiyordur: forbidden işaretlenir', () => {
        const forbidden = { state: 'Forbidden', data: null };
        const all = openItems({ vaccinations: forbidden, labResults: forbidden, pendingCharges: forbidden, outstanding: forbidden });

        expect(buildPetTodo(all, ctx([]))).toEqual({ items: [], loading: false, failed: [], forbidden: true });
        expect(buildPetTodo(openItems({ outstanding: forbidden }), ctx([])).forbidden).toBeFalse();
    });

    it('vefat eden hastanın açık randevusu bilgi satırıdır: en yakın tarih, randevu listesine (hasta + planlı + bugünden itibaren süzgeçli) tek eylem; sayı verilmez', () => {
        const nextAppointment = { state: 'Ok', data: { id: 'a1', scheduledAtUtc: '2026-10-20T09:00:00Z', durationMinutes: 30 } };
        const view = buildPetTodo(openItems({ status: 'Deceased', nextAppointment, outstanding: outstanding(100, 0) }), ctx(['Payments.Create'], { emphasis: 'frontDesk' }));

        expect(view.items.map((i) => i.kind)).toEqual(['deceasedAppointment', 'openBalance']);
        const [item] = view.items;

        expect(item.tone).toBe('info');
        expect(item.title).toBe('Vefat eden hastanın açık randevusu var');
        expect(item.detail).toContain('En yakını: 20.10.2026');
        expect(item.action).toEqual({ label: 'Randevuları gör', route: ['/panel/appointments'], queryParams: { petId: 'p1', status: '0', fromDate: '2026-10-14' } });

        expect(buildPetTodo(openItems({ nextAppointment }), ctx([])).items).withContext('aktif hastada randevu başlıktadır').toEqual([]);
        expect(buildPetTodo(openItems({ status: 'Deceased' }), ctx([])).items).withContext('açık randevu yok').toEqual([]);
        expect(buildPetTodo(openItems({ status: 'Deceased', nextAppointment: { state: 'Forbidden', data: null } }), ctx([])).items).toEqual([]);
    });

    it('istek sürerken yükleniyor; tümden başarısızsa bütün bölümler alınamadı sayılır', () => {
        expect(buildPetTodo({ state: 'loading' }, ctx([])).loading).toBeTrue();
        expect(buildPetTodo({ state: 'error' }, ctx([])).failed).toEqual(['Aşı', 'Lab', 'Ücret bekleyen işlem', 'Bakiye']);
        expect(buildPetTodo(null, ctx([]))).toEqual({ items: [], loading: false, failed: [], forbidden: true });
    });
});
