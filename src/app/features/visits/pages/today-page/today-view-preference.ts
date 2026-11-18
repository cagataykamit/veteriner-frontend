/** Bugün listesinin iki seçimi: liste türü (günlük / yanlış işaretlenenler) ve hasta kapsamı (benim / tümü). */
export type TodayView = 'today' | 'voided';
export type TodayScope = 'mine' | 'all';

/** Seçimler bu tarayıcıda saklanır; sayfadan çıkıp dönünce son seçim geri gelir (kullanıcı kararı 2026-11-19). */
const STORAGE_KEYS = { view: 'vetinity.today.view', scope: 'vetinity.today.scope' } as const;

const VIEWS: readonly TodayView[] = ['today', 'voided'];
const SCOPES: readonly TodayScope[] = ['mine', 'all'];

function read<T extends string>(key: string, allowed: readonly T[]): T | null {
    try {
        const stored = localStorage.getItem(key);

        return allowed.find((v) => v === stored) ?? null;
    } catch {
        return null;
    }
}

function write(key: string, value: string): void {
    try {
        localStorage.setItem(key, value);
    } catch {
        /* Depo kapalıysa seçim yalnız bu sayfada kalır. */
    }
}

/** Kayıtlı liste türü; yoksa günlük liste. */
export function readTodayView(): TodayView {
    return read(STORAGE_KEYS.view, VIEWS) ?? 'today';
}

export function writeTodayView(view: TodayView): void {
    write(STORAGE_KEYS.view, view);
}

/** Kayıtlı hasta kapsamı; yoksa `null` (hekimde varsayılan "Benim hastalarım" sayfada belirlenir). */
export function readTodayScope(): TodayScope | null {
    return read(STORAGE_KEYS.scope, SCOPES);
}

export function writeTodayScope(scope: TodayScope): void {
    write(STORAGE_KEYS.scope, scope);
}
