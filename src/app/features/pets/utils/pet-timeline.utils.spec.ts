import type { PetTimelineItemVm } from '@/app/entities/pet/models/pet-timeline-vm.model';
import { mapPetTimelinePageDtoToVm } from '@/app/entities/pet/data/pet-timeline.mapper';
import {
    mergePetTimelineItems,
    paymentToPetTimelineItem,
    petTimelineAppointmentLink,
    petTimelineEventLink,
    petTimelineExaminationLink,
    petTimelineOmittedTypesLabel,
    petTimelineStatus,
    petTimelineTreatmentLink,
    petTimelineTypeIcon,
    petTimelineTypeLabel,
    petTimelineIsDateOnly,
    PET_CARD_TIMELINE_FILTERS,
    groupPetTimelineByDay,
    petTimelineOtherClinicName,
    petTimelineRowTypeLabel,
    petTimelineTypeTone
} from './pet-timeline.utils';

describe('pet-timeline.utils görüntüleme', () => {
    it('Görüntüleme türü kendi adı, simgesi ve detay bağlantısıyla; "Active" yatış etiketiyle karışmaz', () => {
        const item: PetTimelineItemVm = {
            key: 'Imaging:i1',
            type: 'Imaging',
            sourceId: 'i1',
            eventAtUtc: '2026-10-22T07:30:00Z',
            clinicId: null,
            clinicName: null,
            title: 'Röntgen',
            summary: 'Toraks LL',
            status: 'Active',
            isVoided: false,
            linkType: 'Imaging',
            linkId: 'i1',
            relatedExaminationId: 'e1',
            relatedAppointmentId: null,
            relatedTreatmentId: null,
            addedAfterFinalization: true
        };

        expect(petTimelineTypeLabel('Imaging')).toBe('Görüntüleme');
        expect(petTimelineTypeIcon('Imaging')).toBe('pi-image');
        expect(petTimelineEventLink(item)).toEqual(['/panel/imaging', 'i1']);
        expect(petTimelineStatus(item)).toBeNull();
    });
});

const event = (id: string, eventAtUtc: string): PetTimelineItemVm => ({
    key: `Examination:${id}`,
    type: 'Examination',
    sourceId: id,
    eventAtUtc,
    clinicId: null,
    clinicName: null,
    title: id,
    summary: null,
    status: null,
    isVoided: false,
    linkType: 'Examination',
    linkId: id,
    relatedExaminationId: null,
    relatedAppointmentId: null,
    relatedTreatmentId: null,
    addedAfterFinalization: false
});

describe('pet-timeline.utils ödeme ve birleştirme', () => {
    it('ödeme satırı Ödeme türüyle, cüzdan simgesiyle ve ödeme detayı bağlantısıyla gösterilir', () => {
        const item = paymentToPetTimelineItem({ id: 'pay1', paidAtUtc: '2026-10-10T10:00:00Z', clinicName: 'Merkez' }, '₺500,00', 'Nakit');

        expect(item.key).toBe('Payment:pay1');
        expect(petTimelineTypeLabel(item.type)).toBe('Ödeme');
        expect(petTimelineTypeIcon(item.type)).toBe('pi-wallet');
        expect(petTimelineEventLink(item)).toEqual(['/panel/payments', 'pay1']);
        expect(item.summary).toBe('Nakit');
        expect(petTimelineOmittedTypesLabel(['LabResult', 'Payment'])).toBe('Laboratuvar, Ödeme');
    });

    it('iki liste tarihe göre yeniden eskiye karışır ve sınırda kesilir; Z\'siz tarih UTC sayılır', () => {
        const a = [event('e3', '2026-10-12T10:00:00Z'), event('e1', '2026-10-01T10:00:00Z')];
        const b = [event('p2', '2026-10-13T10:00:00'), event('p1', '2026-10-05T10:00:00Z')];

        expect(mergePetTimelineItems(a, b, 3).map((i) => i.sourceId)).toEqual(['p2', 'e3', 'p1']);
        expect(mergePetTimelineItems([], [], 10)).toEqual([]);
    });
});

