import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { ClinicAiSettingsVm } from '@/app/entities/ai/models/ai-vm.model';
import { AiStatusService } from '@/app/entities/ai/services/ai-status.service';
import { ClinicAiSettingsService } from '@/app/entities/ai/services/clinic-ai-settings.service';
import { ClinicsService } from '@/app/entities/clinic/services/clinics.service';
import { AiSettingsPageComponent } from './ai-settings-page.component';

const settings = (over: Partial<ClinicAiSettingsVm> = {}): ClinicAiSettingsVm => ({
    clinicId: 'k1',
    isConfigured: true,
    isEnabled: false,
    isAvailable: false,
    unavailableCode: 'Ai.ClinicNotEnabled',
    updatedAtUtc: null,
    hasAcknowledged: false,
    acknowledgedAtUtc: null,
    acknowledgementVersion: 1,
    acknowledgementItems: ['Yalnız taslak üretir.', 'Veri yurt dışındaki sağlayıcıya gider.'],
    monthlyCredits: 2000,
    creditsUsedThisMonth: 240,
    creditsRemaining: 2010,
    fundCredits: 250,
    usedPercent: 10,
    quotaResetsAtUtc: '2026-11-30T21:00:00Z',
    creditGrants: [],
    ...over
});

describe('AiSettingsPageComponent', () => {
    let fixture: ComponentFixture<AiSettingsPageComponent>;
    let service: { get: ReturnType<typeof vi.fn>; save: ReturnType<typeof vi.fn> };
    let refresh: ReturnType<typeof vi.fn>;
    let claims: Set<string>;
    let readOnly: boolean;
    let confirmation: ConfirmationService;

    const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
    const text = (testId: string): string => el().querySelector(`[data-testid="${testId}"]`)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    const body = (): string => (document.body.textContent ?? '').replace(/\s+/g, ' ');

    async function create(): Promise<void> {
        await TestBed.configureTestingModule({
            imports: [AiSettingsPageComponent],
            providers: [
                provideRouter([]),
                { provide: ClinicAiSettingsService, useValue: service },
                { provide: AiStatusService, useValue: { refresh } },
                { provide: ClinicsService, useValue: { listClinics: () => of([{ id: 'k1', name: 'Pati', isActive: true }]) } },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c), getClinicId: () => 'k1', getClinicName: () => 'Pati' } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => readOnly } }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(AiSettingsPageComponent);
        confirmation = fixture.debugElement.injector.get(ConfirmationService);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    beforeEach(() => {
        claims = new Set(['Clinics.Read', 'Clinics.Update']);
        readOnly = false;
        refresh = vi.fn();
        service = {
            get: vi.fn().mockReturnValue(of(settings())),
            save: vi.fn().mockReturnValue(of(settings({ isEnabled: true, isAvailable: true, unavailableCode: null, hasAcknowledged: true, acknowledgedAtUtc: '2026-11-28T09:00:00Z' })))
        };
    });

    afterEach(() => document.body.querySelectorAll('.p-dialog-mask').forEach((n) => n.remove()));

    it('bu ayın kredisini tam sayı ve Türkçe biçimle gösterir; dolar yok', async () => {
        await create();

        expect(service.get).toHaveBeenCalledWith('k1');
        expect(text('ai-credit-monthly')).toBe('2.000');
        expect(text('ai-credit-used')).toBe('240');
        expect(text('ai-credit-fund')).toBe('250');
        expect(text('ai-credit-remaining')).toBe('2.010');
        expect(el().querySelector('[role="progressbar"]')!.getAttribute('aria-valuenow')).toBe('10');
        expect(el().textContent).not.toContain('$');
        expect(text('ai-settings-grants-empty')).toBe('Henüz eklenen kredi yok.');
    });

    it('ilk açılışta bilgilendirme çıkar; kabul kutusu işaretlenmeden açılmaz, işaretlenince sürümle kaydeder', async () => {
        await create();

        fixture.componentInstance.onToggle(true);
        fixture.detectChanges();
        await fixture.whenStable();

        expect(service.save).not.toHaveBeenCalled();
        expect(body()).toContain('Veri yurt dışındaki sağlayıcıya gider.');

        fixture.componentInstance.acceptAndEnable();
        expect(service.save).not.toHaveBeenCalled();

        fixture.componentInstance.ackChecked.set(true);
        fixture.componentInstance.acceptAndEnable();
        fixture.detectChanges();

        expect(service.save).toHaveBeenCalledWith('k1', true, 1);
        expect(refresh).toHaveBeenCalled();
        expect(fixture.componentInstance.ackOpen()).toBe(false);
        expect(fixture.componentInstance.toggle()).toBe(true);
    });

    it('bilgilendirme kapatılırsa anahtar kapalıya döner', async () => {
        await create();

        fixture.componentInstance.onToggle(true);
        fixture.componentInstance.onAckVisibleChange(false);

        expect(fixture.componentInstance.toggle()).toBe(false);
        expect(service.save).not.toHaveBeenCalled();
    });

    it('daha önce kabul edilmişse yeniden sormadan açar; kapatmak onay ister', async () => {
        service.get.mockReturnValue(of(settings({ hasAcknowledged: true })));
        await create();

        fixture.componentInstance.onToggle(true);
        expect(service.save).toHaveBeenCalledWith('k1', true, undefined);

        const confirm = vi.spyOn(confirmation, 'confirm');

        service.save.mockReturnValue(of(settings({ hasAcknowledged: true })));
        fixture.componentInstance.onToggle(false);
        expect(confirm).toHaveBeenCalled();
        confirm.mock.calls[0][0].accept!();
        expect(service.save).toHaveBeenLastCalledWith('k1', false, undefined);
    });

    it('yetkisiz ya da salt okunur kiracıda anahtar pasif ve nedeni yazılı', async () => {
        claims = new Set(['Clinics.Read']);
        await create();

        expect(fixture.componentInstance.canWrite()).toBe(false);
        expect(el().textContent).toContain('Ayarı yalnız klinik yönetim yetkisi olan kullanıcı değiştirir.');
        fixture.componentInstance.onToggle(true);
        expect(fixture.componentInstance.ackOpen()).toBe(false);
    });

    it('kredi bitince nedeni tek cümleyle söyler; eklenen krediler listelenir', async () => {
        service.get.mockReturnValue(
            of(
                settings({
                    isEnabled: true,
                    unavailableCode: 'Ai.ClinicQuotaExceeded',
                    usedPercent: 100,
                    creditGrants: [{ id: 'g1', kind: 'Manual', credits: 1500, createdAtUtc: '2026-11-20T09:00:00Z' }]
                })
            )
        );
        await create();

        expect(text('ai-settings-reason')).toContain('diğer işler etkilenmez');
        expect(text('ai-settings-grant-list')).toContain('+1.500 kredi');
        expect(text('ai-settings-grant-list')).toContain('Vetinity tarafından eklendi');
    });

    it('kaydetme hatasında mesaj gösterir ve anahtar sunucudaki değere döner', async () => {
        service.get.mockReturnValue(of(settings({ hasAcknowledged: true })));
        service.save.mockReturnValue(throwError(() => new Error('Bilgilendirme metni güncellenmiş; sayfayı yenileyip yeniden kabul edin.')));
        await create();

        fixture.componentInstance.onToggle(true);
        fixture.detectChanges();

        expect(fixture.componentInstance.toggle()).toBe(false);
        expect(el().textContent).toContain('Bilgilendirme metni güncellenmiş');
    });
});
