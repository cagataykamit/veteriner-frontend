import type { Mock } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { signal, type WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import type { AppointmentListItemVm } from '@/app/entities/appointment/models/appointment-vm.model';
import { AppointmentsService } from '@/app/entities/appointment/services/appointments.service';
import type { PetDetailVm } from '@/app/entities/pet/models/pet-vm.model';
import { PetsService } from '@/app/entities/pet/services/pets.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { PetStatusDialogComponent } from './pet-status-dialog.component';

const pet = { id: 'p1', name: 'Pamuk', status: 'Active', deceasedOn: null, rowVersion: 'rv1', birthDate: '2020-05-01' } as PetDetailVm;

const appt = (id: string, scheduledAtUtc: string, status = 0) => ({ id, scheduledAtUtc, status, appointmentType: 1, appointmentTypeName: null }) as AppointmentListItemVm;

describe('PetStatusDialogComponent', () => {
    let fixture: ComponentFixture<PetStatusDialogComponent>;
    let updatePetStatus: Mock;
    let getAppointments: Mock;
    let cancelAppointment: Mock;
    let claims: string[];
    let mutationBlocked: WritableSignal<boolean>;

    const create = (p: PetDetailVm) => {
        TestBed.configureTestingModule({
            imports: [PetStatusDialogComponent],
            providers: [
                provideRouter([]),
                { provide: PetsService, useValue: { updatePetStatus } },
                { provide: AppointmentsService, useValue: { getAppointments, cancelAppointment } },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.includes(c) } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked } }
            ]
        });
        fixture = TestBed.createComponent(PetStatusDialogComponent);
        fixture.componentRef.setInput('pet', p);
        fixture.componentInstance.visible.set(true);
        fixture.detectChanges();

        return fixture.componentInstance;
    };

    const text = () => (document.body.textContent ?? '').replace(/\s+/g, ' ');

    beforeEach(() => {
        updatePetStatus = vi
            .fn()
            .mockName('updatePetStatus')
            .mockReturnValue(of({ status: 'Deceased', deceasedOn: '2026-01-02', rowVersion: 'rv2' }));
        getAppointments = vi
            .fn()
            .mockName('getAppointments')
            .mockReturnValue(of({ items: [], page: 1, pageSize: 200, totalItems: 0, totalPages: 0 }));
        cancelAppointment = vi
            .fn()
            .mockName('cancelAppointment')
            .mockReturnValue(of(void 0));
        claims = ['Appointments.Read', 'Appointments.Cancel'];
        mutationBlocked = signal(false);
    });

    const withOpenAppointments = (...items: AppointmentListItemVm[]) => getAppointments.mockReturnValue(of({ items, page: 1, pageSize: 200, totalItems: items.length, totalPages: 1 }));

    it('aktif hayvanı tarih ve rowVersion ile vefat olarak işaretler, sonucu yayar ve kapanır', () => {
        const c = create(pet);
        const changed = vi.fn().mockName('changed');

        c.changed.subscribe(changed);
        c.deceasedOn.setValue('2026-01-02');

        c.onSubmit();

        expect(updatePetStatus).toHaveBeenCalledWith('p1', { status: 'Deceased', deceasedOn: '2026-01-02', rowVersion: 'rv1' });
        expect(changed).toHaveBeenCalledWith({ status: 'Deceased', deceasedOn: '2026-01-02', rowVersion: 'rv2' });
        expect(c.visible()).toBe(false);
    });

    it('tarih boşsa tarihsiz gönderir; gelecek veya doğumdan önceki tarih engellenir', () => {
        const c = create(pet);

        c.deceasedOn.setValue('2999-01-01');
        expect(c.dateError()).toContain('ileri');
        c.deceasedOn.setValue('2019-01-01');
        expect(c.dateError()).toContain('doğum');
        c.onSubmit();
        expect(updatePetStatus).not.toHaveBeenCalled();

        c.deceasedOn.setValue('');
        c.onSubmit();
        expect(updatePetStatus).toHaveBeenCalledWith('p1', { status: 'Deceased', deceasedOn: null, rowVersion: 'rv1' });
    });

    it('vefat eden hayvanda aktife alır (tarih gönderilmez, randevu listesi okunmaz)', () => {
        const c = create({ ...pet, status: 'Deceased', deceasedOn: '2026-01-02' });

        expect(c.markingDeceased()).toBe(false);
        expect(getAppointments).not.toHaveBeenCalled();
        c.onSubmit();
        expect(updatePetStatus).toHaveBeenCalledWith('p1', { status: 'Active', deceasedOn: null, rowVersion: 'rv1' });
    });

    it('409 Pets.ConcurrencyConflict mesajı gösterir ve detay yenilemesi ister', () => {
        updatePetStatus.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { title: 'Conflict', extensions: { code: 'Pets.ConcurrencyConflict' } } })));
        const c = create(pet);
        const stale = vi.fn().mockName('stale');

        c.stale.subscribe(stale);

        c.onSubmit();

        expect(stale).toHaveBeenCalled();
        expect(c.submitError()).toContain('başka biri');
        expect(c.visible()).toBe(true);
    });

    describe('açık randevular', () => {
        it('hastanın planlı randevularını sorgular; yalnız ileri tarihlileri en yakın önce listeler', () => {
            withOpenAppointments(appt('a2', '2999-02-01T09:00:00Z'), appt('old', '2000-01-01T09:00:00Z'), appt('a1', '2999-01-01T09:00:00Z'));
            const c = create(pet);

            expect(getAppointments).toHaveBeenCalledWith({ page: 1, pageSize: 200, petId: 'p1', status: '0', sort: 'scheduledAtUtc', order: 'asc' });
            expect(c.openAppointments().map((a) => a.id)).toEqual(['a1', 'a2']);
            expect(text()).toContain('Bu hastanın 2 açık randevusu var.');
            expect(text()).toContain('Açık randevuları da iptal et');
        });

        it('açık randevu yoksa bölüm görünmez', () => {
            create(pet);
            expect(document.body.querySelector('[data-testid="open-appointments"]')).toBeNull();
        });

        it('kutu varsayılan işaretsiz; işaretsizken randevu iptal çağrısı yapılmaz', () => {
            withOpenAppointments(appt('a1', '2999-01-01T09:00:00Z'));
            const c = create(pet);

            expect(c.cancelOpenAppointments.value).toBe(false);

            c.onSubmit();

            expect(updatePetStatus).toHaveBeenCalled();
            expect(cancelAppointment).not.toHaveBeenCalled();
            expect(c.visible()).toBe(false);
        });

        it('işaretliyse önce durum kaydedilir, sonra her randevu gerekçeyle iptal edilir ve pencere kapanır', () => {
            withOpenAppointments(appt('a1', '2999-01-01T09:00:00Z'), appt('a2', '2999-02-01T09:00:00Z'));
            const order: string[] = [];

            updatePetStatus.mockImplementation(() => {
                order.push('status');

                return of({ status: 'Deceased', deceasedOn: null, rowVersion: 'rv2' });
            });
            cancelAppointment.mockImplementation((id: string) => {
                order.push(id);

                return of(void 0);
            });
            const c = create(pet);
            const cancelled = vi.fn().mockName('appointmentsCancelled');

            c.appointmentsCancelled.subscribe(cancelled);
            c.cancelOpenAppointments.setValue(true);

            c.onSubmit();

            expect(order).toEqual(['status', 'a1', 'a2']);
            expect(cancelAppointment).toHaveBeenCalledWith('a1', 'Hasta vefat etti');
            expect(cancelled).toHaveBeenCalled();
            expect(c.visible()).toBe(false);
        });

        it('kısmi iptal hatası: durum geri alınmaz, iptal edilemeyenler pencerede listelenir', () => {
            withOpenAppointments(appt('a1', '2999-01-01T09:00:00Z'), appt('a2', '2999-02-01T09:00:00Z'));
            cancelAppointment.mockImplementation((id: string) => (id === 'a2' ? throwError(() => new Error('Randevu durumu bu işleme uygun değil.')) : of(void 0)));
            const c = create(pet);
            const changed = vi.fn().mockName('changed');

            c.changed.subscribe(changed);
            c.cancelOpenAppointments.setValue(true);

            c.onSubmit();
            fixture.detectChanges();

            expect(changed).toHaveBeenCalled();
            expect(c.visible()).toBe(true);
            expect(c.cancelOutcome()?.failures.map((f) => f.appointment.id)).toEqual(['a2']);
            expect(text()).toContain('2 randevudan 1 tanesi iptal edilemedi');
            expect(text()).toContain('Randevu durumu bu işleme uygun değil.');
        });

        it('durum kaydı başarısızsa randevu iptal edilmez', () => {
            withOpenAppointments(appt('a1', '2999-01-01T09:00:00Z'));
            updatePetStatus.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
            const c = create(pet);

            c.cancelOpenAppointments.setValue(true);

            c.onSubmit();

            expect(cancelAppointment).not.toHaveBeenCalled();
            expect(c.submitError()).toBeTruthy();
        });

        it('randevu iptal izni yoksa yalnız bilgi gösterir; kutu yok, iptal çağrısı yok', () => {
            claims = ['Appointments.Read'];
            withOpenAppointments(appt('a1', '2999-01-01T09:00:00Z'));
            const c = create(pet);

            c.cancelOpenAppointments.setValue(true);

            expect(text()).toContain('Bu hastanın 1 açık randevusu var.');
            expect(text()).not.toContain('Açık randevuları da iptal et');
            c.onSubmit();
            expect(cancelAppointment).not.toHaveBeenCalled();
        });

        it('abonelik salt okunursa kutu gösterilmez', () => {
            mutationBlocked.set(true);
            withOpenAppointments(appt('a1', '2999-01-01T09:00:00Z'));
            create(pet);
            expect(text()).toContain('Bu hastanın 1 açık randevusu var.');
            expect(text()).not.toContain('Açık randevuları da iptal et');
        });

        it('randevu okuma izni yoksa liste sorgulanmaz', () => {
            claims = [];
            create(pet);
            expect(getAppointments).not.toHaveBeenCalled();
        });

        it('liste yüklenemezse hata gösterilir', () => {
            getAppointments.mockReturnValue(throwError(() => new Error('Randevu listesi yüklenemedi.')));
            create(pet);
            expect(text()).toContain('Açık randevular yüklenemedi');
        });
    });
});
