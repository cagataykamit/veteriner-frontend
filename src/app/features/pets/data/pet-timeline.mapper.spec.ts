import { mapPetTimelinePageDtoToVm, petTimelineQueryToHttpParams } from '@/app/features/pets/data/pet-timeline.mapper';
import { petTimelineEventLink, petTimelineExaminationLink, petTimelineStatusLabel, petTimelineTypeIcon } from '@/app/features/pets/utils/pet-timeline.utils';

describe('petTimelineQueryToHttpParams', () => {
    it('types tekrarlı parametre; includeVoided yalnız true iken; imleç aynen', () => {
        const params = petTimelineQueryToHttpParams({ types: ['Visit', 'Examination'], includeVoided: true, limit: 20, cursor: 'a+b/c==' });

        expect(params.getAll('types')).toEqual(['Visit', 'Examination']);
        expect(params.get('includeVoided')).toBe('true');
        expect(params.get('limit')).toBe('20');
        expect(params.get('cursor')).toBe('a+b/c==');
    });

    it('tarih aralığı İstanbul gün sınırıyla yarı açık fromUtc/toUtc olur (bitiş günü dahil)', () => {
        const params = petTimelineQueryToHttpParams({ fromDate: '2026-10-10', toDate: '2026-10-11' });

        expect(params.get('fromUtc')).toBe('2026-10-09T21:00:00.000Z');
        expect(params.get('toUtc')).toBe('2026-10-11T21:00:00.000Z');
    });

    it('varsayılan sorguda parametre eklenmez', () => {
        const params = petTimelineQueryToHttpParams({ types: [], includeVoided: false, cursor: null });

        expect(params.keys()).toEqual([]);
    });
});

describe('mapPetTimelinePageDtoToVm', () => {
    it('olayı eşler; linkRef yoksa türden/kaynak kimliğinden türetir; kimliksiz satırı atar', () => {
        const page = mapPetTimelinePageDtoToVm({
            items: [
                { type: 'Treatment', sourceId: 't1', eventAtUtc: '2026-10-10T10:00:00Z', title: 'Serum', relatedExaminationId: 'e1', isVoided: false },
                { type: 'Visit', title: 'Geliş' },
                { type: 'Vaccination', sourceId: 'v1', title: 'Kuduz', status: 'Cancelled', isVoided: true, linkRef: { type: 'Vaccination', id: 'v1' } }
            ],
            nextCursor: ' abc ',
            omittedTypes: ['LabResult']
        });

        expect(page.items.length).toBe(2);
        expect(page.items[0]).toEqual(jasmine.objectContaining({ key: 'Treatment:t1', linkType: 'Treatment', linkId: 't1', relatedExaminationId: 'e1' }));
        expect(page.items[1].isVoided).toBeTrue();
        expect(page.nextCursor).toBe('abc');
        expect(page.omittedTypes).toEqual(['LabResult']);
    });

    it('nextCursor boş/yoksa null (sayfa sonu); omittedTypes yoksa boş', () => {
        expect(mapPetTimelinePageDtoToVm({ items: [], nextCursor: '' })).toEqual({ items: [], nextCursor: null, omittedTypes: [] });
        expect(mapPetTimelinePageDtoToVm({})).toEqual({ items: [], nextCursor: null, omittedTypes: [] });
    });
});

describe('pet timeline yardımcıları', () => {
    const base = mapPetTimelinePageDtoToVm({
        items: [
            { type: 'Visit', sourceId: 'vi1', status: 'InProgress', title: 'Geliş' },
            { type: 'Examination', sourceId: 'e1', title: 'Kontrol' },
            { type: 'LabResult', sourceId: 'l1', title: 'Kan', relatedExaminationId: 'e1' },
            { type: 'Payment', sourceId: 'pay1', title: 'Ödeme', status: 'Garip' }
        ]
    }).items;

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

    it('durum etiketi Türkçe; bilinmeyen durum etiketsiz; bilinmeyen tür genel simge', () => {
        expect(petTimelineStatusLabel(base[0])).toBe('Devam ediyor');
        expect(petTimelineStatusLabel(base[3])).toBeNull();
        expect(petTimelineTypeIcon('Payment')).toBe('pi-circle');
        expect(petTimelineTypeIcon('Vaccination')).toBe('pi-shield');
    });
});
