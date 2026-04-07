/** Tarayıcıda tam davet join URL’i (`/join/:token`). */
export function buildPublicJoinInviteUrl(token: string): string {
    const t = token?.trim() ?? '';
    if (!t) {
        return '';
    }
    const path = `/join/${encodeURIComponent(t)}`;
    if (typeof window === 'undefined' || !window.location?.origin) {
        return path;
    }
    return `${window.location.origin}${path}`;
}
