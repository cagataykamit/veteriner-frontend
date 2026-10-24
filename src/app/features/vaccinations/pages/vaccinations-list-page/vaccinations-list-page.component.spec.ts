import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { VACCINE_DEFINITIONS_READ_CLAIM, VACCINATIONS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { VaccinationListItemVm } from '@/app/features/vaccinations/models/vaccination-vm.model';
import { VaccinationsService } from '@/app/features/vaccinations/services/vaccinations.service';
import { isRightAfterDetail, rowEditActions } from '@/app/shared/ui/row-action-button/row-action-button.testing';
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
                { provide: AuthService, useValue: { hasOperationClaim: () => true } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
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
                queryParams: { status: null, fromDate: null, toDate: null, onlyReceivingCare: null, hbsStatus: null, overdue: null },
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

/** ADR-026 madde 6: Düzenle, detay sayfasındaki Düzenle ile aynı yetki ve salt okunur koşuluyla satırda Detay'ın yanındadır. */
describe('VaccinationsListPageComponent — satırda Düzenle', () => {
    const vac: VaccinationListItemVm = {
        id: 'v1',
        appliedAtUtc: '2026-10-10T07:00:00Z',
        dueAtUtc: null,
        vaccineName: 'Kuduz',
        petId: 'p1',
        petName: 'Pamuk',
        clientId: 'c1',
        clientName: 'Ali Veli',
        status: 1,
        notes: '',
        administrationId: null,
        hbsStatus: 'Entered'
    };

    const create = (claims: string[], mutationBlocked = false): HTMLElement => {
        TestBed.configureTestingModule({
            imports: [VaccinationsListPageComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
                { provide: VaccinationsService, useValue: { getVaccinations: () => of({ items: [vac], page: 1, pageSize: 10, totalItems: 1, totalPages: 1 }) } },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.includes(c) } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => mutationBlocked } }
            ]
        });
        const fixture = TestBed.createComponent(VaccinationsListPageComponent);

        fixture.detectChanges();

        return fixture.nativeElement as HTMLElement;
    };

    beforeEach(() => sessionStorage.removeItem(STATE_KEY));
    afterEach(() => sessionStorage.removeItem(STATE_KEY));

    /** Düzenleme rotası aşı kataloğunu da okur; rota koruması VaccineDefinitions.Read ister. */
    const EDIT_CLAIMS = [VACCINATIONS_UPDATE_CLAIM, VACCINE_DEFINITIONS_READ_CLAIM];

    it("Vaccinations.Update ve VaccineDefinitions.Read varsa tablo ve mobil kartta Detay'dan hemen sonra düzenleme sayfasına gider", () => {
        const edits = rowEditActions(create(EDIT_CLAIMS));

        expect(edits.length).withContext('tablo + mobil kart').toBe(2);

        for (const edit of edits) {
            expect(edit.getAttribute('href')).toBe('/panel/vaccinations/v1/edit');
            expect(isRightAfterDetail(edit)).toBeTrue();
        }
    });

    it('yetki yoksa ya da yalnız Vaccinations.Update varsa (rota /notfound verir) Düzenle görünmez; salt okunur kiracıda pasiftir', () => {
        expect(rowEditActions(create([])).length).toBe(0);

        TestBed.resetTestingModule();
        expect(rowEditActions(create([VACCINATIONS_UPDATE_CLAIM])).length).toBe(0);

        TestBed.resetTestingModule();
        const readOnly = rowEditActions(create(EDIT_CLAIMS, true));

        expect(readOnly.length).toBe(2);
        expect(readOnly.every((e) => e.tagName === 'BUTTON' && e.getAttribute('aria-disabled') === 'true')).toBeTrue();
    });
});
