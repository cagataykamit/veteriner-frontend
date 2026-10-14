import type { PetTimelineItemVm } from '@/app/features/pets/models/pet-timeline-vm.model';
import {
    mergePetTimelineItems,
    paymentToPetTimelineItem,
    petTimelineEventLink,
    petTimelineOmittedTypesLabel,
    petTimelineTypeIcon,
    petTimelineTypeLabel
} from './pet-timeline.utils';

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
