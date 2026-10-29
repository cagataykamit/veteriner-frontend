import { mapPetTimelinePageDtoToVm, petTimelineQueryToHttpParams } from '@/app/entities/pet/data/pet-timeline.mapper';

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
                { type: 'Prescription', sourceId: 'rx1', title: 'Antibiyotik', relatedTreatmentId: ' t1 ' },
                { type: 'Visit', title: 'Geliş' },
                { type: 'Vaccination', sourceId: 'v1', title: 'Kuduz', status: 'Cancelled', isVoided: true, linkRef: { type: 'Vaccination', id: 'v1' } }
            ],
            nextCursor: ' abc ',
            omittedTypes: ['LabResult']
        });

        expect(page.items.length).toBe(3);
        expect(page.items[0]).toEqual(expect.objectContaining({ key: 'Treatment:t1', linkType: 'Treatment', linkId: 't1', relatedExaminationId: 'e1' }));
        expect(page.items[0].relatedTreatmentId).toBeNull();
        expect(page.items[1].relatedTreatmentId).toBe('t1');
        expect(page.items[2].isVoided).toBe(true);
        expect(page.nextCursor).toBe('abc');
        expect(page.omittedTypes).toEqual(['LabResult']);
    });

    it('nextCursor boş/yoksa null (sayfa sonu); omittedTypes yoksa boş', () => {
        expect(mapPetTimelinePageDtoToVm({ items: [], nextCursor: '' })).toEqual({ items: [], nextCursor: null, omittedTypes: [] });
        expect(mapPetTimelinePageDtoToVm({})).toEqual({ items: [], nextCursor: null, omittedTypes: [] });
    });
});
