import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';
import type { ClinicTaxpayerSettingsDto } from '@/app/features/clinics/models/clinic-taxpayer-settings.model';
import { ClinicTaxpayerSettingsService } from '@/app/features/clinics/services/clinic-taxpayer-settings.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { ClinicTaxpayerSettingsSectionComponent } from './clinic-taxpayer-settings-section.component';

const defaults: ClinicTaxpayerSettingsDto = {
    clinicId: 'k1',
    isConfigured: false,
    taxpayerType: null,
    taxIdentityNumber: null,
    taxOffice: null,
    taxpayerName: null,
    province: null,
    district: null,
    addressLine: null,
    defaultVatRate: 20,
    withholdingRate: null,
    updatedAtUtc: null
};

describe('ClinicTaxpayerSettingsSectionComponent', () => {
    let service: jasmine.SpyObj<ClinicTaxpayerSettingsService>;

    const render = () => {
        service = jasmine.createSpyObj<ClinicTaxpayerSettingsService>('ClinicTaxpayerSettingsService', ['get', 'update']);
        service.get.and.returnValue(of(defaults));
        TestBed.configureTestingModule({
            imports: [ClinicTaxpayerSettingsSectionComponent],
            providers: [
                MessageService,
                { provide: ClinicTaxpayerSettingsService, useValue: service },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        });
        const fixture = TestBed.createComponent(ClinicTaxpayerSettingsSectionComponent);

        fixture.componentRef.setInput('clinicId', 'k1');
        fixture.detectChanges();

        return fixture;
    };

    it('varsayılanları yükler (KDV %20, stopaj boş)', () => {
        const fixture = render();

        expect(service.get).toHaveBeenCalledWith('k1');
        expect(fixture.componentInstance.form.getRawValue().defaultVatRate).toBe(20);
        expect(fixture.componentInstance.form.getRawValue().withholdingRate).toBeNull();
        expect((fixture.nativeElement as HTMLElement).textContent).toContain('Mükellef bilgileri');
    });

    it('geçersiz VKN/TCKN ve oran kaydı engeller; geçerli gövde gönderilir', () => {
        const fixture = render();
        const cmp = fixture.componentInstance;

        cmp.form.controls.taxIdentityNumber.setValue('1234567891');
        cmp.form.controls.taxIdentityNumber.markAsTouched();
        fixture.detectChanges();
        expect(cmp.form.invalid).toBeTrue();
        expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="taxpayer-error-identity"]')?.textContent).toContain('VKN');

        cmp.form.controls.taxIdentityNumber.setValue('10000000146');
        cmp.form.controls.withholdingRate.setValue(150);
        expect(cmp.form.invalid).toBeTrue();

        cmp.form.controls.withholdingRate.setValue(20);
        cmp.form.controls.taxpayerType.setValue('SelfEmployed');
        service.update.and.returnValue(of({ ...defaults, isConfigured: true, taxpayerType: 'SelfEmployed', taxIdentityNumber: '10000000146', withholdingRate: 20 }));
        cmp.save();

        expect(service.update).toHaveBeenCalledWith('k1', {
            taxpayerType: 'SelfEmployed',
            taxIdentityNumber: '10000000146',
            taxOffice: null,
            taxpayerName: null,
            province: null,
            district: null,
            addressLine: null,
            defaultVatRate: 20,
            withholdingRate: 20
        });
    });
});
