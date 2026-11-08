import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { WaitlistSlotDto } from '@/app/entities/waitlist/models/waitlist.model';
import { WaitlistService } from '@/app/entities/waitlist/services/waitlist.service';
import { WaitlistSlotNoticeComponent } from './waitlist-slot-notice.component';

const slot = (over: Partial<WaitlistSlotDto> = {}): WaitlistSlotDto => ({
    appointmentId: 'a1',
    startUtc: '2026-11-11T07:00:00Z',
    durationMinutes: 30,
    veterinarianUserId: null,
    isReleased: true,
    autoOfferEnabled: true,
    eligibleCount: 1,
    blockedCount: 0,
    openOffer: null,
    isBooked: false,
    candidates: [{ entryId: 'e1', position: 1, petName: 'Pamuk', clientName: 'Ayşe', offerBlocker: 'None' }],
    ...over
});

describe('WaitlistSlotNoticeComponent (iptalde bekleme listesi bilgisi, TIER-018)', () => {
    let fixture: ComponentFixture<WaitlistSlotNoticeComponent>;
    let el: HTMLElement;
    let api: { slot: ReturnType<typeof vi.fn>; sendOffer: ReturnType<typeof vi.fn> };
    let planLocked: boolean;

    async function create(value: WaitlistSlotDto): Promise<void> {
        api.slot.mockReturnValue(of(value));
        await TestBed.configureTestingModule({
            imports: [WaitlistSlotNoticeComponent],
            providers: [
                provideRouter([]),
                { provide: WaitlistService, useValue: api },
                { provide: AuthService, useValue: { hasOperationClaim: () => true } },
                {
                    provide: TenantReadOnlyContextService,
                    useValue: { mutationBlocked: () => false, lockedPlanFeature: () => (planLocked ? { feature: 'Waitlist', isEnabled: false, requiredPlanCode: 'Pro' } : null) }
                }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(WaitlistSlotNoticeComponent);
        fixture.componentRef.setInput('appointmentId', 'a1');
        el = fixture.nativeElement;
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    beforeEach(() => {
        planLocked = false;
        api = { slot: vi.fn(), sendOffer: vi.fn().mockReturnValue(of({})) };
    });

    it('otomatik teklif açıkken uygun kişi sayısını gösterir, elle gönderim sunmaz', async () => {
        await create(slot());

        expect(el.querySelector('[data-testid="waitlist-slot-notice"]')?.textContent).toContain('uygun 1 kişi var');
        expect(el.querySelector('[data-testid="waitlist-send-offer"]')).toBeNull();
    });

    it('otomatik teklif kapalıyken sıradakine elle teklif gönderir', async () => {
        await create(slot({ autoOfferEnabled: false }));

        el.querySelector<HTMLButtonElement>('[data-testid="waitlist-send-offer"]')!.click();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(api.sendOffer).toHaveBeenCalledWith('e1', 'a1');
        expect(el.querySelector('[data-testid="waitlist-send-feedback"]')?.textContent).toContain('Teklif gönderildi');
    });

    it('uyan kimse yoksa ya da pakette yoksa çizilmez', async () => {
        planLocked = true;
        await create(slot());

        expect(api.slot).not.toHaveBeenCalled();
        expect(el.querySelector('[data-testid="waitlist-slot-notice"]')).toBeNull();
    });
});
