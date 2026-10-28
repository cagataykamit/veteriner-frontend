import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { TenantInvitesService } from '@/app/entities/tenant-invite/services/tenant-invites.service';
import { TenantInvitePanelPageComponent } from './tenant-invite-panel-page.component';

const created = { inviteId: 'inv-1', token: 'tok-1', email: 'ayse@example.com', tenantId: 't1', clinicId: 'c1', expiresAtUtc: '2026-11-04T04:25:00Z' };

describe('TenantInvitePanelPageComponent (oluşturulan davet kartı)', () => {
    let fixture: ComponentFixture<TenantInvitePanelPageComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TenantInvitePanelPageComponent],
            providers: [
                provideRouter([]),
                { provide: AuthService, useValue: { getMyClinics: () => of([{ id: 'c1', name: 'Merkez Klinik' }]), hasOperationClaim: () => true } },
                { provide: TenantInvitesService, useValue: { listOperationClaims: () => of([{ id: 'r1', name: 'Sekreter' }]), createInvite: () => of(created) } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: signal(false) } }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(TenantInvitePanelPageComponent);
        fixture.detectChanges();
    });

    it('ham kimlik yerine klinik adını ve davet ayrıntısı bağlantısını gösterir', () => {
        const cmp = fixture.componentInstance;

        cmp.form.setValue({ email: 'ayse@example.com', clinicId: 'c1', operationClaimId: 'r1', expiresAtLocal: '' });
        cmp.onSubmit();
        fixture.detectChanges();

        const el = fixture.nativeElement as HTMLElement;

        expect(el.textContent).toContain('Merkez Klinik');
        expect(el.textContent).not.toContain('Davet ID');
        expect(el.textContent).not.toContain('c1');
        expect(el.querySelector('a[href="/panel/settings/invites/inv-1"]')).not.toBeNull();
    });

    it('geliştirici notu gösterilmez', () => {
        expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('backend');
    });
});
