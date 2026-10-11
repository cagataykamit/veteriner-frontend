import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { ClinicsService } from '@/app/features/clinics/services/clinics.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { ClinicDetailPageComponent } from './clinic-detail-page.component';

const DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

describe('ClinicDetailPageComponent — çalışma saatleri ve randevu varsayılanları', () => {
    let fixture: ComponentFixture<ClinicDetailPageComponent>;
    const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

    beforeEach(async () => {
        const clinics = jasmine.createSpyObj<ClinicsService>('ClinicsService', ['getClinicById', 'getWorkingHours', 'getAppointmentSettings']);
        clinics.getClinicById.and.returnValue(
            of({ id: 'c1', name: 'Merkez Pati', city: 'İstanbul', isActive: true, phone: '', email: '', address: '', description: '' })
        );
        clinics.getWorkingHours.and.returnValue(
            of(
                DAYS.map((dayLabel, dayOfWeek) => ({
                    dayOfWeek,
                    dayLabel,
                    isClosed: dayOfWeek === 0,
                    opensAt: dayOfWeek === 0 ? null : '09:00:00',
                    closesAt: dayOfWeek === 0 ? null : '18:00:00',
                    breakStartsAt: dayOfWeek === 1 ? '12:00:00' : null,
                    breakEndsAt: dayOfWeek === 1 ? '13:00:00' : null
                }))
            )
        );
        clinics.getAppointmentSettings.and.returnValue(of({ defaultAppointmentDurationMinutes: 30, slotIntervalMinutes: 15, allowOverlappingAppointments: false }));
        await TestBed.configureTestingModule({
            imports: [ClinicDetailPageComponent],
            providers: [
                provideRouter([]),
                MessageService,
                { provide: ClinicsService, useValue: clinics },
                { provide: AuthService, useValue: { hasOperationClaim: () => true, getAccessToken: () => 't' } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } },
                { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ clinicId: 'c1' })), snapshot: { paramMap: convertToParamMap({ clinicId: 'c1' }) } } }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(ClinicDetailPageComponent);
        document.body.appendChild(fixture.nativeElement);
        fixture.detectChanges();
        await wait(100);
        fixture.detectChanges();
    });

    afterEach(() => fixture.destroy());

    it('7 gün, gün adları ve saat alanları çizilir; randevu varsayılanları yüklenir', () => {
        const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
        for (const d of DAYS) {
            expect(text).toContain(d);
        }
        const times = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('app-date-input input')) as HTMLInputElement[];
        expect(times.length).toBe(28);
        expect(times.some((i) => i.value === '09:00')).toBeTrue();
        expect(text).not.toContain('Randevu varsayılanları yükleniyor');
    });
});
