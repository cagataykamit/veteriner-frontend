import type { ClientPortalAccessDto, ClientPortalInviteDto, ClientPortalLinkDto } from '@/app/entities/client/models/client-portal-access-api.model';

/**
 * Müşteri kartındaki portal durumu (ADR-031 K3): önce aktif bağ, sonra bekleyen davet, sonra kapatılmış bağ; hiçbiri yoksa davet yok.
 * Müşteride en fazla bir aktif bağ olur (sunucu kuralı); liste sırası sunucudan (davetler en yeni önce).
 * `lastInvite`: davet yok durumunda son davetin sonucu (süresi doldu / iptal edildi) bilgi olarak gösterilir.
 */
export type ClientPortalState =
    | { readonly kind: 'linked'; readonly link: ClientPortalLinkDto }
    | { readonly kind: 'pending'; readonly invite: ClientPortalInviteDto }
    | { readonly kind: 'closed'; readonly link: ClientPortalLinkDto }
    | { readonly kind: 'none'; readonly lastInvite: ClientPortalInviteDto | null };

export function clientPortalState(access: ClientPortalAccessDto): ClientPortalState {
    const active = access.links.find((l) => l.status === 'Active');

    if (active) {
        return { kind: 'linked', link: active };
    }

    const pending = access.invites.find((i) => i.status === 'Pending');

    if (pending) {
        return { kind: 'pending', invite: pending };
    }

    const closed = latestClosedLink(access.links);

    if (closed) {
        return { kind: 'closed', link: closed };
    }

    return { kind: 'none', lastInvite: access.invites[0] ?? null };
}

function latestClosedLink(links: ClientPortalLinkDto[]): ClientPortalLinkDto | null {
    return links
        .filter((l) => l.status === 'Closed')
        .reduce<ClientPortalLinkDto | null>((latest, l) => (!latest || (l.closedAtUtc ?? '') > (latest.closedAtUtc ?? '') ? l : latest), null);
}

/** Davet yok durumundaki son davet notu; bekleyen/kabul edilmiş davet için not yok. */
export function clientPortalLastInviteNote(invite: ClientPortalInviteDto | null): string | null {
    switch (invite?.status) {
        case 'Expired':
            return 'Son davetin süresi doldu; müşteri bağlanmadı.';
        case 'Revoked':
            return 'Son davet iptal edildi.';
        default:
            return null;
    }
}
