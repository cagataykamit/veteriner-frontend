import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { PrescriptionDetailVm } from '@/app/entities/prescription/models/prescription-vm.model';
import { PrescriptionsService } from '@/app/entities/prescription/services/prescriptions.service';
import { PrescriptionDetailPageComponent } from './prescription-detail-page.component';

describe('PrescriptionDetailPageComponent — rota kimliği değişimi', () => {
    it('aynı bileşende başka reçeteye geçince yeni kaydı yükler; eski kaydın onay mesajı kalmaz', () => {
        const paramMap = new BehaviorSubject(convertToParamMap({ id: 'rx1' }));
        const route = { paramMap, snapshot: { queryParamMap: convertToParamMap({ saved: '1' }) } };
        const getPrescriptionById = vi.fn((id: string) => of({ id } as PrescriptionDetailVm));

        TestBed.configureTestingModule({
            imports: [PrescriptionDetailPageComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: route },
                { provide: PrescriptionsService, useValue: { getPrescriptionById } },
                { provide: AuthService, useValue: { hasOperationClaim: () => true } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        });
        TestBed.overrideTemplate(PrescriptionDetailPageComponent, '');
        const fixture = TestBed.createComponent(PrescriptionDetailPageComponent);
        const page = fixture.componentInstance;

        fixture.detectChanges();
        expect(page.showSavedBanner()).toBe(true);

        route.snapshot = { queryParamMap: convertToParamMap({}) };
        paramMap.next(convertToParamMap({ id: 'rx2' }));

        expect(getPrescriptionById).toHaveBeenLastCalledWith('rx2');
        expect(page.row()?.id).toBe('rx2');
        expect(page.showSavedBanner()).toBe(false);
    });
});
