import type { MockedObject } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { EDocumentConnectionDto } from '@/app/entities/e-document/models/e-document.model';
import { EDocumentsService } from '@/app/entities/e-document/services/e-documents.service';
import { ClinicEDocumentConnectionSectionComponent } from './clinic-e-document-connection-section.component';

const notConnected: EDocumentConnectionDto = {
    clinicId: 'k1',
    provider: null,
    providerName: null,
    environment: null,
    status: 'NotConnected',
    accountId: null,
    accountName: null,
    connectedAtUtc: null,
    lastVerifiedAtUtc: null,
    lastVerificationOk: null,
    lastVerificationMessage: null,
    accountChoices: null,
    availableProviders: [{ provider: 'parasut', providerName: 'Paraşüt', configured: true }]
};

describe('ClinicEDocumentConnectionSectionComponent', () => {
    let service: MockedObject<EDocumentsService>;
    let messages: MessageService;

    const render = (dto: EDocumentConnectionDto, query: Record<string, string> = {}) => {
        service = {
            getConnection: vi.fn().mockReturnValue(of(dto)),
            authorize: vi.fn().mockReturnValue(of('https://id-staging.parasut.test/auth')),
            verify: vi.fn(),
            selectAccount: vi.fn(),
            disconnect: vi.fn().mockReturnValue(of(undefined))
        } as unknown as MockedObject<EDocumentsService>;
        TestBed.configureTestingModule({
            imports: [ClinicEDocumentConnectionSectionComponent],
            providers: [
                provideRouter([]),
                MessageService,
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } },
                { provide: EDocumentsService, useValue: service },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } }
            ]
        });
        messages = TestBed.inject(MessageService);
        vi.spyOn(messages, 'add');
        vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
        const fixture = TestBed.createComponent(ClinicEDocumentConnectionSectionComponent);

        fixture.componentRef.setInput('clinicId', 'k1');
        fixture.detectChanges();

        return fixture;
    };

    it('bağlı değilken sağlayıcı bağlama düğmesi gösterir; kimlik bilgisi alanı yoktur', () => {
        const fixture = render(notConnected);
        const el = fixture.nativeElement as HTMLElement;

        expect(el.querySelector('[data-testid="edoc-connect-parasut"]')?.textContent).toContain('Paraşüt hesabını bağla');
        expect(el.querySelector('input[type="password"]')).toBeNull();
        expect(fixture.componentInstance.statusText()).toBe('Bağlı değil');
    });

    it('bağla, yetki adresini ister', () => {
        const fixture = render(notConnected);
        const open = vi.spyOn(fixture.componentInstance, 'openAuthorization').mockImplementation(() => undefined);

        fixture.componentInstance.connect('parasut');

        expect(service.authorize).toHaveBeenCalledWith('k1', 'parasut');
        expect(open).toHaveBeenCalledWith('https://id-staging.parasut.test/auth');
    });

    it('OAuth dönüş hatasını bildirir ve adresi temizler', () => {
        render(notConnected, { eDocumentConnection: 'error', reason: 'denied' });

        expect(messages.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error', detail: 'Yetkilendirme entegratör ekranında onaylanmadı.' }));
        expect(TestBed.inject(Router).navigate).toHaveBeenCalled();
    });

    it('bağlı ve sınaması başarısızsa "Sorunlu" gösterir', () => {
        const fixture = render({ ...notConnected, status: 'Connected', provider: 'parasut', providerName: 'Paraşüt', environment: 'Test', accountName: 'Klinik', lastVerifiedAtUtc: '2026-11-11T00:00:00Z', lastVerificationOk: false, lastVerificationMessage: 'Yetki yok' });

        expect(fixture.componentInstance.statusText()).toBe('Sorunlu');
        expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="edoc-verify"]')).not.toBeNull();
    });
});
