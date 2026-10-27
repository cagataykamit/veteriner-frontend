import type { Mock } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { ClientsService } from '@/app/entities/client/services/clients.service';
import type { KvkkFormTemplateVm } from '@/app/entities/kvkk/models/kvkk-form-template.model';
import { KvkkFormTemplateService } from '@/app/entities/kvkk/services/kvkk-form-template.service';
import { kvkkFormDate } from '@/app/entities/kvkk/utils/kvkk-form.utils';
import { ClientKvkkFormPageComponent } from './client-kvkk-form-page.component';

const template = (over: Partial<KvkkFormTemplateVm> = {}): KvkkFormTemplateVm => ({
    clinicId: 'k1',
    text: '{{clinicName}} — {{clientName}} — {{date}}',
    isDefault: false,
    rowVersion: 'rv1',
    updatedAtUtc: null,
    maxLength: 20000,
    placeholders: [],
    textVersion: 2,
    ...over
});

describe('ClientKvkkFormPageComponent', () => {
    let fixture: ComponentFixture<ClientKvkkFormPageComponent>;
    let getTemplate: Mock;
    let clinicId: string | null;
    let routeData: Record<string, unknown>;

    const el = () => fixture.nativeElement as HTMLElement;

    const create = (claims: string[] = []) => {
        TestBed.configureTestingModule({
            imports: [ClientKvkkFormPageComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'c1' }), data: routeData } } },
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
        routeData = {};
        getTemplate = vi.fn().mockName('getTemplate').mockReturnValue(of(template()));
    });

    it('açık rıza: aktif kliniğin şablonunu müşteri adı ve bugünle doldurur; kutu ve imza bloğu basılır; düzenlenmiş metinde uyarı yok', () => {
        create();
        expect(getTemplate).toHaveBeenCalledTimes(1);
        expect(getTemplate).toHaveBeenCalledWith('k1', 'consent');
        expect(el().textContent).toContain('KVKK açık rıza formu');
        expect(el().querySelector('[data-testid="kvkk-form-text"]')?.textContent).toBe(`Pati Kliniği — Ali Veli — ${kvkkFormDate()}`);
        expect(el().querySelector('[data-testid="kvkk-form-choices"]')?.textContent).toContain('Kabul etmiyorum');
        expect(el().querySelector('[data-testid="kvkk-form-signature"]')?.textContent).toContain('Ali Veli');
        expect(el().querySelector('[data-testid="kvkk-default-warning"]')).toBeNull();
        expect(el().querySelector('[data-testid="kvkk-print"]')).not.toBeNull();
        expect(el().querySelector('[data-testid="kvkk-form-text-version"]')?.textContent).toContain('Metin sürümü: 2');
    });

    it('metin sürümü (ADR-032): varsayılan metin 0 "Varsayılan metin" basılır; sürüm gelmezse satır yok', () => {
        getTemplate.mockReturnValue(of(template({ isDefault: true, textVersion: 0 })));
        create();
        expect(el().querySelector('[data-testid="kvkk-form-text-version"]')?.textContent).toContain('Metin sürümü: Varsayılan metin');

        TestBed.resetTestingModule();
        getTemplate.mockReturnValue(of(template({ textVersion: null })));
        create();
        expect(el().querySelector('[data-testid="kvkk-form-text-version"]')).toBeNull();
    });

    it('varsayılan taslak metinde yazdırmadan önce uyarı; düzenleme bağlantısı yalnız Clinics.Update ile', () => {
        getTemplate.mockReturnValue(of(template({ isDefault: true })));
        create();
        expect(el().querySelector('[data-testid="kvkk-default-warning"]')?.textContent).toContain('hukuk danışmanınızca onaylanmadan');
        expect(el().querySelector('a[href="/panel/settings/kvkk-form"]')).toBeNull();

        TestBed.resetTestingModule();
        create(['Clinics.Update']);
        expect(el().querySelector('a[href="/panel/settings/kvkk-form"]')).not.toBeNull();
    });

    it('aydınlatma (rota verisi): aydınlatma şablonu doldurulur; Kabul/Kabul etmiyorum kutuları ve imza bloğu basılmaz', () => {
        routeData = { kvkkKind: 'disclosure' };
        getTemplate.mockReturnValue(of(template({ text: 'Bilgilendirilen: {{clientName}}\nDüzenleme tarihi: {{date}}' })));
        create();

        expect(getTemplate).toHaveBeenCalledTimes(1);

        expect(getTemplate).toHaveBeenCalledWith('k1', 'disclosure');
        expect(el().textContent).toContain('KVKK aydınlatma metni');
        expect(el().querySelector('[data-testid="kvkk-form-text"]')?.textContent).toBe(`Bilgilendirilen: Ali Veli\nDüzenleme tarihi: ${kvkkFormDate()}`);
        expect(el().querySelector('[data-testid="kvkk-form-choices"]')).toBeNull();
        expect(el().querySelector('[data-testid="kvkk-form-signature"]')).toBeNull();
        expect(el().querySelector('[data-testid="kvkk-print"]')).not.toBeNull();
    });

    it("aydınlatma taslağında düzenleme bağlantısı Ayarlar'ı aydınlatma türüyle açar", () => {
        routeData = { kvkkKind: 'disclosure' };
        getTemplate.mockReturnValue(of(template({ isDefault: true })));
        create(['Clinics.Update']);

        expect(el().querySelector('a[href="/panel/settings/kvkk-form?kind=disclosure"]')).not.toBeNull();
    });

    it('aktif klinik yoksa şablon istenmez, açıklayıcı hata gösterilir', () => {
        clinicId = null;
        create();
        expect(getTemplate).not.toHaveBeenCalled();
        expect(el().textContent).toContain('önce bir klinik seçmelisiniz');
    });
});
