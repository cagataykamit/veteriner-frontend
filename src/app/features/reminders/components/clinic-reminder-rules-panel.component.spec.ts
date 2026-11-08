import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { ClinicMarketingGateDto, ClinicReminderRuleDto, ClinicReminderRulesDto } from '@/app/features/reminders/models/clinic-reminder-rule.model';
import { RemindersService } from '@/app/features/reminders/services/reminders.service';
import { ClinicReminderRulesPanelComponent } from './clinic-reminder-rules-panel.component';

const rule = (over: Partial<ClinicReminderRuleDto> & Pick<ClinicReminderRuleDto, 'ruleType'>): ClinicReminderRuleDto => ({
    isEnabled: false,
    days: 30,
    defaultDays: 30,
    minDays: 1,
    maxDays: 365,
    sendingAvailable: true,
    updatedAtUtc: null,
    ...over
});

const DECLARATION = "Kliniğimiz İYS'ye kayıtlıdır; onay ve retleri İYS'ye işlemek kliniğin yükümlülüğüdür.";

const gate = (over: Partial<ClinicMarketingGateDto> = {}): ClinicMarketingGateDto => ({
    isEnabled: false,
    declarationText: DECLARATION,
    declarationVersion: '2026-11-08',
    declaredAtUtc: null,
    declaredByUserId: null,
    updatedAtUtc: null,
    ...over
});

const dto = (): ClinicReminderRulesDto => ({
    clinicId: 'k1',
    rules: [rule({ ruleType: 'FollowUp', days: 3, maxDays: 30 }), rule({ ruleType: 'Debt' }), rule({ ruleType: 'NoReturn', days: 180, minDays: 30, maxDays: 730, sendingAvailable: false })],
    marketingGate: gate()
});

