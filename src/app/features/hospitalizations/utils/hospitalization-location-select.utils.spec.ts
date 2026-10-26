import { FormControl, FormGroup } from '@angular/forms';
import type { HospitalizationWardVm } from '@/app/features/hospitalization-wards/models/hospitalization-ward-vm.model';
import {
    HOSPITALIZATION_ROOM_REQUIRED_ERROR_KEY,
    hospitalizationRoomOptions,
    hospitalizationRoomWriteFields,
    hospitalizationWardIdForRoom,
    hospitalizationWardOptions,
    roomRequiredWhenWardSelectedValidator
} from '@/app/features/hospitalizations/utils/hospitalization-location-select.utils';

const wards: HospitalizationWardVm[] = [
    {
        id: 'w1',
        clinicId: 'c1',
        name: 'Yoğun bakım',
        sortOrder: 1,
        isActive: true,
        rooms: [
            { id: 'r1', wardId: 'w1', name: 'Kafes 1', sortOrder: 1, isActive: true },
            { id: 'r2', wardId: 'w1', name: 'Kafes 2', sortOrder: 2, isActive: false }
        ]
    },
    { id: 'w2', clinicId: 'c1', name: 'Eski servis', sortOrder: 2, isActive: false, rooms: [{ id: 'r3', wardId: 'w2', name: 'Kafes A', sortOrder: 1, isActive: true }] }
];

describe('hospitalization-location-select.utils', () => {
    it('bölüm seçenekleri "Konum yok" ile başlar ve yalnız aktif bölümleri içerir', () => {
        expect(hospitalizationWardOptions(wards).map((o) => o.value)).toEqual(['', 'w1']);
        expect(hospitalizationWardOptions(wards)[0].label).toBe('Konum yok');
    });

    it('mevcut yatışın odası pasif bölümdeyse bölüm "(pasif)" etiketiyle listelenir', () => {
        const options = hospitalizationWardOptions(wards, 'r3');

        expect(options.map((o) => o.value)).toEqual(['', 'w1', 'w2']);
        expect(options[2].label).toBe('Eski servis (pasif)');
    });

    it('oda seçenekleri yalnız aktif odalar; mevcut oda pasifse etiketle kalır; bölüm yoksa boş', () => {
        expect(hospitalizationRoomOptions(wards, 'w1').map((o) => o.value)).toEqual(['r1']);
        expect(hospitalizationRoomOptions(wards, 'w1', 'r2').map((o) => o.label)).toEqual(['Kafes 1', 'Kafes 2 (pasif)']);
        expect(hospitalizationRoomOptions(wards, 'yok')).toEqual([]);
    });

    it('odanın bölümü bulunur; tanımlarda olmayan oda için boş', () => {
        expect(hospitalizationWardIdForRoom(wards, 'r3')).toBe('w2');
        expect(hospitalizationWardIdForRoom(wards, 'r9')).toBe('');
        expect(hospitalizationWardIdForRoom(wards, '')).toBe('');
    });

    it('bölüm seçildiyse oda zorunlu; bölüm yoksa ya da oda seçildiyse geçerli', () => {
        const group = new FormGroup({ wardId: new FormControl(''), roomId: new FormControl('') }, roomRequiredWhenWardSelectedValidator());

        expect(group.valid).toBe(true);
        group.patchValue({ wardId: 'w1' });
        expect(group.hasError(HOSPITALIZATION_ROOM_REQUIRED_ERROR_KEY)).toBe(true);
        group.patchValue({ roomId: 'r1' });
        expect(group.valid).toBe(true);
    });

    it('PUT oda alanları: değişmedi → dokunma; yeni oda → roomId; "Konum yok" → clearRoom ve konum metni temizlenir', () => {
        expect(hospitalizationRoomWriteFields('r1', 'r1')).toEqual({ roomId: null, clearRoom: false, location: null });
        expect(hospitalizationRoomWriteFields('', '')).toEqual({ roomId: null, clearRoom: false, location: null });
        expect(hospitalizationRoomWriteFields('r2', 'r1')).toEqual({ roomId: 'r2', clearRoom: false, location: null });
        expect(hospitalizationRoomWriteFields('r2', '')).toEqual({ roomId: 'r2', clearRoom: false, location: null });
        expect(hospitalizationRoomWriteFields('', 'r1')).toEqual({ roomId: null, clearRoom: true, location: '' });
    });
});
