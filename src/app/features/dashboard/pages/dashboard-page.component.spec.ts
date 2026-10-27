import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { NEVER, of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { APPOINTMENTS_READ_CLAIM, VISITS_CREATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { DashboardService } from '@/app/features/dashboard/services/dashboard.service';
import { ClientsService } from '@/app/entities/client/services/clients.service';
import { PetsService } from '@/app/entities/pet/services/pets.service';
import { VisitsService } from '@/app/features/visits/services/visits.service';
import { ProductStockService } from '@/app/features/inventory/services/product-stock.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { DashboardPageComponent } from './dashboard-page.component';

describe('DashboardPageComponent hızlı işlemler', () => {
    const create = (claims: string[], mutationBlocked = false): ComponentFixture<DashboardPageComponent> => {
        TestBed.configureTestingModule({
            imports: [DashboardPageComponent],
            providers: [
                provideRouter([]),
                { provide: AuthService, useValue: { hasSelectedClinic: () => true, activeClinicLabel: () => 'Klinik', hasOperationClaim: (c: string) => claims.includes(c) } },
                { provide: DashboardService, useValue: { loadOperationalDashboard: () => NEVER, loadDashboardSummariesPhase: () => NEVER, loadDashboardListsPhase: () => NEVER } },
                { provide: ProductStockService, useValue: {} },
                { provide: VisitsService, useValue: { getVeterinarians: () => of([]), getCurrentVeterinarianUserId: () => of(null) } },
                { provide: ClientsService, useValue: {} },
                { provide: PetsService, useValue: {} },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => mutationBlocked } }
            ]
        });
        const fixture = TestBed.createComponent(DashboardPageComponent);

        fixture.detectChanges();

        return fixture;
    };

    const walkInButton = (fixture: ComponentFixture<DashboardPageComponent>): HTMLButtonElement | undefined => Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button')).find((b) => b.textContent?.includes('Randevusuz geliş'));

    it('Visits.Create izni varken Randevusuz geliş düğmesi görünür, diğer düğmeler kalır', () => {
        const fixture = create([VISITS_CREATE_CLAIM, APPOINTMENTS_READ_CLAIM]);

        expect(walkInButton(fixture)).toBeDefined();
        expect(fixture.nativeElement.textContent).toContain('Yeni Randevu');
    });

    it('Visits.Create izni yokken düğme ve diyalog yoktur', () => {
        const fixture = create([APPOINTMENTS_READ_CLAIM]);

        expect(walkInButton(fixture)).toBeUndefined();
        expect(fixture.nativeElement.querySelector('app-visit-arrival-dialog')).toBeNull();
    });

    it('abonelik salt okunursa düğme devre dışıdır', () => {
        const fixture = create([VISITS_CREATE_CLAIM], true);

        expect(walkInButton(fixture)?.disabled).toBe(true);
    });

    it('düğme geliş diyaloğunu açar; kayıt sonrası Bugün sayfasına gidilir', () => {
        const fixture = create([VISITS_CREATE_CLAIM]);
        const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

        walkInButton(fixture)!.click();
        expect(fixture.componentInstance.walkInOpen()).toBe(true);
        fixture.componentInstance.onWalkInArrived();
        expect(navigate).toHaveBeenCalledWith(['/panel/today']);
    });
});
