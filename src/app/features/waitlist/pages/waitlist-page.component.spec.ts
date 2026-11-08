import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { ClientsService } from '@/app/entities/client/services/clients.service';
import { PetsService } from '@/app/entities/pet/services/pets.service';
import { VisitsService } from '@/app/entities/visit/services/visits.service';
import type { WaitlistEntryDto } from '@/app/entities/waitlist/models/waitlist.model';
import { WaitlistService } from '@/app/entities/waitlist/services/waitlist.service';
import { WaitlistPageComponent } from './waitlist-page.component';

const entry = (over: Partial<WaitlistEntryDto> = {}): WaitlistEntryDto => ({
    id: 'e1',
    clinicId: 'c1',
    clientId: 'cl1',
    clientName: 'Ayşe Yılmaz',
    petId: 'p1',
    petName: 'Pamuk',
    preferredVeterinarianUserId: null,
    preferredVeterinarianName: null,
    appointmentType: 2,
    reasonId: null,
    reasonName: null,
    durationMinutes: null,
    earliestDate: '2026-11-09',
    latestDate: '2026-11-30',
    preferredDays: 'Monday, Wednesday',
    preferredFromTime: '09:00:00',
    preferredToTime: '12:00:00',
    note: 'Erken gelmek istiyor',
    status: 'Waiting',
    position: 1,
    isPastRange: false,
    offerBlocker: 'None',
    createdAtUtc: '2026-11-08T08:00:00Z',
    closedAtUtc: null,
    closeReason: null,
    bookedAppointmentId: null,
    openOffer: null,
    ...over
});

describe('WaitlistPageComponent (bekleme listesi, TIER-018)', () => {
    let fixture: ComponentFixture<WaitlistPageComponent>;
    let el: HTMLElement;
    let api: Record<'list' | 'move' | 'close' | 'create' | 'detail', ReturnType<typeof vi.fn>>;
    let planLocked: boolean;
    let claims: string[];

    async function create(rows: WaitlistEntryDto[]): Promise<void> {
        api.list.mockReturnValue(of(rows));
        await TestBed.configureTestingModule({
            imports: [WaitlistPageComponent],
            providers: [
                provideRouter([]),
                { provide: WaitlistService, useValue: api },
                { provide: VisitsService, useValue: { getVeterinarians: () => of([{ userId: 'v1', name: 'Dr. Can' }]) } },
                { provide: ClientsService, useValue: {} },
                { provide: PetsService, useValue: {} },
                { provide: AuthService, useValue: { getClinicId: () => 'c1', hasOperationClaim: (c: string) => claims.includes(c) } },
                {
                    provide: TenantReadOnlyContextService,
                    useValue: {
                        mutationBlocked: () => false,
                        lockedPlanFeature: () => (planLocked ? { feature: 'Waitlist', isEnabled: false, requiredPlanCode: 'Pro' } : null)
                    }
                }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(WaitlistPageComponent);
        el = fixture.nativeElement;
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    beforeEach(() => {
        planLocked = false;
        claims = ['Appointments.Read', 'Appointments.Create'];
        api = { list: vi.fn(), move: vi.fn().mockReturnValue(of(entry())), close: vi.fn(), create: vi.fn(), detail: vi.fn() };
    });

    it('seçili kliniğin sıradaki kayıtlarını ister ve satırda tercihleri gösterir', async () => {
        await create([entry()]);

        expect(api.list).toHaveBeenCalledWith({ clinicId: 'c1', veterinarianUserId: null, status: 'Waiting' });
        const row = el.querySelector('[data-testid="wl-row"]')!;
        expect(row.textContent).toContain('Pamuk');
        expect(row.textContent).toContain('Pzt, Çar');
        expect(row.textContent).toContain('09:00–12:00');
        expect(row.textContent).toContain('Fark etmez');
        expect(el.querySelector('[data-testid="wl-add"]')).not.toBeNull();
    });

    it('teklif gidemeyecek kaydı uyarır', async () => {
        await create([entry({ offerBlocker: 'NoEmail' })]);

        expect(el.querySelector('[data-testid="wl-blocker"]')?.textContent).toContain('E-postası yok');
    });

    it('açık teklifi satırda gösterir', async () => {
        await create([entry({ openOffer: { id: 'o1', status: 'Open', sourceAppointmentId: 'a1', slotStartUtc: '2026-11-11T07:00:00Z', durationMinutes: 30, veterinarianUserId: null, isAutomatic: true, createdAtUtc: '2026-11-09T07:00:00Z', expiresAtUtc: '2026-11-09T09:00:00Z', closedAtUtc: null, appointmentId: null } })]);

        expect(el.querySelector('[data-testid="wl-open-offer"]')?.textContent).toContain('Teklif bekleniyor');
    });

    it('sırayı kaydırınca listeyi yeniler', async () => {
        await create([entry({ id: 'e1', position: 1 }), entry({ id: 'e2', position: 2, petName: 'Boncuk' })]);

        const down = el.querySelectorAll<HTMLButtonElement>('button[aria-label="Sırada geriye al"]')[0];
        down.click();
        await fixture.whenStable();

        expect(api.move).toHaveBeenCalledWith('e1', 'Down');
        expect(api.list).toHaveBeenCalledTimes(2);
    });

    it('alt pakette "üst pakete geç" kutusu çıkar, ekleme düğmesi gizlenir, kayıtlar okunur', async () => {
        planLocked = true;
        await create([entry()]);

        expect(el.querySelector('[data-testid="wl-locked"]')).not.toBeNull();
        expect(el.querySelector('[data-testid="wl-add"]')).toBeNull();
        expect(el.querySelector('[data-testid="wl-row"]')).not.toBeNull();
    });

    it('randevu oluşturma izni yoksa yazma düğmeleri çıkmaz', async () => {
        claims = ['Appointments.Read'];
        await create([entry()]);

        expect(el.querySelector('[data-testid="wl-add"]')).toBeNull();
        expect(el.querySelector('[data-testid="wl-close-button"]')).toBeNull();
        expect(el.querySelector('[data-testid="wl-history-button"]')).not.toBeNull();
    });
});
