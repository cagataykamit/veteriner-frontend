import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { HospitalizationDetailVm } from '@/app/entities/hospitalization/models/hospitalization-vm.model';
import { HospitalizationsService } from '@/app/entities/hospitalization/services/hospitalizations.service';
import { HospitalizationDetailPageComponent } from './hospitalization-detail-page.component';

describe('HospitalizationDetailPageComponent — rota kimliği değişimi', () => {
    it('aynı bileşende başka yatışa geçince yeni kaydı yükler; eski kaydın mesajları ve taburcu diyaloğu kalmaz, taburcu yeni kayda gider', () => {
        const paramMap = new BehaviorSubject(convertToParamMap({ id: 'h1' }));
        const route = { paramMap, snapshot: { queryParamMap: convertToParamMap({ saved: 'created' }) } };
        const service = {
            getHospitalizationById: vi.fn((id: string) => of({ id, rowVersion: `V-${id}` } as HospitalizationDetailVm)),
            dischargeHospitalization: vi.fn(() => of(void 0))
        };

        TestBed.configureTestingModule({
            imports: [HospitalizationDetailPageComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: route },
                { provide: HospitalizationsService, useValue: service },
                { provide: AuthService, useValue: { hasOperationClaim: () => true } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        });
        TestBed.overrideTemplate(HospitalizationDetailPageComponent, '');
        const fixture = TestBed.createComponent(HospitalizationDetailPageComponent);
        const page = fixture.componentInstance;

        fixture.detectChanges();
        expect(page.savedMessage()).toBe('Kayıt oluşturuldu.');
        page.showDischargedBanner.set(true);
        page.openDischargeDialog();

        route.snapshot = { queryParamMap: convertToParamMap({}) };
        paramMap.next(convertToParamMap({ id: 'h2' }));

        expect(service.getHospitalizationById).toHaveBeenLastCalledWith('h2');
        expect(page.row()?.id).toBe('h2');
        expect(page.savedMessage()).toBeNull();
        expect(page.showDischargedBanner()).toBe(false);
        expect(page.dischargeDialogVisible()).toBe(false);

        page.dischargeForm.setValue({ dischargedAtLocal: '2026-10-20T10:00', dischargeNote: '' });
        page.onDischargeSubmit();

        expect(service.dischargeHospitalization).toHaveBeenCalledWith('h2', expect.objectContaining({ rowVersion: 'V-h2' }));
    });
});