describe('pet timeline yardımcıları', () => {
    const base = mapPetTimelinePageDtoToVm({
        items: [
            { type: 'Visit', sourceId: 'vi1', status: 'InProgress', title: 'Geliş' },
            { type: 'Examination', sourceId: 'e1', title: 'Kontrol' },
            { type: 'LabResult', sourceId: 'l1', title: 'Kan', relatedExaminationId: 'e1' },
            { type: 'Appointment', sourceId: 'ap1', title: 'Randevu', status: 'Garip' },
            { type: 'Visit', sourceId: 'vi2', title: 'Geliş', relatedExaminationId: 'e9' }
        ]
    }).items;

    it('Administration satırı: addedAfterFinalization eşlenir (yoksa false), durum etiketi yatışla karışmaz', () => {
        const page = mapPetTimelinePageDtoToVm({
            items: [
                { type: 'Administration', sourceId: 'a1', title: 'Serum', summary: '1.5 şişe', status: 'Active', addedAfterFinalization: true, relatedExaminationId: 'e1' },
                { type: 'Administration', sourceId: 'a2', title: 'Serum', status: 'Voided', isVoided: true }
            ]
        });

        expect(page.items[0]).toEqual(expect.objectContaining({ summary: '1.5 şişe', addedAfterFinalization: true, relatedExaminationId: 'e1' }));
        expect(page.items[1].addedAfterFinalization).toBe(false);
        expect(petTimelineStatus(page.items[0])).toBeNull();
        expect(petTimelineStatus(page.items[1])).toBeNull();
        expect(petTimelineEventLink(page.items[0])).toBeNull();
        expect(petTimelineExaminationLink(page.items[0])).toEqual(['/panel/examinations', 'e1']);
    });

    it('kaynak kaydına bağlantı: detay sayfası olan türlerde rota, Visit ve bilinmeyen türde null', () => {
        expect(petTimelineEventLink(base[1])).toEqual(['/panel/examinations', 'e1']);
        expect(petTimelineEventLink(base[2])).toEqual(['/panel/lab-results', 'l1']);
        expect(petTimelineEventLink(base[0])).toBeNull();
        expect(petTimelineEventLink(base[3])).toBeNull();
    });

    it('bağlı muayene bağlantısı yalnız muayene dışı satırlarda', () => {
        expect(petTimelineExaminationLink(base[2])).toEqual(['/panel/examinations', 'e1']);
        expect(petTimelineExaminationLink(base[1])).toBeNull();
    });

    it('geliş satırı: relatedExaminationId doluysa bağlı muayene rotası, null ise bağlantı yok', () => {
        expect(petTimelineExaminationLink(base[4])).toEqual(['/panel/examinations', 'e9']);
        expect(petTimelineExaminationLink(base[0])).toBeNull();
    });

    it('bağlı tedavi (reçete, uygulama) ve randevu (yalnız geliş) bağlantıları; kimlik yoksa bağlantı yok', () => {
        const rows = mapPetTimelinePageDtoToVm({
            items: [
                { type: 'Prescription', sourceId: 'rx1', title: 'Antibiyotik', relatedTreatmentId: 't1' },
                { type: 'Administration', sourceId: 'a1', title: 'Serum', relatedTreatmentId: 't2' },
                { type: 'Administration', sourceId: 'a2', title: 'Serum' },
                { type: 'Visit', sourceId: 'vi1', title: 'Geliş', relatedAppointmentId: 'ap1' },
                { type: 'Examination', sourceId: 'e1', title: 'Kontrol', relatedAppointmentId: 'ap2' }
            ]
        }).items;

        expect(petTimelineTreatmentLink(rows[0])).toEqual(['/panel/treatments', 't1']);
        expect(petTimelineTreatmentLink(rows[1])).toEqual(['/panel/treatments', 't2']);
        expect(petTimelineTreatmentLink(rows[2])).toBeNull();
        expect(petTimelineAppointmentLink(rows[3])).toEqual(['/panel/appointments', 'ap1']);
        expect(petTimelineAppointmentLink(rows[4])).toBeNull();
        expect(petTimelineAppointmentLink(base[0])).toBeNull();
    });

    it('durum etiketi Türkçe; bilinmeyen durum etiketsiz; bilinmeyen tür genel simge', () => {
        expect(petTimelineStatus(base[0])).toEqual({ label: 'Muayenede', tone: 'warn' });
        expect(petTimelineStatus(base[3])).toBeNull();
        expect(petTimelineTypeIcon('Appointment')).toBe('pi-circle');
        expect(petTimelineTypeIcon('Vaccination')).toBe('pi-shield');
    });

    it('eski program kaydı kendi etiketiyle, detay bağlantısız ve yalnız tarihli görünür; muayene filtresine girer (ADR-048)', () => {
        const item = mapPetTimelinePageDtoToVm({ items: [{ type: 'ImportedClinicalRecord', sourceId: 'r1', eventAtUtc: '2024-05-03T09:00:00Z', title: 'Kontrol' }] }).items[0];

        expect(petTimelineTypeLabel('ImportedClinicalRecord')).toBe('Eski program kaydı');
        expect(petTimelineEventLink(item)).toBeNull();
        expect(petTimelineIsDateOnly('ImportedClinicalRecord')).toBe(true);
        expect(petTimelineIsDateOnly('Examination')).toBe(false);
        expect(PET_CARD_TIMELINE_FILTERS.find((f) => f.value === 'examination')?.types).toContain('ImportedClinicalRecord');
    });
});

