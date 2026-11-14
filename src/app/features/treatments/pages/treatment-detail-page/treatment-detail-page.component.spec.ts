import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { TreatmentDetailVm } from '@/app/entities/treatment/models/treatment-vm.model';
import { TreatmentsService } from '@/app/entities/treatment/services/treatments.service';
import { TreatmentDetailPageComponent } from './treatment-detail-page.component';

describe('TreatmentDetailPageComponent — rota kimliği değişimi', () => {
    it('aynı bileşende başka tedaviye geçince yeni kaydı yükler; eski kaydın onay mesajı kalmaz', () => {
        const paramMap = new BehaviorSubject(convertToParamMap({ id: 't1' }));
        const route = { paramMap, snapshot: { queryParamMap: convertToParamMap({ saved: '1' }) } };
        const getTreatmentById = vi.fn((id: string) => of({ id } as TreatmentDetailVm));

        TestBed.configureTestingModule({
            imports: [TreatmentDetailPageComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: route },
                { provide: TreatmentsService, useValue: { getTreatmentById } },
                { provide: AuthService, useValue: { hasOperationClaim: () => true } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        });
        TestBed.overrideTemplate(TreatmentDetailPageComponent, '');
        const fixture = TestBed.createComponent(TreatmentDetailPageComponent);
        const page = fixture.componentInstance;

        fixture.detectChanges();
        expect(page.showSavedBanner()).toBe(true);

        route.snapshot = { queryParamMap: convertToParamMap({}) };
        paramMap.next(convertToParamMap({ id: 't2' }));

        expect(getTreatmentById).toHaveBeenLastCalledWith('t2');
        expect(page.row()?.id).toBe('t2');
        expect(page.showSavedBanner()).toBe(false);
    });
});

describe('TreatmentDetailPageComponent — gerekçeli iptal (ADR-043 AK-2)', () => {
    it('iptal ekranın açıldığı sürüm ve gerekçeyle gönderilir', () => {
        const cancelTreatment = vi.fn(() => of(void 0));

        TestBed.configureTestingModule({
            imports: [TreatmentDetailPageComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 't1' })), snapshot: { queryParamMap: convertToParamMap({}) } } },
                { provide: TreatmentsService, useValue: { getTreatmentById: () => of({ id: 't1', title: 'Pansuman', petName: 'Pamuk', rowVersion: 'V1' } as TreatmentDetailVm), cancelTreatment } },
                { provide: AuthService, useValue: { hasOperationClaim: () => true } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        });
        TestBed.overrideTemplate(TreatmentDetailPageComponent, '');
        const fixture = TestBed.createComponent(TreatmentDetailPageComponent);
        const page = fixture.componentInstance as unknown as { cancelSummary: () => string | null; cancelTreatment: (reason: string) => unknown };

        fixture.detectChanges();
        expect(page.cancelSummary()).toBe('Pansuman · Pamuk');
        page.cancelTreatment('Yanlış hastaya girildi');

        expect(cancelTreatment).toHaveBeenCalledWith('t1', 'Yanlış hastaya girildi', 'V1');
    });
});
