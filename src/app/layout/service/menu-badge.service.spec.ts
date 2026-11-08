import type { Mock } from 'vitest';
import { DestroyRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { APPOINTMENT_REQUESTS_MANAGE_CLAIM, LAB_RESULTS_READ_CLAIM, OWNER_PORTAL_MANAGE_CLAIM, VISITS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { MenuBadgeFeed } from '@/app/core/routing/menu-badge-feed';
import { LabResultsService } from '@/app/entities/lab-result/services/lab-results.service';
import { AppointmentRequestsService } from '@/app/entities/online-booking/services/online-booking.service';
import { PortalInboxService } from '@/app/entities/owner-portal/services/owner-portal.service';
import type { TodayVm } from '@/app/entities/visit/models/visit-vm.model';
import { VisitsService } from '@/app/entities/visit/services/visits.service';
import { MenuBadgeService, menuBadgeLabel } from './menu-badge.service';

describe('menuBadgeLabel', () => {
    it('0, boş ve negatif sayıda gizlidir', () => {
        expect(menuBadgeLabel(0)).toBeNull();
        expect(menuBadgeLabel(null)).toBeNull();
        expect(menuBadgeLabel(undefined)).toBeNull();
        expect(menuBadgeLabel(-1)).toBeNull();
    });

    it('99 ve altı olduğu gibi, üstü 99+ gösterilir', () => {
        expect(menuBadgeLabel(1)).toBe('1');
        expect(menuBadgeLabel(99)).toBe('99');
        expect(menuBadgeLabel(100)).toBe('99+');
    });
});

describe('MenuBadgeService', () => {
    const today = (...statuses: Array<'Waiting' | 'InProgress' | null>) => ({ date: '2026-10-13', items: statuses.map((careStatus) => ({ careStatus })), activeHospitalizations: [] }) as unknown as TodayVm;

    let claims: Set<string>;
    let clinicId: string;
    let getToday: Mock;
    let getLabResults: Mock;
    let getPendingRequests: Mock;
    let getInboxSummary: Mock;
    let service: MenuBadgeService;
    let routerEvents: Subject<unknown>;
    let navigating: boolean;

    beforeEach(() => {
        routerEvents = new Subject();
        navigating = false;
        claims = new Set([VISITS_READ_CLAIM, LAB_RESULTS_READ_CLAIM]);
        clinicId = 'clinic-1';
        getToday = vi
            .fn()
            .mockName('getToday')
            .mockReturnValue(of(today('Waiting', 'Waiting', 'InProgress', null)));
        getPendingRequests = vi
            .fn()
            .mockName('getPendingRequests')
            .mockReturnValue(of({ items: [], totalCount: 3, page: 1, pageSize: 1 }));
        getInboxSummary = vi.fn().mockName('getInboxSummary').mockReturnValue(of({ openDataRequestCount: 4, overdueDataRequestCount: 1 }));
        getLabResults = vi
            .fn()
            .mockName('getLabResults')
            .mockReturnValue(of({ items: [], page: 1, pageSize: 1, totalItems: 7, totalPages: 7 }));
        TestBed.configureTestingModule({
            providers: [
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c), getClinicId: () => clinicId } },
                { provide: VisitsService, useValue: { getToday } },
                { provide: LabResultsService, useValue: { getLabResults } },
                { provide: AppointmentRequestsService, useValue: { list: getPendingRequests } },
                { provide: PortalInboxService, useValue: { summary: getInboxSummary } },
                { provide: Router, useValue: { events: routerEvents, currentNavigation: () => (navigating ? {} : null) } }
            ]
        });
        service = TestBed.inject(MenuBadgeService);
    });

    it('bekleyen online talep sayacı yalnız kuyruk izniyle, Pending süzgeciyle tek kayıtlık sayfadan toplamı alır', () => {
        service.refresh();
        expect(getPendingRequests).not.toHaveBeenCalled();
        expect(service.count('pendingAppointmentRequests')).toBeNull();

        claims.add(APPOINTMENT_REQUESTS_MANAGE_CLAIM);
        service.refresh();
        expect(getPendingRequests).toHaveBeenCalledWith({ status: 0, page: 1, pageSize: 1 });
        expect(service.count('pendingAppointmentRequests')).toBe(3);
    });

    it('açık portal veri talebi sayacı yalnız OwnerPortal.Manage izniyle gelen kutusu özetinden alınır', () => {
        service.refresh();
        expect(getInboxSummary).not.toHaveBeenCalled();
        expect(service.count('openPortalDataRequests')).toBeNull();

        claims.add(OWNER_PORTAL_MANAGE_CLAIM);
        service.refresh();
        expect(service.count('openPortalDataRequests')).toBe(4);
    });

    it('Bugün sayacı yalnız bekleyen hastaları sayar', () => {
        service.refresh();
        expect(service.count('waitingVisits')).toBe(2);
    });

    it('lab sayacı Requested süzgeciyle tek kayıtlık sayfadan toplamı alır', () => {
        service.refresh();
        expect(service.count('requestedLabResults')).toBe(7);
        expect(getLabResults).toHaveBeenCalledWith({ page: 1, pageSize: 1, status: 'Requested' });
    });

    it('izni olmayan kullanıcı için sorgu yapılmaz ve sayaç boş kalır', () => {
        claims.delete(LAB_RESULTS_READ_CLAIM);
        claims.delete(VISITS_READ_CLAIM);
        service.refresh();
        expect(getToday).not.toHaveBeenCalled();
        expect(getLabResults).not.toHaveBeenCalled();
        expect(service.count('waitingVisits')).toBeNull();
        expect(service.count('requestedLabResults')).toBeNull();
    });

    it('izin sonradan kalkarsa sayaç temizlenir', () => {
        service.refresh();
        claims.delete(VISITS_READ_CLAIM);
        service.refresh();
        expect(service.count('waitingVisits')).toBeNull();
        expect(service.count('requestedLabResults')).toBe(7);
    });

    it('sayfa bildiriyorsa o değer gösterilir ve Bugün sorgusu atlanır; bırakınca sorgu döner', () => {
        const feed = TestBed.inject(MenuBadgeFeed);

        feed.report('waitingVisits', 5);
        service.refresh();
        expect(getToday).not.toHaveBeenCalled();
        expect(getLabResults).toHaveBeenCalledTimes(1);
        expect(service.count('waitingVisits')).toBe(5);

        feed.release('waitingVisits');
        expect(service.count('waitingVisits')).toBe(5);
        service.refresh();
        expect(getToday).toHaveBeenCalledTimes(1);
        expect(service.count('waitingVisits')).toBe(2);
    });

    it('sayfa üstlendiyse ilk sayısı gelmeden de sorgu atlanır (Bugün açılışında çift istek yok)', () => {
        const feed = TestBed.inject(MenuBadgeFeed);

        feed.claim('waitingVisits');
        service.refresh();
        expect(getToday).not.toHaveBeenCalled();
        expect(service.count('waitingVisits')).toBeNull();

        feed.report('waitingVisits', 4);
        feed.claim('waitingVisits');
        expect(service.count('waitingVisits')).toBe(4);

        // Sayfa kapanınca son bildirilen sayı bir sonraki yenilemeye kadar kalır.
        TestBed.tick();
        feed.release('waitingVisits');
        expect(service.count('waitingVisits')).toBe(4);
    });

    it('gezinme sürerken bağlanırsa ilk yenilemeyi gezinme bitip sayfa çizilince yapar; 15 sn sonra ikinci kez sorgulamaz', () => {
        vi.useFakeTimers();

        try {
            navigating = true;
            service.connect(TestBed.inject(DestroyRef));
            vi.advanceTimersByTime(1);
            expect(getLabResults).not.toHaveBeenCalled();

            routerEvents.next(new NavigationEnd(1, '/panel/today', '/panel/today'));
            expect(getLabResults).not.toHaveBeenCalled();
            TestBed.tick();
            expect(getLabResults).toHaveBeenCalledTimes(1);
            vi.advanceTimersByTime(20_000);
            expect(getLabResults).toHaveBeenCalledTimes(1);
        } finally {
            vi.useRealTimers();
        }
    });

    it('hata olursa son değer korunur', () => {
        service.refresh();
        getToday.mockReturnValue(throwError(() => new Error('ağ')));
        service.refresh();
        expect(service.count('waitingVisits')).toBe(2);
    });

    it('klinik değişince eski kliniğin sayacı yeni yanıt gelene kadar gösterilmez', () => {
        service.refresh();
        clinicId = 'clinic-2';
        getToday.mockReturnValue(new Subject());
        service.refresh();
        expect(service.count('waitingVisits')).toBeNull();
    });
});
