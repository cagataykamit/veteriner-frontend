import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { type Confirmation, ConfirmationService, MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import type { ClientPortalAccessDto, ClientPortalInviteDto, ClientPortalLinkDto } from '@/app/features/clients/models/client-portal-access-api.model';
import type { ClientDetailVm } from '@/app/features/clients/models/client-vm.model';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { ClientPortalAccessPanelComponent } from './client-portal-access-panel.component';

const client: ClientDetailVm = {
    id: 'c1',
    fullName: 'Ali Veli',
    phone: '05321234567',
    email: 'ali@ornek.com',
    address: '—',
    createdAtUtc: '2026-01-01T00:00:00Z',
    updatedAtUtc: null,
    preferredContactChannel: 'None',
    remindersOptedOut: false,
    kvkkConsent: { status: 'None', recordedOn: null, recordedByName: null, templateVersion: null, templateHash: null },
    invoicing: null,
    rowVersion: 'rv1'
};

const activeLink: ClientPortalLinkDto = {
    linkId: 'l1',
    clinicId: 'k1',
    clinicName: 'Merkez',
    status: 'Active',
    accountEmail: 'ali@ornek.com',
    linkedAtUtc: '2026-10-01T10:00:00Z',
    closedAtUtc: null
};

const pendingInvite: ClientPortalInviteDto = {
    inviteId: 'i1',
    clinicId: 'k1',
    email: 'ali@ornek.com',
    status: 'Pending',
    createdAtUtc: '2026-10-10T10:00:00Z',
    expiresAtUtc: '2026-10-17T10:00:00Z',
    acceptedAtUtc: null,
    revokedAtUtc: null
};

const none: ClientPortalAccessDto = { clientId: 'c1', canInvite: true, inviteBlockedCode: null, links: [], invites: [] };

describe('ClientPortalAccessPanelComponent (müşteri kartı portal erişimi)', () => {
    let fixture: ComponentFixture<ClientPortalAccessPanelComponent>;
    let access: ClientPortalAccessDto;
    let readOnly: ReturnType<typeof signal<boolean>>;
    let service: jasmine.SpyObj<ClientsService>;
    let messages: MessageService;

    const el = () => fixture.nativeElement as HTMLElement;
    const q = (id: string) => el().querySelector<HTMLButtonElement>(`[data-testid="${id}"]`);
    const status = () => q('client-portal-status')?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    const confirmation = () => fixture.debugElement.injector.get(ConfirmationService);

    const create = () => {
        TestBed.configureTestingModule({
            imports: [ClientPortalAccessPanelComponent],
            providers: [
                provideRouter([]),
                MessageService,
                { provide: ClientsService, useValue: service },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: readOnly } }
            ]
        });
        messages = TestBed.inject(MessageService);
        spyOn(messages, 'add');
        fixture = TestBed.createComponent(ClientPortalAccessPanelComponent);
        fixture.componentRef.setInput('client', client);
        fixture.detectChanges();
    };

    beforeEach(() => {
        access = none;
        readOnly = signal(false);
        service = jasmine.createSpyObj<ClientsService>('ClientsService', ['getPortalAccess', 'sendPortalInvite', 'revokePortalInvite', 'closePortalLink']);
        service.getPortalAccess.and.callFake(() => of(access));
        service.sendPortalInvite.and.returnValue(of(pendingInvite));
        service.revokePortalInvite.and.returnValue(of(undefined));
        service.closePortalLink.and.returnValue(of(undefined));
    });

    it('davet yok: durum ve "Portal daveti gönder" etkin; iptal/kapat yok', () => {
        create();

        expect(service.getPortalAccess).toHaveBeenCalledOnceWith('c1');
        expect(status()).toContain('Davet gönderilmedi');
        expect(q('client-portal-invite')?.disabled).toBeFalse();
        expect(q('client-portal-invite')?.textContent).toContain('Portal daveti gönder');
        expect(q('client-portal-revoke')).toBeNull();
        expect(q('client-portal-close')).toBeNull();
        expect(q('client-portal-invite-blocked')).toBeNull();
    });

    it('davet bekliyor: e-posta, gönderim ve son geçerlilik; "Daveti iptal et" ve "Yeni davet gönder"', () => {
        access = { ...none, invites: [pendingInvite] };
        create();

        expect(status()).toContain('Davet bekliyor');
        expect(status()).toContain('ali@ornek.com');
        expect(status()).toContain('gönderim: 10.10.2026');
        expect(status()).toContain('son geçerlilik: 17.10.2026');
        expect(q('client-portal-revoke')).not.toBeNull();
        expect(q('client-portal-invite')?.textContent).toContain('Yeni davet gönder');
    });

    it('bağ aktif: bağlanma tarihi; davet düğmesi yok, "Erişimi kapat" var', () => {
        access = { ...none, canInvite: false, inviteBlockedCode: 'OwnerPortal.AlreadyLinked', links: [activeLink] };
        create();

        expect(status()).toContain('Portal erişimi açık');
        expect(status()).toContain('bağlanma: 01.10.2026');
        expect(q('client-portal-invite')).toBeNull();
        expect(q('client-portal-close')).not.toBeNull();
        expect(q('client-portal-invite-blocked')).toBeNull();
    });

    it('bağ kapalı: kapatılma tarihi ve yeniden davet', () => {
        access = { ...none, links: [{ ...activeLink, status: 'Closed', closedAtUtc: '2026-10-12T10:00:00Z' }] };
        create();

        expect(status()).toContain('Portal erişimi kapalı');
        expect(status()).toContain('kapatılma: 12.10.2026');
        expect(q('client-portal-invite')?.disabled).toBeFalse();
    });

    it('e-posta yoksa davet pasif ve nedeni yazılı', () => {
        access = { ...none, canInvite: false, inviteBlockedCode: 'OwnerPortal.ClientEmailMissing' };
        create();

        expect(q('client-portal-invite')?.disabled).toBeTrue();
        expect(q('client-portal-invite-blocked')?.textContent).toContain('müşteri kaydında e-posta yok');
    });

    it('KVKK Ret / hatırlatma istemiyor: davet pasif, neden yazılı', () => {
        access = { ...none, canInvite: false, inviteBlockedCode: 'OwnerPortal.ClientOptedOut' };
        create();

        expect(q('client-portal-invite')?.disabled).toBeTrue();
        expect(q('client-portal-invite-blocked')?.textContent).toContain('KVKK açık rızayı reddetmiş ya da hatırlatma istemiyor');
    });

    it('salt okunur kiracı: davet pasif (salt okunur); iptal sunucuda da açık olduğundan etkin kalır', () => {
        readOnly.set(true);
        access = { ...none, invites: [pendingInvite] };
        create();

        expect(q('client-portal-invite')?.disabled).toBeTrue();
        expect(q('client-portal-invite')?.textContent).toContain('(salt okunur)');
        expect(q('client-portal-revoke')?.disabled).toBeFalse();
    });

    it('davet gönder: servis çağrılır, başarı toast\'ı ve durum yeniden okunur', () => {
        create();
        access = { ...none, invites: [pendingInvite] };
        q('client-portal-invite')!.click();
        fixture.detectChanges();

        expect(service.sendPortalInvite).toHaveBeenCalledOnceWith('c1');
        expect(messages.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success', summary: 'Portal daveti gönderildi.' }));
        expect(service.getPortalAccess).toHaveBeenCalledTimes(2);
        expect(status()).toContain('Davet bekliyor');
    });

    it('davet 409: hata toast\'ında sunucu mesajı', () => {
        service.sendPortalInvite.and.returnValue(throwError(() => new Error('Portal daveti bu müşteriye gönderilemez: müşteri KVKK açık rızayı reddetmiş ya da hatırlatma istemiyor.')));
        create();
        q('client-portal-invite')!.click();

        expect(messages.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error', detail: jasmine.stringContaining('gönderilemez') }));
    });

    it('daveti iptal et: onay penceresi; kabulde servis çağrılır, vazgeçte çağrılmaz', () => {
        access = { ...none, invites: [pendingInvite] };
        create();
        let captured: Confirmation | undefined;

        spyOn(confirmation(), 'confirm').and.callFake((c: Confirmation) => {
            captured = c;

            return confirmation();
        });
        q('client-portal-revoke')!.click();

        expect(captured?.header).toBe('Daveti iptal et');
        expect(captured?.message).toContain('ali@ornek.com');
        expect(service.revokePortalInvite).not.toHaveBeenCalled();

        captured!.accept!();

        expect(service.revokePortalInvite).toHaveBeenCalledOnceWith('c1', 'i1');
        expect(messages.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success', summary: 'Davet iptal edildi.' }));
    });

    it('erişimi kapat: onay metni sonucu açık söyler; kabulde servis ve başarı toast\'ı', () => {
        access = { ...none, canInvite: false, inviteBlockedCode: 'OwnerPortal.AlreadyLinked', links: [activeLink] };
        create();
        let captured: Confirmation | undefined;

        spyOn(confirmation(), 'confirm').and.callFake((c: Confirmation) => {
            captured = c;

            return confirmation();
        });
        q('client-portal-close')!.click();

        expect(captured?.message).toContain('Müşteri portala Merkez kliniği için giremez');
        expect(captured?.message).toContain('yeniden davet edebilirsiniz');

        captured!.accept!();

        expect(service.closePortalLink).toHaveBeenCalledOnceWith('c1', 'l1');
        expect(messages.add).toHaveBeenCalledWith(
            jasmine.objectContaining({ severity: 'success', summary: 'Portal erişimi kapatıldı.', detail: 'Müşteri portala Merkez kliniği için giremez; tekrar davet edilebilir.' })
        );
    });

    it('müşteri kaydı değişince (rowVersion) durum yeniden okunur', () => {
        create();
        fixture.componentRef.setInput('client', { ...client, rowVersion: 'rv2' });
        fixture.detectChanges();

        expect(service.getPortalAccess).toHaveBeenCalledTimes(2);
    });

    it('yükleme hatası hata durumunda gösterilir', () => {
        service.getPortalAccess.and.returnValue(throwError(() => new Error('Portal erişim durumu yüklenemedi.')));
        create();

        expect(el().textContent).toContain('Portal erişim durumu yüklenemedi.');
        expect(q('client-portal-invite')).toBeNull();
    });
});
