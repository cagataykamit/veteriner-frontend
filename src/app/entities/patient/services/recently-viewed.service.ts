import { inject, Injectable } from '@angular/core';
import { AuthService } from '@/app/core/auth/auth.service';
import { resolveTenantIdFromJwt } from '@/app/core/auth/jwt-tenant.utils';
import { CLIENTS_READ_CLAIM, EXAMINATIONS_READ_CLAIM, PETS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';

export type RecentlyViewedKind = 'client' | 'pet' | 'examination';

export interface RecentlyViewedEntry {
    readonly kind: RecentlyViewedKind;
    readonly id: string;
    readonly title: string;
    /** Kısa ayırt edici bilgi (tür ve sahip, muayene nedeni ve tarih); boş olabilir. */
    readonly subtitle: string;
}

export const RECENTLY_VIEWED_LIMIT = 10;

const STORAGE_PREFIX = 'vetinity.recentlyViewed.v1';

interface KindDefinition {
    readonly label: string;
    readonly icon: string;
    readonly route: string;
    readonly claim: string;
}

const KINDS: Readonly<Record<RecentlyViewedKind, KindDefinition>> = {
    client: { label: 'Müşteri', icon: 'pi-user', route: '/panel/clients', claim: CLIENTS_READ_CLAIM },
    pet: { label: 'Hasta', icon: 'pi-heart', route: '/panel/pets', claim: PETS_READ_CLAIM },
    examination: { label: 'Muayene', icon: 'pi-file-edit', route: '/panel/examinations', claim: EXAMINATIONS_READ_CLAIM }
};

export function recentlyViewedRoute(entry: RecentlyViewedEntry): string[] {
    return [KINDS[entry.kind].route, entry.id];
}

export function recentlyViewedKindLabel(kind: RecentlyViewedKind): string {
    return KINDS[kind].label;
}

export function recentlyViewedKindIcon(kind: RecentlyViewedKind): string {
    return KINDS[kind].icon;
}

/** Alt satır parçaları ` · ` ile birleşir; boş ve mapper'ın boş işareti (`—`) atlanır. */
export function recentlyViewedSubtitle(...parts: (string | null | undefined)[]): string {
    return parts
        .map((p) => p?.trim() ?? '')
        .filter((p) => p !== '' && p !== '—')
        .join(' · ');
}

/**
 * Son görüntülenen kayıtlar (UX-006): detay sayfası açıldıkça kayıt en üste taşınır, en çok {@link RECENTLY_VIEWED_LIMIT} kayıt tutulur.
 * Tarayıcıda (localStorage) kiracı + kullanıcı anahtarıyla saklanır; anahtar her çağrıda geçerli oturumdan çözülür, bellekte
 * önbellek yoktur, böylece çıkıştan sonra aynı tarayıcıda giren başka kullanıcı bu listeyi görmez. Okuma izni artık olmayan
 * türler listelenmez. Depolama erişilemezse (gizli mod, kota) özellik sessizce boş kalır.
 */
@Injectable({ providedIn: 'root' })
export class RecentlyViewedService {
    private readonly auth = inject(AuthService);

    /** En yeni önce. */
    list(): RecentlyViewedEntry[] {
        const key = this.storageKey();

        return key ? readEntries(key).filter((e) => this.auth.hasOperationClaim(KINDS[e.kind].claim)) : [];
    }

    record(entry: RecentlyViewedEntry): void {
        const key = this.storageKey();
        const id = entry.id.trim();

        if (!key || !id) {
            return;
        }

        const next: RecentlyViewedEntry[] = [
            { kind: entry.kind, id, title: entry.title.trim() || '—', subtitle: entry.subtitle.trim() },
            ...readEntries(key).filter((e) => !(e.kind === entry.kind && e.id === id))
        ].slice(0, RECENTLY_VIEWED_LIMIT);

        try {
            localStorage.setItem(key, JSON.stringify(next));
        } catch {
            // Kolaylık özelliği: yazılamazsa liste eski hâlinde kalır.
        }
    }

    private storageKey(): string | null {
        const userId = this.auth.getUserId();
        const tenantId = resolveTenantIdFromJwt(this.auth.getAccessToken());

        return userId && tenantId ? `${STORAGE_PREFIX}:${tenantId}:${userId}` : null;
    }
}

function readEntries(key: string): RecentlyViewedEntry[] {
    try {
        const parsed = JSON.parse(localStorage.getItem(key) ?? '[]') as unknown;

        return Array.isArray(parsed) ? parsed.filter(isEntry).slice(0, RECENTLY_VIEWED_LIMIT) : [];
    } catch {
        return [];
    }
}

function isEntry(value: unknown): value is RecentlyViewedEntry {
    const e = value as Partial<RecentlyViewedEntry> | null;

    return (
        !!e &&
        typeof e.kind === 'string' &&
        Object.hasOwn(KINDS, e.kind) &&
        typeof e.id === 'string' &&
        e.id.trim() !== '' &&
        typeof e.title === 'string' &&
        typeof e.subtitle === 'string'
    );
}
