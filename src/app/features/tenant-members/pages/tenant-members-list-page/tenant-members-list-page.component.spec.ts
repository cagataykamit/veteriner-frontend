import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { TENANT_MANAGEMENT_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { TenantMemberRemoveDialogComponent } from '@/app/features/tenant-members/components/tenant-member-remove-dialog.component';
import type { TenantMemberListItemVm } from '@/app/features/tenant-members/models/tenant-members-vm.model';
import { TenantMembersService } from '@/app/features/tenant-members/services/tenant-members.service';
import { isLastRowAction, rowDangerActions } from '@/app/shared/ui/row-action-button/row-action-button.testing';
import { TenantMembersListPageComponent } from './tenant-members-list-page.component';

const member = (id: string, email: string): TenantMemberListItemVm => ({ id, name: null, email, emailConfirmed: true, createdAtUtc: null });

/** ADR-026 madde 7: üye detayındaki "Üyeyi kurumdan çıkar" ile aynı yetki, koşul ve diyalog. */
describe('TenantMembersListPageComponent — satırda Kurumdan çıkar', () => {
    const create = (claims: string[], mutationBlocked = false) => {
        const items = [member('U-SELF', 'ben@klinik.test'), member('u2', 'ayse@klinik.test')];
        const service = {
            getMembers: vi
                .fn()
                .mockName('getMembers')
                .mockReturnValue(of({ items, page: 1, pageSize: 10, totalItems: items.length, totalPages: 1 })),
            removeMember: vi
                .fn()
                .mockName('removeMember')
                .mockReturnValue(of(void 0))
        };

        TestBed.configureTestingModule({
            imports: [TenantMembersListPageComponent],
            providers: [
                provideRouter([]),
                { provide: TenantMembersService, useValue: service },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.includes(c), getUserId: () => 'u-self' } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => mutationBlocked } }
            ]
        });
        const fixture = TestBed.createComponent(TenantMembersListPageComponent);

        fixture.detectChanges();

        return { fixture, service, el: fixture.nativeElement as HTMLElement };
    };

    it('yönetim yetkisiyle başka üyede son eylem olarak görünür; kendi satırında, yetkisizken ve salt okunurda yoktur', () => {
        const { el } = create([TENANT_MANAGEMENT_CLAIM]);
        const removes = rowDangerActions(el);

        expect(removes.length, 'yalnız ikinci üye × tablo + mobil kart').toBe(2);
        expect(removes.every((r) => r.querySelector('.fa-trash-can') && r.getAttribute('aria-label') === 'Kurumdan çıkar' && isLastRowAction(r))).toBe(true);

        TestBed.resetTestingModule();
        expect(rowDangerActions(create([]).el).length).toBe(0);

        TestBed.resetTestingModule();
        expect(rowDangerActions(create([TENANT_MANAGEMENT_CLAIM], true).el).length).toBe(0);
    });

    it('tıklamada detaydaki çıkarma diyaloğu açılır, onaylanmadan servis çağrılmaz; onayda üye çıkarılır ve liste yenilenir', () => {
        const { fixture, service, el } = create([TENANT_MANAGEMENT_CLAIM]);

        rowDangerActions(el)[0].click();
        fixture.detectChanges();

        const dialog = fixture.debugElement.query((d) => d.name === 'app-tenant-member-remove-dialog').componentInstance as TenantMemberRemoveDialogComponent;

        expect(dialog.visible()).toBe(true);
        expect(dialog.member()?.email).toBe('ayse@klinik.test');
        expect(service.removeMember).not.toHaveBeenCalled();

        service.getMembers.mockClear();
        dialog.confirm();

        expect(service.removeMember).toHaveBeenCalledTimes(1);

        expect(service.removeMember).toHaveBeenCalledWith('u2');
        expect(dialog.visible()).toBe(false);
        expect(service.getMembers).toHaveBeenCalledTimes(1);
    });
});
