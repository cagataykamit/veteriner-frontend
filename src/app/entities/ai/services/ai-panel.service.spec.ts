import type { MockedObject } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import type { PetHistorySummaryVm } from '@/app/entities/ai/models/ai-vm.model';
import { AiService } from '@/app/entities/ai/services/ai.service';
import { AiPanelService } from '@/app/entities/ai/services/ai-panel.service';
import { AiStatusService } from '@/app/entities/ai/services/ai-status.service';

const result = { petId: 'p1', hasRecords: true } as PetHistorySummaryVm;

const problem = (status: number, code: string) => throwError(() => new HttpErrorResponse({ status, error: { extensions: { code } } }));

describe('AiPanelService', () => {
    let ai: MockedObject<AiService>;
    let status: { refresh: ReturnType<typeof vi.fn> };
    let panel: AiPanelService;

    beforeEach(() => {
        ai = { summarizePetHistory: vi.fn().mockReturnValue(of(result)) } as unknown as MockedObject<AiService>;
        status = { refresh: vi.fn() };
        TestBed.configureTestingModule({
            providers: [
                { provide: AiService, useValue: ai },
                { provide: AiStatusService, useValue: status }
            ]
        });
        panel = TestBed.inject(AiPanelService);
    });

    it('geçmiş özeti açılır ve istenir; aynı hastada hazır sonuç yeniden istenmez (kota harcanmaz)', () => {
        panel.openHistory('p1', 'Karamel');
        expect(panel.content()).toEqual({ kind: 'history' });
        expect(panel.history()).toEqual(expect.objectContaining({ petId: 'p1', petName: 'Karamel', status: 'ready', result }));

        panel.close();
        expect(panel.content()).toBeNull();
        panel.openHistory('p1', 'Karamel');
        expect(ai.summarizePetHistory).toHaveBeenCalledTimes(1);

        panel.openHistory('p2', 'Pamuk');
        expect(ai.summarizePetHistory).toHaveBeenLastCalledWith('p2');
    });

    it('yeniden özetle yeni istek atar', () => {
        panel.openHistory('p1', 'Karamel');
        panel.resummarize();
        expect(ai.summarizePetHistory).toHaveBeenCalledTimes(2);
    });

    it('vazgeç: süren istek bırakılır, panel kapanır, durum silinir', () => {
        const pending = new Subject<PetHistorySummaryVm>();

        ai.summarizePetHistory.mockReturnValue(pending);
        panel.openHistory('p1', 'Karamel');
        expect(panel.history()?.status).toBe('loading');
        panel.cancelHistory();
        expect(pending.observed).toBe(false);
        expect(panel.history()).toBeNull();
        expect(panel.content()).toBeNull();
    });

    it('429: geri sayım anı kurulur, durum ucu sorulmaz; sorunlu sonuç aynı hastada yeniden istenir', () => {
        ai.summarizePetHistory.mockReturnValue(problem(429, 'Ai.RateLimited'));
        const before = Date.now();

        panel.openHistory('p1', 'Karamel');
        const h = panel.history()!;

        expect(h.status).toBe('problem');
        expect(h.problem?.title).toBe('Kısa sürede çok fazla istek gönderildi');
        expect(h.retryAvailableAt).toBeGreaterThanOrEqual(before + 60_000);
        expect(status.refresh).not.toHaveBeenCalled();

        panel.openHistory('p1', 'Karamel');
        expect(ai.summarizePetHistory).toHaveBeenCalledTimes(2);
    });

    it('istek anında kota doldu: durum ucu yeniden sorulur (düğme soluklaşır)', () => {
        ai.summarizePetHistory.mockReturnValue(problem(429, 'Ai.ClinicQuotaExceeded'));
        panel.openHistory('p1', 'Karamel');
        expect(status.refresh).toHaveBeenCalledTimes(1);
        expect(panel.history()?.problem?.retryable).toBe(false);
    });

    it('sayfa içeriği: yalnız sahibi kapatabilir; × sahibine haber verir, geçmiş özeti sonucu saklanır', () => {
        const owner = {};
        const onClose = vi.fn();

        panel.openHistory('p1', 'Karamel');
        panel.openCustom({ title: 'Notu alanlara ayır', template: {} as never, owner, onClose });
        panel.closeFor({});
        expect(panel.content()?.kind).toBe('custom');

        panel.close();
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(panel.history()?.status).toBe('ready');

        panel.openCustom({ title: 'x', template: {} as never, owner });
        panel.closeFor(owner);
        expect(panel.content()).toBeNull();
    });
});
