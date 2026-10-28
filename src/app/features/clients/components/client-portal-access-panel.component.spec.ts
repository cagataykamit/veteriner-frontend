import type { MockedObject } from 'vitest';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { type Confirmation, ConfirmationService, MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import type { ClientPortalAccessDto, ClientPortalInviteDto, ClientPortalLinkDto } from '@/app/entities/client/models/client-portal-access-api.model';
import type { ClientDetailVm } from '@/app/entities/client/models/client-vm.model';
import { ClientsService } from '@/app/entities/client/services/clients.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
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
    closedAtUtc: null,
    closeReason: null
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
    let service: MockedObject<ClientsService>;
    let messages: MessageService;

    const el = () => fixture.nativeElement as HTMLElement;
    const q = (id: string) => el().querySelector<HTMLButtonElement>(`[data-testid="${id}"]`);
    const status = () => q('client-portal-status')?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    const confirmation = () => fixture.debugElement.injector.get(ConfirmationService);

    const create = () => {
        TestBed.configureTestingModule({
            imports: [ClientPortalAccessPanelComponent],
            providers: [provideRouter([]), MessageService, { provide: ClientsService, useValue: service }, { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: readOnly } }]
        });
        messages = TestBed.inject(MessageService);
        vi.spyOn(messages, 'add').mockReturnValue(undefined);
        fixture = TestBed.createComponent(ClientPortalAccessPanelComponent);
        fixture.componentRef.setInput('client', client);
        fixture.detectChanges();
    };

    beforeEach(() => {
        access = none;
        readOnly = signal(false);
        service = {
            getPortalAccess: vi.fn().mockName('ClientsService.getPortalAccess'),
            sendPortalInvite: vi.fn().mockName('ClientsService.sendPortalInvite'),
            revokePortalInvite: vi.fn().mockName('ClientsService.revokePortalInvite'),
            closePortalLink: vi.fn().mockName('ClientsService.closePortalLink')
        } as unknown as MockedObject<ClientsService>;
        service.getPortalAccess.mockImplementation(() => of(access));
        service.sendPortalInvite.mockReturnValue(of(pendingInvite));
        service.revokePortalInvite.mockReturnValue(of(undefined));
        service.closePortalLink.mockReturnValue(of(undefined));
    });

    it('davet yok: durum ve "Portal daveti gönder" etkin; iptal/kapat yok', () => {
        create();

        expect(service.getPortalAccess).toHaveBeenCalledTimes(1);

        expect(service.getPortalAccess).toHaveBeenCalledWith('c1');
        expect(status()).toContain('Davet gönderilmedi');
        expect(q('client-portal-invite')?.disabled).toBe(false);
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
        access = { ...none, links: [{ ...activeLink, status: 'Closed', closedAtUtc: '2026-10-12T10:00:00Z', closeReason: 'ClinicClosed' }] };
        create();

        expect(status()).toContain('Portal erişimi kapalı');
        expect(status()).toContain('kapatılma: 12.10.2026');
        expect(q('client-portal-invite')?.disabled).toBe(false);
    });

    it('hasta sahibi hesabını sildi: gerekçe, silinme tarihi ve yeniden davet', () => {
        access = { ...none, links: [{ ...activeLink, status: 'Closed', accountEmail: null, closedAtUtc: '2026-10-28T10:00:00Z', closeReason: 'OwnerAccountDeleted' }] };
        create();

        expect(status()).toContain('Hasta sahibi portal hesabını sildi');
        expect(status()).toContain('silinme: 28.10.2026');
        expect(q('client-portal-invite')?.disabled).toBe(false);
    });

    it('e-posta yoksa davet pasif ve nedeni yazılı', () => {
        access = { ...none, canInvite: false, inviteBlockedCode: 'OwnerPortal.ClientEmailMissing' };
        create();

        expect(q('client-portal-invite')?.disabled).toBe(true);
        expect(q('client-portal-invite-blocked')?.textContent).toContain('müşteri kaydında e-posta yok');
    });

    it('KVKK Ret / hatırlatma istemiyor: davet pasif, neden yazılı', () => {
        access = { ...none, canInvite: false, inviteBlockedCode: 'OwnerPortal.ClientOptedOut' };
        create();

        expect(q('client-portal-invite')?.disabled).toBe(true);
        expect(q('client-portal-invite-blocked')?.textContent).toContain('KVKK açık rızayı reddetmiş ya da hatırlatma istemiyor');
    });

    it('salt okunur kiracı: davet pasif (salt okunur); iptal sunucuda da açık olduğundan etkin kalır', () => {
        readOnly.set(true);
        access = { ...none, invites: [pendingInvite] };
        create();

        expect(q('client-portal-invite')?.disabled).toBe(true);
        expect(q('client-portal-invite')?.textContent).toContain('(salt okunur)');
        expect(q('client-portal-revoke')?.disabled).toBe(false);
    });

    it("davet gönder: servis çağrılır, başarı toast'ı ve durum yeniden okunur", () => {
        create();
        access = { ...none, invites: [pendingInvite] };
        q('client-portal-invite')!.click();
        fixture.detectChanges();

        expect(service.sendPortalInvite).toHaveBeenCalledTimes(1);

        expect(service.sendPortalInvite).toHaveBeenCalledWith('c1');
        expect(messages.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'Portal daveti gönderildi.' }));
        expect(service.getPortalAccess).toHaveBeenCalledTimes(2);
        expect(status()).toContain('Davet bekliyor');
    });

    it("davet 409: hata toast'ında sunucu mesajı", () => {
        service.sendPortalInvite.mockReturnValue(throwError(() => new Error('Portal daveti bu müşteriye gönderilemez: müşteri KVKK açık rızayı reddetmiş ya da hatırlatma istemiyor.')));
        create();
        q('client-portal-invite')!.click();

        expect(messages.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error', detail: expect.stringContaining('gönderilemez') }));
    });

    it('daveti iptal et: onay penceresi; kabulde servis çağrılır, vazgeçte çağrılmaz', () => {
        access = { ...none, invites: [pendingInvite] };
        create();
        let captured: Confirmation | undefined;

        vi.spyOn(confirmation(), 'confirm').mockImplementation((c: Confirmation) => {
            captured = c;

            return confirmation();
        });
        q('client-portal-revoke')!.click();

        expect(captured?.header).toBe('Daveti iptal et');
        expect(captured?.message).toContain('ali@ornek.com');
        expect(service.revokePortalInvite).not.toHaveBeenCalled();

        captured!.accept!();

        expect(service.revokePortalInvite).toHaveBeenCalledTimes(1);

        expect(service.revokePortalInvite).toHaveBeenCalledWith('c1', 'i1');
        expect(messages.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'Davet iptal edildi.' }));
    });

    it("erişimi kapat: onay metni sonucu açık söyler; kabulde servis ve başarı toast'ı", () => {
        access = { ...none, canInvite: false, inviteBlockedCode: 'OwnerPortal.AlreadyLinked', links: [activeLink] };
        create();
        let captured: Confirmation | undefined;

        vi.spyOn(confirmation(), 'confirm').mockImplementation((c: Confirmation) => {
            captured = c;

            return confirmation();
        });
        q('client-portal-close')!.click();

        expect(captured?.message).toContain('Müşteri portala Merkez kliniği için giremez');
        expect(captured?.message).toContain('yeniden davet edebilirsiniz');

        captured!.accept!();

        expect(service.closePortalLink).toHaveBeenCalledTimes(1);

        expect(service.closePortalLink).toHaveBeenCalledWith('c1', 'l1');
        expect(messages.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'Portal erişimi kapatıldı.', detail: 'Müşteri portala Merkez kliniği için giremez; tekrar davet edilebilir.' }));
    });

    it('müşteri kaydı değişince (rowVersion) durum yeniden okunur', () => {
        create();
        fixture.componentRef.setInput('client', { ...client, rowVersion: 'rv2' });
        fixture.detectChanges();

        expect(service.getPortalAccess).toHaveBeenCalledTimes(2);
    });

    it('yükleme hatası hata durumunda gösterilir', () => {
        service.getPortalAccess.mockReturnValue(throwError(() => new Error('Portal erişim durumu yüklenemedi.')));
        create();

        expect(el().textContent).toContain('Portal erişim durumu yüklenemedi.');
        expect(q('client-portal-invite')).toBeNull();
    });
});
