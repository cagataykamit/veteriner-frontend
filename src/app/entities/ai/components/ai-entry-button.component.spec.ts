import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AiEntryButtonComponent } from '@/app/entities/ai/components/ai-entry-button.component';
import type { AiEntryState } from '@/app/entities/ai/models/ai-vm.model';
import { AiStatusService } from '@/app/entities/ai/services/ai-status.service';

describe('AiEntryButtonComponent', () => {
    let fixture: ComponentFixture<AiEntryButtonComponent>;
    let entry: ReturnType<typeof signal<AiEntryState>>;
    let ensureLoaded: ReturnType<typeof vi.fn>;

    const q = (testId: string) => (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${testId}"]`) as HTMLElement | null;

    beforeEach(async () => {
        entry = signal<AiEntryState>({ kind: 'hidden' });
        ensureLoaded = vi.fn();
        await TestBed.configureTestingModule({
            imports: [AiEntryButtonComponent],
            providers: [{ provide: AiStatusService, useValue: { entry, ensureLoaded } }]
        }).compileComponents();
        fixture = TestBed.createComponent(AiEntryButtonComponent);
        fixture.componentRef.setInput('label', 'Geçmişi özetle');
        fixture.detectChanges();
    });

    it('durumu sorar; kapalı / izinsiz iken hiç çizilmez', () => {
        expect(ensureLoaded).toHaveBeenCalled();
        expect((fixture.nativeElement as HTMLElement).textContent?.trim()).toBe('');
    });

    it('kullanılabilir: düğme olay yayar, açıkken basılı görünür', () => {
        const pressed = vi.fn();

        fixture.componentInstance.pressed.subscribe(pressed);
        entry.set({ kind: 'available' });
        fixture.componentRef.setInput('active', true);
        fixture.detectChanges();

        const btn = q('ai-entry-button') as HTMLButtonElement;

        expect(btn.textContent).toContain('Geçmişi özetle');
        expect(btn.getAttribute('aria-pressed')).toBe('true');
        btn.click();
        expect(pressed).toHaveBeenCalledTimes(1);
    });

    it('kota doldu: soluk düğme ve nedeni altında', () => {
        entry.set({ kind: 'disabled', reason: "Bu ayın AI kotası doldu · 1 Aralık'ta yenilenir" });
        fixture.detectChanges();

        const box = q('ai-entry-disabled')!;

        expect((box.querySelector('button') as HTMLButtonElement).disabled).toBe(true);
        expect(box.textContent).toContain("Bu ayın AI kotası doldu · 1 Aralık'ta yenilenir");
    });
});
