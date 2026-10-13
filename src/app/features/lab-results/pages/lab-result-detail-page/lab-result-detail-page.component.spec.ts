import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import type { LabResultDetailVm, LabResultStatus } from '@/app/features/lab-results/models/lab-result-vm.model';
import { LabResultsService } from '@/app/features/lab-results/services/lab-results.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { LabResultDetailPageComponent } from './lab-result-detail-page.component';

const vm = (status: LabResultStatus): LabResultDetailVm => ({
    id: 'l1',
    clinicId: 'clinic-1',
    petId: 'pet-1',
    petName: 'Pamuk',
    clientId: 'client-1',
    clientName: 'Ali Veli',
    examinationId: null,
    resultDateUtc: null,
    requestedAtUtc: '2026-10-08T10:30:00Z',
    status,
    awaitingInterpretation: false,
    testName: 'Kan sayımı',
    resultText: null,
    interpretation: '—',
    notes: '—',
    createdAtUtc: null,
    updatedAtUtc: null,
    cancelledAtUtc: null,
    cancelReason: null,
    rowVersion: 'V1'
});

describe('LabResultDetailPageComponent — başlık eylemleri', () => {
    const render = (status: LabResultStatus, canUpdate = true, blocked = false): string[] => {
        TestBed.configureTestingModule({
            imports: [LabResultDetailPageComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'l1' }), queryParamMap: convertToParamMap({}) } } },
                { provide: LabResultsService, useValue: { getLabResultById: () => of(vm(status)) } },
                { provide: AuthService, useValue: { hasOperationClaim: () => canUpdate } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => blocked } }
            ]
        });
        const fixture = TestBed.createComponent(LabResultDetailPageComponent);
        fixture.detectChanges();
        const actions = (fixture.nativeElement as HTMLElement).querySelectorAll('[actions]');
        return Array.from(actions).flatMap((c) => Array.from(c.querySelectorAll('a, button')).map((e) => e.textContent?.trim() ?? ''));
    };

    it('Requested: "Sonuç gir" ve "İptal et" görünür', () => {
        expect(render('Requested')).toEqual(['Sonuç gir', 'İptal et']);
    });

    it('Resulted: "Düzenle" ve "İptal et" görünür (muayene durumundan bağımsız)', () => {
        expect(render('Resulted')).toEqual(['Düzenle', 'İptal et']);
    });

    it('Cancelled: eylem yok', () => {
        expect(render('Cancelled')).toEqual([]);
    });

    it('izin yoksa eylem yok', () => {
        expect(render('Requested', false)).toEqual([]);
    });

    it('salt okunur kiracıda yalnız kilitli düğme', () => {
        expect(render('Requested', true, true)).toEqual(['Düzenle (salt okunur)']);
    });
});

describe('LabResultDetailPageComponent — kayıt sonrası onay', () => {
    const bannerFor = (saved: string | null): string | null => {
        TestBed.configureTestingModule({
            imports: [LabResultDetailPageComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'l1' }), queryParamMap: convertToParamMap(saved ? { saved } : {}) } } },
                { provide: LabResultsService, useValue: { getLabResultById: () => of(vm('Requested')) } },
                { provide: AuthService, useValue: { hasOperationClaim: () => true } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        });
        const fixture = TestBed.createComponent(LabResultDetailPageComponent);
        fixture.detectChanges();
        return (fixture.nativeElement as HTMLElement).querySelector('p.text-sm.font-medium')?.textContent?.trim() ?? null;
    };

    it('oluşturma sonrası "Kayıt oluşturuldu.", düzenleme sonrası "Kayıt güncellendi."', () => {
        expect(bannerFor('created')).toBe('Kayıt oluşturuldu.');
        TestBed.resetTestingModule();
        expect(bannerFor('1')).toBe('Kayıt güncellendi.');
        TestBed.resetTestingModule();
        expect(bannerFor(null)).toBeNull();
    });
});
