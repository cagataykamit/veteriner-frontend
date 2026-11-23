import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { ImagingRecordsService } from '@/app/entities/imaging/services/imaging-records.service';
import { PetImagingSectionComponent } from './pet-imaging-section.component';

describe('PetImagingSectionComponent', () => {
    let fixture: ComponentFixture<PetImagingSectionComponent>;

    const create = (entryClosed: boolean) => {
        TestBed.configureTestingModule({
            imports: [PetImagingSectionComponent],
            providers: [
                provideRouter([]),
                { provide: AuthService, useValue: { hasOperationClaim: () => true } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } },
                { provide: ImagingRecordsService, useValue: { list: () => of({ items: [], page: 1, pageSize: 5, totalItems: 0, totalPages: 0 }) } }
            ]
        });
        fixture = TestBed.createComponent(PetImagingSectionComponent);
        fixture.componentRef.setInput('petId', 'p1');
        fixture.componentRef.setInput('clientId', 'c1');
        fixture.componentRef.setInput('entryClosed', entryClosed);
        fixture.detectChanges();

        return fixture.nativeElement as HTMLElement;
    };

    it('"+ Ekle" izinle görünür; yeni kayıt kapalıyken (silinen hasta, ADR-054) çizilmez, liste kalır', () => {
        expect(create(false).querySelector('[data-testid="pet-imaging-new"]')?.getAttribute('href')).toBe('/panel/imaging/new?clientId=c1&petId=p1');

        TestBed.resetTestingModule();
        const el = create(true);

        expect(el.querySelector('[data-testid="pet-imaging-new"]')).toBeNull();
        expect(el.textContent).toContain('Görüntüleme kaydı yok.');
    });
});
