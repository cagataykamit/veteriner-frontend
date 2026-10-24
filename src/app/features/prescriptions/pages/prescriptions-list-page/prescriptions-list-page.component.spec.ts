import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { PRESCRIPTIONS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import type { PrescriptionListItemVm } from '@/app/features/prescriptions/models/prescription-vm.model';
import { PrescriptionsService } from '@/app/features/prescriptions/services/prescriptions.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { isRightAfterDetail, rowEditActions } from '@/app/shared/ui/row-action-button/row-action-button.testing';
import { PrescriptionsListPageComponent } from './prescriptions-list-page.component';

/** ADR-026 madde 6: Düzenle, detay sayfasındaki Düzenle ile aynı yetki ve salt okunur koşuluyla satırda Detay'ın yanındadır. */
describe('PrescriptionsListPageComponent — satırda Düzenle', () => {
    const prescription: PrescriptionListItemVm = {
        id: 'r1',
        clinicId: null,
        petId: 'p1',
        petName: 'Pamuk',
        clientId: 'c1',
        clientName: 'Ali Veli',
        prescribedAtUtc: '2026-10-10T07:00:00Z',
        title: 'Antibiyotik',
        examinationId: null,
        treatmentId: null,
        followUpDateUtc: null,
        hbsStatus: 'NotEntered'
    };

    let getPrescriptions: jasmine.Spy;

    const create = (claims: string[], mutationBlocked = false, query: Record<string, string> = {}): HTMLElement => {
        sessionStorage.clear();
        getPrescriptions = jasmine.createSpy('getPrescriptions').and.returnValue(of({ items: [prescription], page: 1, pageSize: 10, totalItems: 1, totalPages: 1 }));
        TestBed.configureTestingModule({
            imports: [PrescriptionsListPageComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } },
                { provide: PrescriptionsService, useValue: { getPrescriptions } },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.includes(c) } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => mutationBlocked } }
            ]
        });
        const fixture = TestBed.createComponent(PrescriptionsListPageComponent);

        fixture.detectChanges();

        return fixture.nativeElement as HTMLElement;
    };

    afterEach(() => sessionStorage.clear());

    it("Prescriptions.Update varsa tablo ve mobil kartta Detay'dan hemen sonra düzenleme sayfasına gider", () => {
        const edits = rowEditActions(create([PRESCRIPTIONS_UPDATE_CLAIM]));

        expect(edits.length).withContext('tablo + mobil kart').toBe(2);

        for (const edit of edits) {
            expect(edit.getAttribute('href')).toBe('/panel/prescriptions/r1/edit');
            expect(isRightAfterDetail(edit)).toBeTrue();
        }
    });

    it('yetki yoksa Düzenle görünmez; salt okunur kiracıda pasiftir', () => {
        expect(rowEditActions(create([])).length).toBe(0);

        TestBed.resetTestingModule();
        const readOnly = rowEditActions(create([PRESCRIPTIONS_UPDATE_CLAIM], true));

        expect(readOnly.length).toBe(2);
        expect(readOnly.every((e) => e.tagName === 'BUTTON' && e.getAttribute('aria-disabled') === 'true')).toBeTrue();
    });
});

/** ADR-036 Dilim 2: HBS durum sütunu (rozet) ve süzgeç; Bugün bağlantısı `?hbsStatus=NotEntered` ile süzer. */
describe('PrescriptionsListPageComponent — HBS durumu', () => {
    const row: PrescriptionListItemVm = {
        id: 'r1',
        clinicId: null,
        petId: 'p1',
        petName: 'Pamuk',
        clientId: 'c1',
        clientName: 'Ali Veli',
        prescribedAtUtc: '2026-10-10T07:00:00Z',
        title: 'Antibiyotik',
        examinationId: null,
        treatmentId: null,
        followUpDateUtc: null,
        hbsStatus: 'NotEntered'
    };

    const create = (query: Record<string, string> = {}) => {
        sessionStorage.clear();
        const getPrescriptions = jasmine.createSpy('getPrescriptions').and.returnValue(of({ items: [row], page: 1, pageSize: 10, totalItems: 1, totalPages: 1 }));

        TestBed.configureTestingModule({
            imports: [PrescriptionsListPageComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } },
                { provide: PrescriptionsService, useValue: { getPrescriptions } },
                { provide: AuthService, useValue: { hasOperationClaim: () => false } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        });
        const fixture = TestBed.createComponent(PrescriptionsListPageComponent);

        fixture.detectChanges();

        return { el: fixture.nativeElement as HTMLElement, getPrescriptions };
    };

    afterEach(() => sessionStorage.clear());

    it('satırda HBS durum rozeti ve süzgeç bulunur', () => {
        const { el } = create();

        expect(el.querySelector('[data-testid="hbs-status-badge"]')?.textContent).toContain("HBS'e girilmedi");
        expect(el.querySelector('[data-testid="rx-hbs-filter"]')).not.toBeNull();
    });

    it('?hbsStatus=NotEntered bağlantısı listeyi süzerek yükler', () => {
        const { getPrescriptions } = create({ hbsStatus: 'NotEntered' });

        expect(getPrescriptions.calls.mostRecent().args[0].hbsStatus).toBe('NotEntered');
    });

    it('bilinmeyen hbsStatus yok sayılır', () => {
        const { getPrescriptions } = create({ hbsStatus: 'Zorunlu' });

        expect(getPrescriptions.calls.mostRecent().args[0].hbsStatus).toBeUndefined();
    });
});
