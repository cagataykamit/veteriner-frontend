import type { TodayItemVm } from '@/app/entities/visit/models/visit-vm.model';
import {
    correctionActionOptions,
    formatElapsedSince,
    formatTodayArrival,
    formatHospitalizationStay,
    groupTodayItems,
    isPossiblyForgottenVisit,
    todayItemActions,
    todayNeedsCompletionPrompt,
    todayReasonText,
    todaySecondaryActions,
    todayStatusOf,
    todayHasOpenWork,
    waitAlertLevel,
    todayOpenChips,
    waitAlertTitle
} from '@/app/entities/visit/utils/visit-status.utils';

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
    chargedAmount: null,
    allocatedAmount: null,
    outstandingAmount: null,
    clientOutstandingAmount: null,
    chargeIndicator: null,
    chargeableWorkCount: null,
    awaitingLabCount: null,
    pendingChargeCount: null,
    hasActiveHospitalization: false,
    isVoided: false,
    voidReason: null,
    petAlerts: { flags: [], note: null },
    isUrgent: false,
    appointmentReasonName: null,
    arrivalReason: null,
    preparedExaminationTemplateId: null,
    preparedExaminationTemplateName: null,
    ownerConfirmedAtUtc: null,
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

        expect(groups.map((g) => g.key)).toEqual(['clinic', 'planned', 'completed']);
        expect(groups[0].items.map((i) => i.key)).toEqual(['w1', 'w2']);
    });

    it('Klinikte: sırada ve muayenede tek grupta, saat (sunucu) sırası bozulmaz; başlıklar A tasarımındaki gibi', () => {
        const groups = groupTodayItems([item({ key: 'i1', careStatus: 'InProgress' }), item({ key: 'w', careStatus: 'Waiting' }), item({ key: 'i2', careStatus: 'InProgress' }), item({ key: 'p', visitId: null, careStatus: null })]);

        expect(groups.map((g) => [g.title, g.items.map((i) => i.key)])).toEqual([
            ['Klinikte', ['i1', 'w', 'i2']],
            ['Sıradaki randevular', ['p']]
        ]);
    });

    it('Visit siz tamamlanmış randevu Planlı değil Tamamlandı grubundadır', () => {
        const groups = groupTodayItems([
            item({ key: 'ac', visitId: null, careStatus: null, appointmentId: 'a1', appointmentStatus: 'Completed' }),
            item({ key: 'p', visitId: null, careStatus: null, appointmentId: 'a2', appointmentStatus: 'Scheduled' })
        ]);

        expect(groups.map((g) => [g.key, g.items.map((i) => i.key)])).toEqual([
            ['planned', ['p']],
            ['completed', ['ac']]
        ]);
    });

    it('liste boşsa grup yok', () => {
        expect(groupTodayItems([])).toEqual([]);
    });
});

