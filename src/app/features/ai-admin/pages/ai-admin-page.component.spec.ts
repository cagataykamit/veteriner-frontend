import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import type { AiAdminClinicDto, AiAdminTotalsDto, AiAdminUsageDto } from '@/app/features/ai-admin/models/ai-admin.model';
import { AiAdminService } from '@/app/features/ai-admin/services/ai-admin.service';
import { AiAdminPageComponent } from './ai-admin-page.component';

const totals = (patch: Partial<AiAdminTotalsDto> = {}): AiAdminTotalsDto => ({
    requests: 0,
    failedRequests: 0,
    inputTokens: 0,
    outputTokens: 0,
    tokens: 0,
    credits: 0,
    fundCredits: 0,
    costUsd: 0,
    ...patch
});

const clinic = (patch: Partial<AiAdminClinicDto> = {}): AiAdminClinicDto => ({
    tenantId: 't1',
    tenantName: 'Pati Klinikleri',
    clinicId: 'c1',
    clinicName: 'Merkez',
    isClinicActive: true,
    planCode: 'Premium',
    isEnabled: true,
    updatedAtUtc: '2026-11-10T09:00:00Z',
    monthlyCredits: 2000,
    creditsUsedThisMonth: 1640.5,
    creditsRemaining: 609.5,
    fundCredits: 250,
    usedPercent: 72,
    quotaResetsAtUtc: '2026-11-30T21:00:00Z',
    ...patch
});

const usage = (patch: Partial<AiAdminUsageDto> = {}): AiAdminUsageDto => ({
    isConfigured: true,
    model: 'claude-haiku-5-5',
    month: '2026-11',
    isCurrentMonth: true,
    monthStartUtc: '2026-10-31T21:00:00Z',
    monthEndUtc: '2026-11-30T21:00:00Z',
    system: totals({ requests: 120, failedRequests: 2, inputTokens: 280000, outputTokens: 30000, tokens: 310000, credits: 91.2, costUsd: 0.041 }),
    budget: { limitUsd: 10, spentUsd: 0.041, remainingUsd: 9.959, usedPercent: 0 },
    limits: {
        maxInputTokens: 12000,
        maxOutputTokens: 2000,
        userRequestsPerMinute: 3,
        clinicMonthlyTokenLimit: 20000000,
        clinicMonthlyCostLimitUsd: 2,
        systemMonthlyCostLimitUsd: 10,
        creditValueUsd: 0.00045,
        planMonthlyCredits: { Basic: 0, Pro: 500, Premium: 2000 }
    },
    clinics: [{ tenantId: 't1', tenantName: 'Pati Klinikleri', clinicId: 'c1', clinicName: 'Merkez', isEnabled: true, usage: totals({ requests: 80, costUsd: 0.027 }) }],
    features: [{ feature: 'PetHistorySummary', usage: totals({ requests: 100 }) }],
    models: [{ model: 'claude-haiku-5-5', usage: totals({ requests: 120 }) }],
    users: [
        { userId: 'u1', userName: 'Dr. Ayşe', email: 'ayse@pati.test', tenantId: 't1', tenantName: 'Pati Klinikleri', clinicId: 'c1', clinicName: 'Merkez', usage: totals({ requests: 60, failedRequests: 3, costUsd: 0.02 }) },
        { userId: 'u2', userName: '', email: 'resepsiyon@pati.test', tenantId: 't1', tenantName: 'Pati Klinikleri', clinicId: 'c1', clinicName: 'Merkez', usage: totals({ requests: 20 }) }
    ],
    ...patch
});

