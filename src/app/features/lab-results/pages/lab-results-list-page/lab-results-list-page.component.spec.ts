import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import type { LabResultListItemVm } from '@/app/features/lab-results/models/lab-result-vm.model';
import { LabResultsService } from '@/app/features/lab-results/services/lab-results.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { LabResultsListPageComponent } from './lab-results-list-page.component';

const row = (over: Partial<LabResultListItemVm>): LabResultListItemVm => ({
    id: 'l1',
    clinicId: 'c1',
    petId: 'p1',
    petName: 'Pamuk',
    clientId: 'cl1',
    clientName: 'Ayşe',
    resultDateUtc: null,
    requestedAtUtc: '2026-10-10T08:00:00Z',
    status: 'Requested',
    awaitingInterpretation: false,
    testName: 'Hemogram',
    examinationId: null,
    ...over
});

describe('LabResultsListPageComponent — istem ve sonuç tarihi', () => {
    const setup = (items: LabResultListItemVm[]) => {
        const getLabResults = jasmine.createSpy('getLabResults').and.returnValue(of({ items, page: 1, pageSize: 10, totalItems: items.length, totalPages: 1 }));

        TestBed.configureTestingModule({
            imports: [LabResultsListPageComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
                { provide: LabResultsService, useValue: { getLabResults } },
                { provide: AuthService, useValue: { hasOperationClaim: () => true } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        });
        const fixture = TestBed.createComponent(LabResultsListPageComponent);

        fixture.detectChanges();

        return { fixture, getLabResults, el: fixture.nativeElement as HTMLElement };
    };

    it('süzgeç istem tarihine göre olduğu için etiketler bunu söyler; tabloda istem ve sonuç tarihi ayrı sütundur', () => {
        const resulted = row({ id: 'l2', status: 'Resulted', resultDateUtc: '2026-10-12T14:30:00Z' });
        const { el } = setup([row({}), resulted]);

        expect(el.querySelector('label[for="lrFrom"]')?.textContent).toContain('İstem tarihi');
        expect(el.querySelector('label[for="lrTo"]')?.textContent).toContain('İstem tarihi');

        const headers = Array.from(el.querySelectorAll('th')).map((th) => th.textContent?.trim());

        expect(headers).toContain('İstem tarihi');
        expect(headers).toContain('Sonuç tarihi');
        expect(headers).not.toContain('Tarih');

        const requested = Array.from(el.querySelectorAll('[data-testid="lr-requested-at"]')).map((td) => td.textContent?.trim());
        const results = Array.from(el.querySelectorAll('[data-testid="lr-result-date"]')).map((td) => td.textContent?.trim());

        expect(requested).toEqual([formatUtcIsoAsLocalDateTimeDisplay('2026-10-10T08:00:00Z'), formatUtcIsoAsLocalDateTimeDisplay('2026-10-10T08:00:00Z')]);
        expect(results[1]).toBe(formatUtcIsoAsLocalDateTimeDisplay('2026-10-12T14:30:00Z'));
        expect(results[0]).withContext('sonucu gelmemiş istemde sonuç tarihi istem tarihiyle doldurulmaz').toBe(formatUtcIsoAsLocalDateTimeDisplay(null));
    });
});
