import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { AuthService } from '@/app/core/auth/auth.service';
import { VACCINE_DEFINITIONS_READ_CLAIM, VACCINATIONS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import type { VaccinationDetailVm } from '@/app/features/vaccinations/models/vaccination-vm.model';
import { VaccinationsService } from '@/app/features/vaccinations/services/vaccinations.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { HbsService } from '@/app/features/hbs/services/hbs.service';
import { VaccinationDetailPageComponent } from './vaccination-detail-page.component';

const hbsMock = { getHbsData: () => of(null), updateHbsEntry: () => of(null) };

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
    linkedAdministration,
    hbs: { status: 'NotEntered', referenceNumber: null, notRequiredReason: null, markedAtUtc: null, markedByName: null, isTracked: true }
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
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } },
                { provide: HbsService, useValue: hbsMock }
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

/** Düzenle, düzenleme rotasının yetki koşuluyla gösterilir (rota `VaccineDefinitions.Read` da ister). */
describe('VaccinationDetailPageComponent — Düzenle', () => {
    const editLink = (claims: string[]): HTMLElement | null => {
        TestBed.configureTestingModule({
            imports: [VaccinationDetailPageComponent],
            providers: [
                provideRouter([]),
                { provide: PetsService, useValue: { getPetById: () => of({ petAlerts: { flags: [], note: null } }) } },
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) }, paramMap: of(convertToParamMap({ id: 'v1' })) } },
                { provide: VaccinationsService, useValue: { getVaccinationById: () => of(vm(null)) } },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.includes(c) } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } },
                { provide: HbsService, useValue: hbsMock }
            ]
        });
        const fixture = TestBed.createComponent(VaccinationDetailPageComponent);

        fixture.detectChanges();

        return (fixture.nativeElement as HTMLElement).querySelector('a[href="/panel/vaccinations/v1/edit"]');
    };

    it('Vaccinations.Update ve VaccineDefinitions.Read varsa görünür', () => {
        expect(editLink([VACCINATIONS_UPDATE_CLAIM, VACCINE_DEFINITIONS_READ_CLAIM])).not.toBeNull();
    });

    it('yalnız Vaccinations.Update varsa görünmez (rota /notfound verirdi)', () => {
        expect(editLink([VACCINATIONS_UPDATE_CLAIM])).toBeNull();
    });
});

/**
 * ADR-036 Dilim 2: HBS bölümü — kesinleşmiş muayeneye bağlı (kilitli) aşıda da açıktır; geri kayıt yalnız `Vaccinations.Update` ister,
 * kaydedilen durum sayfayı yeniden yüklemeden rozete yansır.
 */
describe('VaccinationDetailPageComponent — HBS', () => {
    const create = (claims: string[]) => {
        TestBed.configureTestingModule({
            imports: [VaccinationDetailPageComponent],
            providers: [
                provideRouter([]),
                { provide: PetsService, useValue: { getPetById: () => of({ petAlerts: { flags: [], note: null } }) } },
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) }, paramMap: of(convertToParamMap({ id: 'v1' })) } },
                { provide: VaccinationsService, useValue: { getVaccinationById: () => of(vm('finalized-exam')) } },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.includes(c) } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } },
                { provide: HbsService, useValue: hbsMock }
            ]
        });
        const fixture = TestBed.createComponent(VaccinationDetailPageComponent);

        fixture.detectChanges();

        return fixture;
    };

    it('kilitli muayeneye bağlı aşıda HBS kartı ve "HBS verisi" düğmesi görünür; geri kayıt Vaccinations.Update ile açılır', () => {
        const fixture = create([VACCINATIONS_UPDATE_CLAIM]);
        const el = fixture.nativeElement as HTMLElement;

        expect(el.querySelector('[data-testid="hbs-section"]')?.textContent).toContain("HBS'e girilmedi");
        expect(el.querySelector('[data-testid="hbs-open-dialog"]')).not.toBeNull();
        expect(fixture.componentInstance.canUpdateHbs).toBe(true);
    });

    it('kaydedilen HBS durumu rozete yansır', () => {
        const fixture = create([VACCINATIONS_UPDATE_CLAIM]);

        fixture.componentInstance.onHbsChange({ status: 'Entered', referenceNumber: 'ATS-1', notRequiredReason: null, markedAtUtc: null, markedByName: null, isTracked: true });
        fixture.detectChanges();

        expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="hbs-section"]')?.textContent).toContain('ATS-1');
    });

    it('Vaccinations.Update yoksa geri kayıt yetkisi yoktur', () => {
        expect(create([]).componentInstance.canUpdateHbs).toBe(false);
    });
});
