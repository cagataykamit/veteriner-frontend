import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { AuthService } from '@/app/core/auth/auth.service';
import type { AppointmentEditVm } from '@/app/features/appointments/models/appointment-vm.model';
import { AppointmentsService } from '@/app/features/appointments/services/appointments.service';
import { ClinicsService } from '@/app/features/clinics/services/clinics.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AppointmentEditPageComponent } from './appointment-edit-page.component';

const APPT: AppointmentEditVm = {
    id: 'a1',
    clientId: 'cl1',
    petId: 'p1',
    clientName: 'Ali Veli',
    petName: 'Pamuk',
    scheduledAtUtc: '2026-10-14T09:00:00Z',
    durationMinutes: 30,
    appointmentType: 0,
    status: 3,
    notes: 'Kontrol'
};

describe('AppointmentEditPageComponent - durum salt okunur', () => {
    let updateAppointment: jasmine.Spy;

    const create = (appt: AppointmentEditVm = APPT) => {
        updateAppointment = jasmine.createSpy('updateAppointment').and.returnValue(of(undefined));
        TestBed.configureTestingModule({
            imports: [AppointmentEditPageComponent],
            providers: [
                provideRouter([]),
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: API_BASE_URL, useValue: 'http://api.test' },
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'a1' }), queryParamMap: convertToParamMap({}) } } },
                { provide: AuthService, useValue: { getClinicId: () => 'c1', getClinicName: () => 'Merkez', hasOperationClaim: () => true } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } },
                { provide: ClinicsService, useValue: { getWorkingHours: () => of([]), getAppointmentSettings: () => of({ slotIntervalMinutes: 15 }) } },
                { provide: AppointmentsService, useValue: { getAppointmentForEditById: () => of(appt), updateAppointment } }
            ]
        });
        spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
        const fixture = TestBed.createComponent(AppointmentEditPageComponent);

        fixture.detectChanges();

        return fixture;
    };

    it('durum seçim kutusu yok; mevcut durum rozet olarak görünür', () => {
        const el = create().nativeElement as HTMLElement;

        expect(el.querySelector('#status')).toBeNull();
        expect(el.querySelector('[data-testid="appointment-status"]')?.textContent?.trim()).toBe('Gelmedi');
        expect(el.textContent).toContain('Durum bu formdan değiştirilmez');
    });

    it('kaydette PUT gövdesi yüklenen mevcut durumu aynen taşır', () => {
        const fixture = create({ ...APPT, status: 0 });

        fixture.componentInstance.onSubmit();

        expect(updateAppointment).toHaveBeenCalledTimes(1);
        const [id, payload] = updateAppointment.calls.mostRecent().args;

        expect(id).toBe('a1');
        expect(payload.status).toBe(0);
        expect(payload.petId).toBe('p1');
        expect(payload.durationMinutes).toBe(30);
    });
});
