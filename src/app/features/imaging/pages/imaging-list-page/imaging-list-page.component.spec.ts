import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { IMAGING_CANCEL_CLAIM, IMAGING_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import type { ImagingRecordListItemVm } from '@/app/features/imaging/models/imaging.model';
import { ImagingRecordsService } from '@/app/features/imaging/services/imaging-records.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { ImagingListPageComponent } from './imaging-list-page.component';

const row = (id: string, status: 'Active' | 'Cancelled' = 'Active'): ImagingRecordListItemVm => ({
    id,
    clinicId: 'clinic-1',
    petId: 'pet-1',
    petName: 'Pamuk',
    clientId: 'client-1',
    clientName: 'Ali Veli',
    examinationId: null,
    performedAtUtc: '2026-10-22T07:30:00Z',
    modality: 'Ultrasound',
    description: 'Batın',
    status,
    fileCount: 2,
    addedAfterExaminationFinalization: false
});

describe('ImagingListPageComponent', () => {
    let list: jasmine.Spy;

    const render = (claims: string[], petId = '') => {
        list = jasmine.createSpy('list').and.returnValue(of({ items: [row('a'), row('b', 'Cancelled')], page: 1, pageSize: 20, totalItems: 2, totalPages: 1 }));
        TestBed.configureTestingModule({
            imports: [ImagingListPageComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(petId ? { petId } : {}) } } },
                { provide: ImagingRecordsService, useValue: { list } },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.includes(c) } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        });
        const fixture = TestBed.createComponent(ImagingListPageComponent);

        fixture.detectChanges();

        return fixture;
    };

    it('satırda tür, hasta ve dosya sayısı; İptal yalnız yetkiyle ve etkin kayıtta (ADR-026)', () => {
        const el = render([IMAGING_READ_CLAIM, IMAGING_CANCEL_CLAIM]).nativeElement as HTMLElement;

        expect(el.textContent).toContain('Ultrason');
        expect(el.textContent).toContain('2 dosya');
        expect(el.querySelectorAll('app-row-action-button[action="detail"]').length).toBe(2);
        expect(el.querySelectorAll('app-row-action-button[action="void"]').length).toBe(1);
    });

    it('iptal yetkisi yoksa yalnız Detay', () => {
        const el = render([IMAGING_READ_CLAIM]).nativeElement as HTMLElement;

        expect(el.querySelectorAll('app-row-action-button[action="void"]').length).toBe(0);
    });

    it('hasta kartından gelen bağlam ve tür süzgeci sorguya gider', () => {
        const fixture = render([IMAGING_READ_CLAIM], 'pet-9');
        const c = fixture.componentInstance;

        expect(list.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ petId: 'pet-9', page: 1 }));
        c.modalityInput = 'XRay';
        c.fromDateInput = '2026-10-20';
        c.toDateInput = '2026-10-01';
        c.applyFilters();

        expect(list.calls.mostRecent().args[0]).toEqual(
            jasmine.objectContaining({ petId: 'pet-9', modality: 'XRay', fromDate: '2026-10-01', toDate: '2026-10-20' })
        );
    });
});
