import { mapHospitalizationLocationFormToApiBody, mapHospitalizationWardsDtoToVm } from '@/app/entities/hospitalization-ward/data/hospitalization-ward.mapper';

describe('hospitalization-ward.mapper', () => {
    it('GET listesi: sunucu sırası korunur, odalar bölüm kimliğiyle bağlanır, eksik alanlar güvenli değer alır', () => {
        const vm = mapHospitalizationWardsDtoToVm([
            {
                id: 'w1',
                clinicId: 'c1',
                name: ' Yoğun bakım ',
                sortOrder: 2,
                isActive: true,
                rooms: [
                    { id: 'r1', name: 'Kafes 1', sortOrder: 1, isActive: true },
                    { id: 'r2', wardId: 'w1', name: 'Kafes 2', sortOrder: null, isActive: false },
                    { id: '', name: 'kimliksiz' }
                ]
            },
            { id: 'w2', name: 'Kedi servisi', sortOrder: 1, isActive: false, rooms: null },
            { id: '  ', name: 'kimliksiz bölüm' }
        ]);

        expect(vm.map((w) => w.id)).toEqual(['w1', 'w2']);
        expect(vm[0].name).toBe('Yoğun bakım');
        expect(vm[0].rooms.map((r) => [r.id, r.wardId, r.sortOrder, r.isActive])).toEqual([
            ['r1', 'w1', 1, true],
            ['r2', 'w1', 0, false]
        ]);
        expect(vm[1].isActive).toBe(false);
        expect(vm[1].rooms).toEqual([]);
    });

    it('boş veya dizi olmayan yanıt boş liste olur', () => {
        expect(mapHospitalizationWardsDtoToVm(null)).toEqual([]);
        expect(mapHospitalizationWardsDtoToVm(undefined)).toEqual([]);
    });

    it('yazma gövdesi adı kırpar, boş sırayı 0 yapar, boş adda hata atar', () => {
        expect(mapHospitalizationLocationFormToApiBody({ name: ' Kafes 3 ', sortOrder: null })).toEqual({ name: 'Kafes 3', sortOrder: 0 });
        expect(mapHospitalizationLocationFormToApiBody({ name: 'A', sortOrder: 5 })).toEqual({ name: 'A', sortOrder: 5 });
        expect(() => mapHospitalizationLocationFormToApiBody({ name: '   ', sortOrder: 1 })).toThrowError('HOSPITALIZATION_LOCATION_NAME_REQUIRED');
    });
});
