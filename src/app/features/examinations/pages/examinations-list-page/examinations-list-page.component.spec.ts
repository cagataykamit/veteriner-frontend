import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { EXAMINATIONS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import type { ExaminationListItemVm } from '@/app/entities/examination/models/examination-vm.model';
import { ExaminationsService } from '@/app/entities/examination/services/examinations.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { isRightAfterDetail, rowEditActions } from '@/app/shared/ui/row-action-button/row-action-button.testing';
import { ExaminationsListPageComponent } from './examinations-list-page.component';

/** ADR-026 madde 6: Düzenle, detay sayfasındaki gibi yalnız taslak muayenede, aynı yetki ve salt okunur koşuluyla Detay'ın yanındadır. */
describe('ExaminationsListPageComponent — satırda Düzenle', () => {
    const row = (over: Partial<ExaminationListItemVm>): ExaminationListItemVm => ({
        id: 'e1',
        status: 'Draft',
        clinicId: null,
        clinicName: null,
        examinedAtUtc: '2026-10-10T07:00:00Z',
        clientId: 'c1',
        clientName: 'Ali Veli',
        petId: 'p1',
        petName: 'Pamuk',
        appointmentId: null,
        visitReason: 'Kontrol',
        ...over
    });

    const create = (items: ExaminationListItemVm[], claims: string[], mutationBlocked = false): HTMLElement => {
        sessionStorage.clear();
        TestBed.configureTestingModule({
            imports: [ExaminationsListPageComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
                { provide: ExaminationsService, useValue: { getExaminations: () => of({ items, page: 1, pageSize: 10, totalItems: items.length, totalPages: 1 }) } },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.includes(c) } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => mutationBlocked } }
            ]
        });
        const fixture = TestBed.createComponent(ExaminationsListPageComponent);

        fixture.detectChanges();

        return fixture.nativeElement as HTMLElement;
    };

    afterEach(() => sessionStorage.clear());

    it("taslak muayenede Examinations.Update varsa tablo ve mobil kartta Detay'dan hemen sonra düzenleme sayfasına gider", () => {
        const edits = rowEditActions(create([row({})], [EXAMINATIONS_UPDATE_CLAIM]));

        expect(edits.length, 'tablo + mobil kart').toBe(2);

        for (const edit of edits) {
            expect(edit.getAttribute('href')).toBe('/panel/examinations/e1/edit');
            expect(isRightAfterDetail(edit)).toBe(true);
        }
    });

    it('kesinleşmiş ya da durumu bilinmeyen muayenede Düzenle görünmez', () => {
        expect(rowEditActions(create([row({ status: 'Finalized' }), row({ id: 'e2', status: null })], [EXAMINATIONS_UPDATE_CLAIM])).length).toBe(0);
    });

    it('yetki yoksa Düzenle görünmez; salt okunur kiracıda pasiftir', () => {
        expect(rowEditActions(create([row({})], [])).length).toBe(0);

        TestBed.resetTestingModule();
        const readOnly = rowEditActions(create([row({})], [EXAMINATIONS_UPDATE_CLAIM], true));

        expect(readOnly.length).toBe(2);
        expect(readOnly.every((e) => e.tagName === 'BUTTON' && e.getAttribute('aria-disabled') === 'true')).toBe(true);
    });
});
