import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { ClientDetailVm } from '@/app/entities/client/models/client-vm.model';
import { ClientsService } from '@/app/entities/client/services/clients.service';
import { ClientEditPageComponent } from './client-edit-page.component';

const client = (over: Partial<ClientDetailVm> = {}): ClientDetailVm => ({
    id: 'c1',
    fullName: 'Deneme Müşteri',
    phone: '—',
    email: '—',
    address: '—',
    createdAtUtc: '2026-01-01T00:00:00Z',
    updatedAtUtc: null,
    preferredContactChannel: 'None',
    remindersOptedOut: false,
    kvkkConsent: { status: 'None', recordedOn: null, recordedByName: null, templateVersion: null, templateHash: null },
    invoicing: null,
    rowVersion: 'rv1',
    notes: 'Sabah arar.\nKedi çantayla gelir.',
    ...over
});

describe('ClientEditPageComponent iç not', () => {
    let fixture: ComponentFixture<ClientEditPageComponent>;
    let clients: { getClientById: ReturnType<typeof vi.fn>; getInvoicingIdentity: ReturnType<typeof vi.fn>; updateClient: ReturnType<typeof vi.fn> };

    const el = () => fixture.nativeElement as HTMLElement;
    const notes = () => el().querySelector('#notes') as HTMLTextAreaElement;

    const render = (vm: ClientDetailVm) => {
        clients = { getClientById: vi.fn().mockReturnValue(of(vm)), getInvoicingIdentity: vi.fn().mockReturnValue(throwError(() => new Error('yetki yok'))), updateClient: vi.fn().mockReturnValue(NEVER) };
        TestBed.configureTestingModule({
            imports: [ClientEditPageComponent],
            providers: [
                provideRouter([]),
                { provide: ClientsService, useValue: clients },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: signal(false), lockedPlanFeature: () => null } },
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'c1' }) } } }
            ]
        });
        fixture = TestBed.createComponent(ClientEditPageComponent);
        fixture.detectChanges();
    };

    const typeNotes = (value: string) => {
        notes().value = value;
        notes().dispatchEvent(new Event('input'));
        notes().dispatchEvent(new Event('blur'));
        fixture.detectChanges();
    };

    const submit = () => {
        (el().querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
        fixture.detectChanges();
    };

    afterEach(() => fixture?.destroy());

    it('kayıtlı not forma satır sonlarıyla gelir; portalda görünmediği yazılır', () => {
        render(client());

        expect(notes().value).toBe('Sabah arar.\nKedi çantayla gelir.');
        expect(el().textContent).toContain('sahip portalında görünmez');
    });

    it('boşaltılan not "" ile gider (sunucu temizler)', () => {
        render(client());
        typeNotes('');
        submit();

        expect(clients.updateClient).toHaveBeenCalledWith('c1', expect.objectContaining({ notes: '' }));
    });

    it('4000 karakteri aşan not kaydı engeller', () => {
        render(client({ notes: null }));
        typeNotes('a'.repeat(4001));
        submit();

        expect(el().textContent).toContain('En fazla 4000 karakter olabilir.');
        expect(clients.updateClient).not.toHaveBeenCalled();
    });
});
