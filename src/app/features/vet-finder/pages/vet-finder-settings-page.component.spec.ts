import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { ClinicsService } from '@/app/entities/clinic/services/clinics.service';
import { type ClinicVetFinderListingDto, parseCoordinates } from '@/app/features/vet-finder/models/vet-finder.model';
import { VetFinderService } from '@/app/features/vet-finder/services/vet-finder.service';
import { environment } from '@/environments/environment';
import { VetFinderSettingsPageComponent } from './vet-finder-settings-page.component';

const listing = (over: Partial<ClinicVetFinderListingDto> = {}): ClinicVetFinderListingDto => ({
    clinicId: 'k1',
    isListed: false,
    services: [],
    latitude: null,
    longitude: null,
    publicPath: '/veteriner/istanbul/kadikoy',
    missing: ['phone'],
    availableServices: [
        { key: 'genel-muayene', name: 'Genel muayene' },
        { key: 'asi', name: 'Aşı' },
        { key: 'cerrahi', name: 'Cerrahi' }
    ],
    ...over
});

describe('parseCoordinates', () => {
    it('harita uygulamasının kopyaladığı biçimi okur, boşluk konum yok demektir', () => {
        expect(parseCoordinates('40.990123, 29.0287654')).toEqual({ latitude: 40.990123, longitude: 29.028765 });
        expect(parseCoordinates('39.92 32.85')).toEqual({ latitude: 39.92, longitude: 32.85 });
        expect(parseCoordinates('  ')).toBeNull();
    });

    it('okunamayan ya da Türkiye dışı konum geçersizdir', () => {
        for (const text of ['40,99', 'abc', '48.85, 2.35', '41, 50']) {
            expect(parseCoordinates(text), text).toBe('invalid');
        }
    });
});

describe('VetFinderSettingsPageComponent', () => {
    let fixture: ComponentFixture<VetFinderSettingsPageComponent>;
    let service: { get: ReturnType<typeof vi.fn>; save: ReturnType<typeof vi.fn> };
    let claims: Set<string>;
    let blocked: boolean;

    async function create(initial = listing()): Promise<HTMLElement> {
        service.get.mockReturnValue(of(initial));
        await TestBed.configureTestingModule({
            imports: [VetFinderSettingsPageComponent],
            providers: [
                provideRouter([]),
                { provide: VetFinderService, useValue: service },
                { provide: ClinicsService, useValue: { listClinics: () => of([{ id: 'k1', name: 'Pati', isActive: true }]) } },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c), getClinicId: () => 'k1', getClinicName: () => 'Pati' } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => blocked } }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(VetFinderSettingsPageComponent);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        return fixture.nativeElement as HTMLElement;
    }

    beforeEach(() => {
        claims = new Set(['Clinics.Update', 'Clinics.Read']);
        blocked = false;
        service = { get: vi.fn(), save: vi.fn() };
    });

    it('varsayılan kapalı başlar; eksik bilgiyi uyarı olarak gösterir', async () => {
        const host = await create();

        expect(fixture.componentInstance.form.getRawValue().isListed).toBe(false);
        expect(host.textContent).toContain('Listelenmiyor');
        expect(host.querySelector('[data-testid="vet-finder-missing"]')?.textContent).toContain('Telefon girilmemiş');
        expect(host.querySelector('[data-testid="vet-finder-url"]')?.textContent).toContain(`${environment.siteBaseUrl}/veteriner/istanbul/kadikoy`);
    });

    it('listelenmeyi açar; seçili hizmetleri ve konumu gönderir', async () => {
        service.save.mockReturnValue(of(listing({ isListed: true, services: ['asi'], latitude: 40.99, longitude: 29.03 })));
        const host = await create();
        const cmp = fixture.componentInstance;

        cmp.form.patchValue({ isListed: true, services: { asi: true, cerrahi: false }, location: '40.99, 29.03' });
        cmp.form.markAsDirty();
        cmp.save();
        fixture.detectChanges();

        expect(service.save).toHaveBeenCalledWith('k1', { isListed: true, services: ['asi'], latitude: 40.99, longitude: 29.03 });
        expect(host.textContent).toContain('Listeleniyor');
        expect(host.querySelector<HTMLAnchorElement>('a[data-testid="vet-finder-url"]')).not.toBeNull();
        expect(cmp.form.getRawValue().location).toBe('40.99, 29.03');
    });

    it('geçersiz konumla kaydetmez', async () => {
        await create();
        const cmp = fixture.componentInstance;

        cmp.form.patchValue({ location: '48.85, 2.35' });
        cmp.save();
        fixture.detectChanges();

        expect(cmp.locationInvalid()).toBe(true);
        expect(service.save).not.toHaveBeenCalled();
    });

    it('salt okunur kiracıda form kapalıdır, kaydet düğmesi yoktur', async () => {
        blocked = true;
        const host = await create(listing({ isListed: true }));

        expect(fixture.componentInstance.form.disabled).toBe(true);
        expect(host.querySelector('[data-testid="vet-finder-save"]')).toBeNull();
        expect(host.textContent).toContain('salt okunur');
    });
});
