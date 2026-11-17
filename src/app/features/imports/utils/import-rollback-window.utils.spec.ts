import {
    rollbackWindowBeforeCommitText,
    rollbackWindowListText,
    rollbackWindowSentence,
    rollbackWindowState,
    timeWithDative
} from '@/app/features/imports/utils/import-rollback-window.utils';

// Son an: 2 Aralık 2026 15:57 İstanbul (UTC+3) = 12:57 UTC.
const deadlineUtc = '2026-12-02T12:57:00Z';
const open = { status: 'Committed' as const, canRollback: true, rollbackDeadlineUtc: deadlineUtc };
const at = (iso: string) => new Date(iso);

describe('geri alma süresi metinleri (sözleşme 9.1, İstanbul takvim günü)', () => {
    it('kalan günü İstanbul takvim gününe göre sayar', () => {
        // 20 Kasım 10:00 İstanbul → 2 Aralık: 12 gün.
        expect(rollbackWindowState(open, at('2026-11-20T07:00:00Z'))).toEqual({ kind: 'open', daysLeft: 12, deadlineUtc });
    });

    it('"1 gün daha" ile "bugün son gün" sınırı İstanbul gece yarısıdır, UTC değil', () => {
        // 1 Aralık 23:59 İstanbul (20:59 UTC): son gün yarın → 1 gün daha.
        expect(rollbackWindowState(open, at('2026-12-01T20:59:00Z'))).toEqual({ kind: 'open', daysLeft: 1, deadlineUtc });
        // 2 Aralık 00:00 İstanbul (1 Aralık 21:00 UTC; UTC'de hâlâ 1 Aralık): bugün son gün.
        expect(rollbackWindowState(open, at('2026-12-01T21:00:00Z'))).toEqual({ kind: 'lastDay', deadlineUtc });
        // Son andan bir dakika önce hâlâ son gün; son anda kesinleşir.
        expect(rollbackWindowState(open, at('2026-12-02T12:56:00Z'))?.kind).toBe('lastDay');
        expect(rollbackWindowState(open, at('2026-12-02T12:57:00Z'))?.kind).toBe('final');
    });

    it('sunucu kesinleşti dediyse kesinleşmiştir; son anı olmayan partide durum yoktur', () => {
        expect(rollbackWindowState({ ...open, canRollback: false }, at('2026-11-20T07:00:00Z'))?.kind).toBe('final');
        expect(rollbackWindowState({ status: 'RolledBack', canRollback: false, rollbackDeadlineUtc: null })).toBeNull();
    });

    it('liste ve sayfa metinleri kalan günü öne, kesin tarihi yanına koyar', () => {
        const state = rollbackWindowState(open, at('2026-11-20T07:00:00Z'))!;
        const lastDay = rollbackWindowState(open, at('2026-12-02T06:00:00Z'))!;

        expect(rollbackWindowListText(state)).toBe("12 gün daha geri alınabilir · 2 Aralık 15:57'ye kadar");
        expect(rollbackWindowListText(lastDay)).toBe("15:57'ye kadar geri alınabilir");
        expect(rollbackWindowSentence(state)).toBe("Bu aktarmayı 12 gün daha geri alabilirsiniz (2 Aralık 2026, 15:57'ye kadar). Bu tarihten sonra aktarma kesinleşir ve geri alınamaz.");
        expect(rollbackWindowSentence(lastDay)).toBe("Bu aktarmayı geri almak için bugün son gün (15:57'ye kadar). Bu saatten sonra aktarma kesinleşir ve geri alınamaz.");
        expect(rollbackWindowBeforeCommitText(15)).toBe('Aktarmadan sonra 15 gün içinde geri alabilirsiniz; bu sürenin sonunda aktarma kesinleşir.');
        expect(rollbackWindowBeforeCommitText(undefined)).toBeNull();
    });

    it('saate son okunan sayıya göre yönelme eki gelir', () => {
        expect(timeWithDative(15, 57)).toBe("15:57'ye");
        expect(timeWithDative(15, 0)).toBe("15:00'e");
        expect(timeWithDative(10, 30)).toBe("10:30'a");
        expect(timeWithDative(9, 50)).toBe("09:50'ye");
        expect(timeWithDative(20, 0)).toBe("20:00'ye");
        expect(timeWithDative(16, 6)).toBe("16:06'ya");
        expect(timeWithDative(0, 0)).toBe("00:00'a");
    });
});
