import {
    mapCorrectVisitToApiBody,
    mapCreateVisitToApiBody,
    mapTodayDtoToVm,
    mapVeterinarianDtoToVm,
    mapVisitCreateResultDtoToVm,
    todayQueryToHttpParams
} from '@/app/features/visits/data/visit.mapper';
import type { TodayItemDto, VisitDto } from '@/app/features/visits/models/visit-api.model';

const visitDto = (over: Partial<VisitDto> = {}): VisitDto => ({
    id: 'v1',
    clinicId: 'c1',
    petId: 'p1',
    appointmentId: null,
    responsibleVeterinarianUserId: null,
    responsibleVeterinarianName: null,
    arrivedAtUtc: '2026-10-10T07:00:00Z',
    careStatus: 'Waiting',
    isVoided: false,
    isUrgent: false,
    ...over
});

const itemDto = (over: Partial<TodayItemDto> = {}): TodayItemDto => ({
    visitId: 'v1',
    appointmentId: null,
    petId: 'p1',
    petName: 'Pamuk',
    speciesName: 'Kedi',
    clientId: 'cl1',
    clientName: 'Ali Veli',
    clientPhone: '5551112233',
    arrivedAtUtc: '2026-10-10T07:00:00Z',
    careStatus: 'Waiting',
    isCarriedOver: false,
    ...over
});

describe('visit mapper — okuma', () => {
    it('create yanıtında created bayrağını korur ve Visit i eşler', () => {
        const vm = mapVisitCreateResultDtoToVm({ created: false, visit: visitDto({ appointmentId: ' a1 ', responsibleVeterinarianName: 'Dr. Ayşe' }) });
        expect(vm.created).toBeFalse();
        expect(vm.visit.appointmentId).toBe('a1');
        expect(vm.visit.responsibleVeterinarianName).toBe('Dr. Ayşe');
        expect(vm.visit.careStatus).toBe('Waiting');
    });

    it('Bugün satırı: randevulu Visit için anahtar visitId; Visit siz planlı satır için appointmentId', () => {
        const vm = mapTodayDtoToVm({
            date: '2026-10-10',
            clinicId: 'c1',
            generatedAtUtc: '2026-10-10T08:00:00Z',
            items: [
                itemDto({ visitId: 'v1', appointmentId: 'a1' }),
                itemDto({ visitId: null, appointmentId: 'a2', careStatus: null, appointmentStatus: 'Scheduled', arrivedAtUtc: null })
            ]
        });
        expect(vm.items.map((i) => i.key)).toEqual(['v1', 'a2']);
        expect(vm.items[1].visitId).toBeNull();
        expect(vm.items[1].careStatus).toBeNull();
        expect(vm.items[1].appointmentStatus).toBe('Scheduled');
    });

    it('boş ad ve hekim alanlarını güvenli varsayılana çevirir', () => {
        const [item] = mapTodayDtoToVm({
            date: 'd',
            clinicId: 'c',
            generatedAtUtc: 'g',
            items: [itemDto({ petName: ' ', clientName: null, clientPhone: '', responsibleVeterinarianName: undefined })]
        }).items;
        expect(item.petName).toBe('—');
        expect(item.clientName).toBe('—');
        expect(item.clientPhone).toBeNull();
        expect(item.responsibleVeterinarianName).toBeNull();
    });

    it('yatış göstergesi ve tutar alanları eşlenir; tutar yoksa null (yetkisiz), 0 ile karışmaz', () => {
        const [full, missing, zero] = mapTodayDtoToVm({
            date: 'd',
            clinicId: 'c',
            generatedAtUtc: 'g',
            items: [
                itemDto({ hasActiveHospitalization: true, chargedAmount: 1000, allocatedAmount: 400, outstandingAmount: 600, clientOutstandingAmount: 900 }),
                itemDto({}),
                itemDto({ chargedAmount: 0, allocatedAmount: 0, outstandingAmount: 0, clientOutstandingAmount: 0 })
            ]
        }).items;
        expect(full.hasActiveHospitalization).toBeTrue();
        expect(full.careStatus).toBe('Waiting');
        expect([full.chargedAmount, full.allocatedAmount, full.outstandingAmount, full.clientOutstandingAmount]).toEqual([1000, 400, 600, 900]);
        expect(missing.hasActiveHospitalization).toBeFalse();
        expect([missing.chargedAmount, missing.allocatedAmount, missing.outstandingAmount, missing.clientOutstandingAmount]).toEqual([null, null, null, null]);
        expect([zero.chargedAmount, zero.clientOutstandingAmount]).toEqual([0, 0]);
    });

    it('hekim adı yoksa — gösterir', () => {
        expect(mapVeterinarianDtoToVm({ userId: 'u1', name: null })).toEqual({ userId: 'u1', name: '—' });
    });

    it('Bugün sorgusu klinik varsa clinicId gönderir, yoksa göndermez', () => {
        expect(todayQueryToHttpParams('c1').get('clinicId')).toBe('c1');
        expect(todayQueryToHttpParams(null).keys().length).toBe(0);
    });
});

describe('visit mapper — yazma gövdeleri', () => {
    it('randevulu geliş: yalnızca appointmentId; hekim seçilmediyse alan hiç gitmez', () => {
        expect(mapCreateVisitToApiBody({ appointmentId: 'a1', responsibleVeterinarianUserId: '' })).toEqual({ appointmentId: 'a1' });
        expect(mapCreateVisitToApiBody({ appointmentId: 'a1', responsibleVeterinarianUserId: null })).toEqual({ appointmentId: 'a1' });
    });

    it('randevusuz geliş: petId + clinicId + seçilen hekim', () => {
        expect(mapCreateVisitToApiBody({ petId: ' p1 ', clinicId: 'c1', responsibleVeterinarianUserId: 'u1' })).toEqual({
            petId: 'p1',
            clinicId: 'c1',
            responsibleVeterinarianUserId: 'u1'
        });
    });

    it('düzeltme: durum hedefi ve yanlış geliş birbirini dışlar; gerekçe kırpılır', () => {
        expect(mapCorrectVisitToApiBody({ action: 'Waiting', reason: '  Yanlış tıklandı  ' })).toEqual({
            reason: 'Yanlış tıklandı',
            targetCareStatus: 'Waiting',
            markAsMistaken: false
        });
        expect(mapCorrectVisitToApiBody({ action: 'Mistaken', reason: 'Başka hasta' })).toEqual({
            reason: 'Başka hasta',
            targetCareStatus: null,
            markAsMistaken: true
        });
    });
});

describe('visit mapper — petAlerts', () => {
    it('Bugün satırı hasta uyarılarını taşır; yoksa boş uyarı', () => {
        const [withAlerts, without] = mapTodayDtoToVm({
            date: 'd',
            clinicId: 'c',
            generatedAtUtc: 'g',
            items: [itemDto({ petAlerts: { flags: ['Aggressive'], note: 'Isırır' } }), itemDto({ visitId: 'v2' })]
        }).items;
        expect(withAlerts.petAlerts).toEqual({ flags: ['Aggressive'], note: 'Isırır' });
        expect(without.petAlerts).toEqual({ flags: [], note: null });
    });
});
