import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { ClinicsService } from '@/app/entities/clinic/services/clinics.service';
import type { ClinicPortalSettingsVm } from '@/app/entities/owner-portal/models/owner-portal.model';
import { ClinicPortalSettingsService } from '@/app/entities/owner-portal/services/owner-portal.service';
import { ClinicPortalSettingsPageComponent } from './clinic-portal-settings-page.component';

const settings = (over: Partial<ClinicPortalSettingsVm> = {}): ClinicPortalSettingsVm => ({
    clinicId: 'k1',
    isEnabled: true,
    updatedAtUtc: null,
    activeLinkCount: 12,
    pendingInviteCount: 1,
    ...over
});

describe('ClinicPortalSettingsPageComponent', () => {
    let fixture: ComponentFixture<ClinicPortalSettingsPageComponent>;
    let service: { get: ReturnType<typeof vi.fn>; save: ReturnType<typeof vi.fn>; notificationRules: ReturnType<typeof vi.fn> };
    let claims: Set<string>;
    let confirmation: ConfirmationService;
    let el: HTMLElement;
    let planLocked: boolean;

    async function create(): Promise<void> {
        await TestBed.configureTestingModule({
            imports: [ClinicPortalSettingsPageComponent],
            providers: [
                provideRouter([]),
                { provide: ClinicPortalSettingsService, useValue: service },
                { provide: ClinicsService, useValue: { listClinics: () => of([{ id: 'k1', name: 'Pati', isActive: true }]) } },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c), getClinicId: () => 'k1', getClinicName: () => 'Pati' } },
                {
                    provide: TenantReadOnlyContextService,
                    useValue: {
                        mutationBlocked: () => false,
                        lockedPlanFeature: () => (planLocked ? { feature: 'OwnerPortal', isEnabled: false, requiredPlanCode: 'Pro' } : null)
                    }
                }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(ClinicPortalSettingsPageComponent);
        confirmation = fixture.debugElement.injector.get(ConfirmationService);
        el = fixture.nativeElement;
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    beforeEach(() => {
        planLocked = false;
        claims = new Set(['Clinics.Read', 'Clinics.Update']);
        service = {
            get: vi.fn().mockReturnValue(of(settings())),
            save: vi.fn().mockReturnValue(of(settings({ isEnabled: false, updatedAtUtc: '2026-11-01T10:00:00Z' }))),
            notificationRules: vi.fn().mockReturnValue(
                of([
                    {
                        type: 'AppointmentReminder',
                        category: 'Reminder',
                        channels: [
                            { channel: 'Email', mode: 'Preference' },
                            { channel: 'Push', mode: 'NotConfigured' },
                            { channel: 'WhatsAppLink', mode: 'StaffManual' }
                        ]
                    },
                    { type: 'SignInCode', category: 'Transactional', channels: [{ channel: 'Email', mode: 'Always' }, { channel: 'Push', mode: 'Disabled' }, { channel: 'WhatsAppLink', mode: 'Disabled' }] }
                ])
            )
        };
    });

    it('etki sayıları ve bildirim kanalları Türkçe modlarla gösterilir', async () => {
        await create();

        expect(service.get).toHaveBeenCalledWith('k1');
        expect(el.querySelector('[data-testid="portal-counts"]')?.textContent).toContain('Aktif portal erişimi: 12');
        expect(el.querySelector('[data-testid="portal-counts"]')?.textContent).toContain('Bekleyen davet: 1');

        const rows = el.querySelectorAll('[data-testid="portal-rule-row"]');

        expect(rows).toHaveLength(2);
        expect(rows[0].textContent).toContain('Randevu hatırlatması');
        expect(rows[0].textContent).toContain('Tercihe bağlı');
        expect(rows[0].textContent).toContain('Yapılandırılmadı');
        expect(rows[0].textContent).toContain('Personel elle');
        expect(rows[1].textContent).toContain('Her zaman');
        expect(rows[1].textContent).toContain('Kapalı');
    });

    it('kapatma onay diyaloğu etkiyi anlatır; onaylanınca PUT isEnabled=false', async () => {
        await create();
        const confirm = vi.spyOn(confirmation, 'confirm');

        fixture.componentInstance.onToggle(false);

        const options = confirm.mock.calls[0][0];

        expect(options.message).toContain('12 hasta sahibinin portal erişimi durur');
        expect(options.message).toContain('Hesaplar ve bağlantılar silinmez');
        expect(service.save).not.toHaveBeenCalled();

        options.accept!();
        fixture.detectChanges();

        expect(service.save).toHaveBeenCalledWith('k1', false);
        expect(fixture.componentInstance.settings()?.isEnabled).toBe(false);
        expect(el.textContent).toContain('Portal bu klinikte kapalı');
    });

    it('onay reddedilirse anahtar sunucudaki değere döner', async () => {
        await create();
        const confirm = vi.spyOn(confirmation, 'confirm');

        fixture.componentInstance.onToggle(false);
        expect(fixture.componentInstance.toggle()).toBe(false);

        confirm.mock.calls[0][0].reject!();
        expect(fixture.componentInstance.toggle()).toBe(true);
        expect(service.save).not.toHaveBeenCalled();
    });

    it('paket açıkken üst paket kutusu çıkmaz', async () => {
        await create();

        expect(el.querySelector('[data-testid="plan-upgrade-notice"]')).toBeNull();
        expect(el.querySelector('[data-testid="portal-enabled"]')).not.toBeNull();
    });

    it('paket portalı içermiyor ve kullanım yoksa anahtar yerine üst paket kutusu çıkar', async () => {
        planLocked = true;
        service.get.mockReturnValue(of(settings({ activeLinkCount: 0, pendingInviteCount: 0 })));
        await create();

        expect(el.querySelector('[data-testid="plan-upgrade-notice"]')?.textContent).toContain('Profesyonel ve Kurumsal paketlerinde var');
        expect(el.querySelector('[data-testid="portal-enabled"]')).toBeNull();
    });

    it('paket düşmüş kiracıda mevcut erişim varsa anahtar kalır, üst paket kutusu da çıkar', async () => {
        planLocked = true;
        await create();

        expect(el.querySelector('[data-testid="plan-upgrade-notice"]')?.textContent).toContain('Mevcut erişimler açık kalır');
        expect(el.querySelector('[data-testid="portal-enabled"]')).not.toBeNull();
    });

    it('Clinics.Update yoksa anahtar kilitli ve açıklama görünür', async () => {
        claims.delete('Clinics.Update');
        await create();

        expect(fixture.componentInstance.canWrite()).toBe(false);
        expect(el.textContent).toContain('yalnız klinik yönetim yetkisi olan kullanıcı');
    });
});
