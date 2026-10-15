import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import type { KvkkFormTemplateVm } from '@/app/features/kvkk/models/kvkk-form-template.model';
import { KvkkFormTemplateService } from '@/app/features/kvkk/services/kvkk-form-template.service';
import { kvkkFormDate } from '@/app/features/kvkk/utils/kvkk-form.utils';
import { ClientKvkkFormPageComponent } from './client-kvkk-form-page.component';

const template = (over: Partial<KvkkFormTemplateVm> = {}): KvkkFormTemplateVm => ({
    clinicId: 'k1',
    text: '{{clinicName}} — {{clientName}} — {{date}}',
    isDefault: false,
    rowVersion: 'rv1',
    updatedAtUtc: null,
    maxLength: 20000,
    placeholders: [],
    ...over
});

describe('ClientKvkkFormPageComponent', () => {
    let fixture: ComponentFixture<ClientKvkkFormPageComponent>;
    let getTemplate: jasmine.Spy;
    let clinicId: string | null;

    const el = () => fixture.nativeElement as HTMLElement;

    const create = (claims: string[] = []) => {
        TestBed.configureTestingModule({
            imports: [ClientKvkkFormPageComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'c1' }) } } },
                { provide: AuthService, useValue: { getClinicId: () => clinicId, getClinicName: () => 'Pati Kliniği', hasOperationClaim: (c: string) => claims.includes(c) } },
                { provide: ClientsService, useValue: { getClientById: () => of({ id: 'c1', fullName: 'Ali Veli' }) } },
                { provide: KvkkFormTemplateService, useValue: { getTemplate } }
            ]
        });
        fixture = TestBed.createComponent(ClientKvkkFormPageComponent);
        fixture.detectChanges();
    };

    beforeEach(() => {
        clinicId = 'k1';
        getTemplate = jasmine.createSpy('getTemplate').and.returnValue(of(template()));
    });

    it('aktif kliniğin şablonunu müşteri adı ve bugünle doldurur; düzenlenmiş metinde uyarı yok', () => {
        create();
        expect(getTemplate).toHaveBeenCalledOnceWith('k1');
        expect(el().querySelector('[data-testid="kvkk-form-text"]')?.textContent).toBe(`Pati Kliniği — Ali Veli — ${kvkkFormDate()}`);
        expect(el().querySelector('[data-testid="kvkk-default-warning"]')).toBeNull();
        expect(el().querySelector('[data-testid="kvkk-print"]')).not.toBeNull();
    });

    it('varsayılan yer tutucu metinde yazdırmadan önce uyarı; düzenleme bağlantısı yalnız Clinics.Update ile', () => {
        getTemplate.and.returnValue(of(template({ isDefault: true })));
        create();
        expect(el().querySelector('[data-testid="kvkk-default-warning"]')?.textContent).toContain('hukuk danışmanınızca onaylanmış');
        expect(el().querySelector('a[href="/panel/settings/kvkk-form"]')).toBeNull();

        TestBed.resetTestingModule();
        create(['Clinics.Update']);
        expect(el().querySelector('a[href="/panel/settings/kvkk-form"]')).not.toBeNull();
    });

    it('aktif klinik yoksa şablon istenmez, açıklayıcı hata gösterilir', () => {
        clinicId = null;
        create();
        expect(getTemplate).not.toHaveBeenCalled();
        expect(el().textContent).toContain('önce bir klinik seçmelisiniz');
    });
});
