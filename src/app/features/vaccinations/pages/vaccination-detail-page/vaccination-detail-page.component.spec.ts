import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { AuthService } from '@/app/core/auth/auth.service';
import type { VaccinationDetailVm } from '@/app/features/vaccinations/models/vaccination-vm.model';
import { VaccinationsService } from '@/app/features/vaccinations/services/vaccinations.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { VaccinationDetailPageComponent } from './vaccination-detail-page.component';

const linked = {
    id: 'a1',
    productName: 'Nobivac DHPPi',
    quantity: 1,
    unit: 'doz',
    lotNumber: 'LOT-77',
    expiryDate: '2027-03-31'
};

const vm = (examinationId: string | null, linkedAdministration: VaccinationDetailVm['linkedAdministration'] = null): VaccinationDetailVm => ({
    id: 'v1',
    appliedAtUtc: '2026-10-08T10:30:00Z',
    dueAtUtc: null,
    vaccineName: 'Karma',
    petId: 'pet-1',
    petName: 'Pamuk',
    clientId: 'client-1',
    clientName: 'Ali Veli',
    status: 1,
    notes: '—',
    examinationId,
    createdAtUtc: null,
    updatedAtUtc: null,
    linkedAdministration
});

describe('VaccinationDetailPageComponent — muayene bağlantısı', () => {
    const render = (examinationId: string | null, linkedAdministration: VaccinationDetailVm['linkedAdministration'] = null): HTMLElement => {
        TestBed.configureTestingModule({
            imports: [VaccinationDetailPageComponent],
            providers: [
                provideRouter([]),
                { provide: PetsService, useValue: { getPetById: () => of({ petAlerts: { flags: [], note: null } }) } },
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) }, paramMap: of(convertToParamMap({ id: 'v1' })) } },
                { provide: VaccinationsService, useValue: { getVaccinationById: () => of(vm(examinationId, linkedAdministration)) } },
                { provide: AuthService, useValue: { hasOperationClaim: () => true } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        });
        const fixture = TestBed.createComponent(VaccinationDetailPageComponent);

        fixture.detectChanges();

        return fixture.nativeElement as HTMLElement;
    };

    it('muayeneye bağlı aşıda muayene detayına bağlantı görünür', () => {
        const a = render('e1').querySelector('[data-testid="linked-examination"]');

        expect(a?.getAttribute('href')).toContain('/panel/examinations/e1');
    });

    it('muayeneye bağlı olmayan aşıda bağlantı yok', () => {
        expect(render(null).querySelector('[data-testid="linked-examination"]')).toBeNull();
    });

    it('stoktan düşen uygulama varsa ürün, seri no ve SKT ile bağlantı gösterilir', () => {
        const el = render(null, linked);
        const card = el.querySelector('[data-testid="linked-administration"]');

        expect(card?.textContent).toContain('Nobivac DHPPi');
        expect(card?.textContent).toContain('LOT-77');
        expect(card?.textContent).toContain('2027');
        expect(el.querySelector('[data-testid="linked-administration-link"]')?.getAttribute('href')).toContain('/panel/administrations');
    });

    it('ürünsüz (yalnız aşı kaydı) kayıtta uygulama kartı yok', () => {
        expect(render(null).querySelector('[data-testid="linked-administration"]')).toBeNull();
    });
});
