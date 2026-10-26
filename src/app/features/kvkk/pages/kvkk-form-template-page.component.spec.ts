import type { Mock } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import type { KvkkFormTemplateVm } from '@/app/features/kvkk/models/kvkk-form-template.model';
import { KvkkFormTemplateService } from '@/app/features/kvkk/services/kvkk-form-template.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { KvkkFormTemplatePageComponent } from './kvkk-form-template-page.component';

const vm = (over: Partial<KvkkFormTemplateVm> = {}): KvkkFormTemplateVm => ({
    clinicId: 'k1',
    text: 'Yer tutucu metin {{clinicName}}',
    isDefault: true,
    rowVersion: null,
    updatedAtUtc: null,
    maxLength: 50,
    placeholders: ['{{clinicName}}', '{{clientName}}', '{{date}}'],
    textVersion: 0,
    ...over
});

describe('KvkkFormTemplatePageComponent', () => {
    let fixture: ComponentFixture<KvkkFormTemplatePageComponent>;
    let service: {
        getTemplate: Mock;
        updateTemplate: Mock;
    };
    let blocked: boolean;
    let query: Record<string, string>;
    let navigate: Mock;

    const el = () => fixture.nativeElement as HTMLElement;
    const kindButton = (kind: string) => el().querySelector(`[data-testid="kvkk-kind"] [data-kind="${kind}"]`) as HTMLButtonElement;

    const create = () => {
        TestBed.configureTestingModule({
            imports: [KvkkFormTemplatePageComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } },
                { provide: AuthService, useValue: { getClinicId: () => 'k1', getClinicName: () => 'Pati Kliniği' } },
                { provide: KvkkFormTemplateService, useValue: service },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => blocked } }
            ]
        });
        navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
        fixture = TestBed.createComponent(KvkkFormTemplatePageComponent);
        fixture.detectChanges();

        return fixture.componentInstance;
    };

    beforeEach(() => {
        blocked = false;
        query = {};
        service = {
            getTemplate: vi.fn().mockName('getTemplate').mockReturnValue(of(vm())),
            updateTemplate: vi
                .fn()
                .mockName('updateTemplate')
                .mockReturnValue(of(vm({ text: 'Onaylı metin', isDefault: false, rowVersion: 'rv1' })))
        };
    });

    it('varsayılan (açık rıza): taslak uyarısı, yer tutucu açıklamaları, sayaç ve kutu/imzalı canlı önizleme', () => {
        const c = create();

        expect(service.getTemplate).toHaveBeenCalledTimes(1);

        expect(service.getTemplate).toHaveBeenCalledWith('k1', 'consent');
        expect(kindButton('consent').getAttribute('aria-pressed')).toBe('true');
        expect(el().querySelector('[data-testid="kvkk-default-warning"]')?.textContent).toContain('hukuk danışmanınızca onaylanmadan');
        expect(el().querySelector('[data-testid="kvkk-placeholders"]')?.textContent).toContain('Müşterinin adı soyadı');
        expect(el().querySelector('[data-testid="kvkk-placeholders"]')?.textContent).toContain('imza bloğu formda her zaman bulunur');
        expect(el().querySelector('[data-testid="kvkk-template-counter"]')?.textContent).toContain('/ 50');

        c.text.setValue('Yeni {{clientName}}');
        fixture.detectChanges();
        expect(el().querySelector('[data-testid="kvkk-form-text"]')?.textContent).toBe('Yeni Örnek Müşteri');
        expect(el().querySelector('[data-testid="kvkk-form-clinic"]')?.textContent).toContain('Pati Kliniği');
        expect(el().querySelector('[data-testid="kvkk-form-signature"]')).not.toBeNull();
    });

    it('kaydeder: tür ve mevcut sürüm durumuyla gönderilir, yanıt uygulanır ve uyarı kalkar', () => {
        const c = create();

        c.text.setValue('Onaylı metin');
        c.save();
        fixture.detectChanges();

        expect(service.updateTemplate).toHaveBeenCalledWith('k1', 'consent', 'Onaylı metin', expect.objectContaining({ isDefault: true, rowVersion: null }));
        expect(c.template()?.rowVersion).toBe('rv1');
        expect(el().querySelector('[data-testid="kvkk-default-warning"]')).toBeNull();
    });

    it('?kind=disclosure: aydınlatma şablonu yüklenir, önizlemede kutu/imza yok, kayıt aydınlatma ucuna gider', () => {
        query = { kind: 'disclosure' };
        service.getTemplate.mockReturnValue(of(vm({ text: 'Aydınlatma {{clientName}}' })));
        const c = create();

        expect(service.getTemplate).toHaveBeenCalledTimes(1);

        expect(service.getTemplate).toHaveBeenCalledWith('k1', 'disclosure');
        expect(kindButton('disclosure').getAttribute('aria-pressed')).toBe('true');
        expect(el().querySelector('[data-testid="kvkk-default-warning"]')?.textContent).toContain('köşeli parantezli alanları doldurun');
        expect(el().querySelector('[data-testid="kvkk-placeholders"]')?.textContent).toContain('onay kutusu ve imza bloğu basılmaz');
        expect(el().querySelector('[data-testid="kvkk-form-text"]')?.textContent).toBe('Aydınlatma Örnek Müşteri');
        expect(el().querySelector('[data-testid="kvkk-form-choices"]')).toBeNull();
        expect(el().querySelector('[data-testid="kvkk-form-signature"]')).toBeNull();

        c.text.setValue('Onaylı aydınlatma');
        c.save();
        expect(service.updateTemplate).toHaveBeenCalledWith('k1', 'disclosure', 'Onaylı aydınlatma', expect.objectContaining({ isDefault: true }));
    });

    it('tür değişimi: değişiklik yoksa doğrudan yükler ve adrese yazar; kaydedilmemiş değişiklikte onay ister', () => {
        const c = create();

        kindButton('disclosure').click();
        fixture.detectChanges();
        expect(c.kind()).toBe('disclosure');
        expect(service.getTemplate).toHaveBeenCalledWith('k1', 'disclosure');
        expect(navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { kind: 'disclosure' }, replaceUrl: true }));

        const confirm = vi.spyOn(fixture.debugElement.injector.get(ConfirmationService), 'confirm').mockReturnValue(undefined as never);

        c.text.setValue('Yarım kalan düzenleme');
        kindButton('consent').click();
        expect(confirm).toHaveBeenCalledTimes(1);
        expect(c.kind()).toBe('disclosure');

        vi.mocked(confirm).mock.lastCall![0].accept!();
        expect(c.kind()).toBe('consent');
        expect(navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { kind: null } }));
        expect(service.getTemplate).toHaveBeenCalledTimes(3);
    });

    it('boş veya sınırı aşan metin ve salt okunur abonelik kaydı engeller', () => {
        const c = create();

        c.text.setValue('   ');
        expect(c.canSave()).toBe(false);
        c.text.setValue('x'.repeat(51));
        expect(c.canSave()).toBe(false);
        c.save();
        expect(service.updateTemplate).not.toHaveBeenCalled();

        TestBed.resetTestingModule();
        blocked = true;
        const ro = create();

        ro.text.setValue('Metin');
        expect(ro.canSave()).toBe(false);
    });

    it('409 çakışmada mesaj ve "Güncel metni yükle"; yükleme sonrası tekrar kaydedilebilir', () => {
        service.updateTemplate.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { extensions: { code: 'Clinics.KvkkFormTemplate.ConcurrencyConflict' } } })));
        const c = create();

        c.text.setValue('Benim metnim');
        c.save();
        fixture.detectChanges();

        expect(c.saveError()).toContain('başka biri');
        expect(c.canSave()).toBe(false);
        (el().querySelector('[data-testid="kvkk-template-reload"] button') as HTMLButtonElement).click();
        fixture.detectChanges();
        expect(service.getTemplate).toHaveBeenCalledTimes(2);
        expect(c.stale()).toBe(false);
    });
});
