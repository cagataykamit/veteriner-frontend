import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { VaccinationsService } from '@/app/features/vaccinations/services/vaccinations.service';
import { VaccinationsListPageComponent } from './vaccinations-list-page.component';

const STATE_KEY = 'panel:vaccinations:listState';

describe('VaccinationsListPageComponent — karttan gelen süzgeç bağlantısı', () => {
    const setup = (query: Record<string, string>) => {
        const getVaccinations = jasmine
            .createSpy('getVaccinations')
            .and.returnValue(of({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 }));

        TestBed.configureTestingModule({
            imports: [VaccinationsListPageComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } },
                { provide: VaccinationsService, useValue: { getVaccinations } },
                { provide: AuthService, useValue: { hasOperationClaim: () => true } }
            ]
        });
        const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
        const fixture = TestBed.createComponent(VaccinationsListPageComponent);

        fixture.detectChanges();

        return { getVaccinations, navigate, cmp: fixture.componentInstance };
    };

    beforeEach(() => sessionStorage.removeItem(STATE_KEY));
    afterEach(() => sessionStorage.removeItem(STATE_KEY));

    it('status, tarih aralığı ve onlyReceivingCare API çağrısına gider, süzgeç çubuğunda etkin görünür ve adresten kaldırılır', () => {
        const { getVaccinations, navigate, cmp } = setup({ status: '0', fromDate: '2026-10-16', toDate: '2026-10-23', onlyReceivingCare: 'true' });
        const args = getVaccinations.calls.mostRecent().args[0];

        expect(args.status).toBe('0');
        expect(args.fromDate).toBe('2026-10-16');
        expect(args.toDate).toBe('2026-10-23');
        expect(args.onlyReceivingCare).toBeTrue();
        expect(args.onlyOverdue).toBeUndefined();
        expect(cmp.isStatusActive()).toBeTrue();
        expect(cmp.isFromDateActive()).toBeTrue();
        expect(cmp.isToDateActive()).toBeTrue();
        expect(cmp.isReceivingCareActive()).toBeTrue();
        expect(navigate).toHaveBeenCalledWith(
            [],
            jasmine.objectContaining({
                queryParams: { status: null, fromDate: null, toDate: null, onlyReceivingCare: null, overdue: null },
                replaceUrl: true
            })
        );
    });

    it('bağlantı süzgeçleri oturumdaki eski süzgeçlerin (arama, sayfa) yerine geçer ve oturuma yazılır', () => {
        sessionStorage.setItem(STATE_KEY, JSON.stringify({ search: 'eski', status: '1', fromDate: '2025-01-01', toDate: '2025-01-31', page: 3, pageSize: 20 }));

        const { getVaccinations } = setup({ status: '0', fromDate: '2026-10-16', onlyReceivingCare: 'true' });
        const args = getVaccinations.calls.mostRecent().args[0];

        expect(args.search).toBeUndefined();
        expect(args.toDate).toBeUndefined();
        expect(args.page).toBe(1);
        expect(JSON.parse(sessionStorage.getItem(STATE_KEY)!)).toEqual(jasmine.objectContaining({ status: '0', fromDate: '2026-10-16', onlyReceivingCare: true }));
    });

    it('süzgeç parametresi yoksa oturum durumu (yaşayanlar süzgeci dahil) korunur; Temizle süzgeci kaldırır', () => {
        sessionStorage.setItem(STATE_KEY, JSON.stringify({ search: '', status: '2', fromDate: '', toDate: '', page: 2, pageSize: 10, onlyReceivingCare: true }));

        const { getVaccinations, cmp } = setup({ status: 'x' });
        const args = getVaccinations.calls.mostRecent().args[0];

        expect(args.status).toBe('2');
        expect(args.onlyReceivingCare).toBeTrue();
        expect(args.page).toBe(2);

        cmp.resetFilters();
        expect(getVaccinations.calls.mostRecent().args[0].onlyReceivingCare).toBeUndefined();
        expect(cmp.isReceivingCareActive()).toBeFalse();
    });

    it('gecikmiş derin bağlantısı (overdue=true) önceliklidir', () => {
        const { getVaccinations } = setup({ overdue: 'true', fromDate: '2026-10-16' });
        const args = getVaccinations.calls.mostRecent().args[0];

        expect(args.onlyOverdue).toBeTrue();
        expect(args.status).toBe('0');
        expect(args.fromDate).toBeUndefined();
    });
});
