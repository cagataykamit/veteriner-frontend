import type { MockedObject } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ClientImportedAccountEntriesPanelComponent } from '@/app/entities/imported-history/components/client-imported-account-entries-panel.component';
import type { ImportedAccountEntryDto } from '@/app/entities/imported-history/models/imported-history.model';
import { ImportedHistoryService } from '@/app/entities/imported-history/services/imported-history.service';

const entry = (id: string, over: Partial<ImportedAccountEntryDto> = {}): ImportedAccountEntryDto => ({
    id,
    occurredOn: '2025-12-31',
    kind: 'Debit',
    amount: 1250.5,
    currency: 'TRY',
    description: 'Muayene',
    paymentMethod: null,
    documentNumber: 'F-12',
    petName: 'Pamuk',
    clinicId: 'k1',
    importBatchId: 'b1',
    ...over
});

describe('ClientImportedAccountEntriesPanelComponent', () => {
    let service: MockedObject<ImportedHistoryService>;

    function create(): HTMLElement {
        const fixture = TestBed.createComponent(ClientImportedAccountEntriesPanelComponent);

        fixture.componentRef.setInput('clientId', 'c1');
        fixture.detectChanges();

        return fixture.nativeElement as HTMLElement;
    }

    beforeEach(() => {
        service = { getClientAccountEntries: vi.fn() } as unknown as MockedObject<ImportedHistoryService>;
        TestBed.configureTestingModule({ imports: [ClientImportedAccountEntriesPanelComponent], providers: [{ provide: ImportedHistoryService, useValue: service }] });
    });

    it('hareket yoksa panel görünmez', () => {
        service.getClientAccountEntries.mockReturnValue(of({ items: [], page: 1, pageSize: 20, totalItems: 0, totalPages: 0, totals: { debit: 0, credit: 0 } }));

        expect(create().querySelector('[data-testid="client-imported-entries"]')).toBeNull();
        expect(service.getClientAccountEntries).toHaveBeenCalledWith('c1', 1, 20);
    });

    it('hareketleri bilgi amaçlı notla ve toplamlarla listeler; daha fazlası varsa düğme çıkar', () => {
        service.getClientAccountEntries.mockReturnValue(
            of({
                items: [entry('e1'), entry('e2', { kind: 'Credit', amount: 500, paymentMethod: 'Nakit', description: null })],
                page: 1,
                pageSize: 20,
                totalItems: 3,
                totalPages: 1,
                totals: { debit: 1250.5, credit: 500 }
            })
        );
        const el = create();
        const text = el.textContent ?? '';

        expect(text).toContain('Eski program hareketleri');
        expect(text).toContain('bakiyeyi ve kasayı etkilemez');
        expect(text).toContain('31.12.2025');
        expect(text).toContain('Borç');
        expect(text).toContain('Tahsilat');
        expect(text).toContain('No F-12');
        expect(el.querySelector('[data-testid="client-imported-entries-totals"]')).not.toBeNull();
        expect(el.querySelector('[data-testid="client-imported-entries-more"]')?.textContent).toContain('(1)');
    });
});