describe('Yapay zekâ yönetim sayfası', () => {
    let service: MockedObject<AiAdminService>;
    let fixture: ComponentFixture<AiAdminPageComponent>;

    const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
    const text = (testId: string): string => el().querySelector(`[data-testid="${testId}"]`)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

    const create = async (): Promise<void> => {
        TestBed.configureTestingModule({
            imports: [AiAdminPageComponent],
            providers: [provideRouter([]), { provide: AiAdminService, useValue: service }]
        });
        fixture = TestBed.createComponent(AiAdminPageComponent);
        await fixture.whenStable();
    };

    const confirm = (answer: 'accept' | 'reject') => {
        const confirmation = fixture.debugElement.injector.get(ConfirmationService);

        return vi.spyOn(confirmation, 'confirm').mockImplementation((c) => {
            if (answer === 'accept') {
                c.accept?.();
            } else {
                c.reject?.();
            }

            return confirmation;
        });
    };

    beforeEach(() => {
        service = {
            usage: vi.fn().mockReturnValue(of(usage())),
            clinics: vi.fn().mockReturnValue(of([clinic()])),
            setEnabled: vi.fn(),
            fundGrants: vi.fn().mockReturnValue(of([])),
            grantFund: vi.fn()
        } as unknown as MockedObject<AiAdminService>;
    });

    it('bu ayın maliyetini sistem sınırına uzaklıkla, istek, token ve krediyi gösterir', async () => {
        await create();

        expect(service.usage).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}$/));
        expect(text('ai-admin-cost')).toContain('$0,041');
        expect(text('ai-admin-cost')).toContain('kalan');
        expect(text('ai-admin-requests')).toContain('120');
        expect(text('ai-admin-requests')).toContain('2 başarısız');
        expect(text('ai-admin-tokens')).toContain('310.000');
        expect(text('ai-admin-credits')).toContain('91,2');
        expect(el().querySelector('[data-testid="ai-admin-not-configured"]')).toBeNull();
    });

    it('klinik satırında paket, kullanım oranı, kalan ve fon görünür; kırılımlar Türkçe etiketli', async () => {
        await create();

        const row = text('ai-admin-clinic-row');

        expect(row).toContain('Merkez');
        expect(row).toContain('Pati Klinikleri');
        expect(row).toContain('%72');
        expect(row).toContain('1.640 / 2.000 kredi');
        expect(row).toContain('609');
        expect(row).toContain('250');
        expect(text('ai-admin-by-feature')).toContain('Hasta geçmişi özeti');
        expect(text('ai-admin-by-model')).toContain('claude-haiku-5-5');
    });

    it('kullanıcı kırılımı adı (yoksa e-postayı), kliniği ve başarısız isteği gösterir', async () => {
        await create();

        const users = text('ai-admin-by-user');

        expect(users).toContain('Kullanıcılara göre');
        expect(users).toContain('Dr. Ayşe');
        expect(users).toContain('ayse@pati.test · Merkez · Pati Klinikleri');
        expect(users).toContain('3 başarısız');
        expect(users).toContain('resepsiyon@pati.test');
    });

    it('kullanıcı kırılımı boşsa bu ay kullanım yok der', async () => {
        service.usage.mockReturnValue(of(usage({ users: [] })));
        await create();

        expect(text('ai-admin-by-user')).toContain('Bu ay kullanım yok.');
    });

    it('sağlayıcı anahtarı yoksa bunu söyler', async () => {
        service.usage.mockReturnValue(of(usage({ isConfigured: false })));
        await create();

        expect(text('ai-admin-not-configured')).toContain('Sağlayıcı anahtarı tanımlı değil');
    });

    it('ay değişince o ayın kullanımı yeniden okunur', async () => {
        await create();
        const cmp = fixture.componentInstance;
        const previous = cmp.monthOptions[1].value;

        cmp.selectMonth(previous);
        expect(service.usage).toHaveBeenLastCalledWith(previous);
    });

    it('filtre: tek karakterde istek atılmaz, aramada kırpılmış metin gönderilir', async () => {
        await create();
        const cmp = fixture.componentInstance;

        service.clinics.mockClear();

        cmp.searchText = 'P';
        cmp.searchClinics();
        expect(service.clinics).not.toHaveBeenCalled();

        cmp.searchText = ' Pati ';
        cmp.searchClinics();
        expect(service.clinics).toHaveBeenCalledWith('Pati');
    });

    it('aç/kapat onayla kaydedilir; vazgeçilirse sunucuya gidilmez', async () => {
        await create();
        const cmp = fixture.componentInstance;

        service.setEnabled.mockReturnValue(of(clinic({ isEnabled: false })));

        confirm('reject');
        cmp.confirmToggle(clinic(), false);
        expect(service.setEnabled).not.toHaveBeenCalled();
        expect(cmp.clinics()[0].isEnabled).toBe(true);

        vi.restoreAllMocks();
        confirm('accept');
        cmp.confirmToggle(clinic(), false);
        expect(service.setEnabled).toHaveBeenCalledWith('c1', false);
        expect(cmp.clinics()[0].isEnabled).toBe(false);
    });

    it('kaydetme başarısızsa satır eski hâline döner', async () => {
        await create();
        const cmp = fixture.componentInstance;

        service.setEnabled.mockReturnValue(throwError(() => new Error('Klinik bulunamadı.')));
        confirm('accept');

        cmp.confirmToggle(clinic(), false);
        expect(cmp.clinics()[0].isEnabled).toBe(true);
        expect(cmp.savingId()).toBeNull();
    });

    it('fon eklenince satır sunucunun döndüğü değerlerle güncellenir', async () => {
        await create();
        const cmp = fixture.componentInstance;

        cmp.openFund(clinic());
        expect(cmp.fundClinic()?.clinicId).toBe('c1');
        cmp.onFundGranted(clinic({ fundCredits: 500, creditsRemaining: 859.5 }));
        expect(cmp.clinics()[0].fundCredits).toBe(500);
    });

    it('klinik listesi boşsa arama önerisi gösterilir', async () => {
        service.clinics.mockReturnValue(of([]));
        await create();

        expect(el().textContent).toContain('Açmak için kliniği arayın');
    });
});
