import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import type { KvkkFormTemplateVm } from '@/app/features/kvkk/models/kvkk-form-template.model';
import { KvkkFormTemplateService } from '@/app/features/kvkk/services/kvkk-form-template.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { KvkkFormTemplatePageComponent } from './kvkk-form-template-page.component';

const vm = (over: Partial<KvkkFormTemplateVm> = {}): KvkkFormTemplateVm => ({
    clinicId: 'k1',
    text: 'Yer tutucu metin {{clinicName}}',
    isDefault: true,
    rowVersion: null,
    updatedAtUtc: null,
    maxLength: 50,
    placeholders: ['{{clinicName}}', '{{clientName}}', '{{date}}'],
    ...over
});

describe('KvkkFormTemplatePageComponent', () => {
    let fixture: ComponentFixture<KvkkFormTemplatePageComponent>;
    let service: { getTemplate: jasmine.Spy; updateTemplate: jasmine.Spy };
    let blocked: boolean;

    const el = () => fixture.nativeElement as HTMLElement;
    const create = () => {
        TestBed.configureTestingModule({
            imports: [KvkkFormTemplatePageComponent],
            providers: [
                provideRouter([]),
                { provide: AuthService, useValue: { getClinicId: () => 'k1', getClinicName: () => 'Pati Kliniği' } },
                { provide: KvkkFormTemplateService, useValue: service },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => blocked } }
            ]
        });
        fixture = TestBed.createComponent(KvkkFormTemplatePageComponent);
        fixture.detectChanges();
        return fixture.componentInstance;
    };

    beforeEach(() => {
        blocked = false;
        service = {
            getTemplate: jasmine.createSpy('getTemplate').and.returnValue(of(vm())),
            updateTemplate: jasmine.createSpy('updateTemplate').and.returnValue(of(vm({ text: 'Onaylı metin', isDefault: false, rowVersion: 'rv1' })))
        };
    });

    it('varsayılan metinde uyarı, yer tutucu açıklamaları, sayaç ve canlı önizleme', () => {
        const c = create();
        expect(service.getTemplate).toHaveBeenCalledOnceWith('k1');
        expect(el().querySelector('[data-testid="kvkk-default-warning"]')?.textContent).toContain('hukuk danışmanınızca onaylanmış');
        expect(el().querySelector('[data-testid="kvkk-placeholders"]')?.textContent).toContain('Müşterinin adı soyadı');
        expect(el().querySelector('[data-testid="kvkk-template-counter"]')?.textContent).toContain('/ 50');

        c.text.setValue('Yeni {{clientName}}');
        fixture.detectChanges();
        expect(el().querySelector('[data-testid="kvkk-form-text"]')?.textContent).toBe('Yeni Örnek Müşteri');
        expect(el().querySelector('[data-testid="kvkk-form-clinic"]')?.textContent).toContain('Pati Kliniği');
    });

    it('kaydeder: mevcut sürüm durumuyla gönderilir, yanıt uygulanır ve uyarı kalkar', () => {
        const c = create();
        c.text.setValue('Onaylı metin');
        c.save();
        fixture.detectChanges();

        expect(service.updateTemplate).toHaveBeenCalledWith('k1', 'Onaylı metin', jasmine.objectContaining({ isDefault: true, rowVersion: null }));
        expect(c.template()?.rowVersion).toBe('rv1');
        expect(el().querySelector('[data-testid="kvkk-default-warning"]')).toBeNull();
    });

    it('boş veya sınırı aşan metin ve salt okunur abonelik kaydı engeller', () => {
        const c = create();
        c.text.setValue('   ');
        expect(c.canSave()).toBeFalse();
        c.text.setValue('x'.repeat(51));
        expect(c.canSave()).toBeFalse();
        c.save();
        expect(service.updateTemplate).not.toHaveBeenCalled();

        TestBed.resetTestingModule();
        blocked = true;
        const ro = create();
        ro.text.setValue('Metin');
        expect(ro.canSave()).toBeFalse();
    });

    it('409 çakışmada mesaj ve "Güncel metni yükle"; yükleme sonrası tekrar kaydedilebilir', () => {
        service.updateTemplate.and.returnValue(
            throwError(() => new HttpErrorResponse({ status: 409, error: { extensions: { code: 'Clinics.KvkkFormTemplate.ConcurrencyConflict' } } }))
        );
        const c = create();
        c.text.setValue('Benim metnim');
        c.save();
        fixture.detectChanges();

        expect(c.saveError()).toContain('başka biri');
        expect(c.canSave()).toBeFalse();
        (el().querySelector('[data-testid="kvkk-template-reload"] button') as HTMLButtonElement).click();
        fixture.detectChanges();
        expect(service.getTemplate).toHaveBeenCalledTimes(2);
        expect(c.stale()).toBeFalse();
    });
});
