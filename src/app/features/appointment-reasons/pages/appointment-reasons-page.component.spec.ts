import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { ClinicsService } from '@/app/entities/clinic/services/clinics.service';
import type { AppointmentReasonVm } from '@/app/entities/online-booking/models/online-booking.model';
import { AppointmentReasonsService } from '@/app/entities/online-booking/services/online-booking.service';
import { VisitsService } from '@/app/entities/visit/services/visits.service';
import { AppointmentReasonsPageComponent } from './appointment-reasons-page.component';

const reason = (id: string, over: Partial<AppointmentReasonVm> = {}): AppointmentReasonVm => ({
    id,
    clinicId: 'k1',
    name: 'Aşı',
    defaultDurationMinutes: 15,
    isOnlineBookable: true,
    sortOrder: 1,
    isActive: true,
    veterinarianUserIds: [],
    ...over
});

describe('AppointmentReasonsPageComponent', () => {
    let fixture: ComponentFixture<AppointmentReasonsPageComponent>;
    let service: { list: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; setActive: ReturnType<typeof vi.fn> };
    let claims: Set<string>;

    async function create(): Promise<void> {
        await TestBed.configureTestingModule({
            imports: [AppointmentReasonsPageComponent],
            providers: [
                provideRouter([]),
                { provide: AppointmentReasonsService, useValue: service },
                { provide: VisitsService, useValue: { getVeterinarians: () => of([{ userId: 'v1', name: 'Dr. Can' }, { userId: 'v2', name: 'Dr. Ece' }]) } },
                { provide: ClinicsService, useValue: { listClinics: () => of([{ id: 'k1', name: 'Pati', isActive: true }]) } },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c), getClinicId: () => 'k1', getClinicName: () => 'Pati' } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(AppointmentReasonsPageComponent);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    beforeEach(() => {
        claims = new Set(['Clinics.Update']);
        service = {
            list: vi.fn().mockReturnValue(of([reason('r1', { veterinarianUserIds: ['v2'] }), reason('r2', { name: 'Cerrahi', isActive: false, isOnlineBookable: false })])),
            create: vi.fn().mockReturnValue(of(reason('r3'))),
            update: vi.fn().mockReturnValue(of(reason('r1'))),
            setActive: vi.fn().mockReturnValue(of(reason('r2')))
        };
    });

    it('nedenleri süre, online görünürlük ve uygun hekim adlarıyla listeler', async () => {
        await create();
        const rows = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[data-testid="reason-row"]')).map((r) => (r.textContent ?? '').replace(/\s+/g, ' '));

        expect(rows[0]).toContain('Aşı');
        expect(rows[0]).toContain('15 dk');
        expect(rows[0]).toContain('Dr. Ece');
        expect(rows[1]).toContain('Gizli');
        expect(rows[1]).toContain('Pasif');
    });

    it('yeni neden seçilen hekimlerle kaydedilir', async () => {
        await create();
        const cmp = fixture.componentInstance;

        cmp.openCreate();
        cmp.form.patchValue({ name: 'Kontrol', defaultDurationMinutes: 20 });
        cmp.toggleVet('v1', true);
        cmp.submit();

        expect(service.create).toHaveBeenCalledWith('k1', expect.objectContaining({ name: 'Kontrol', defaultDurationMinutes: 20, veterinarianUserIds: ['v1'], sortOrder: 2 }));
        expect(cmp.dialogVisible()).toBe(false);
    });

    it('online görünür "Acil" nedeni uyarı simgesiyle işaretlenir; "Diğer" seçeneği anlatılır (ADR-042 eki)', async () => {
        service.list.mockReturnValue(of([reason('r1'), reason('r2', { name: 'ACİL muayene' }), reason('r3', { name: 'Acil', isOnlineBookable: false })]));
        await create();
        const el = fixture.nativeElement as HTMLElement;
        const rows = Array.from(el.querySelectorAll('[data-testid="reason-row"]'));

        expect(rows.map((r) => !!r.querySelector('[data-testid="reason-urgent-online"]'))).toEqual([false, true, false]);
        expect(el.querySelector('[data-testid="reasons-other-note"]')?.textContent).toContain('Diğer / emin değilim');
    });

    it('yetkisiz kullanıcı düzenleme penceresi açamaz', async () => {
        claims = new Set(['Appointments.Create']);
        await create();
        const cmp = fixture.componentInstance;

        cmp.openCreate();
        expect(cmp.dialogVisible()).toBe(false);
        expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="reason-new"]')).toBeNull();
    });
});
