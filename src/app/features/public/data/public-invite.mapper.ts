import type { PublicInviteDetailsDto } from '@/app/features/public/models/public-invite-api.model';
import type { PublicInviteVm } from '@/app/features/public/models/public-invite-vm.model';

const EM = '—';

function str(v: string | null | undefined, fallback = EM): string {
    return v?.trim() ? v.trim() : fallback;
}

function bool(v: boolean | null | undefined, defaultFalse = false): boolean {
    if (v === true) {
        return true;
    }
    if (v === false) {
        return false;
    }
    return defaultFalse;
}

function readString(dto: Record<string, unknown>, keys: string[]): string | null {
    for (const k of keys) {
        const v = dto[k];
        if (typeof v === 'string' && v.trim()) {
            return v.trim();
        }
    }
    return null;
}

function readBool(dto: Record<string, unknown>, keys: string[]): boolean | null {
    for (const k of keys) {
        if (!(k in dto)) {
            continue;
        }
        const v = dto[k];
        if (v === true || v === false) {
            return v;
        }
    }
    return null;
}

export function mapPublicInviteDetailsDtoToVm(raw: unknown, pathToken: string): PublicInviteVm | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return null;
    }
    const dto = raw as PublicInviteDetailsDto & Record<string, unknown>;

    const inviteToken =
        readString(dto as Record<string, unknown>, ['inviteToken', 'InviteToken']) ?? pathToken.trim();

    return {
        inviteToken,
        tenantName: str(readString(dto as Record<string, unknown>, ['tenantName', 'TenantName'])),
        clinicName: str(readString(dto as Record<string, unknown>, ['clinicName', 'ClinicName'])),
        email: str(readString(dto as Record<string, unknown>, ['email', 'Email'])),
        expiresAtUtc: readString(dto as Record<string, unknown>, ['expiresAtUtc', 'ExpiresAtUtc']),
        isExpired: bool(readBool(dto as Record<string, unknown>, ['isExpired', 'IsExpired']), false),
        canJoin: bool(readBool(dto as Record<string, unknown>, ['canJoin', 'CanJoin']), false),
        requiresLogin: bool(readBool(dto as Record<string, unknown>, ['requiresLogin', 'RequiresLogin']), false),
        requiresSignup: bool(readBool(dto as Record<string, unknown>, ['requiresSignup', 'RequiresSignup']), false)
    };
}
