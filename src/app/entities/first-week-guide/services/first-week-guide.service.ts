import { inject, Injectable, signal } from '@angular/core';
import { AuthService } from '@/app/core/auth/auth.service';
import { resolveTenantIdFromJwt } from '@/app/core/auth/jwt-tenant.utils';

/** Rehber ilk görüldüğünden bu kadar gün kendiliğinden açılır; sonra yalnız kullanıcı menüsünden açılır. */
export const FIRST_WEEK_GUIDE_AUTO_DAYS = 14;

const STORAGE_PREFIX = 'vetinity.firstWeekGuide.v1';
const DAY_MS = 24 * 60 * 60 * 1000;

export interface FirstWeekGuideState {
    /** Hesap açılış tarihi panelde yoktur; rehberin bu tarayıcıda ilk görüldüğü an onun yerine geçer (ISO). */
    readonly firstSeenAt: string;
    readonly dismissed: boolean;
    /** Kullanıcı menüden yeniden açtı: 14 gün geçmiş olsa da kapatılana kadar görünür. */
    readonly reopened: boolean;
    readonly done: readonly string[];
}

export function isFirstWeekGuideVisible(state: FirstWeekGuideState, now: Date): boolean {
    if (state.dismissed) {
        return false;
    }

    const firstSeen = Date.parse(state.firstSeenAt);

    return state.reopened || !Number.isFinite(firstSeen) || now.getTime() - firstSeen < FIRST_WEEK_GUIDE_AUTO_DAYS * DAY_MS;
}

/**
 * İlk hafta rehberi (TIER-022) durumu: tarayıcıda (localStorage) kiracı + kullanıcı anahtarıyla saklanır; sunucu kaydı yoktur.
 * "Yapıldı" işaretleri hem `firstWeekGuideInterceptor`'ın gördüğü başarılı isteklerden hem elle işaretten gelir.
 * Anahtar her çağrıda geçerli oturumdan çözülür; depolama erişilemezse durum yalnız bu oturumda kalır.
 */
@Injectable({ providedIn: 'root' })
export class FirstWeekGuideService {
    private readonly auth = inject(AuthService);

    /** Kartın okuduğu durum; `load` ile doldurulur. */
    readonly state = signal<FirstWeekGuideState | null>(null);
    private loadedKey: string | null = null;

    /** Kayıt yoksa ilk görülme anı olarak `now` yazılır. */
    load(now = new Date()): void {
        const key = this.storageKey();

        this.loadedKey = key;
        this.state.set(key ? this.readOrCreate(key, now) : null);
    }

    markDone(keys: readonly string[]): void {
        this.update((s) => (keys.every((k) => s.done.includes(k)) ? s : { ...s, done: [...new Set([...s.done, ...keys])] }));
    }

    toggle(key: string): void {
        this.update((s) => ({ ...s, done: s.done.includes(key) ? s.done.filter((k) => k !== key) : [...s.done, key] }));
    }

    dismiss(): void {
        this.update((s) => ({ ...s, dismissed: true, reopened: false }));
    }

    reopen(): void {
        this.update((s) => ({ ...s, dismissed: false, reopened: true }));
    }

    private update(change: (state: FirstWeekGuideState) => FirstWeekGuideState): void {
        const key = this.storageKey();

        if (!key) {
            return;
        }

        const current = (key === this.loadedKey ? this.state() : null) ?? this.readOrCreate(key, new Date());
        const next = change(current);

        if (next === current) {
            return;
        }

        write(key, next);

        if (key === this.loadedKey) {
            this.state.set(next);
        }
    }

    private readOrCreate(key: string, now: Date): FirstWeekGuideState {
        const stored = read(key);

        if (stored) {
            return stored;
        }

        const created: FirstWeekGuideState = { firstSeenAt: now.toISOString(), dismissed: false, reopened: false, done: [] };

        write(key, created);

        return created;
    }

    private storageKey(): string | null {
        const userId = this.auth.getUserId();
        const tenantId = resolveTenantIdFromJwt(this.auth.getAccessToken());

        return userId && tenantId ? `${STORAGE_PREFIX}:${tenantId}:${userId}` : null;
    }
}

function read(key: string): FirstWeekGuideState | null {
    try {
        const parsed = JSON.parse(localStorage.getItem(key) ?? 'null') as Partial<FirstWeekGuideState> | null;

        if (!parsed || typeof parsed.firstSeenAt !== 'string') {
            return null;
        }

        return {
            firstSeenAt: parsed.firstSeenAt,
            dismissed: parsed.dismissed === true,
            reopened: parsed.reopened === true,
            done: Array.isArray(parsed.done) ? parsed.done.filter((k): k is string => typeof k === 'string') : []
        };
    } catch {
        return null;
    }
}

function write(key: string, state: FirstWeekGuideState): void {
    try {
        localStorage.setItem(key, JSON.stringify(state));
    } catch {
        // Yazılamazsa durum yalnız bu oturumda geçerli kalır.
    }
}
