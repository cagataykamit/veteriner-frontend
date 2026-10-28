import type { ClientPortalAccessDto, ClientPortalInviteDto, ClientPortalLinkDto } from '@/app/entities/client/models/client-portal-access-api.model';
import { clientPortalClosedLabels, clientPortalLastInviteNote, clientPortalState } from '@/app/features/clients/utils/client-portal-access.utils';

const link = (status: ClientPortalLinkDto['status'], closedAtUtc: string | null = null, linkId = 'l1'): ClientPortalLinkDto => ({
    linkId,
    clinicId: 'k1',
    clinicName: 'Merkez',
    status,
    accountEmail: 'a@b.com',
    linkedAtUtc: '2026-10-01T10:00:00Z',
    closedAtUtc,
    closeReason: status === 'Closed' ? 'ClinicClosed' : null
});

const invite = (status: ClientPortalInviteDto['status'], inviteId = 'i1'): ClientPortalInviteDto => ({
    inviteId,
    clinicId: 'k1',
    email: 'a@b.com',
    status,
    createdAtUtc: '2026-10-10T10:00:00Z',
    expiresAtUtc: '2026-10-17T10:00:00Z',
    acceptedAtUtc: null,
    revokedAtUtc: null
});

const access = (links: ClientPortalLinkDto[], invites: ClientPortalInviteDto[]): ClientPortalAccessDto => ({ clientId: 'c1', canInvite: true, inviteBlockedCode: null, links, invites });

describe('clientPortalState', () => {
    it('aktif bağ her şeyden önce gelir', () => {
        expect(clientPortalState(access([link('Closed', '2026-09-01T00:00:00Z', 'l0'), link('Active')], [invite('Accepted')])).kind).toBe('linked');
    });

    it('aktif bağ yoksa bekleyen davet; kapalı bağ olsa da', () => {
        const s = clientPortalState(access([link('Closed', '2026-09-01T00:00:00Z')], [invite('Pending', 'i2'), invite('Expired')]));

        expect(s.kind).toBe('pending');
        expect(s.kind === 'pending' && s.invite.inviteId).toBe('i2');
    });

    it('yalnız kapalı bağlar varsa en son kapatılan', () => {
        const s = clientPortalState(access([link('Closed', '2026-09-01T00:00:00Z', 'eski'), link('Closed', '2026-10-01T00:00:00Z', 'yeni')], []));

        expect(s.kind === 'closed' && s.link.linkId).toBe('yeni');
    });

    it('hiçbiri yoksa davet yok; son davet notu süresi doldu / iptal', () => {
        const s = clientPortalState(access([], [invite('Expired')]));

        expect(s.kind).toBe('none');
        expect(s.kind === 'none' && clientPortalLastInviteNote(s.lastInvite)).toContain('süresi doldu');
        expect(clientPortalLastInviteNote(invite('Revoked'))).toBe('Son davet iptal edildi.');
        expect(clientPortalLastInviteNote(null)).toBeNull();
    });
});

describe('clientPortalClosedLabels', () => {
    it('personel kapatması ve hasta sahibinin hesap silmesi ayrı yazılır', () => {
        expect(clientPortalClosedLabels(link('Closed', '2026-10-01T00:00:00Z')).title).toBe('Portal erişimi kapalı');
        expect(clientPortalClosedLabels({ ...link('Closed', '2026-10-01T00:00:00Z'), closeReason: 'OwnerAccountDeleted' })).toEqual({
            title: 'Hasta sahibi portal hesabını sildi',
            dateLabel: 'silinme'
        });
    });
});
