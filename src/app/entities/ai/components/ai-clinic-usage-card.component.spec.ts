import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { AiClinicUsageVm } from '@/app/entities/ai/models/ai-vm.model';
import { AiStatusService } from '@/app/entities/ai/services/ai-status.service';
import { AiClinicUsageCardComponent } from './ai-clinic-usage-card.component';

describe('AiClinicUsageCardComponent', () => {
    let usage: ReturnType<typeof signal<AiClinicUsageVm | null>>;
    let refresh: ReturnType<typeof vi.fn>;
    let fixture: ComponentFixture<AiClinicUsageCardComponent>;

    const el = (): HTMLElement => fixture.nativeElement as HTMLElement;

    const create = async (): Promise<void> => {
        TestBed.configureTestingModule({
            imports: [AiClinicUsageCardComponent],
            providers: [{ provide: AiStatusService, useValue: { clinicUsage: usage, refresh } }]
        });
        fixture = TestBed.createComponent(AiClinicUsageCardComponent);
        await fixture.whenStable();
    };

    beforeEach(() => {
        usage = signal<AiClinicUsageVm | null>(null);
        refresh = vi.fn();
    });

    it('açılışta durumu tazeler; AI açık değilse hiçbir şey göstermez', async () => {
        await create();

        expect(refresh).toHaveBeenCalledTimes(1);
        expect(el().querySelector('[data-testid="ai-clinic-usage"]')).toBeNull();
    });

    it('yalnız oran ve yenilenme günü; dolar ve kredi yok', async () => {
        usage.set({ percent: 34, resetLabel: "1 Aralık'ta yenilenir", exhausted: false });
        await create();

        const text = el().querySelector('[data-testid="ai-clinic-usage-text"]')!.textContent!.replace(/\s+/g, ' ').trim();

        expect(text).toBe("Bu ay %34 · 1 Aralık'ta yenilenir");
        expect(el().textContent).not.toContain('$');
        expect(el().textContent).not.toContain('kredi kaldı');
        expect(el().querySelector('[role="progressbar"]')!.getAttribute('aria-valuenow')).toBe('34');
        expect(el().querySelector('[data-testid="ai-clinic-usage-exhausted"]')).toBeNull();
    });

    it('kredi bitince yalnız AI durduğunu söyler', async () => {
        usage.set({ percent: 100, resetLabel: "1 Aralık'ta yenilenir", exhausted: true });
        await create();

        expect(el().querySelector('[data-testid="ai-clinic-usage-exhausted"]')!.textContent).toContain('diğer işler etkilenmez');
    });
});
