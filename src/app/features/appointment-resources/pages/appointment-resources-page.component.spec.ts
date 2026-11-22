import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { AppointmentResourceVm } from '@/app/entities/appointment-resource/models/appointment-resource.model';
import { AppointmentResourceError, AppointmentResourcesService } from '@/app/entities/appointment-resource/services/appointment-resources.service';
import { ClinicsService } from '@/app/entities/clinic/services/clinics.service';
import { AppointmentResourcesPageComponent } from './appointment-resources-page.component';

const resource = (id: string, over: Partial<AppointmentResourceVm> = {}): AppointmentResourceVm => ({
    id,
    clinicId: 'k1',
    name: 'Ameliyathane',
    type: 'Room',
    capacity: 1,
    sortOrder: 1,
    isActive: true,
    ...over
});

describe('AppointmentResourcesPageComponent (Tanımlar > Oda ve cihazlar)', () => {
    let fixture: ComponentFixture<AppointmentResourcesPageComponent>;
    let service: { list: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; setActive: ReturnType<typeof vi.fn> };
    let claims: Set<string>;

    const el = () => fixture.nativeElement as HTMLElement;
    const cmp = () => fixture.componentInstance;

    async function create(): Promise<void> {
        await TestBed.configureTestingModule({
            imports: [AppointmentResourcesPageComponent],
            providers: [
                provideRouter([]),
                { provide: AppointmentResourcesService, useValue: service },
                { provide: ClinicsService, useValue: { listClinics: () => of([{ id: 'k1', name: 'Pati', isActive: true }]) } },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c), getClinicId: () => 'k1', getClinicName: () => 'Pati' } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(AppointmentResourcesPageComponent);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    beforeEach(() => {
        claims = new Set(['Clinics.Update']);
        service = {
            list: vi.fn().mockReturnValue(of([resource('r1'), resource('e1', { name: 'Ultrason', type: 'Equipment', capacity: 2, isActive: false })])),
            create: vi.fn().mockReturnValue(of(resource('r3'))),
            update: vi.fn().mockReturnValue(of(resource('r1'))),
            setActive: vi.fn().mockReturnValue(of(resource('e1')))
        };
    });

    it('kaynakları tür, kapasite ve durumla listeler', async () => {
        await create();
        const rows = Array.from(el().querySelectorAll('[data-testid="resource-row"]')).map((r) => (r.textContent ?? '').replace(/\s+/g, ' '));

        expect(service.list).toHaveBeenCalledWith('k1');
        expect(rows[0]).toContain('Ameliyathane');
        expect(rows[0]).toContain('Oda');
        expect(rows[0]).toContain('1 randevu');
        expect(rows[1]).toContain('Cihaz');
        expect(rows[1]).toContain('2 randevu');
        expect(rows[1]).toContain('Pasif');
        expect(rows[1]).toContain('Etkinleştir');
    });

    it('yeni kaynak tür, ad, kapasite ve sırayla gönderilir; liste yenilenir', async () => {
        await create();
        cmp().open(null);
        cmp().form.patchValue({ type: 'Equipment', name: ' Röntgen ', capacity: 1 });
        cmp().submit();

        expect(service.create).toHaveBeenCalledWith('k1', { type: 'Equipment', name: ' Röntgen ', capacity: 1, sortOrder: 2 });
        expect(service.list).toHaveBeenCalledTimes(2);
        expect(cmp().dialogVisible()).toBe(false);
    });

    it('düzenlemede tür kilitli; kapasite sınırı formda denetlenir', async () => {
        await create();
        cmp().open(resource('r1'));

        expect(cmp().form.controls.type.disabled).toBe(true);
        cmp().form.patchValue({ capacity: 21 });
        cmp().submit();
        expect(service.update).not.toHaveBeenCalled();

        cmp().form.patchValue({ capacity: 3 });
        cmp().submit();
        expect(service.update).toHaveBeenCalledWith('k1', 'r1', expect.objectContaining({ type: 'Room', capacity: 3 }));
    });

    it('ad çakışması pencerede gösterilir', async () => {
        service.create.mockReturnValue(throwError(() => new AppointmentResourceError('Bu klinikte bu adda aktif bir oda ya da cihaz zaten var.', false)));
        await create();
        cmp().open(null);
        cmp().form.patchValue({ name: 'Ameliyathane' });
        cmp().submit();

        expect(cmp().dialogVisible()).toBe(true);
        expect(cmp().dialogError()).toContain('bu adda');
    });

    it('yetkisiz kullanıcı yeni kayıt ve işlem düğmelerini görmez', async () => {
        claims = new Set();
        await create();

        expect(el().querySelector('[data-testid="resource-new"]')).toBeNull();
        expect(el().textContent).toContain('liste salt okunurdur');
        expect(el().textContent).not.toContain('Pasife al');
    });
});
