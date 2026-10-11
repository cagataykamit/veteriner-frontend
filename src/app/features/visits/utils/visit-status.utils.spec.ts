import type { TodayItemVm } from '@/app/features/visits/models/visit-vm.model';
import {
    correctionActionOptions,
    formatElapsedSince,
    groupTodayItems,
    isPossiblyForgottenVisit,
    todayItemActions,
    todaySecondaryActions,
    todayUrgencyToggle,
    waitAlertLevel,
    waitAlertTitle
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
    isVoided: false,
    voidReason: null,
    petAlerts: { flags: [], note: null },
    isUrgent: false,
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

    it('süre sütunu başlığı gruba göre: Bekleme / Süre; planlı ve tamamlananlarda yok', () => {
        const groups = groupTodayItems([
            item({ key: 'w', careStatus: 'Waiting' }),
            item({ key: 'i', careStatus: 'InProgress' }),
            item({ key: 'p', visitId: null, careStatus: null }),
            item({ key: 'c', careStatus: 'Completed' })
        ]);
        expect(groups.map((g) => g.elapsedLabel)).toEqual(['Bekleme', 'Süre', null, null]);
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

describe('waitAlertLevel', () => {
    const now = new Date('2026-10-10T08:00:00Z');
    const arrivedMinutesAgo = (m: number) => new Date(now.getTime() - m * 60_000).toISOString();
    const waiting = (m: number, over: Partial<TodayItemVm> = {}) => item({ arrivedAtUtc: arrivedMinutesAgo(m), ...over });

    it('eşik sınırları: 29 none, 30 warning, 59 warning, 60 critical', () => {
        expect(waitAlertLevel(waiting(29), now)).toBe('none');
        expect(waitAlertLevel(waiting(30), now)).toBe('warning');
        expect(waitAlertLevel(waiting(59), now)).toBe('warning');
        expect(waitAlertLevel(waiting(60), now)).toBe('critical');
        expect(waitAlertLevel(waiting(180), now)).toBe('critical');
    });

    it('Devam ediyor, Tamamlandı ve planlı satır uzun süre geçse de none', () => {
        expect(waitAlertLevel(waiting(90, { careStatus: 'InProgress' }), now)).toBe('none');
        expect(waitAlertLevel(waiting(90, { careStatus: 'Completed' }), now)).toBe('none');
        expect(waitAlertLevel(waiting(90, { careStatus: null }), now)).toBe('none');
    });

    it('geliş anı yok/geçersiz ise none', () => {
        expect(waitAlertLevel(item({ arrivedAtUtc: null }), now)).toBe('none');
        expect(waitAlertLevel(item({ arrivedAtUtc: 'geçersiz' }), now)).toBe('none');
    });
});

describe('waitAlertTitle', () => {
    it('uyarı seviyesine metin ipucu verir; none için null', () => {
        expect(waitAlertTitle('none')).toBeNull();
        expect(waitAlertTitle('warning')).toContain('30');
        expect(waitAlertTitle('critical')).toContain('60');
    });
});

describe('yanlış işaretlenen satır', () => {
    const voided = item({ isVoided: true, voidReason: 'Yanlış hasta' });

    it('voided grubuna düşer; yalnızca geri alma mümkündür', () => {
        expect(groupTodayItems([voided]).map((g) => g.key)).toEqual(['voided']);
        const a = todayItemActions(voided);
        expect(a.canRestore).toBeTrue();
        expect(a.canCorrect || a.canStartCare || a.canOpenExamination || a.canCompleteCare).toBeFalse();
    });

    it('normal satırda geri alma yok', () => {
        expect(todayItemActions(item()).canRestore).toBeFalse();
    });
});

describe('canToggleUrgency', () => {
    it('yalnızca açık kayıtta; tamamlanmış, yanlış işaretli ve planlı satırda yok', () => {
        expect(todayItemActions(item({ careStatus: 'Waiting' })).canToggleUrgency).toBeTrue();
        expect(todayItemActions(item({ careStatus: 'InProgress' })).canToggleUrgency).toBeTrue();
        expect(todayItemActions(item({ careStatus: 'Completed' })).canToggleUrgency).toBeFalse();
        expect(todayItemActions(item({ isVoided: true })).canToggleUrgency).toBeFalse();
        expect(todayItemActions(item({ visitId: null, careStatus: null })).canToggleUrgency).toBeFalse();
    });
});

describe('Gelmedi (NoShow) satırı', () => {
    const now = new Date('2026-10-10T10:00:00Z');
    const planned = (over: Partial<TodayItemVm> = {}) =>
        item({ visitId: null, key: 'a1', appointmentId: 'a1', careStatus: null, arrivedAtUtc: null, appointmentStatus: 'Scheduled', scheduledAtUtc: '2026-10-10T09:00:00Z', ...over });

    it('Visit siz NoShow randevu en sonda Gelmedi grubuna düşer', () => {
        const groups = groupTodayItems([planned({ key: 'ns', appointmentStatus: 'NoShow' }), item({ key: 'c', careStatus: 'Completed' }), planned({ key: 'p' })]);
        expect(groups.map((g) => g.key)).toEqual(['planned', 'completed', 'noShow']);
    });

    it('saati geçmiş planlı satırda Gelmedi işaretlenir; gelecek saatte işaretlenemez', () => {
        expect(todayItemActions(planned(), now).canMarkNoShow).toBeTrue();
        expect(todayItemActions(planned({ scheduledAtUtc: '2026-10-10T11:00:00Z' }), now).canMarkNoShow).toBeFalse();
    });

    it('Gelmedi satırında geri alma ve geç gelen için Geldi var; Visit li satırda gelmedi yok', () => {
        const ns = todayItemActions(planned({ appointmentStatus: 'NoShow' }), now);
        expect(ns.canRevertNoShow).toBeTrue();
        expect(ns.canMarkArrived).toBeTrue();
        expect(ns.canMarkNoShow).toBeFalse();
        const withVisit = todayItemActions(item({ appointmentId: 'a1', appointmentStatus: 'Scheduled', scheduledAtUtc: '2026-10-10T09:00:00Z' }), now);
        expect(withVisit.canMarkNoShow || withVisit.canRevertNoShow).toBeFalse();
    });
});

describe('satır eylem düzeni (görünür / menü)', () => {
    const all = { canUpdateVisit: true, canNoShow: true, canCorrect: true };
    const now = new Date('2026-10-10T10:00:00Z');
    const secondary = (i: TodayItemVm, perms = all) => todaySecondaryActions(i, todayItemActions(i, now), perms).map((a) => a.key);
    const urgency = (i: TodayItemVm, perms = all) => todayUrgencyToggle(i, todayItemActions(i, now), perms);
    const planned = item({ visitId: null, careStatus: null, appointmentId: 'a1', appointmentStatus: 'Scheduled', scheduledAtUtc: '2026-10-10T09:00:00Z' });

    it('acil açık satırda görünür ikon düğmesidir, menüde değildir', () => {
        expect(urgency(item())).toEqual({ label: 'Acil işaretle', pressed: false });
        expect(urgency(item({ isUrgent: true }))).toEqual({ label: 'Acili kaldır', pressed: true });
        expect(secondary(item())).toEqual(['correct']);
    });

    it('acil düğmesi yetkisiz, tamamlanmış, yanlış işaretli ve planlı satırda yok', () => {
        expect(urgency(item(), { ...all, canUpdateVisit: false })).toBeNull();
        expect(urgency(item({ careStatus: 'Completed' }))).toBeNull();
        expect(urgency(item({ isVoided: true }))).toBeNull();
        expect(urgency(planned)).toBeNull();
    });

    it('menüde yalnızca seyrek eylemler; yetkisiz kullanıcıda menü boş', () => {
        expect(secondary(item({ careStatus: 'Completed' }))).toEqual(['correct']);
        expect(secondary(item(), { canUpdateVisit: true, canNoShow: true, canCorrect: false })).toEqual([]);
    });

    it('yanlış işaretli satırda Geri al menüdedir; yetkisizde menü boş', () => {
        expect(secondary(item({ isVoided: true }))).toEqual(['restore']);
        expect(secondary(item({ isVoided: true }), { ...all, canCorrect: false })).toEqual([]);
    });

    it('planlı ve gelmedi satırları', () => {
        expect(secondary(planned)).toEqual(['markNoShow']);
        expect(secondary({ ...planned, appointmentStatus: 'NoShow' })).toEqual(['revertNoShow']);
    });
});

describe('isPossiblyForgottenVisit', () => {
    const now = new Date('2026-10-11T12:00:00Z');
    const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();

    it('açık geliş 12 saati aşınca (sınır dahil) true', () => {
        expect(isPossiblyForgottenVisit(item({ careStatus: 'Waiting', arrivedAtUtc: hoursAgo(12) }), now)).toBeTrue();
        expect(isPossiblyForgottenVisit(item({ careStatus: 'InProgress', arrivedAtUtc: hoursAgo(23) }), now)).toBeTrue();
    });

    it('12 saatten kısa süre false', () => {
        expect(isPossiblyForgottenVisit(item({ careStatus: 'Waiting', arrivedAtUtc: hoursAgo(11.9) }), now)).toBeFalse();
    });

    it('tamamlanan, planlı ve gelişi olmayan satır false', () => {
        expect(isPossiblyForgottenVisit(item({ careStatus: 'Completed', arrivedAtUtc: hoursAgo(30) }), now)).toBeFalse();
        expect(isPossiblyForgottenVisit(item({ careStatus: null, arrivedAtUtc: null }), now)).toBeFalse();
    });
});