describe('ClinicReminderRulesPanelComponent (TIER-003)', () => {
    let fixture: ComponentFixture<ClinicReminderRulesPanelComponent>;
    let service: { getClinicRules: ReturnType<typeof vi.fn>; saveClinicRules: ReturnType<typeof vi.fn>; saveMarketingGate: ReturnType<typeof vi.fn> };
    let locked: boolean;
    let claims: Set<string>;
    let readOnly: boolean;

    const el = () => fixture.nativeElement as HTMLElement;
    const q = (id: string) => el().querySelector<HTMLElement>(`[data-testid="${id}"]`);

    async function create(): Promise<void> {
        await TestBed.configureTestingModule({
            imports: [ClinicReminderRulesPanelComponent],
            providers: [
                provideRouter([]),
                { provide: RemindersService, useValue: service },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c), getClinicId: () => 'k1', getClinicName: () => 'Pati' } },
                {
                    provide: TenantReadOnlyContextService,
                    useValue: {
                        mutationBlocked: () => readOnly,
                        lockedPlanFeature: () => (locked ? { feature: 'AutomatedReminders', isEnabled: false, requiredPlanCode: 'Pro' } : null)
                    }
                }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(ClinicReminderRulesPanelComponent);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    beforeEach(() => {
        locked = false;
        readOnly = false;
        claims = new Set(['Reminders.Manage']);
        service = {
            getClinicRules: vi.fn().mockReturnValue(of(dto())),
            saveClinicRules: vi.fn().mockImplementation((_id: string, rows: unknown) => of({ ...dto(), rows })),
            saveMarketingGate: vi.fn().mockImplementation((_id: string, isEnabled: boolean) => of(gate({ isEnabled, declaredAtUtc: isEnabled ? '2026-11-08T09:00:00Z' : null })))
        };
    });

    it('üç kuralı aktif klinik için gösterir, kapalı başlar', async () => {
        await create();

        expect(service.getClinicRules).toHaveBeenCalledWith('k1');
        expect(q('reminder-rule-FollowUp')?.textContent).toContain('Kontrol muayenesi');
        expect(q('reminder-rule-Debt')?.textContent).toContain('Ödenmemiş bakiye');
        expect(q('reminder-rule-NoReturn')?.textContent).toContain('Uzun süredir gelmedi');
        expect(el().textContent).toContain('Pati kliniği');
        expect(q('plan-upgrade-notice')).toBeNull();
    });

    it('kapı kapalıyken ticari kural açılabilir ama gönderim yapılmadığı yazılır (ADR-046)', async () => {
        await create();
        const c = fixture.componentInstance;

        expect(c.editLocked()).toBe(false);
        expect(q('reminder-rule-NoReturn')?.querySelector('[data-testid="reminder-rule-commercial"]')?.textContent).toContain('gönderim yapılmaz');
        expect(q('reminder-rule-Debt')?.querySelector('[data-testid="reminder-rule-commercial"]')).toBeNull();
        expect(q('marketing-gate-closed')?.textContent).toContain('hatırlatmalar');
        expect(q('marketing-gate-declaration')?.textContent).toContain("İYS'ye kayıtlıdır");
    });

    it('kaydet ticari kural dahil tüm kuralları yollar', async () => {
        await create();
        const c = fixture.componentInstance;

        expect(c.dirty()).toBe(false);
        c.patch('Debt', { isEnabled: true, days: 45 });
        c.patch('NoReturn', { isEnabled: true });
        expect(c.dirty()).toBe(true);

        c.save();

        expect(service.saveClinicRules).toHaveBeenCalledWith('k1', [
            { ruleType: 'FollowUp', isEnabled: false, days: 3 },
            { ruleType: 'Debt', isEnabled: true, days: 45 },
            { ruleType: 'NoReturn', isEnabled: true, days: 180 }
        ]);
        expect(c.saved()).toBe(true);
        expect(c.dirty()).toBe(false);
    });

    it('kapı beyan onaylanmadan açılamaz; onaylayınca açılır, kural gönderilebilir olur ve kapatılabilir', async () => {
        await create();
        const c = fixture.componentInstance;
        const openButton = () => q('marketing-gate-open-button') as HTMLButtonElement;

        expect(openButton().disabled).toBe(true);

        c.declarationAccepted.set(true);
        fixture.detectChanges();
        expect(openButton().disabled).toBe(false);
        openButton().click();
        fixture.detectChanges();

        expect(service.saveMarketingGate).toHaveBeenCalledWith('k1', true, true);
        expect(q('marketing-gate-open')?.textContent).toContain('İYS beyanı');
        expect(c.rules()[2].sendingAvailable).toBe(true);
        expect(q('reminder-rule-NoReturn')?.querySelector('[data-testid="reminder-rule-commercial"]')).toBeNull();

        (q('marketing-gate-close') as HTMLButtonElement).click();
        fixture.detectChanges();

        expect(service.saveMarketingGate).toHaveBeenLastCalledWith('k1', false, false);
        expect(q('marketing-gate-closed')).not.toBeNull();
    });

    it('kayıt hatası gösterilir ve değişiklik kaybolmaz', async () => {
        service.saveClinicRules.mockReturnValue(throwError(() => new Error('Gün değeri 1-365 aralığında olmalıdır.')));
        await create();
        const c = fixture.componentInstance;

        c.patch('Debt', { days: 45 });
        c.save();

        expect(c.saveError()).toContain('1-365');
        expect(c.dirty()).toBe(true);
        expect(c.rules()[1].days).toBe(45);
    });

    it('pakette yoksa üst paket kutusu çıkar, kural yüklenmez görünmez', async () => {
        locked = true;
        await create();

        expect(q('plan-upgrade-notice')?.textContent).toContain('Profesyonel ve Kurumsal paketlerinde var');
        expect(q('reminder-rule-Debt')).toBeNull();
        expect(q('reminder-rules-save')).toBeNull();
    });

    it('yönetim yetkisi yoksa ya da salt okunursa değiştirilemez', async () => {
        claims.clear();
        await create();

        expect(q('reminder-rules-save')).toBeNull();
        expect(fixture.componentInstance.editLocked()).toBe(true);
        expect(q('marketing-gate-open-button')).toBeNull();
    });
});
