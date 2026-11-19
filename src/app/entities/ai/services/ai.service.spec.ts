import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '@/app/core/api/api-base-url.token';
import type { AiDraftDto } from '@/app/entities/ai/models/ai-api.model';
import { AiService } from '@/app/entities/ai/services/ai.service';

const draft: AiDraftDto = {
    id: 'd1',
    feature: 'DischargeInstructions',
    status: 'Draft',
    targetType: 'Hospitalization',
    targetId: 'h1',
    sources: [],
    content: { text: 'Dinlendirin' },
    createdByUserId: 'u1',
    createdAtUtc: '2026-11-19T09:00:00Z',
    expiresAtUtc: '2026-12-19T09:00:00Z'
};

describe('AiService', () => {
    let service: AiService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: 'http://api.test' }]
        });
        service = TestBed.inject(AiService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('durum: GET /ai/status', async () => {
        const p = firstValueFrom(service.getStatus());

        http.expectOne({ method: 'GET', url: 'http://api.test/api/v1/ai/status' }).flush({ isAvailable: true, unavailableCode: null, isConfigured: true, isClinicEnabled: true, clinicMonthUsedPercent: 12 });
        expect(await p).toEqual({ isAvailable: true, unavailableCode: null, clinicMonthUsedPercent: 12, creditsRemaining: null, quotaResetsAtUtc: null });
    });

    it('geçmiş özeti: gövdesiz POST, yanıt görünüm modeline çevrilir', async () => {
        const p = firstValueFrom(service.summarizePetHistory('p/1'));
        const req = http.expectOne('http://api.test/api/v1/pets/p%2F1/ai/history-summary');

        expect(req.request.method).toBe('POST');
        expect(req.request.body).toBeNull();
        req.flush({ petId: 'p/1', status: 'NoRecords', isDraft: true, generatedAtUtc: '2026-11-19T09:00:00Z', model: null, coverage: null, sections: [], droppedItemCount: 0 });
        expect((await p).hasRecords).toBe(false);
    });

    it('hata ham HttpErrorResponse olarak iletilir (kod panelde okunur)', async () => {
        const p = firstValueFrom(service.summarizePetHistory('p1'));

        http.expectOne('http://api.test/api/v1/pets/p1/ai/history-summary').flush({ extensions: { code: 'Ai.RateLimited' } }, { status: 429, statusText: 'Too Many Requests' });
        await expect(p).rejects.toMatchObject({ status: 429, error: { extensions: { code: 'Ai.RateLimited' } } });
    });

    it('bekleyen taslaklar: hedef türü ve kimliğiyle', async () => {
        const p = firstValueFrom(service.getPendingDrafts('Hospitalization', 'h1'));
        const req = http.expectOne((r) => r.url === 'http://api.test/api/v1/ai/drafts');

        expect(req.request.params.get('targetType')).toBe('Hospitalization');
        expect(req.request.params.get('targetId')).toBe('h1');
        req.flush([draft]);
        expect((await p).map((d) => d.id)).toEqual(['d1']);
    });

    it('kabul: düzenleme yoksa boş gövde, varsa editedContent', async () => {
        const plain = firstValueFrom(service.acceptDraft('d1'));
        const r1 = http.expectOne('http://api.test/api/v1/ai/drafts/d1/accept');

        expect(r1.request.body).toEqual({});
        r1.flush({ ...draft, status: 'Accepted', content: null, appliedRecordId: 'ci1' });
        expect((await plain).appliedRecordId).toBe('ci1');

        const edited = firstValueFrom(service.acceptDraft('d1', { text: 'Düzeltildi' }));
        const r2 = http.expectOne('http://api.test/api/v1/ai/drafts/d1/accept');

        expect(r2.request.body).toEqual({ editedContent: { text: 'Düzeltildi' } });
        r2.flush({ ...draft, status: 'AcceptedWithEdits', content: null });
        expect((await edited).status).toBe('AcceptedWithEdits');
    });

    it('at ve getir', async () => {
        const discarded = firstValueFrom(service.discardDraft('d1'));
        const r1 = http.expectOne('http://api.test/api/v1/ai/drafts/d1/discard');

        expect(r1.request.method).toBe('POST');
        r1.flush({ ...draft, status: 'Discarded', content: null });
        expect((await discarded).status).toBe('Discarded');

        const got = firstValueFrom(service.getDraft('d1'));

        http.expectOne({ method: 'GET', url: 'http://api.test/api/v1/ai/drafts/d1' }).flush(draft);
        expect((await got).content).toEqual({ text: 'Dinlendirin' });
    });

    it('üretim uçları: AI-001 not zorunlu, AI-003/004 boş vurgu gövdesiz; talimat kaynağa göre uç seçer', async () => {
        const note = firstValueFrom(service.draftExamNote('e1', '  Sahip kusma diyor  '));
        const r1 = http.expectOne({ method: 'POST', url: 'http://api.test/api/v1/examinations/e1/ai/note-draft' });

        expect(r1.request.body).toEqual({ text: 'Sahip kusma diyor' });
        r1.flush({ ...draft, feature: 'ExamNoteStructure' });
        expect((await note).feature).toBe('ExamNoteStructure');

        const owner = firstValueFrom(service.draftOwnerExplanation('e1', '   '));
        const r2 = http.expectOne('http://api.test/api/v1/examinations/e1/ai/owner-explanation-draft');

        expect(r2.request.body).toEqual({});
        r2.flush(draft);
        await owner;

        const fromHosp = firstValueFrom(service.draftCareInstruction({ hospitalizationId: 'h1' }, 'Yara bakımı'));

        http.expectOne('http://api.test/api/v1/hospitalizations/h1/ai/care-instruction-draft').flush(draft);
        await fromHosp;

        const fromExam = firstValueFrom(service.draftCareInstruction({ examinationId: 'e1' }, ''));

        http.expectOne('http://api.test/api/v1/examinations/e1/ai/care-instruction-draft').flush(draft);
        await fromExam;
    });
});
