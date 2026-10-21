import { mapCreatePetToApiBody, mapPetDetailDtoToEditVm, mapPetDetailDtoToVm, mapPetUpsertFormToCreateRequest } from '@/app/features/pets/data/pet.mapper';
import type { PetUpsertFormValue } from '@/app/features/pets/forms/pet-upsert-form.model';

const form = (over: Partial<PetUpsertFormValue> = {}): PetUpsertFormValue => ({
    clientId: 'c1',
    name: 'Pamuk',
    speciesId: 's1',
    breedId: '',
    gender: '',
    birthDate: '',
    colorId: '',
    weightStr: '',
    microchipNumber: '',
    passportOrTagNumber: '',
    specialProtocolNumber: '',
    hbsAnimalId: '',
    isNeutered: false,
    notes: '',
    alertFlags: [],
    alertNote: '',
    ...over
});

describe('pet uyarıları — mapper', () => {
    it('detay: petAlerts VM e eşlenir; yoksa boş uyarı', () => {
        expect(mapPetDetailDtoToVm({ id: 'p1', petAlerts: { flags: ['Allergy'], note: 'Penisilin' } }).petAlerts).toEqual({ flags: ['Allergy'], note: 'Penisilin' });
        expect(mapPetDetailDtoToVm({ id: 'p1' }).petAlerts).toEqual({ flags: [], note: null });
    });

    it('düzenleme VM: yanıtta petAlerts yoksa null (dokunma), varsa değerler', () => {
        expect(mapPetDetailDtoToEditVm({ id: 'p1' }).petAlerts).toBeNull();
        expect(mapPetDetailDtoToEditVm({ id: 'p1', petAlerts: { flags: [], note: null } }).petAlerts).toEqual({ flags: [], note: null });
    });

    it('düzenleme yüklenen uyarıyı aynen geri gönderir (kazara silme yok)', () => {
        const edit = mapPetDetailDtoToEditVm({ id: 'p1', petAlerts: { flags: ['Aggressive', 'Allergy'], note: 'Isırır' } });
        const body = mapCreatePetToApiBody(
            mapPetUpsertFormToCreateRequest(form({ alertFlags: edit.petAlerts!.flags, alertNote: edit.petAlerts!.note ?? '' }), [])
        );

        expect(body.alertFlags).toEqual(['Allergy', 'Aggressive']);
        expect(body.alertNote).toBe('Isırır');
    });

    it('tüm bayrakları kaldırınca [] ve boş not gider (temizle); bayraksız not gönderilmez', () => {
        const body = mapCreatePetToApiBody(mapPetUpsertFormToCreateRequest(form({ alertFlags: [], alertNote: 'artık not' }), []));

        expect(body.alertFlags).toEqual([]);
        expect(body.alertNote).toBe('');
    });

    it('uyarı alanları bilinmiyorsa (undefined) gövdeye hiç girmez', () => {
        const req = { ...mapPetUpsertFormToCreateRequest(form(), []), alertFlags: undefined, alertNote: undefined };
        const body = mapCreatePetToApiBody(req);

        expect('alertFlags' in body).toBeFalse();
        expect('alertNote' in body).toBeFalse();
    });
});

describe('pet HBS kimlik no — mapper (ADR-036)', () => {
    it('form değeri kırpılarak gönderilir; boş değer temizler, alan bilinmiyorsa gövdeye girmez', () => {
        expect(mapCreatePetToApiBody(mapPetUpsertFormToCreateRequest(form({ hbsAnimalId: ' TR-1 ' }), [])).hbsAnimalId).toBe('TR-1');
        expect(mapCreatePetToApiBody(mapPetUpsertFormToCreateRequest(form(), [])).hbsAnimalId).toBe('');

        const req = { ...mapPetUpsertFormToCreateRequest(form(), []), hbsAnimalId: undefined };

        expect('hbsAnimalId' in mapCreatePetToApiBody(req)).toBeFalse();
    });

    it('detay ve düzenleme VM eşlenir', () => {
        expect(mapPetDetailDtoToVm({ id: 'p1', hbsAnimalId: 'TR-1' }).hbsAnimalId).toBe('TR-1');
        expect(mapPetDetailDtoToEditVm({ id: 'p1', hbsAnimalId: null }).hbsAnimalId).toBe('');
    });
});
