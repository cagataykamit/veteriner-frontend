import type { Mock, MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { ClientsService } from '@/app/entities/client/services/clients.service';
import { PetsService } from '@/app/entities/pet/services/pets.service';
import type { TodayItemVm, VisitCreateResultVm } from '@/app/entities/visit/models/visit-vm.model';
import { VisitsService } from '@/app/entities/visit/services/visits.service';
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
        isVoided: false,
        isUrgent: false
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
    isCarriedOver: false,
    chargedAmount: null,
    allocatedAmount: null,
    outstandingAmount: null,
    clientOutstandingAmount: null,
    chargeIndicator: null,
    chargeableWorkCount: null,
    awaitingLabCount: null,
    pendingChargeCount: null,
    hasActiveHospitalization: false,
    isVoided: false,
    voidReason: null,
    petAlerts: { flags: [], note: null },
    isUrgent: false
};

describe('VisitArrivalDialogComponent', () => {
    let fixture: ComponentFixture<VisitArrivalDialogComponent>;
    let cmp: VisitArrivalDialogComponent;
    let visits: MockedObject<VisitsService>;
    let arrived: VisitCreateResultVm[];
    let getPets: Mock;
    let claims: string[];
    let userId: string | null;

    beforeEach(async () => {
        claims = [];
        userId = null;
        getPets = vi
            .fn()
            .mockName('getPets')
            .mockReturnValue(of({ items: [{ id: 'p1', clientId: 'cl1', name: 'Pamuk', speciesName: 'Kedi' }] }));
        visits = {
            createVisit: vi.fn().mockName('VisitsService.createVisit'),
            getVeterinarians: vi.fn().mockName('VisitsService.getVeterinarians')
        } as unknown as MockedObject<VisitsService>;
        visits.getVeterinarians.mockReturnValue(of([{ userId: 'u1', name: 'Dr. Ayşe' }]));

        await TestBed.configureTestingModule({
            imports: [VisitArrivalDialogComponent],
            providers: [
                { provide: VisitsService, useValue: visits },
                { provide: AuthService, useValue: { getClinicId: () => 'c1', getUserId: () => userId, hasOperationClaim: (c: string) => claims.includes(c) } },
                { provide: ClientsService, useValue: { getClientById: () => of({ fullName: 'Ali Veli' }) } },
                { provide: PetsService, useValue: { getPets } }
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
            fixture.detectChanges();
        });

        it('hasta seçimi istemeden yalnızca appointmentId gönderir; hekim seçilmediyse boş', () => {
            visits.createVisit.mockReturnValue(of(result(true)));
            expect(cmp.form.valid).toBe(true);
            cmp.onSubmit();

            expect(visits.createVisit).toHaveBeenCalledTimes(1);

            expect(visits.createVisit).toHaveBeenCalledWith({ appointmentId: 'a1', responsibleVeterinarianUserId: '', isUrgent: false });
            expect(arrived.length).toBe(1);
            expect(cmp.visible()).toBe(false);
        });

        it('çift tıklama: yanıt gelmeden ikinci gönderim ikinci istek üretmez', () => {
            const pending = new Subject<VisitCreateResultVm>();

            visits.createVisit.mockReturnValue(pending);

            cmp.onSubmit();
            cmp.onSubmit();
            expect(visits.createVisit).toHaveBeenCalledTimes(1);
            expect(cmp.submitting()).toBe(true);

            pending.next(result(true));
            pending.complete();
            expect(arrived.length).toBe(1);
            expect(cmp.submitting()).toBe(false);
        });

        it('200 / created:false yanıtı hata değildir: diyalog kapanır, sonuç üst bileşene iletilir', () => {
            visits.createVisit.mockReturnValue(of(result(false)));
            cmp.onSubmit();

            expect(cmp.submitError()).toBeNull();
            expect(arrived[0].created).toBe(false);
            expect(cmp.visible()).toBe(false);
        });

        it('hata: mesaj gösterilir, diyalog açık kalır ve tekrar denenebilir', () => {
            visits.createVisit.mockReturnValue(throwError(() => new Error('İptal edilmiş randevu için geliş kaydı açılamaz.')));
            cmp.onSubmit();

            expect(cmp.submitError()).toBe('İptal edilmiş randevu için geliş kaydı açılamaz.');
            expect(cmp.submitting()).toBe(false);
            expect(cmp.visible()).toBe(true);
            expect(arrived.length).toBe(0);
        });

        it('seçilen hekim isteğe eklenir', () => {
            visits.createVisit.mockReturnValue(of(result(true)));
            cmp.form.controls.veterinarianId.setValue('u1');
            cmp.onSubmit();

            expect(vi.mocked(visits.createVisit).mock.lastCall![0]).toEqual({ appointmentId: 'a1', responsibleVeterinarianUserId: 'u1', isUrgent: false });
        });

        it('Acil işaretlenirse isteğe isUrgent:true eklenir', () => {
            visits.createVisit.mockReturnValue(of(result(true)));
            cmp.form.controls.isUrgent.setValue(true);
            cmp.onSubmit();

            expect(vi.mocked(visits.createVisit).mock.lastCall![0]).toEqual({ appointmentId: 'a1', responsibleVeterinarianUserId: '', isUrgent: true });
        });
    });

    describe('randevusuz hızlı geliş (sunucu tarafı arama)', () => {
        const pick = () => cmp.form.controls.pet.setValue({ id: 'p1', label: 'Pamuk — Kedi · Sahip: Ali Veli', clientId: 'cl1', clientName: 'Ali Veli' });

        beforeEach(() => {
            fixture.componentRef.setInput('appointment', null);
            cmp.visible.set(true);
            fixture.detectChanges();
        });

        it('hasta seçilmeden gönderilmez', () => {
            cmp.onSubmit();
            expect(visits.createVisit).not.toHaveBeenCalled();
            expect(cmp.form.controls.pet.touched).toBe(true);
        });

        it('arama terimi sunucuya search olarak gider (yalnız aktif hayvanlar); sonuçlar sahip adıyla etiketlenir', () => {
            cmp.onPetSearch({ query: ' 985 1210 ', originalEvent: new Event('x') });

            expect(getPets).toHaveBeenCalledTimes(1);

            expect(getPets).toHaveBeenCalledWith({ page: 1, pageSize: 10, search: '985 1210', status: 'Active' });
            expect(cmp.petSuggestions()).toEqual([{ id: 'p1', label: 'Pamuk — Kedi · Sahip: Ali Veli', clientId: 'cl1', clientName: 'Ali Veli' }]);
        });

        it('boş terim istek üretmez', () => {
            cmp.onPetSearch({ query: '   ', originalEvent: new Event('x') });
            expect(getPets).not.toHaveBeenCalled();
        });

        it('arama hatasında mesaj gösterilir ve liste boşalır', () => {
            getPets.mockReturnValue(throwError(() => new Error('Sunucuya ulaşılamıyor.')));
            cmp.onPetSearch({ query: 'pam', originalEvent: new Event('x') });

            expect(cmp.loadError()).toBe('Sunucuya ulaşılamıyor.');
            expect(cmp.petSuggestions()).toEqual([]);
        });

        it('yalnızca yazılmış metin (listeden seçilmemiş) geçersizdir', () => {
            cmp.form.controls.pet.setValue('pamuk');
            expect(cmp.form.controls.pet.invalid).toBe(true);
        });

        it('seçilen hasta petId ve aktif klinikle (hekimsiz) gönderilir', () => {
            visits.createVisit.mockReturnValue(of(result(true)));
            pick();
            cmp.onSubmit();

            expect(visits.createVisit).toHaveBeenCalledTimes(1);

            expect(visits.createVisit).toHaveBeenCalledWith({ clinicId: 'c1', petId: 'p1', responsibleVeterinarianUserId: '', isUrgent: false });
        });

        it('hekim listesi yüklenemese de geliş hekimsiz kaydedilebilir', () => {
            visits.getVeterinarians.mockReturnValue(throwError(() => new Error('Hekim listesi yüklenemedi.')));
            cmp.visible.set(false);
            fixture.detectChanges();
            cmp.visible.set(true);
            fixture.detectChanges();
            pick();

            expect(cmp.loadError()).toBe('Hekim listesi yüklenemedi.');
            expect(cmp.form.valid).toBe(true);
        });
    });
});

describe('VisitArrivalDialogComponent — sorumlu hekim varsayılanı', () => {
    const open = async (
        userId: string | null,
        vets: Array<{
            userId: string;
            name: string;
        }>
    ) => {
        const visits = {
            createVisit: vi.fn().mockName('VisitsService.createVisit'),
            getVeterinarians: vi.fn().mockName('VisitsService.getVeterinarians')
        };

        visits.getVeterinarians.mockReturnValue(of(vets));
        await TestBed.configureTestingModule({
            imports: [VisitArrivalDialogComponent],
            providers: [
                { provide: VisitsService, useValue: visits },
                { provide: AuthService, useValue: { getClinicId: () => 'c1', getUserId: () => userId, hasOperationClaim: () => false } },
                { provide: ClientsService, useValue: { getClientById: () => of({ fullName: 'Ali' }) } },
                { provide: PetsService, useValue: { getPets: () => of({ items: [] }) } }
            ]
        }).compileComponents();
        const fixture = TestBed.createComponent(VisitArrivalDialogComponent);

        fixture.detectChanges();
        fixture.componentInstance.visible.set(true);
        fixture.detectChanges();

        return fixture.componentInstance;
    };

    const vets = [
        { userId: 'u1', name: 'Dr. Ayşe' },
        { userId: 'u2', name: 'Dr. Test Hekim' }
    ];

    it('hekim kullanıcıda alan kendisiyle gelir; değiştirilebilir ve temizlenebilir', async () => {
        const cmp = await open('U2', vets);

        expect(cmp.form.controls.veterinarianId.value).toBe('u2');
        cmp.form.controls.veterinarianId.setValue('u1');
        expect(cmp.form.controls.veterinarianId.value).toBe('u1');
        cmp.form.controls.veterinarianId.setValue('');
        expect(cmp.form.controls.veterinarianId.value).toBe('');
    });

    it('hekim olmayan kullanıcıda (resepsiyon) alan boş kalır', async () => {
        const cmp = await open('u9', vets);

        expect(cmp.form.controls.veterinarianId.value).toBe('');
    });
});
