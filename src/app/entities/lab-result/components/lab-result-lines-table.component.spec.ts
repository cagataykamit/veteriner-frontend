import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import type { LabResultLineVm } from '@/app/entities/lab-result/models/lab-result-vm.model';
import { LabResultsService } from '@/app/entities/lab-result/services/lab-results.service';
import { LabResultLinesTableComponent } from './lab-result-lines-table.component';

const lines: LabResultLineVm[] = [
    {
        parameterName: 'Glikoz',
        value: 140.5,
        unit: 'mg/dL',
        referenceLow: 70,
        referenceHigh: 120,
        flag: 'High',
        previous: { labResultId: 'l0', resultDateUtc: '2026-11-01T09:00:00Z', value: 110, flag: 'Normal' },
        trend: 'Up'
    },
    { parameterName: 'Üre', value: 40, unit: null, referenceLow: null, referenceHigh: null, flag: null, previous: null, trend: null }
];

describe('LabResultLinesTableComponent', () => {
    const setup = () => {
        const service = {
            getParameterHistory: vi
                .fn()
                .mockName('getParameterHistory')
                .mockReturnValue(
                    of([
                        { labResultId: 'l1', resultDateUtc: '2026-11-20T09:00:00Z', testName: 'Biyokimya', value: 140.5, unit: 'mg/dL', referenceLow: 70, referenceHigh: 120, flag: 'High' },
                        { labResultId: 'l0', resultDateUtc: '2026-11-01T09:00:00Z', testName: 'Biyokimya', value: 110, unit: 'mg/dL', referenceLow: 70, referenceHigh: 120, flag: 'Normal' }
                    ])
                )
        };

        TestBed.configureTestingModule({
            imports: [LabResultLinesTableComponent],
            providers: [provideRouter([]), { provide: LabResultsService, useValue: service }]
        });
        const fixture = TestBed.createComponent(LabResultLinesTableComponent);

        fixture.componentRef.setInput('lines', lines);
        fixture.componentRef.setInput('petId', 'p1');
        fixture.detectChanges();

        return { fixture, service, el: fixture.nativeElement as HTMLElement };
    };

    it('değer, Türkçe ondalık, referans, hesaplanmış işaret ve önceki değeri gösterir; aralık yoksa işaret yok', () => {
        const { el } = setup();
        const rows = Array.from(el.querySelectorAll('[data-testid="lab-result-line"]')).map((r) => r.textContent?.replace(/\s+/g, ' ').trim());

        expect(rows[0]).toContain('140,5 mg/dL');
        expect(rows[0]).toContain('70–120');
        expect(rows[0]).toContain('Yüksek');
        expect(rows[0]).toContain('110');
        expect(el.querySelector('[aria-label="Önceki sonuca göre arttı"]')).not.toBeNull();
        expect(rows[1]).not.toContain('Normal');
        expect(el.textContent).not.toContain('%');
    });

    it('Geçmiş, parametrenin hastadaki değerlerini açar ve ikinci tıkta kapatır', () => {
        const { fixture, service, el } = setup();
        const button = el.querySelector('[data-testid="lab-line-history"]') as HTMLButtonElement;

        button.click();
        fixture.detectChanges();

        expect(service.getParameterHistory).toHaveBeenCalledWith('p1', 'Glikoz');
        expect(el.querySelectorAll('[data-testid="lab-line-history-panel"] li').length).toBe(2);

        button.click();
        fixture.detectChanges();
        expect(el.querySelector('[data-testid="lab-line-history-panel"]')).toBeNull();
    });
});
