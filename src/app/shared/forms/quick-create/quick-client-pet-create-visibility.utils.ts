import type { AuthService } from '@/app/core/auth/auth.service';
import { CLIENTS_CREATE_CLAIM, PETS_CREATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import type { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';

/** Müşteri/hayvan select alanı kilitli değilken ve yetki varsa quick-create göster. */
export function canShowQuickClientCreateButton(
    auth: AuthService,
    ro: TenantReadOnlyContextService,
    contextLocked: boolean
): boolean {
    return !contextLocked && auth.hasOperationClaim(CLIENTS_CREATE_CLAIM) && !ro.mutationBlocked();
}

export function canShowQuickPetCreateButton(
    auth: AuthService,
    ro: TenantReadOnlyContextService,
    contextLocked: boolean
): boolean {
    return !contextLocked && auth.hasOperationClaim(PETS_CREATE_CLAIM) && !ro.mutationBlocked();
}
