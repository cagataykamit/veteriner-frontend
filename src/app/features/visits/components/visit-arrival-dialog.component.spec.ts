import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import { PetsService } from '@/app/features/pets/services/pets.service';
import type { TodayItemVm, VisitCreateResultVm } from '@/app/features/visits/models/visit-vm.model';
import { VisitsService } from '@/app/features/visits/services/visits.service';
import { VisitArrivalDialogComponent } from './visit-arrival-dialog.component';

const result = (created: boolean): VisitCreateResultVm => ({
    created,
    visit: {
        id: 'v1',
        clinicId: 'c1',
        petId: 'p1',
        appointmentId: null,
        responsibleVeterinarianUserId: null,
        responsibleVeterinarianName: null,
        arrivedAtUtc: '2026-10-10T07:00:00Z',
        careStatus: 'Waiting',
        isVoided: false
    }
});

const plannedItem: TodayItemVm = {
    key: 'a1',
    visitId: null,
    appointmentId: 'a1',
    petId: 'p1',
    petName: 'Pamuk',
    speciesName: 'Kedi',
    clientId: 'cl1',
    clientName: 'Ali Veli',
    clientPhone: null,
    scheduledAtUtc: '2026-10-10T07:00:00Z',
    arrivedAtUtc: null,
    careStatus: null,
    appointmentStatus: 'Scheduled',
    responsibleVeterinarianName: null,
    isCarriedOver: false
};

describe('VisitArrivalDialogComponent', () => {
    let fixture: ComponentFixture<VisitArrivalDialogComponent>;
    let cmp: VisitArrivalDialogComponent;
    let visits: jasmine.SpyObj<VisitsService>;
    let arrived: VisitCreateResultVm[];

    beforeEach(async () => {
        visits = jasmine.createSpyObj<VisitsService>('VisitsService', ['createVisit', 'getVeterinarians']);
        visits.getVeterinarians.and.returnValue(of([{ userId: 'u1', name: 'Dr. Ayşe' }]));

        await TestBed.configureTestingModule({
            imports: [VisitArrivalDialogComponent],
            providers: [
                { provide: VisitsService, useValue: visits },
                { provide: AuthService, useValue: { getClinicId: () => 'c1' } },
                { provide: ClientsService, useValue: { getClients: () => of({ items: [{ id: 'cl1', fullName: 'Ali Veli', phone: '5551112233' }] }) } },
                {
                    provide: PetsService,
                    useValue: { getPets: () => of({ items: [{ id: 'p1', clientId: 'cl1', name: 'Pamuk', speciesName: 'Kedi' }] }) }
                }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(VisitArrivalDialogComponent);
        cmp = fixture.componentInstance;
        arrived = [];
        cmp.arrived.subscribe((r) => arrived.push(r));
        fixture.detectChanges();
    });

    describe('randevudan Geldi', () => {
        beforeEach(() => {
            fixture.componentRef.setInput('appointment', plannedItem);
            cmp.visible.set(true);
            cmp.onDialogShow();
        });

        it('hasta seçimi istemeden yalnızca appointmentId gönderir; hekim seçilmediyse boş', () => {
            visits.createVisit.and.returnValue(of(result(true)));
            expect(cmp.form.valid).toBeTrue();
            cmp.onSubmit();

            expect(visits.createVisit).toHaveBeenCalledOnceWith({ appointmentId: 'a1', responsibleVeterinarianUserId: '' });
            expect(arrived.length).toBe(1);
            expect(cmp.visible()).toBeFalse();
        });

        it('çift tıklama: yanıt gelmeden ikinci gönderim ikinci istek üretmez', () => {
            const pending = new Subject<VisitCreateResultVm>();
            visits.createVisit.and.returnValue(pending);

            cmp.onSubmit();
            cmp.onSubmit();
            expect(visits.createVisit).toHaveBeenCalledTimes(1);
            expect(cmp.submitting()).toBeTrue();

            pending.next(result(true));
            pending.complete();
            expect(arrived.length).toBe(1);
            expect(cmp.submitting()).toBeFalse();
        });

        it('200 / created:false yanıtı hata değildir: diyalog kapanır, sonuç üst bileşene iletilir', () => {
            visits.createVisit.and.returnValue(of(result(false)));
            cmp.onSubmit();

            expect(cmp.submitError()).toBeNull();
            expect(arrived[0].created).toBeFalse();
            expect(cmp.visible()).toBeFalse();
        });

        it('hata: mesaj gösterilir, diyalog açık kalır ve tekrar denenebilir', () => {
            visits.createVisit.and.returnValue(throwError(() => new Error('İptal edilmiş randevu için geliş kaydı açılamaz.')));
            cmp.onSubmit();

            expect(cmp.submitError()).toBe('İptal edilmiş randevu için geliş kaydı açılamaz.');
            expect(cmp.submitting()).toBeFalse();
            expect(cmp.visible()).toBeTrue();
            expect(arrived.length).toBe(0);
        });

        it('seçilen hekim isteğe eklenir', () => {
            visits.createVisit.and.returnValue(of(result(true)));
            cmp.form.controls.veterinarianId.setValue('u1');
            cmp.onSubmit();

            expect(visits.createVisit.calls.mostRecent().args[0]).toEqual({ appointmentId: 'a1', responsibleVeterinarianUserId: 'u1' });
        });
    });

    describe('randevusuz hızlı geliş', () => {
        beforeEach(() => {
            fixture.componentRef.setInput('appointment', null);
            cmp.visible.set(true);
            cmp.onDialogShow();
        });

        it('müşteri ve hayvan seçilmeden gönderilmez', () => {
            cmp.onSubmit();
            expect(visits.createVisit).not.toHaveBeenCalled();
            expect(cmp.form.controls.clientId.touched).toBeTrue();
        });

        it('müşteri → hayvan seçilince petId ve aktif klinikle (hekimsiz) gönderilir', () => {
            visits.createVisit.and.returnValue(of(result(true)));
            cmp.form.controls.clientId.setValue('cl1');
            expect(cmp.form.controls.petId.enabled).toBeTrue();
            expect(cmp.petOptions().map((o) => o.value)).toEqual(['p1']);
            cmp.form.controls.petId.setValue('p1');
            cmp.onSubmit();

            expect(visits.createVisit).toHaveBeenCalledOnceWith({ clinicId: 'c1', petId: 'p1', responsibleVeterinarianUserId: '' });
        });

        it('hekim listesi yüklenemese de geliş hekimsiz kaydedilebilir', () => {
            visits.getVeterinarians.and.returnValue(throwError(() => new Error('Hekim listesi yüklenemedi.')));
            cmp.onDialogShow();
            cmp.form.controls.clientId.setValue('cl1');
            cmp.form.controls.petId.setValue('p1');

            expect(cmp.loadError()).toBe('Hekim listesi yüklenemedi.');
            expect(cmp.form.valid).toBeTrue();
        });
    });
});
