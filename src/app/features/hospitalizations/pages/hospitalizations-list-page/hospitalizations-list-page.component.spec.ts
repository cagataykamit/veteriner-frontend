import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { HOSPITALIZATIONS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import type { HospitalizationListItemVm } from '@/app/features/hospitalizations/models/hospitalization-vm.model';
import { HospitalizationsService } from '@/app/features/hospitalizations/services/hospitalizations.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { isRightAfterDetail, rowEditActions } from '@/app/shared/ui/row-action-button/row-action-button.testing';
import { HospitalizationsListPageComponent } from './hospitalizations-list-page.component';

/** ADR-026 madde 6: Düzenle, detay sayfasındaki gibi yalnız aktif yatışta, aynı yetki ve salt okunur koşuluyla Detay'ın yanındadır. */
describe('HospitalizationsListPageComponent — satırda Düzenle', () => {
    const row = (over: Partial<HospitalizationListItemVm>): HospitalizationListItemVm => ({
        id: 'h1',
        clinicId: null,
        petId: 'p1',
        petName: 'Pamuk',
        clientId: 'c1',
        clientName: 'Ali Veli',
        examinationId: null,
        visitId: null,
        location: '',
        admittedAtUtc: '2026-10-10T07:00:00Z',
        plannedDischargeAtUtc: null,
        dischargedAtUtc: null,
        reason: 'Gözlem',
        isActive: true,
        ...over
    });

    const create = (items: HospitalizationListItemVm[], claims: string[], mutationBlocked = false): HTMLElement => {
        sessionStorage.clear();
        TestBed.configureTestingModule({
            imports: [HospitalizationsListPageComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
                { provide: HospitalizationsService, useValue: { getHospitalizations: () => of({ items, page: 1, pageSize: 10, totalItems: items.length, totalPages: 1 }) } },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.includes(c) } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => mutationBlocked } }
            ]
        });
        const fixture = TestBed.createComponent(HospitalizationsListPageComponent);

        fixture.detectChanges();

        return fixture.nativeElement as HTMLElement;
    };

    afterEach(() => sessionStorage.clear());

    it("aktif yatışta Hospitalizations.Update varsa tablo ve mobil kartta Detay'dan hemen sonra düzenleme sayfasına gider", () => {
        const edits = rowEditActions(create([row({})], [HOSPITALIZATIONS_UPDATE_CLAIM]));

        expect(edits.length).withContext('tablo + mobil kart').toBe(2);

        for (const edit of edits) {
            expect(edit.getAttribute('href')).toBe('/panel/hospitalizations/h1/edit');
            expect(isRightAfterDetail(edit)).toBeTrue();
        }
    });

    it('taburcu edilmiş yatışta Düzenle görünmez', () => {
        expect(rowEditActions(create([row({ isActive: false, dischargedAtUtc: '2026-10-12T07:00:00Z' })], [HOSPITALIZATIONS_UPDATE_CLAIM])).length).toBe(0);
    });

    it('yetki yoksa Düzenle görünmez; salt okunur kiracıda pasiftir', () => {
        expect(rowEditActions(create([row({})], [])).length).toBe(0);

        TestBed.resetTestingModule();
        const readOnly = rowEditActions(create([row({})], [HOSPITALIZATIONS_UPDATE_CLAIM], true));

        expect(readOnly.length).toBe(2);
        expect(readOnly.every((e) => e.tagName === 'BUTTON' && e.getAttribute('aria-disabled') === 'true')).toBeTrue();
    });
});
