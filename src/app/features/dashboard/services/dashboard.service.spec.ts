import type { MockedObject } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { DashboardService } from '@/app/features/dashboard/services/dashboard.service';
import { AppointmentsService } from '@/app/entities/appointment/services/appointments.service';
import { ExaminationsService } from '@/app/entities/examination/services/examinations.service';
import { VaccinationsService } from '@/app/features/vaccinations/services/vaccinations.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { upcomingVaccinationsFilters, vaccinationsListLinkQuery } from '@/app/features/vaccinations/utils/vaccinations-list-link.utils';

describe('DashboardService — liste fazı istekleri', () => {
    const emptyPage = { items: [], page: 1, pageSize: 8, totalItems: 0, totalPages: 0 };
    let vaccinations: MockedObject<VaccinationsService>;
    let examinations: MockedObject<ExaminationsService>;
    let service: DashboardService;

    beforeEach(() => {
        vi.useFakeTimers();
        vaccinations = {
            getVaccinations: vi.fn().mockName('VaccinationsService.getVaccinations')
        } as unknown as MockedObject<VaccinationsService>;
        examinations = {
            getExaminations: vi.fn().mockName('ExaminationsService.getExaminations')
        } as unknown as MockedObject<ExaminationsService>;
        const appointments = {
            getAppointments: vi.fn().mockName('AppointmentsService.getAppointments')
        };

        vaccinations.getVaccinations.mockReturnValue(of(emptyPage));
        examinations.getExaminations.mockReturnValue(of(emptyPage));
        appointments.getAppointments.mockReturnValue(of(emptyPage));
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

    afterEach(() => vi.useRealTimers());

    it('yaklaşan aşılar: planlı, vefat edenler hariç, vadesi bugünün İstanbul gününden itibaren, vadeye göre artan (kanonik sort adı)', () => {
        // 2026-10-14 22:30Z = İstanbul 15 Ekim 01:30 — gün İstanbul'a göre alınır.
        vi.setSystemTime(new Date('2026-10-14T22:30:00Z'));
        service.loadDashboardListsPhase().subscribe();
        expect(vaccinations.getVaccinations).toHaveBeenCalledWith(expect.objectContaining({ status: '0', onlyReceivingCare: true, fromDate: '2026-10-15', sort: 'dueAtUtc', order: 'asc', pageSize: 8 }));
        const q = vi.mocked(vaccinations.getVaccinations).mock.lastCall![0];

        expect(q.toDate).toBeUndefined();
    });

    it('kartın "Tümü →" bağlantısı kartın API sorgusuyla aynı süzgeci taşır', () => {
        vi.setSystemTime(new Date('2026-10-14T22:30:00Z'));
        service.loadDashboardListsPhase().subscribe();
        const q = vi.mocked(vaccinations.getVaccinations).mock.lastCall![0];

        expect(vaccinationsListLinkQuery(upcomingVaccinationsFilters())).toEqual({
            status: q.status!,
            fromDate: q.fromDate!,
            onlyReceivingCare: String(q.onlyReceivingCare)
        });
    });

    it('son muayeneler kanonik examinedAtUtc ile azalan istenir', () => {
        vi.setSystemTime(new Date('2026-10-15T09:00:00Z'));
        service.loadDashboardListsPhase().subscribe();
        expect(examinations.getExaminations).toHaveBeenCalledWith(expect.objectContaining({ sort: 'examinedAtUtc', order: 'desc' }));
    });
});