describe('todayItemActions', () => {
    it('Scheduled randevu ve Visit yok: Geldi', () => {
        const a = todayItemActions(item({ visitId: null, careStatus: null, appointmentId: 'a1', appointmentStatus: 'Scheduled' }));

        expect(a.canMarkArrived).toBe(true);
        expect(a.canCorrect).toBe(false);
        expect(a.canOpenExamination).toBe(false);
    });

    it('muayeneyle tamamlanmış (Visit siz) randevuya Geldi yok', () => {
        const a = todayItemActions(item({ visitId: null, careStatus: null, appointmentId: 'a1', appointmentStatus: 'Completed' }));

        expect(a.canMarkArrived).toBe(false);
    });

    it('Sırada: yalnız Muayeneye al (ayrı Muayene aç yok); Muayenede: tamamla + muayene; Tamamlandı: yalnızca düzeltme', () => {
        const waiting = todayItemActions(item({ careStatus: 'Waiting' }));

        expect([waiting.canStartCare, waiting.canOpenExamination, waiting.canCompleteCare]).toEqual([true, false, false]);
        const inProgress = todayItemActions(item({ careStatus: 'InProgress' }));

        expect([inProgress.canStartCare, inProgress.canOpenExamination, inProgress.canCompleteCare]).toEqual([false, true, true]);
        const done = todayItemActions(item({ careStatus: 'Completed' }));

        expect([done.canStartCare, done.canOpenExamination, done.canCompleteCare, done.canCorrect]).toEqual([false, false, false, true]);
    });

    it('tamamlanmış ve hiç ücreti yoksa birincil adım Ücret ekle; ücret bekleyen kalem varsa ya da ücretsiz kapatıldıysa yok', () => {
        expect(todayItemActions(item({ careStatus: 'Completed', chargeIndicator: 'ChargeMissing', pendingChargeCount: 0 })).canAddMissingCharge).toBe(true);
        expect(todayItemActions(item({ careStatus: 'Completed', chargeIndicator: 'ChargeMissing', pendingChargeCount: 2 })).canAddMissingCharge).toBe(false);
        expect(todayItemActions(item({ careStatus: 'Completed', chargeIndicator: 'NoChargeableWork' })).canAddMissingCharge).toBe(false);
        expect(todayItemActions(item({ careStatus: 'InProgress', chargeIndicator: 'ChargeMissing' })).canAddMissingCharge).toBe(false);
    });
});

describe('todayNeedsCompletionPrompt', () => {
    it('muayenedeki gelişte ne işlem ne ücret varsa sorulur; işlem, ücret, bekleyen kalem ya da ücret izni yoksa sorulmaz', () => {
        expect(todayNeedsCompletionPrompt(item({ careStatus: 'InProgress', chargeIndicator: 'NoChargeableWork', pendingChargeCount: 0 }))).toBe(true);
        expect(todayNeedsCompletionPrompt(item({ careStatus: 'InProgress', chargeIndicator: 'ChargeMissing' }))).toBe(false);
        expect(todayNeedsCompletionPrompt(item({ careStatus: 'InProgress', chargeIndicator: 'PaymentPending' }))).toBe(false);
        expect(todayNeedsCompletionPrompt(item({ careStatus: 'InProgress', chargeIndicator: 'NoChargeableWork', pendingChargeCount: 1 }))).toBe(false);
        expect(todayNeedsCompletionPrompt(item({ careStatus: 'InProgress', chargeIndicator: null }))).toBe(false);
    });
});

describe('formatTodayArrival (H15)', () => {
    const now = new Date('2026-11-16T09:00:00Z');

    it('bugünkü gelişte yalnız saat, önceki günden açık kalanda tarih ve saat', () => {
        expect(formatTodayArrival('2026-11-16T06:30:00Z', now)).toBe('09:30');
        expect(formatTodayArrival('2026-11-10T18:40:00Z', now)).toBe('10.11.2026 21:40');
    });
});

