import type { Mock, MockedObject } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { type Observable, of, Subject, throwError } from 'rxjs';
import type { AiDraftVm } from '@/app/entities/ai/models/ai-vm.model';
import { AiService } from '@/app/entities/ai/services/ai.service';
import { type AiDraftFlow, injectAiDraftFlow } from '@/app/entities/ai/services/ai-draft-flow';
import { AiStatusService } from '@/app/entities/ai/services/ai-status.service';

const draft = (id: string, over: Partial<AiDraftVm> = {}): AiDraftVm => ({
    id,
    feature: 'OwnerExplanation',
    status: 'Draft',
    targetType: 'Examination',
    targetId: 'e1',
    sources: [],
    content: { text: 'Açıklama' },
    createdAtUtc: '2026-11-19T09:00:00Z',
    expiresAtUtc: '2026-12-19T09:00:00Z',
    decidedByUserId: null,
    decidedAtUtc: null,
    appliedRecordId: null,
    ...over
});

const httpProblem = (status: number, code: string) => throwError(() => new HttpErrorResponse({ status, error: { extensions: { code } } }));

describe('AiDraftFlow', () => {
    let ai: MockedObject<AiService>;
    let status: { refresh: ReturnType<typeof vi.fn> };
    let generate: Mock<(note: string) => Observable<AiDraftVm>>;
    let flow: AiDraftFlow;

    beforeEach(() => {
        ai = {
            getPendingDrafts: vi.fn().mockReturnValue(of([])),
            acceptDraft: vi.fn(),
            discardDraft: vi.fn().mockReturnValue(of(draft('d1', { status: 'Discarded', content: null })))
        } as unknown as MockedObject<AiService>;
        status = { refresh: vi.fn() };
        generate = vi.fn<(note: string) => Observable<AiDraftVm>>().mockReturnValue(of(draft('d1')));
        TestBed.configureTestingModule({
            providers: [
                { provide: AiService, useValue: ai },
                { provide: AiStatusService, useValue: status }
            ]
        });
        flow = TestBed.runInInjectionContext(() => injectAiDraftFlow({ feature: 'OwnerExplanation', target: () => ({ type: 'Examination', id: 'e1' }), generate: (note: string) => generate(note) }));
    });

    it('üretim: not gider, taslak adımına geçer', () => {
        flow.note.set('Diyet önemli');
        flow.generate();
        expect(generate).toHaveBeenCalledWith('Diyet önemli');
        expect(flow.step()).toBe('draft');
        expect(flow.draft()?.id).toBe('d1');
    });

    it('üretilirken Vazgeç notu koruyarak yazma adımına döner', () => {
        generate.mockReturnValue(new Subject());
        flow.note.set('x');
        flow.generate();
        expect(flow.step()).toBe('generating');
        flow.cancel();
        expect(flow.step()).toBe('compose');
        expect(flow.note()).toBe('x');
    });

    it('üretim sorunu: yazma adımında sorun ve 429 geri sayımı; kota dolduysa durum yeniden sorulur', () => {
        generate.mockReturnValue(httpProblem(429, 'Ai.RateLimited'));
        flow.generate();
        expect(flow.step()).toBe('compose');
        expect(flow.problem()?.title).toBe('Kısa sürede çok fazla istek gönderildi');
        expect(flow.retryAvailableAt()).toBeGreaterThan(Date.now());

        generate.mockReturnValue(httpProblem(429, 'Ai.ClinicQuotaExceeded'));
        flow.generate();
        expect(status.refresh).toHaveBeenCalledTimes(1);
    });

    it('Yeniden: yeni taslak gelince önceki bekleyen taslak atılır', () => {
        flow.generate();
        generate.mockReturnValue(of(draft('d2')));
        flow.generate();
        expect(flow.draft()?.id).toBe('d2');
        expect(ai.discardDraft).toHaveBeenCalledWith('d1');
    });

    it('bekleyen taslağa dönüş: yalnız bu özelliğin içerikli taslağı', () => {
        ai.getPendingDrafts.mockReturnValue(of([draft('x', { feature: 'DischargeInstructions' }), draft('d9')]));
        flow.resumePending();
        expect(ai.getPendingDrafts).toHaveBeenCalledWith('Examination', 'e1');
        expect(flow.draft()?.id).toBe('d9');
        expect(flow.step()).toBe('draft');
    });

    it('kabul: düzenlenmiş içerik gider, başarıda akış sıfırlanır ve sonuç döner', () => {
        const done = vi.fn();

        ai.acceptDraft.mockReturnValue(of(draft('d1', { status: 'AcceptedWithEdits', content: null, appliedRecordId: 'oe1' })));
        flow.generate();
        flow.accept({ text: 'Düzeltildi' }, done);
        expect(ai.acceptDraft).toHaveBeenCalledWith('d1', { text: 'Düzeltildi' });
        expect(done).toHaveBeenCalledWith(expect.objectContaining({ appliedRecordId: 'oe1' }));
        expect(flow.step()).toBe('compose');
        expect(flow.draft()).toBeNull();
    });

    it('kabul kaydın kuralına takılırsa taslak bekler, sorun panelde', () => {
        ai.acceptDraft.mockReturnValue(httpProblem(409, 'Examinations.Finalized'));
        flow.generate();
        flow.accept(undefined, vi.fn());
        expect(flow.step()).toBe('draft');
        expect(flow.deciding()).toBe(false);
        expect(flow.problem()).toEqual(expect.objectContaining({ title: 'Taslak kayda geçirilemedi', retryable: false }));
    });

    it('at: başarıda ya da taslak zaten karara bağlanmışsa panel temizlenir', () => {
        const done = vi.fn();

        flow.generate();
        flow.discard(done);
        expect(done).toHaveBeenCalledTimes(1);
        expect(flow.draft()).toBeNull();

        ai.discardDraft.mockReturnValue(httpProblem(410, 'AiDrafts.Expired'));
        flow.generate();
        flow.discard(done);
        expect(done).toHaveBeenCalledTimes(2);
        expect(flow.problem()).toBeNull();
    });
});
