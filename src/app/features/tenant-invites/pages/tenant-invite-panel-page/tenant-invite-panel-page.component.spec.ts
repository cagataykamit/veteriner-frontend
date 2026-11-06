import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
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

    it('paketin kullanıcı sınırı doluysa sınır ve üst paket söylenir, abonelik bağlantısı çıkar (WEB-007)', () => {
        const cmp = fixture.componentInstance;
        const limitError = new HttpErrorResponse({ status: 403, error: { code: 'Subscriptions.UserLimitExceeded', detail: 'Kiracı kullanıcı kotası dolu; yeni davet oluşturulamaz.' } });

        vi.spyOn(TestBed.inject(TenantInvitesService), 'createInvite').mockReturnValue(throwError(() => limitError));
        cmp.form.setValue({ email: 'ayse@example.com', clinicId: 'c1', operationClaimId: 'r1', expiresAtLocal: '' });
        cmp.onSubmit();
        fixture.detectChanges();

        const el = fixture.nativeElement as HTMLElement;
        const alert = el.querySelector('form [role="alert"]')?.textContent ?? '';

        expect(alert).toContain('kullanıcı sınırına ulaşıldı');
        expect(alert).toContain('üst pakete');
        expect(alert).not.toContain('Kiracı');
        expect(el.querySelector('[data-testid="invite-user-limit-link"]')?.getAttribute('href')).toBe('/panel/settings/subscription');
    });

    it('başka hatada abonelik bağlantısı çıkmaz', () => {
        const cmp = fixture.componentInstance;
        const duplicate = new HttpErrorResponse({ status: 409, error: { code: 'Invites.DuplicatePending' } });

        vi.spyOn(TestBed.inject(TenantInvitesService), 'createInvite').mockReturnValue(throwError(() => duplicate));
        cmp.form.setValue({ email: 'ayse@example.com', clinicId: 'c1', operationClaimId: 'r1', expiresAtLocal: '' });
        cmp.onSubmit();
        fixture.detectChanges();

        const el = fixture.nativeElement as HTMLElement;

        expect(el.querySelector('form [role="alert"]')?.textContent).toContain('bekleyen bir davet');
        expect(el.querySelector('[data-testid="invite-user-limit-link"]')).toBeNull();
    });
});