describe('formatElapsedSince', () => {
    const now = new Date('2026-10-10T08:00:00Z');

    it('dakika ve saat biçimleri', () => {
        expect(formatElapsedSince('2026-10-10T07:59:40Z', now)).toBe('Az önce');
        expect(formatElapsedSince('2026-10-10T07:48:00Z', now)).toBe('12 dk');
        expect(formatElapsedSince('2026-10-10T06:55:00Z', now)).toBe('1 sa 5 dk');
        expect(formatElapsedSince('2026-10-10T06:00:00Z', now)).toBe('2 sa');
        // H15: bir günü geçen açık geliş saatle değil günle söylenir.
        expect(formatElapsedSince('2026-10-04T01:52:00Z', now)).toBe('6 gün');
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

describe('formatHospitalizationStay', () => {
    const now = new Date('2026-10-10T08:00:00Z');

    it('bir günden kısa süre saat/dakika, sonrası tam gün', () => {
        expect(formatHospitalizationStay('2026-10-10T06:00:00Z', now)).toBe('2 sa');
        expect(formatHospitalizationStay('2026-10-09T08:00:00Z', now)).toBe('1 gün');
        expect(formatHospitalizationStay('2026-10-07T07:00:00Z', now)).toBe('3 gün');
    });

    it('geçersiz/boş değer null', () => {
        expect(formatHospitalizationStay(null, now)).toBeNull();
        expect(formatHospitalizationStay('geçersiz', now)).toBeNull();
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
    const arrivedMinutesAgo = (m: number) => new Date(now.getTime() - m * 60000).toISOString();
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

        expect(a.canRestore).toBe(true);
        expect(a.canCorrect || a.canStartCare || a.canOpenExamination || a.canCompleteCare).toBe(false);
    });

    it('normal satırda geri alma yok', () => {
        expect(todayItemActions(item()).canRestore).toBe(false);
    });
});

describe('canToggleUrgency', () => {
    it('yalnızca açık kayıtta; tamamlanmış, yanlış işaretli ve planlı satırda yok', () => {
        expect(todayItemActions(item({ careStatus: 'Waiting' })).canToggleUrgency).toBe(true);
        expect(todayItemActions(item({ careStatus: 'InProgress' })).canToggleUrgency).toBe(true);
        expect(todayItemActions(item({ careStatus: 'Completed' })).canToggleUrgency).toBe(false);
        expect(todayItemActions(item({ isVoided: true })).canToggleUrgency).toBe(false);
        expect(todayItemActions(item({ visitId: null, careStatus: null })).canToggleUrgency).toBe(false);
    });
});

describe('geliş hazırlığı (CHECKIN-001/002)', () => {
    it('Hazırlığı düzenle yalnız açık Visit te ve Visits.Update ile; tamamlanmış, yanlış işaretli ve planlı satırda yok', () => {
        const perms = { canUpdateVisit: true, canNoShow: false, canCorrect: false, canCollectPayment: false, canCreateCharge: false, canCreateAppointment: false };
        const keys = (i: TodayItemVm, p = perms) => todaySecondaryActions(i, todayItemActions(i), p).map((a) => a.key);

        expect(keys(item({ careStatus: 'Waiting' }))).toEqual(['editPreparation', 'toggleUrgency']);
        expect(keys(item({ careStatus: 'InProgress' }))).toEqual(['editPreparation', 'toggleUrgency']);
        expect(keys(item({ careStatus: 'Completed' }))).toEqual([]);
        expect(keys(item({ isVoided: true }))).toEqual([]);
        expect(keys(item({ visitId: null, careStatus: null, appointmentId: 'a1', appointmentStatus: 'Scheduled' }))).toEqual([]);
        expect(keys(item(), { ...perms, canUpdateVisit: false })).toEqual([]);
    });

    it('satır nedeni: geliş nedeni, yoksa randevu nedeni; ikisi de yoksa null', () => {
        expect(todayReasonText(item({ arrivalReason: 'Kulak kaşıntısı', appointmentReasonName: 'Kontrol' }))).toBe('Kulak kaşıntısı');
        expect(todayReasonText(item({ appointmentReasonName: 'Kontrol' }))).toBe('Kontrol');
        expect(todayReasonText(item())).toBeNull();
    });
});

describe('Gelmedi (NoShow) satırı', () => {
    const now = new Date('2026-10-10T10:00:00Z');
    const planned = (over: Partial<TodayItemVm> = {}) => item({ visitId: null, key: 'a1', appointmentId: 'a1', careStatus: null, arrivedAtUtc: null, appointmentStatus: 'Scheduled', scheduledAtUtc: '2026-10-10T09:00:00Z', ...over });

    it('Visit siz NoShow randevu en sonda Gelmedi grubuna düşer', () => {
        const groups = groupTodayItems([planned({ key: 'ns', appointmentStatus: 'NoShow' }), item({ key: 'c', careStatus: 'Completed' }), planned({ key: 'p' })]);

        expect(groups.map((g) => g.key)).toEqual(['planned', 'completed', 'noShow']);
    });

    it('saati geçmiş planlı satırda Gelmedi işaretlenir; gelecek saatte işaretlenemez', () => {
        expect(todayItemActions(planned(), now).canMarkNoShow).toBe(true);
        expect(todayItemActions(planned({ scheduledAtUtc: '2026-10-10T11:00:00Z' }), now).canMarkNoShow).toBe(false);
    });

    it('Gelmedi satırında geri alma ve geç gelen için Geldi var; Visit li satırda gelmedi yok', () => {
        const ns = todayItemActions(planned({ appointmentStatus: 'NoShow' }), now);

        expect(ns.canRevertNoShow).toBe(true);
        expect(ns.canMarkArrived).toBe(true);
        expect(ns.canMarkNoShow).toBe(false);
        const withVisit = todayItemActions(item({ appointmentId: 'a1', appointmentStatus: 'Scheduled', scheduledAtUtc: '2026-10-10T09:00:00Z' }), now);

        expect(withVisit.canMarkNoShow || withVisit.canRevertNoShow).toBe(false);
    });
});

describe('satır eylem düzeni (görünür / menü)', () => {
    const all = { canUpdateVisit: true, canNoShow: true, canCorrect: true, canCollectPayment: false, canCreateCharge: false, canCreateAppointment: false };
    const now = new Date('2026-10-10T10:00:00Z');
    const secondary = (i: TodayItemVm, perms = all) => todaySecondaryActions(i, todayItemActions(i, now), perms).map((a) => a.key);
    const urgency = (i: TodayItemVm, perms = all) => todaySecondaryActions(i, todayItemActions(i, now), perms).find((a) => a.key === 'toggleUrgency')?.label ?? null;
    const planned = item({ visitId: null, careStatus: null, appointmentId: 'a1', appointmentStatus: 'Scheduled', scheduledAtUtc: '2026-10-10T09:00:00Z' });

    it('acil aç/kapat açık satırda menüdedir (hazırlıktan sonra); metin işarete göre değişir', () => {
        expect(urgency(item())).toBe('Acil olarak işaretle');
        expect(urgency(item({ isUrgent: true }))).toBe('Acil işaretini kaldır');
        expect(secondary(item())).toEqual(['editPreparation', 'toggleUrgency', 'correct']);
    });

    it('acil eylemi yetkisiz, tamamlanmış, yanlış işaretli ve planlı satırda yok', () => {
        expect(urgency(item(), { ...all, canUpdateVisit: false })).toBeNull();
        expect(urgency(item({ careStatus: 'Completed' }))).toBeNull();
        expect(urgency(item({ isVoided: true }))).toBeNull();
        expect(urgency(planned)).toBeNull();
    });

    it('menüde yalnızca seyrek eylemler; yetkisiz kullanıcıda menü boş', () => {
        expect(secondary(item({ careStatus: 'Completed' }))).toEqual(['correct']);
        expect(secondary(item(), { ...all, canCorrect: false })).toEqual(['editPreparation', 'toggleUrgency']);
        expect(secondary(item(), { ...all, canUpdateVisit: false, canCorrect: false })).toEqual([]);
    });

    it('yanlış işaretli satırda Geri al menüdedir; yetkisizde menü boş', () => {
        expect(secondary(item({ isVoided: true }))).toEqual(['restore']);
        expect(secondary(item({ isVoided: true }), { ...all, canCorrect: false })).toEqual([]);
    });

    it('Ödeme al: yetki varsa menünün başında; yanlış işaretli satırda ve yetkisizde yok', () => {
        const pay = { ...all, canCollectPayment: true };

        expect(secondary(item(), pay)).toEqual(['collectPayment', 'editPreparation', 'toggleUrgency', 'correct']);
        expect(secondary(item(), all)).toEqual(['editPreparation', 'toggleUrgency', 'correct']);
        expect(secondary(item({ isVoided: true }), pay)).toEqual(['restore']);
    });

    it("Ücret ekle: yetki varsa Ödeme al'dan önce; yanlış işaretli satırda ve yetkisizde yok", () => {
        const charge = { ...all, canCreateCharge: true };

        expect(secondary(item(), charge)).toEqual(['addCharge', 'editPreparation', 'toggleUrgency', 'correct']);
        expect(secondary(item(), { ...charge, canCollectPayment: true })).toEqual(['addCharge', 'collectPayment', 'editPreparation', 'toggleUrgency', 'correct']);
        expect(secondary(item(), all)).toEqual(['editPreparation', 'toggleUrgency', 'correct']);
        expect(secondary(item({ isVoided: true }), charge)).toEqual(['restore']);
    });

    it("Randevu al: gelişi olan satırda Ödeme al'dan sonra; planlı ve yanlış işaretli satırda yok (O9)", () => {
        const book = { ...all, canCreateAppointment: true, canCollectPayment: true };

        expect(secondary(item(), book)).toEqual(['collectPayment', 'bookAppointment', 'editPreparation', 'toggleUrgency', 'correct']);
        expect(secondary(planned, { ...all, canCreateAppointment: true })).toEqual(['markNoShow']);
        expect(secondary(item({ isVoided: true }), book)).toEqual(['restore']);
    });

    it('planlı ve gelmedi satırları', () => {
        expect(secondary(planned)).toEqual(['markNoShow']);
        expect(secondary({ ...planned, appointmentStatus: 'NoShow' })).toEqual(['revertNoShow']);
    });
});

describe('isPossiblyForgottenVisit', () => {
    const now = new Date('2026-10-11T12:00:00Z');
    const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600000).toISOString();

    it('açık geliş 12 saati aşınca (sınır dahil) true', () => {
        expect(isPossiblyForgottenVisit(item({ careStatus: 'Waiting', arrivedAtUtc: hoursAgo(12) }), now)).toBe(true);
        expect(isPossiblyForgottenVisit(item({ careStatus: 'InProgress', arrivedAtUtc: hoursAgo(23) }), now)).toBe(true);
    });

    it('12 saatten kısa süre false', () => {
        expect(isPossiblyForgottenVisit(item({ careStatus: 'Waiting', arrivedAtUtc: hoursAgo(11.9) }), now)).toBe(false);
    });

    it('tamamlanan, planlı ve gelişi olmayan satır false', () => {
        expect(isPossiblyForgottenVisit(item({ careStatus: 'Completed', arrivedAtUtc: hoursAgo(30) }), now)).toBe(false);
        expect(isPossiblyForgottenVisit(item({ careStatus: null, arrivedAtUtc: null }), now)).toBe(false);
    });
});

describe('todayOpenChips', () => {
    const chips = (over: Partial<TodayItemVm>) => todayOpenChips(item(over));

    it('null değerler (yetki yok veya planlı satır) çip üretmez', () => {
        expect(chips({ chargeIndicator: null, chargeableWorkCount: null, awaitingLabCount: null })).toEqual([]);
    });

    it('Paid ve NoChargeableWork çip üretmez; awaitingLabCount 0 çip üretmez', () => {
        expect(chips({ chargeIndicator: 'Paid', awaitingLabCount: 0 })).toEqual([]);
        expect(chips({ chargeIndicator: 'NoChargeableWork' })).toEqual([]);
    });

    it('Ücret yok: danger, işlem sayısı ipucunda', () => {
        const [c] = chips({ chargeIndicator: 'ChargeMissing', chargeableWorkCount: 3 });

        expect(c.label).toBe('Ücret yok');
        expect(c.severity).toBe('danger');
        expect(c.title).toContain('3 işlem');
        expect(c.payable).toBe(false);
    });

    it('Ödeme bekliyor ve Kısmi ödeme ödemeye geçilebilir', () => {
        expect(chips({ chargeIndicator: 'PaymentPending' }).map((c) => [c.label, c.payable])).toEqual([['Ödeme bekliyor', true]]);
        expect(chips({ chargeIndicator: 'PartiallyPaid' }).map((c) => [c.label, c.payable])).toEqual([['Kısmi ödeme', true]]);
    });

    it('bekleyen kalem varsa Ücret bekliyor çıkar, Ücret yok çıkmaz (kural tek yerde)', () => {
        const [c, ...rest] = chips({ chargeIndicator: 'ChargeMissing', chargeableWorkCount: 2, pendingChargeCount: 3 });

        expect(c.key).toBe('chargePending');
        expect(c.label).toBe('Ücret bekliyor (3)');
        expect(c.reviewable).toBe(true);
        expect(rest).toEqual([]);
    });

    it('bekleyen kalem 0 veya null ise Ücret yok eskisi gibi çıkar', () => {
        expect(chips({ chargeIndicator: 'ChargeMissing', pendingChargeCount: 0 }).map((c) => c.key)).toEqual(['chargeMissing']);
        expect(chips({ chargeIndicator: 'ChargeMissing', pendingChargeCount: null }).map((c) => c.key)).toEqual(['chargeMissing']);
        expect(chips({ pendingChargeCount: 0 })).toEqual([]);
    });

    it('Ücret bekliyor Lab bekliyor ve ödemeden önce gelir', () => {
        expect(chips({ chargeIndicator: 'PaymentPending', awaitingLabCount: 1, pendingChargeCount: 1 }).map((c) => c.key)).toEqual(['chargePending', 'awaitingLab', 'paymentPending']);
    });

    it('Lab bekliyor sayıyı gösterir', () => {
        expect(chips({ awaitingLabCount: 2 }).map((c) => c.label)).toEqual(['Lab bekliyor (2)']);
    });

    it('kritik olan önce: Ücret yok, Lab bekliyor, sonra ödeme', () => {
        expect(chips({ chargeIndicator: 'ChargeMissing', awaitingLabCount: 1 }).map((c) => c.key)).toEqual(['chargeMissing', 'awaitingLab']);
        expect(chips({ chargeIndicator: 'PaymentPending', awaitingLabCount: 1 }).map((c) => c.key)).toEqual(['awaitingLab', 'paymentPending']);
    });

    it('her çipin simgesi var (yalnız renkle ayrım yok)', () => {
        const all = chips({ chargeIndicator: 'ChargeMissing', awaitingLabCount: 1 }).concat(chips({ chargeIndicator: 'PaymentPending' }));

        expect(all.every((c) => c.icon.startsWith('pi '))).toBe(true);
    });
});

describe('todayStatusOf (birleşik durum)', () => {
    const now = new Date('2026-10-10T10:00:00Z');
    const planned = (scheduledAtUtc: string, over: Partial<TodayItemVm> = {}) => item({ visitId: null, careStatus: null, arrivedAtUtc: null, appointmentId: 'a1', appointmentStatus: 'Scheduled', scheduledAtUtc, ...over });

    it('bekleniyor: randevu saatine göre "sonra" / "gecikti" / "şimdi"', () => {
        expect(todayStatusOf(planned('2026-10-10T10:10:00Z'), now)).toEqual({ tone: 'planned', label: 'Bekleniyor', detail: '10 dk sonra' });
        expect(todayStatusOf(planned('2026-10-10T09:45:00Z'), now).detail).toBe('15 dk gecikti');
        // Bir saati aşınca yalnız yuvarlanmış tam saat (kesin zaman saat sütununda): 65 dk → 1 sa, 9 sa 21 dk → 9 sa, 100 dk gecikme → 2 sa
        expect(todayStatusOf(planned('2026-10-10T11:05:00Z'), now).detail).toBe('1 sa sonra');
        expect(todayStatusOf(planned('2026-10-10T19:21:00Z'), now).detail).toBe('9 sa sonra');
        expect(todayStatusOf(planned('2026-10-10T08:20:00Z'), now).detail).toBe('2 sa gecikti');
        expect(todayStatusOf(planned('2026-10-10T10:59:00Z'), now).detail).toBe('59 dk sonra');
        expect(todayStatusOf(planned('2026-10-10T10:00:30Z'), now).detail).toBe('şimdi');
        expect(todayStatusOf(planned('2026-10-10T10:00:00Z', { scheduledAtUtc: null }), now).detail).toBeNull();
    });

    it('sırada ve muayenede: gelişten bu yana süre', () => {
        const arrived = '2026-10-10T09:48:00Z';

        expect(todayStatusOf(item({ careStatus: 'Waiting', arrivedAtUtc: arrived }), now)).toEqual({ tone: 'waiting', label: 'Sırada', detail: '12 dk' });
        expect(todayStatusOf(item({ careStatus: 'InProgress', arrivedAtUtc: arrived }), now)).toEqual({ tone: 'inProgress', label: 'Muayenede', detail: '12 dk' });
    });

    it('tamamlanan (Visit li ya da Visit siz randevu) ve gelmedi süresiz; "Randevu tamamlandı" yazılmaz', () => {
        expect(todayStatusOf(item({ careStatus: 'Completed' }), now)).toEqual({ tone: 'completed', label: 'Tamamlandı', detail: null });
        expect(todayStatusOf(planned('2026-10-10T08:00:00Z', { appointmentStatus: 'Completed' }), now)).toEqual({ tone: 'completed', label: 'Tamamlandı', detail: null });
        expect(todayStatusOf(planned('2026-10-10T08:00:00Z', { appointmentStatus: 'NoShow' }), now)).toEqual({ tone: 'noShow', label: 'Gelmedi', detail: null });
    });

    it('yanlış işaretli açık gelişte süre yazılmaz', () => {
        expect(todayStatusOf(item({ careStatus: 'Waiting', isVoided: true }), now)).toEqual({ tone: 'waiting', label: 'Sırada', detail: null });
    });
});

describe('todayHasOpenWork ve Ödeme al (tamamlanan satır)', () => {
    it('kalan ya da açık iş çipi varsa iş kalmıştır; ödenmiş ve göstergesiz satırda yoktur', () => {
        expect(todayHasOpenWork(item({ careStatus: 'Completed', outstandingAmount: 850 }))).toBe(true);
        expect(todayHasOpenWork(item({ careStatus: 'Completed', chargeIndicator: 'ChargeMissing' }))).toBe(true);
        expect(todayHasOpenWork(item({ careStatus: 'Completed', awaitingLabCount: 1 }))).toBe(true);
        expect(todayHasOpenWork(item({ careStatus: 'Completed', chargeIndicator: 'Paid', outstandingAmount: 0 }))).toBe(false);
        expect(todayHasOpenWork(item({ careStatus: 'Completed' }))).toBe(false);
    });

    it('Ödeme al birincil adımı yalnız tamamlanmış ve kalanı olan, yanlış işaretli olmayan satırda', () => {
        expect(todayItemActions(item({ careStatus: 'Completed', outstandingAmount: 850 })).canCollectRemaining).toBe(true);
        expect(todayItemActions(item({ careStatus: 'Completed', outstandingAmount: 0 })).canCollectRemaining).toBe(false);
        expect(todayItemActions(item({ careStatus: 'InProgress', outstandingAmount: 850 })).canCollectRemaining).toBe(false);
        expect(todayItemActions(item({ careStatus: 'Completed', outstandingAmount: 850, isVoided: true })).canCollectRemaining).toBe(false);
    });
});
