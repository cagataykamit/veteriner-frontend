import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { of } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { ApiKeyDto, ApiKeyListDto } from '@/app/entities/api-key/models/api-key.model';
import { ApiKeysService } from '@/app/entities/api-key/services/api-keys.service';
import { ApiAccessPageComponent } from './api-access-page.component';

const SCOPES = ['clients:read', 'pets:read', 'appointments:read', 'vaccinations:read'];
// Testte üretilmiş sahte değer; gerçek anahtar biçimine benzer ama hiçbir sunucuda geçerli değildir.
const FAKE_PLAIN = `vtk_testtest_${'x'.repeat(43)}`;

const key = (over: Partial<ApiKeyDto> = {}): ApiKeyDto => ({
    id: 'k1',
    name: 'Muhasebe',
    prefix: 'vtk_testtest',
    scopes: ['clients:read', 'pets:read'],
    createdByUserId: 'u1',
    createdByName: 'Ayşe',
    createdAtUtc: '2026-11-01T10:00:00Z',
    lastUsedAtUtc: null,
    isRevoked: false,
    revokedAtUtc: null,
    revokedByName: null,
    ...over
});

const list = (items: ApiKeyDto[]): ApiKeyListDto => ({ items, availableScopes: SCOPES, maxActiveKeys: 10 });

describe('ApiAccessPageComponent', () => {
    let fixture: ComponentFixture<ApiAccessPageComponent>;
    let service: { list: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; revoke: ReturnType<typeof vi.fn> };
    let planLocked: boolean;
    let el: HTMLElement;

    async function create(): Promise<void> {
        await TestBed.configureTestingModule({
            imports: [ApiAccessPageComponent],
            providers: [
                provideRouter([]),
                { provide: ApiKeysService, useValue: service },
                { provide: ApiClient, useValue: { absoluteUrl: (p: string) => `https://api.test${p}` } },
                { provide: AuthService, useValue: { hasOperationClaim: () => true } },
                {
                    provide: TenantReadOnlyContextService,
                    useValue: {
                        mutationBlocked: () => false,
                        lockedPlanFeature: () => (planLocked ? { feature: 'ExternalApi', isEnabled: false, requiredPlanCode: 'Premium' } : null)
                    }
                }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(ApiAccessPageComponent);
        el = fixture.nativeElement;
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    beforeEach(() => {
        planLocked = false;
        service = {
            list: vi.fn().mockReturnValue(of(list([key(), key({ id: 'k2', name: 'Eski', isRevoked: true, revokedAtUtc: '2026-11-02T10:00:00Z', revokedByName: 'Ali' })]))),
            create: vi.fn().mockReturnValue(of({ key: key({ id: 'k3', name: 'Yeni' }), plainTextKey: FAKE_PLAIN })),
            revoke: vi.fn().mockReturnValue(of(undefined))
        };
    });

    it('listede yalnız maskeli ön ek, Türkçe kapsam ve durum görünür', async () => {
        await create();

        const rows = el.querySelectorAll('[data-testid="api-key-row"]');
        expect(rows.length).toBe(2);
        expect(rows[0].textContent).toContain('vtk_testtest_••••••••');
        expect(rows[0].textContent).toContain('Müşteriler, Hayvanlar');
        expect(rows[0].textContent).toContain('Etkin');
        expect(rows[0].textContent).toContain('Kullanılmadı');
        expect(rows[1].textContent).toContain('İptal edildi');
        expect(rows[1].querySelector('[data-testid="api-key-revoke"]')).toBeNull();
        expect(el.querySelector('[data-testid="api-base-url"]')?.textContent).toBe('https://api.test/api/external/v1');
    });

    it('kapsam seçilmeden oluşturulamaz; oluşturulan anahtar bir kez gösterilir ve kapatınca silinir', async () => {
        await create();
        const page = fixture.componentInstance;
        const button = () => el.querySelector<HTMLButtonElement>('[data-testid="api-key-create"]')!;

        page.name.set('  Yeni  ');
        fixture.detectChanges();
        expect(button().disabled).toBe(true);

        page.toggleScope('vaccinations:read', true);
        page.toggleScope('clients:read', true);
        fixture.detectChanges();
        expect(button().disabled).toBe(false);

        page.create();
        fixture.detectChanges();

        expect(service.create).toHaveBeenCalledWith('Yeni', ['clients:read', 'vaccinations:read']);
        const revealed = el.querySelector('[data-testid="api-key-revealed"]')!;
        expect(revealed.textContent).toContain('bir daha gösterilmeyecek');
        expect(el.querySelector<HTMLInputElement>('[data-testid="api-key-plain"]')!.value).toBe(FAKE_PLAIN);
        expect(page.name()).toBe('');
        expect(page.selected().size).toBe(0);

        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
        el.querySelector<HTMLButtonElement>('[data-testid="api-key-copy"]')!.click();
        expect(writeText).toHaveBeenCalledWith(FAKE_PLAIN);

        el.querySelector<HTMLButtonElement>('[data-testid="api-key-dismiss"]')!.click();
        fixture.detectChanges();
        expect(el.querySelector('[data-testid="api-key-revealed"]')).toBeNull();
        expect(el.textContent).not.toContain(FAKE_PLAIN);
    });

    it('iptal onaydan sonra gönderilir ve liste yenilenir', async () => {
        await create();
        const confirmation = fixture.debugElement.injector.get(ConfirmationService);
        const confirm = vi.spyOn(confirmation, 'confirm').mockImplementation((c) => {
            c.accept?.();

            return confirmation;
        });

        el.querySelector<HTMLButtonElement>('[data-testid="api-key-revoke"]')!.click();

        expect(confirm).toHaveBeenCalled();
        expect(service.revoke).toHaveBeenCalledWith('k1');
        expect(service.list).toHaveBeenCalledTimes(2);
    });

    it('paket Kurumsal değilse üst paket kutusu çıkar, oluşturma yok; mevcut anahtar listede kalır ve iptal edilebilir', async () => {
        planLocked = true;
        await create();

        expect(el.querySelector('[data-testid="api-access-locked"] [data-testid="plan-upgrade-notice"]')).not.toBeNull();
        expect(el.querySelector('[data-testid="api-key-create"]')).toBeNull();
        expect(el.querySelectorAll('[data-testid="api-key-row"]').length).toBe(2);
        expect(el.querySelector('[data-testid="api-key-revoke"]')).not.toBeNull();
    });

    it('anahtar yoksa boş durum gösterilir', async () => {
        service.list.mockReturnValue(of(list([])));
        await create();

        expect(el.querySelector('[data-testid="api-keys-empty"]')).not.toBeNull();
    });
});
