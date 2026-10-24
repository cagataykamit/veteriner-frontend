import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { TREATMENTS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { TreatmentListItemVm } from '@/app/features/treatments/models/treatment-vm.model';
import { TreatmentsService } from '@/app/features/treatments/services/treatments.service';
import { isRightAfterDetail, rowEditActions } from '@/app/shared/ui/row-action-button/row-action-button.testing';
import { TreatmentsListPageComponent } from './treatments-list-page.component';

describe('TreatmentsListPageComponent — detaydan gelen hayvan süzgeci', () => {
    const setup = (query: Record<string, string>) => {
        const getTreatments = jasmine.createSpy('getTreatments').and.returnValue(of({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 }));

        TestBed.configureTestingModule({
            imports: [TreatmentsListPageComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } },
                { provide: TreatmentsService, useValue: { getTreatments } },
                { provide: AuthService, useValue: { hasOperationClaim: () => true } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        });
        const fixture = TestBed.createComponent(TreatmentsListPageComponent);

        fixture.detectChanges();

        return { fixture, getTreatments, el: fixture.nativeElement as HTMLElement };
    };

    it('petId sorgu parametresi API çağrısına gider ve süzgeç etiketi görünür', () => {
        const { getTreatments, el } = setup({ petId: 'pet-1' });

        expect(getTreatments.calls.mostRecent().args[0].petId).toBe('pet-1');
        expect(el.querySelector('[data-testid="context-filter-chip"]')).not.toBeNull();
    });

    it('süzgeç kaldırılınca petId gönderilmeden yeniden yüklenir', () => {
        const { fixture, getTreatments, el } = setup({ petId: 'pet-1' });

        (el.querySelector('[data-testid="context-filter-clear"]') as HTMLButtonElement).click();
        fixture.detectChanges();

        expect(getTreatments.calls.mostRecent().args[0].petId).toBeUndefined();
        expect(el.querySelector('[data-testid="context-filter-chip"]')).toBeNull();
    });

    it('parametre yoksa süzgeç yok', () => {
        const { getTreatments, el } = setup({});

        expect(getTreatments.calls.mostRecent().args[0].petId).toBeUndefined();
        expect(el.querySelector('[data-testid="context-filter-chip"]')).toBeNull();
    });
});

/** ADR-026 madde 6: Düzenle, detay sayfasındaki Düzenle ile aynı yetki ve salt okunur koşuluyla satırda Detay'ın yanındadır. */
describe('TreatmentsListPageComponent — satırda Düzenle', () => {
    const treatment: TreatmentListItemVm = {
        id: 't1',
        clinicId: null,
        petId: 'p1',
        petName: 'Pamuk',
        clientId: 'c1',
        clientName: 'Ali Veli',
        treatmentDateUtc: '2026-10-10T07:00:00Z',
        title: 'Pansuman',
        examinationId: null,
        followUpDateUtc: null
    };

    const create = (claims: string[], mutationBlocked = false): HTMLElement => {
        sessionStorage.clear();
        TestBed.configureTestingModule({
            imports: [TreatmentsListPageComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
                { provide: TreatmentsService, useValue: { getTreatments: () => of({ items: [treatment], page: 1, pageSize: 10, totalItems: 1, totalPages: 1 }) } },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.includes(c) } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => mutationBlocked } }
            ]
        });
        const fixture = TestBed.createComponent(TreatmentsListPageComponent);

        fixture.detectChanges();

        return fixture.nativeElement as HTMLElement;
    };

    afterEach(() => sessionStorage.clear());

    it("Treatments.Update varsa tablo ve mobil kartta Detay'dan hemen sonra düzenleme sayfasına gider", () => {
        const edits = rowEditActions(create([TREATMENTS_UPDATE_CLAIM]));

        expect(edits.length).withContext('tablo + mobil kart').toBe(2);

        for (const edit of edits) {
            expect(edit.getAttribute('href')).toBe('/panel/treatments/t1/edit');
            expect(isRightAfterDetail(edit)).toBeTrue();
        }
    });

    it('yetki yoksa Düzenle görünmez; salt okunur kiracıda pasiftir', () => {
        expect(rowEditActions(create([])).length).toBe(0);

        TestBed.resetTestingModule();
        const readOnly = rowEditActions(create([TREATMENTS_UPDATE_CLAIM], true));

        expect(readOnly.length).toBe(2);
        expect(readOnly.every((e) => e.tagName === 'BUTTON' && e.getAttribute('aria-disabled') === 'true')).toBeTrue();
    });
});
