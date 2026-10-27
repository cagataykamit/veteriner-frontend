import type { PetTimelineItemVm } from '@/app/entities/pet/models/pet-timeline-vm.model';
import { mapPetTimelinePageDtoToVm } from '@/app/entities/pet/data/pet-timeline.mapper';
import {
    mergePetTimelineItems,
    paymentToPetTimelineItem,
    petTimelineEventLink,
    petTimelineExaminationLink,
    petTimelineOmittedTypesLabel,
    petTimelineStatusLabel,
    petTimelineTypeIcon,
    petTimelineTypeLabel
} from './pet-timeline.utils';

describe('pet-timeline.utils görüntüleme', () => {
    it('Görüntüleme türü kendi adı, simgesi ve detay bağlantısıyla; "Active" yatış etiketiyle karışmaz', () => {
        const item: PetTimelineItemVm = {
            key: 'Imaging:i1',
            type: 'Imaging',
            sourceId: 'i1',
            eventAtUtc: '2026-10-22T07:30:00Z',
            clinicName: null,
            title: 'Röntgen',
            summary: 'Toraks LL',
            status: 'Active',
            isVoided: false,
            linkType: 'Imaging',
            linkId: 'i1',
            relatedExaminationId: 'e1',
            addedAfterFinalization: true
        };

        expect(petTimelineTypeLabel('Imaging')).toBe('Görüntüleme');
        expect(petTimelineTypeIcon('Imaging')).toBe('pi-image');
        expect(petTimelineEventLink(item)).toEqual(['/panel/imaging', 'i1']);
        expect(petTimelineStatusLabel(item)).toBeNull();
    });
});

const event = (id: string, eventAtUtc: string): PetTimelineItemVm => ({
    key: `Examination:${id}`,
    type: 'Examination',
    sourceId: id,
    eventAtUtc,
    clinicName: null,
    title: id,
    summary: null,
    status: null,
    isVoided: false,
    linkType: 'Examination',
    linkId: id,
    relatedExaminationId: null,
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
        expect(petTimelineStatusLabel(page.items[0])).toBeNull();
        expect(petTimelineStatusLabel(page.items[1])).toBeNull();
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

    it('durum etiketi Türkçe; bilinmeyen durum etiketsiz; bilinmeyen tür genel simge', () => {
        expect(petTimelineStatusLabel(base[0])).toBe('Devam ediyor');
        expect(petTimelineStatusLabel(base[3])).toBeNull();
        expect(petTimelineTypeIcon('Appointment')).toBe('pi-circle');
        expect(petTimelineTypeIcon('Vaccination')).toBe('pi-shield');
    });
});
