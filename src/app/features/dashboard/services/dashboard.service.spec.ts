import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { DashboardService } from '@/app/features/dashboard/services/dashboard.service';
import { AppointmentsService } from '@/app/features/appointments/services/appointments.service';
import { ExaminationsService } from '@/app/features/examinations/services/examinations.service';
import { VaccinationsService } from '@/app/features/vaccinations/services/vaccinations.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';

describe('DashboardService — liste fazı istekleri', () => {
    const emptyPage = { items: [], page: 1, pageSize: 8, totalItems: 0, totalPages: 0 };
    let vaccinations: jasmine.SpyObj<VaccinationsService>;
    let examinations: jasmine.SpyObj<ExaminationsService>;
    let service: DashboardService;

    beforeEach(() => {
        jasmine.clock().install();
        vaccinations = jasmine.createSpyObj<VaccinationsService>('VaccinationsService', ['getVaccinations']);
        examinations = jasmine.createSpyObj<ExaminationsService>('ExaminationsService', ['getExaminations']);
        const appointments = jasmine.createSpyObj<AppointmentsService>('AppointmentsService', ['getAppointments']);

        vaccinations.getVaccinations.and.returnValue(of(emptyPage));
        examinations.getExaminations.and.returnValue(of(emptyPage));
        appointments.getAppointments.and.returnValue(of(emptyPage));
        TestBed.configureTestingModule({
            providers: [
                { provide: ApiClient, useValue: {} },
                { provide: AppointmentsService, useValue: appointments },
                { provide: VaccinationsService, useValue: vaccinations },
                { provide: ExaminationsService, useValue: examinations },
                { provide: TenantReadOnlyContextService, useValue: {} }
            ]
        });
        service = TestBed.inject(DashboardService);
    });

    afterEach(() => jasmine.clock().uninstall());

    it('yaklaşan aşılar: planlı, vefat edenler hariç, vadesi bugünün İstanbul gününden itibaren, vadeye göre artan (kanonik sort adı)', () => {
        // 2026-10-14 22:30Z = İstanbul 15 Ekim 01:30 — gün İstanbul'a göre alınır.
        jasmine.clock().mockDate(new Date('2026-10-14T22:30:00Z'));
        service.loadDashboardListsPhase().subscribe();
        expect(vaccinations.getVaccinations).toHaveBeenCalledWith(
            jasmine.objectContaining({ status: '0', onlyReceivingCare: true, fromDate: '2026-10-15', sort: 'dueAtUtc', order: 'asc', pageSize: 8 })
        );
        const q = vaccinations.getVaccinations.calls.mostRecent().args[0];

        expect(q.toDate).toBeUndefined();
    });

    it('son muayeneler kanonik examinedAtUtc ile azalan istenir', () => {
        jasmine.clock().mockDate(new Date('2026-10-15T09:00:00Z'));
        service.loadDashboardListsPhase().subscribe();
        expect(examinations.getExaminations).toHaveBeenCalledWith(jasmine.objectContaining({ sort: 'examinedAtUtc', order: 'desc' }));
    });
});
