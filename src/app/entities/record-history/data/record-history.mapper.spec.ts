import { mapRecordChangeDtoToVm, recordFieldLabel, recordValueText } from '@/app/entities/record-history/data/record-history.mapper';

describe('record-history.mapper', () => {
    it('alan adını etikete çevirir, bilinmeyeni olduğu gibi bırakır', () => {
        expect(recordFieldLabel('Findings')).toBe('Bulgular');
        expect(recordFieldLabel('items')).toBe('Reçete kalemleri');
        expect(recordFieldLabel('YeniAlan')).toBe('YeniAlan');
    });

    it('değerleri okunur metne çevirir', () => {
        expect(recordValueText(null)).toBe('—');
        expect(recordValueText('')).toBe('—');
        expect(recordValueText('Finalized')).toBe('Kesinleşti');
        expect(recordValueText('true')).toBe('Evet');
        expect(recordValueText('4.25')).toBe('4,25');
        expect(recordValueText('120')).toBe('120');
        expect(recordValueText('0f8fad5b-d9cb-469f-a165-70867728950e')).toBe('Bağlı kayıt');
        // İstanbul duvar saati (UTC+3)
        expect(recordValueText('2026-10-30T09:15:00.000Z')).toBe('30.10.2026 12:15');
        expect(recordValueText('2026-11-05')).toBe('05.11.2026');
        expect(recordValueText('Amoksisilin · × 14\nParasetamol')).toBe('Amoksisilin · × 14\nParasetamol');
    });

    it('satırı eşler; iki farklı bağlantı "başka kayda bağlandı" olarak görünür', () => {
        const vm = mapRecordChangeDtoToVm({
            id: 'c1',
            kind: 'Updated',
            occurredAtUtc: '2026-10-30T09:15:00Z',
            actorUserId: 'u1',
            actorName: null,
            changes: [
                { field: 'Title', oldValue: 'Pansuman', newValue: 'Pansuman ve temizlik' },
                { field: 'ExaminationId', oldValue: '0f8fad5b-d9cb-469f-a165-70867728950e', newValue: '7c9e6679-7425-40de-944b-e07fc1f90ae7' }
            ]
        });

        expect(vm.kindLabel).toBe('Değiştirildi');
        expect(vm.actorName).toBe('Bilinmeyen kullanıcı');
        expect(vm.changes).toEqual([
            { label: 'Başlık', oldText: 'Pansuman', newText: 'Pansuman ve temizlik' },
            { label: 'Bağlı muayene', oldText: 'Bağlı kayıt', newText: 'Başka bir kayda bağlandı' }
        ]);
    });

    it('uygulama yolunu Türkçe etiketle gösterir; bilinmeyen değer olduğu gibi kalır', () => {
        const vm = mapRecordChangeDtoToVm({
            id: 'c2',
            kind: 'Updated',
            occurredAtUtc: '2026-10-30T09:15:00Z',
            actorUserId: 'u1',
            actorName: 'Dr. Test',
            changes: [{ field: 'Route', oldValue: null, newValue: 'Intramuscular' }, { field: 'Route', oldValue: 'Bilinmeyen', newValue: null }]
        });

        expect(vm.changes[0]).toEqual({ label: 'Uygulama yolu', oldText: '—', newText: expect.stringContaining('(IM)') });
        expect(vm.changes[1]).toEqual({ label: 'Uygulama yolu', oldText: 'Bilinmeyen', newText: '—' });
    });
});
