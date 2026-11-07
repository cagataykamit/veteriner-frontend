import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { mapTenantAccessStateDtoToVm } from '@/app/core/tenant/data/tenant-access-state.mapper';
import type { TenantAccessStateVm } from '@/app/core/tenant/models/tenant-access-state-vm.model';
import { TenantAccessService } from '@/app/core/tenant/tenant-access.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { SubscriptionSummaryVm } from '@/app/entities/subscription/models/subscription-vm.model';

const stateFor = (planCode: string, portal: boolean): TenantAccessStateVm =>
    mapTenantAccessStateDtoToVm({
        tenantId: 't1',
        isReadOnly: false,
        planCode,
        planFeatures: [
            { feature: 'OwnerPortal', isEnabled: portal, requiredPlanCode: 'Pro' },
            { feature: 'MultiClinic', isEnabled: false, requiredPlanCode: 'Premium' }
        ]
    });

const jwtWithTenant = (): string => `x.${btoa(JSON.stringify({ tenant_id: 't1' }))}.y`;

describe('TenantReadOnlyContextService paket özellikleri (TIER-001)', () => {
    let getState: ReturnType<typeof vi.fn>;
    let service: TenantReadOnlyContextService;

    beforeEach(() => {
        getState = vi.fn().mockReturnValue(of(stateFor('Basic', false)));
        TestBed.configureTestingModule({
            providers: [
                { provide: TenantAccessService, useValue: { getTenantAccessState: getState } },
                {
                    provide: AuthService,
                    useValue: { isAuthenticated: () => true, hasSelectedClinic: () => true, getAccessToken: jwtWithTenant, getClinicId: () => 'k1', hasOperationClaim: () => false }
                }
            ]
        });
        service = TestBed.inject(TenantReadOnlyContextService);
    });

    it('durum yüklenmeden kilit gösterilmez', () => {
        expect(service.lockedPlanFeature('OwnerPortal')).toBeNull();
    });

    it('kapalı özelliğin gereken paketini verir, açık özellikte null döner', () => {
        getState.mockReturnValue(of(stateFor('Pro', true)));
        service.loadForPanel();

        expect(service.lockedPlanFeature('OwnerPortal')).toBeNull();
        expect(service.lockedPlanFeature('MultiClinic')?.requiredPlanCode).toBe('Premium');
    });

    it('özette paket değiştiyse özellikleri yeniden okur, aynıysa okumaz', () => {
        service.loadForPanel();
        expect(service.lockedPlanFeature('OwnerPortal')).not.toBeNull();
        expect(getState).toHaveBeenCalledTimes(1);

        service.applySummary({ planCode: 'basic', canManageSubscription: true } as SubscriptionSummaryVm);
        expect(getState).toHaveBeenCalledTimes(1);

        getState.mockReturnValue(of(stateFor('Pro', true)));
        service.applySummary({ planCode: 'Pro', canManageSubscription: true } as SubscriptionSummaryVm);

        expect(getState).toHaveBeenCalledTimes(2);
        expect(service.lockedPlanFeature('OwnerPortal')).toBeNull();
    });

    it('eski yanıtta özellik alanı yoksa kilit yok sayılır', () => {
        expect(mapTenantAccessStateDtoToVm({ tenantId: 't1', isReadOnly: false }).planFeatures).toEqual([]);
    });
});