describe('pet-timeline.utils A düzeni (gün grubu, tür rengi, durum tonu, klinik adı)', () => {
    const at = (id: string, eventAtUtc: string | null, over: Partial<PetTimelineItemVm> = {}): PetTimelineItemVm => ({ ...event(id, eventAtUtc ?? ''), eventAtUtc, ...over });
    const now = new Date('2026-11-22T09:00:00Z');

    it('kayıtlar İstanbul gününe göre sıra korunarak gruplanır; başlık ay adıyla, ayrıntı gün adı ve göreli gün', () => {
        const groups = groupPetTimelineByDay(
            [
                at('e1', '2026-11-20T11:10:00Z'),
                at('e2', '2026-11-19T21:30:00Z'),
                at('e3', '2026-11-19T20:30:00Z'),
                at('e4', '2026-11-22T06:00:00Z'),
                at('e5', null)
            ],
            now
        );

        expect(groups.map((g) => [g.key, g.items.map((i) => i.sourceId)])).toEqual([
            ['2026-11-20', ['e1', 'e2']],
            ['2026-11-19', ['e3']],
            ['2026-11-22', ['e4']],
            ['', ['e5']]
        ]);
        expect(groups[0].title).toBe('20 Kasım 2026');
        expect(groups[0].detail).toBe('Cuma · 2 gün önce');
        expect(groups[2].detail).toBe('Pazar · bugün');
        expect(groups[3]).toEqual(expect.objectContaining({ title: 'Tarihsiz', detail: '' }));
    });

    it('göreli gün: dün, hafta, ay ve yıl', () => {
        const detail = (eventAtUtc: string) => groupPetTimelineByDay([at('x', eventAtUtc)], now)[0].detail;

        expect(detail('2026-11-21T09:00:00Z')).toBe('Cumartesi · dün');
        expect(detail('2026-11-01T09:00:00Z')).toBe('Pazar · 3 hafta önce');
        expect(detail('2026-08-29T09:00:00Z')).toBe('Cumartesi · 2 ay önce');
        expect(detail('2024-05-03T09:00:00Z')).toBe('Cuma · 2 yıl önce');
    });

    it('her türün kendi rengi var; tedavi, reçete ve uygulama aynı aile; aktarılan kayıt ve bilinmeyen tür nötr gri', () => {
        expect(petTimelineTypeTone('Vaccination').text).toContain('indigo');
        expect(petTimelineTypeTone('Prescription')).toBe(petTimelineTypeTone('Treatment'));
        expect(petTimelineTypeTone('Administration')).toBe(petTimelineTypeTone('Treatment'));
        expect(petTimelineTypeTone('Payment').tile).toContain('dark:');
        expect(petTimelineTypeTone('ImportedClinicalRecord')).toBe(petTimelineTypeTone('Appointment'));
        expect(petTimelineTypeTone('ImportedClinicalRecord').text).toContain('surface');
        expect(new Set(['Visit', 'Examination', 'Treatment', 'LabResult', 'Vaccination', 'Hospitalization', 'Imaging', 'Payment'].map((t) => petTimelineTypeTone(t).text)).size).toBe(8);
    });

    it('satır tür etiketi: eski program kaydı "Eski programdan"; diğerleri tür adı', () => {
        expect(petTimelineRowTypeLabel('ImportedClinicalRecord')).toBe('Eski programdan');
        expect(petTimelineRowTypeLabel('LabResult')).toBe('Laboratuvar');
    });

    it('durum tonu: olağan sonuç soluk, bekleyen/süren dikkat, iptal tehlike', () => {
        const tone = (type: string, status: string) => petTimelineStatus(at('s', '2026-11-20T10:00:00Z', { type, status }))?.tone;

        expect(tone('Vaccination', 'Applied')).toBe('quiet');
        expect(tone('Examination', 'Finalized')).toBe('quiet');
        expect(tone('Visit', 'Completed')).toBe('quiet');
        expect(tone('Hospitalization', 'Discharged')).toBe('quiet');
        expect(tone('LabResult', 'Resulted')).toBe('quiet');
        expect(tone('LabResult', 'Requested')).toBe('warn');
        expect(tone('Examination', 'Draft')).toBe('warn');
        expect(tone('Hospitalization', 'Active')).toBe('warn');
        expect(tone('Visit', 'Waiting')).toBe('warn');
        expect(tone('Vaccination', 'Cancelled')).toBe('danger');
    });

    it('klinik adı yalnız kayıt aktif klinikten başkasındaysa; kimliksiz ödeme adından karşılaştırılır; aktif klinik yoksa görünür', () => {
        const active = { id: 'C1', name: 'Merkez' };

        expect(petTimelineOtherClinicName(at('a', null, { clinicId: 'c1', clinicName: 'Merkez' }), active)).toBeNull();
        expect(petTimelineOtherClinicName(at('b', null, { clinicId: 'c2', clinicName: 'Şube' }), active)).toBe('Şube');
        expect(petTimelineOtherClinicName(at('c', null, { clinicId: null, clinicName: 'MERKEZ' }), active)).toBeNull();
        expect(petTimelineOtherClinicName(at('d', null, { clinicId: null, clinicName: 'Şube' }), active)).toBe('Şube');
        expect(petTimelineOtherClinicName(at('e', null, { clinicId: 'c2', clinicName: null }), active)).toBeNull();
        expect(petTimelineOtherClinicName(at('f', null, { clinicId: 'c1', clinicName: 'Merkez' }), { id: null, name: null })).toBe('Merkez');
    });
});
