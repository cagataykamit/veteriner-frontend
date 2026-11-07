import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import type { PlanFeatureCode, TenantPlanFeatureVm } from '@/app/core/tenant/models/tenant-access-state-vm.model';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AppPlanUpgradeNoticeComponent } from './app-plan-upgrade-notice.component';

describe('AppPlanUpgradeNoticeComponent', () => {
    let claims: Set<string>;
    let locked: TenantPlanFeatureVm | null;

    function create(feature: PlanFeatureCode): HTMLElement {
        const fixture = TestBed.createComponent(AppPlanUpgradeNoticeComponent);

        fixture.componentRef.setInput('feature', feature);
        fixture.detectChanges();

        return fixture.nativeElement as HTMLElement;
    }

    beforeEach(() => {
        claims = new Set();
        locked = null;
        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c) } },
                { provide: TenantReadOnlyContextService, useValue: { lockedPlanFeature: () => locked } }
            ]
        });
    });

    it('gereken paketi ve üst paketleri yazar, abonelik sayfasına bağlar', () => {
        claims.add('Subscriptions.Read');
        locked = { feature: 'OwnerPortal', isEnabled: false, requiredPlanCode: 'Pro' };
        const el = create('OwnerPortal');
        const link = el.querySelector<HTMLAnchorElement>('[data-testid="plan-upgrade-link"]');

        expect(el.textContent).toContain('Hasta sahibi portalı Profesyonel ve Kurumsal paketlerinde var.');
        expect(link?.textContent).toContain('Üst pakete geç');
        expect(link?.getAttribute('href')).toBe('/panel/settings/subscription');
    });

    it('tek paketli özelliği tekil yazar', () => {
        locked = { feature: 'MultiClinic', isEnabled: false, requiredPlanCode: 'Premium' };

        expect(create('MultiClinic').textContent).toContain('Birden fazla klinik Kurumsal paketinde var.');
    });

    it('abonelik erişimi olmayan rolde bağlantı yerine yöneticiye yönlendirir', () => {
        locked = { feature: 'OwnerPortal', isEnabled: false, requiredPlanCode: 'Pro' };
        const el = create('OwnerPortal');

        expect(el.querySelector('[data-testid="plan-upgrade-link"]')).toBeNull();
        expect(el.textContent).toContain('kurum yöneticinize');
    });

    it('paket bilgisi henüz yoksa paket adı uydurmaz', () => {
        expect(create('OwnerPortal').textContent).toContain('Hasta sahibi portalı mevcut paketinizde yok.');
    });
});
