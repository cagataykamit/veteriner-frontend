import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import type { CashRegisterReportRowDto } from '@/app/entities/cash-register/models/cash-register.model';
import { CashRegistersService } from '@/app/entities/cash-register/services/cash-registers.service';
import { CashReportRowsComponent } from './cash-report-rows.component';

const row = (kind: CashRegisterReportRowDto['kind'], atUtc: string, description: string): CashRegisterReportRowDto => ({
    businessDate: '2026-11-23',
    atUtc,
    kind,
    referenceId: description,
    cashRegisterId: 'r1',
    cashRegisterName: 'Ana kasa',
    description,
    inAmount: kind === 'Out' ? 0 : 100,
    outAmount: kind === 'Out' ? 40 : 0,
    balance: 60,
    performedByName: null
});

describe('CashReportRowsComponent', () => {
    const render = (inputs: Record<string, unknown>) => {
        const voidMovement = vi.fn().mockReturnValue(of(undefined));

        TestBed.configureTestingModule({ imports: [CashReportRowsComponent], providers: [{ provide: CashRegistersService, useValue: { voidMovement } }] });
        const fixture = TestBed.createComponent(CashReportRowsComponent);

        for (const [k, v] of Object.entries(inputs)) {
            fixture.componentRef.setInput(k, v);
        }

        fixture.detectChanges();

        return { fixture, el: fixture.nativeElement as HTMLElement, voidMovement };
    };

    const rows = [row('Collection', '2026-11-23T07:00:00Z', 'Tahsilat'), row('Out', '2026-11-23T09:15:00Z', 'Kırtasiye')];

    it('dönem raporunda tarih ve kasa sütunu; iptal yalnız kasa hareketinde, yetkiyle', () => {
        const { el } = render({ rows, canVoid: true });

        expect(el.querySelector('thead')?.textContent).toContain('Tarih');
        expect(el.querySelector('thead')?.textContent).toContain('Kasa');
        expect(el.querySelectorAll('[data-testid="cash-movement-void"]')).toHaveLength(1);
        expect(el.querySelector('tbody tr td:last-child')?.textContent?.trim()).toBe('');
    });

    it('bugünkü hareketlerde yalnız saat, en yeni üstte; kasa sütunu kapatılabilir; iptal yetkisi yoksa düğme yok', () => {
        const { el } = render({ rows, timeOnly: true, showRegister: false });
        const first = el.querySelector('tbody tr')!;

        expect(el.querySelector('thead')?.textContent).toContain('Saat');
        expect(el.querySelector('thead')?.textContent).not.toContain('Kasa');
        expect(first.textContent).toContain('12:15');
        expect(first.textContent).toContain('Kırtasiye');
        expect(el.querySelector('[data-testid="cash-movement-void"]')).toBeNull();
    });

    it('iptal gerekçeyle sunucuya gider ve satır kimliği kullanılır', () => {
        const { fixture, voidMovement } = render({ rows, canVoid: true });

        fixture.componentInstance.openVoid(rows[1]);
        fixture.componentInstance.voidMovement('Yanlış tutar').subscribe();
        expect(voidMovement).toHaveBeenCalledWith('Kırtasiye', 'Yanlış tutar');
    });
});
