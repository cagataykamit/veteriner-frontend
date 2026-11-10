import { signal, type WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { WaitlistService } from '@/app/entities/waitlist/services/waitlist.service';
import { WaitlistTodaySummaryComponent } from './waitlist-today-summary.component';

describe('WaitlistTodaySummaryComponent (TIER-018)', () => {
    let fixture: ComponentFixture<WaitlistTodaySummaryComponent>;
    let today: ReturnType<typeof vi.fn>;
    let ready: WritableSignal<boolean>;

    async function create(): Promise<void> {
        await TestBed.configureTestingModule({
            imports: [WaitlistTodaySummaryComponent],
            providers: [
                provideRouter([]),
                { provide: WaitlistService, useValue: { today } },
                { provide: AuthService, useValue: { getClinicId: () => 'k1', hasOperationClaim: () => true } },
                { provide: TenantReadOnlyContextService, useValue: { planFeatureReady: () => ready() } }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(WaitlistTodaySummaryComponent);
        fixture.detectChanges();
        await fixture.whenStable();
    }

    beforeEach(() => {
        today = vi.fn().mockReturnValue(of({ waitingCount: 0, releasedSlots: [] }));
        ready = signal(false);
    });

    afterEach(() => fixture?.destroy());

    it('paket bilgisi gelmeden ya da kilitliyken istek göndermez; açık olduğu öğrenilince bir kez yükler', async () => {
        await create();
        expect(today).not.toHaveBeenCalled();

        ready.set(true);
        fixture.detectChanges();
        await fixture.whenStable();
        expect(today).toHaveBeenCalledTimes(1);
        expect(today).toHaveBeenCalledWith('k1');
    });
});
