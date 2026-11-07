import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmationService } from 'primeng/api';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import { MENU_GROUPS, visibleGroups } from '@/app/core/routing/panel-navigation';
import { ClinicAddressesPageComponent } from '@/app/features/clinic-addresses/pages/clinic-addresses-page.component';

const URL = '/api/v1/admin/clinic-sites/cagri-vet/address-change-grants';

describe('ClinicAddressesPageComponent', () => {
    let fixture: ComponentFixture<ClinicAddressesPageComponent>;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [ClinicAddressesPageComponent],
            providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: '' }]
        });
        fixture = TestBed.createComponent(ClinicAddressesPageComponent);
        http = TestBed.inject(HttpTestingController);
        fixture.detectChanges();
    });

    afterEach(() => http.verify());

    /** Onay penceresinde kabul edilmiş gibi: gerçek pencerenin düğmesi PrimeNG'nindir. */
    function submit(slug: string, additionalChanges: number): void {
        const confirmation = fixture.debugElement.injector.get(ConfirmationService);
        const confirm = vi.spyOn(confirmation, 'confirm').mockImplementation((options) => {
            options.accept?.();

            return confirmation;
        });

        fixture.componentInstance.form.setValue({ slug, additionalChanges });
        fixture.componentInstance.confirmGrant();
        expect(confirm).toHaveBeenCalledOnce();
        expect(confirm.mock.calls[0][0].message).toContain(slug.trim().toLowerCase());
    }

    const text = (): string => (fixture.nativeElement as HTMLElement).textContent ?? '';

    it('varsayılan ek hak 1, adres boşken gönderilemez', () => {
        expect(fixture.componentInstance.form.getRawValue().additionalChanges).toBe(1);
        expect((fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[data-testid="ca-submit"]')?.disabled).toBe(true);
    });

    it('onaydan sonra sözleşmedeki gövdeyle gönderir, yeni kalan hakkı gösterir; adres kırpılıp küçültülür', async () => {
        submit('  Cagri-Vet ', 2);

        const request = http.expectOne(URL);

        expect(request.request.method).toBe('POST');
        expect(request.request.body).toEqual({ additionalChanges: 2 });
        request.flush({ slug: 'cagri-vet', addressChangesRemaining: 2 });
        await fixture.whenStable();
        fixture.detectChanges();

        expect(text()).toContain('vetinity.com/k/cagri-vet için kalan değiştirme hakkı: 2');
    });

    it.each([
        ['ClinicSites.NotFound', 404, 'bulunamadı'],
        ['Auth.PermissionDenied', 403, 'yetkiniz yok'],
        ['ClinicSites.Validation', 400, '1 ile 3']
    ])('%s anlaşılır gösterilir', async (code, status, message) => {
        submit('cagri-vet', 1);
        http.expectOne(URL).flush({ code }, { status, statusText: 'Hata' });
        await fixture.whenStable();
        fixture.detectChanges();

        expect(text()).toContain(message);
        expect(fixture.componentInstance.saving()).toBe(false);
    });

    it.each([0, 4, 1.5])('ek hak %s geçersizdir', (count) => {
        fixture.componentInstance.form.setValue({ slug: 'cagri-vet', additionalChanges: count });
        fixture.componentInstance.confirmGrant();

        expect(fixture.componentInstance.form.invalid).toBe(true);
        http.expectNone(URL);
    });

    it('menüde yalnız platform yöneticisine görünür', () => {
        const labels = (hasClaim: (claim: string) => boolean): string[] => visibleGroups(MENU_GROUPS, hasClaim).flatMap((group) => group.entries.map((entry) => entry.label));

        expect(labels(() => true)).toContain('Klinik adresleri');
        expect(labels((claim) => claim !== 'platform_admin')).not.toContain('Klinik adresleri');
    });
});
