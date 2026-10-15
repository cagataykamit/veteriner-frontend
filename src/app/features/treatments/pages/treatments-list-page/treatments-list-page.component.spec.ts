import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { TreatmentsService } from '@/app/features/treatments/services/treatments.service';
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
