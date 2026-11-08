import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { CustomDevelopmentRequestDto, CustomDevelopmentRequestListDto } from '@/app/entities/custom-development/models/custom-development-request.model';
import { CustomDevelopmentRequestsService } from '@/app/entities/custom-development/services/custom-development-requests.service';
import { CustomDevelopmentPageComponent } from './custom-development-page.component';

const request = (over: Partial<CustomDevelopmentRequestDto> = {}): CustomDevelopmentRequestDto => ({
    id: 'r1',
    requestTitle: 'Gün sonu raporuna hekim sütunu',
    requestText: 'Hekim adı sütunu eklensin.',
    targetKind: 'Report',
    requestTarget: 'Gün sonu raporu',
    priority: 'High',
    status: 'Received',
    isOpen: true,
    createdByUserId: 'u1',
    createdByName: 'Ayşe',
    createdAtUtc: '2026-11-07T10:00:00Z',
    statusChangedAtUtc: null,
    decisionReason: null,
    responseNote: null,
    ...over
});

const list = (items: CustomDevelopmentRequestDto[], openCount = items.filter((i) => i.isOpen).length): CustomDevelopmentRequestListDto => ({
    items,
    openCount,
    maxOpen: 3
});

describe('CustomDevelopmentPageComponent', () => {
    let fixture: ComponentFixture<CustomDevelopmentPageComponent>;
    let service: { list: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
    let planLocked: boolean;
    let el: HTMLElement;

    async function create(): Promise<void> {
        await TestBed.configureTestingModule({
            imports: [CustomDevelopmentPageComponent],
            providers: [
                provideRouter([]),
                { provide: CustomDevelopmentRequestsService, useValue: service },
                { provide: AuthService, useValue: { hasOperationClaim: () => true } },
                {
                    provide: TenantReadOnlyContextService,
                    useValue: {
                        mutationBlocked: () => false,
                        lockedPlanFeature: () => (planLocked ? { feature: 'CustomDevelopment', isEnabled: false, requiredPlanCode: 'Premium' } : null)
                    }
                }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(CustomDevelopmentPageComponent);
        el = fixture.nativeElement;
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    const submit = () => el.querySelector<HTMLButtonElement>('[data-testid="cd-submit"]');

    beforeEach(() => {
        planLocked = false;
        service = {
            list: vi.fn().mockReturnValue(
                of(
                    list([
                        request(),
                        request({ id: 'r2', requestTitle: 'Muhasebe aktarımı', status: 'OutOfScope', isOpen: false, decisionReason: 'Vetinity dışındaki sistem.', responseNote: 'İnceledik.' })
                    ])
                )
            ),
            create: vi.fn().mockReturnValue(of(request({ id: 'r3', requestTitle: 'Yeni talep' })))
        };
    });

    it('talepler durum, konu ve öncelikle; kapsam dışında gerekçe ve Vetinity notuyla listelenir', async () => {
        await create();

        const rows = el.querySelectorAll('[data-testid="cd-row"]');

        expect(rows.length).toBe(2);
        expect(rows[0].textContent).toContain('Alındı');
        expect(rows[0].textContent).toContain('Rapor: Gün sonu raporu');
        expect(rows[0].textContent).toContain('Öncelik yüksek');
        expect(rows[0].querySelector('[data-testid="cd-reason"]')).toBeNull();
        expect(rows[1].textContent).toContain('Kapsam dışı');
        expect(rows[1].querySelector('[data-testid="cd-reason"]')?.textContent).toContain('Vetinity dışındaki sistem.');
        expect(rows[1].querySelector('[data-testid="cd-note"]')?.textContent).toContain('İnceledik.');
        expect(el.querySelector('[data-testid="cd-open-count"]')?.textContent).toContain('1 / 3');
    });

    it('formda kişisel veri uyarısı var; zorunlu alanlar dolmadan gönderilemez, gönderince form sıfırlanır ve liste yenilenir', async () => {
        await create();
        const page = fixture.componentInstance;

        expect(el.querySelector('[data-testid="cd-privacy"]')?.textContent).toContain('kişisel veri yazmayın');
        expect(submit()!.disabled).toBe(true);

        page.title.set('  Yeni talep  ');
        page.target.set('Muayene çıktısı');
        page.text.set('Logo olsun.');
        fixture.detectChanges();
        expect(submit()!.disabled).toBe(true);

        page.targetKind.set('Output');
        fixture.detectChanges();
        expect(submit()!.disabled).toBe(false);

        page.create();
        fixture.detectChanges();

        expect(service.create).toHaveBeenCalledWith({
            requestTitle: 'Yeni talep',
            requestText: 'Logo olsun.',
            targetKind: 'Output',
            requestTarget: 'Muayene çıktısı',
            priority: 'Normal'
        });
        expect(page.title()).toBe('');
        expect(page.targetKind()).toBeNull();
        expect(service.list).toHaveBeenCalledTimes(2);
        expect(el.querySelector('[data-testid="cd-list-message"]')?.textContent).toContain('"Yeni talep" alındı');
    });

    it('açık talep sınırı doluysa form yerine sınır açıklaması görünür', async () => {
        service.list.mockReturnValue(of(list([request(), request({ id: 'r2' }), request({ id: 'r3' })])));
        await create();

        expect(el.querySelector('[data-testid="cd-limit"]')?.textContent).toContain('en fazla 3 açık talebiniz');
        expect(submit()).toBeNull();
    });

    it('sunucu sınır hatası verirse mesaj gösterilir ve liste yenilenir', async () => {
        service.create.mockReturnValue(
            throwError(() => new HttpErrorResponse({ status: 409, error: { code: 'CustomDevelopment.TooManyOpen', detail: 'Aynı anda en fazla 3 açık talebiniz olabilir.' } }))
        );
        await create();
        const page = fixture.componentInstance;

        page.title.set('Başlık');
        page.targetKind.set('Screen');
        page.target.set('Randevu ekranı');
        page.text.set('Metin');
        page.create();
        fixture.detectChanges();

        expect(page.formError()).toContain('en fazla 3 açık talebiniz');
        expect(service.list).toHaveBeenCalledTimes(2);
    });

    it('paket Kurumsal değilse üst paket kutusu çıkar, form yok; mevcut talepler listede kalır', async () => {
        planLocked = true;
        await create();

        expect(el.querySelector('[data-testid="cd-locked"] [data-testid="plan-upgrade-notice"]')).not.toBeNull();
        expect(submit()).toBeNull();
        expect(el.querySelectorAll('[data-testid="cd-row"]').length).toBe(2);
    });

    it('talep yoksa boş durum gösterilir', async () => {
        service.list.mockReturnValue(of(list([])));
        await create();

        expect(el.querySelector('[data-testid="cd-empty"]')).not.toBeNull();
    });
});
