import type { Mock } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { LAB_RESULTS_READ_CLAIM, VISITS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { LabResultsService } from '@/app/entities/lab-result/services/lab-results.service';
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
    let service: MenuBadgeService;

    beforeEach(() => {
        claims = new Set([VISITS_READ_CLAIM, LAB_RESULTS_READ_CLAIM]);
        clinicId = 'clinic-1';
        getToday = vi
            .fn()
            .mockName('getToday')
            .mockReturnValue(of(today('Waiting', 'Waiting', 'InProgress', null)));
        getLabResults = vi
            .fn()
            .mockName('getLabResults')
            .mockReturnValue(of({ items: [], page: 1, pageSize: 1, totalItems: 7, totalPages: 7 }));
        TestBed.configureTestingModule({
            providers: [
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c), getClinicId: () => clinicId } },
                { provide: VisitsService, useValue: { getToday } },
                { provide: LabResultsService, useValue: { getLabResults } },
                { provide: Router, useValue: { events: new Subject() } }
            ]
        });
        service = TestBed.inject(MenuBadgeService);
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
