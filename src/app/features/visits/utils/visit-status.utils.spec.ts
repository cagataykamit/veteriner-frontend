import type { TodayItemVm } from '@/app/features/visits/models/visit-vm.model';
import {
    correctionActionOptions,
    formatElapsedSince,
    groupTodayItems,
    todayItemActions
} from '@/app/features/visits/utils/visit-status.utils';

const item = (over: Partial<TodayItemVm> = {}): TodayItemVm => ({
    key: 'k',
    visitId: 'v1',
    appointmentId: null,
    petId: 'p1',
    petName: 'Pamuk',
    speciesName: 'Kedi',
    clientId: 'cl1',
    clientName: 'Ali',
    clientPhone: null,
    scheduledAtUtc: null,
    arrivedAtUtc: '2026-10-10T07:00:00Z',
    careStatus: 'Waiting',
    appointmentStatus: null,
    responsibleVeterinarianName: null,
    isCarriedOver: false,
    paymentIndicator: 'NoPaymentRecorded',
    hasActiveHospitalization: false,
    ...over
});

describe('groupTodayItems', () => {
    it('sözleşme sırasıyla gruplar; boş grup yok; grup içi sunucu sırası korunur', () => {
        const groups = groupTodayItems([
            item({ key: 'c', careStatus: 'Completed' }),
            item({ key: 'p', visitId: null, careStatus: null, appointmentId: 'a1', appointmentStatus: 'Scheduled' }),
            item({ key: 'w1', careStatus: 'Waiting' }),
            item({ key: 'w2', careStatus: 'Waiting' })
        ]);
        expect(groups.map((g) => g.key)).toEqual(['waiting', 'planned', 'completed']);
        expect(groups[0].items.map((i) => i.key)).toEqual(['w1', 'w2']);
    });

    it('liste boşsa grup yok', () => {
        expect(groupTodayItems([])).toEqual([]);
    });
});

describe('todayItemActions', () => {
    it('Scheduled randevu ve Visit yok: Geldi', () => {
        const a = todayItemActions(item({ visitId: null, careStatus: null, appointmentId: 'a1', appointmentStatus: 'Scheduled' }));
        expect(a.canMarkArrived).toBeTrue();
        expect(a.canCorrect).toBeFalse();
        expect(a.canOpenExamination).toBeFalse();
    });

    it('muayeneyle tamamlanmış (Visit siz) randevuya Geldi yok', () => {
        const a = todayItemActions(item({ visitId: null, careStatus: null, appointmentId: 'a1', appointmentStatus: 'Completed' }));
        expect(a.canMarkArrived).toBeFalse();
    });

    it('Bekliyor: başlat + muayene; Devam ediyor: tamamla + muayene; Tamamlandı: yalnızca düzeltme', () => {
        const waiting = todayItemActions(item({ careStatus: 'Waiting' }));
        expect([waiting.canStartCare, waiting.canOpenExamination, waiting.canCompleteCare]).toEqual([true, true, false]);
        const inProgress = todayItemActions(item({ careStatus: 'InProgress' }));
        expect([inProgress.canStartCare, inProgress.canOpenExamination, inProgress.canCompleteCare]).toEqual([false, true, true]);
        const done = todayItemActions(item({ careStatus: 'Completed' }));
        expect([done.canStartCare, done.canOpenExamination, done.canCompleteCare, done.canCorrect]).toEqual([false, false, false, true]);
    });
});

describe('formatElapsedSince', () => {
    const now = new Date('2026-10-10T08:00:00Z');

    it('dakika ve saat biçimleri', () => {
        expect(formatElapsedSince('2026-10-10T07:59:40Z', now)).toBe('Az önce');
        expect(formatElapsedSince('2026-10-10T07:48:00Z', now)).toBe('12 dk');
        expect(formatElapsedSince('2026-10-10T06:55:00Z', now)).toBe('1 sa 5 dk');
        expect(formatElapsedSince('2026-10-10T06:00:00Z', now)).toBe('2 sa');
    });

    it('Z siz UTC anını UTC kabul eder; geçersiz/boş değer null', () => {
        expect(formatElapsedSince('2026-10-10T07:48:00', now)).toBe('12 dk');
        expect(formatElapsedSince(null, now)).toBeNull();
        expect(formatElapsedSince('geçersiz', now)).toBeNull();
    });

    it('saat farkı negatifse (istemci saati geride) Az önce', () => {
        expect(formatElapsedSince('2026-10-10T08:05:00Z', now)).toBe('Az önce');
    });
});

describe('correctionActionOptions', () => {
    it('mevcut durum dışındaki iki durum + yanlış geliş', () => {
        const opts = correctionActionOptions('InProgress');
        expect(opts.map((o) => o.value)).toEqual(['Waiting', 'Completed', 'Mistaken']);
    });
});
