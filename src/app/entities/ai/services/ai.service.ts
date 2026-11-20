import { HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { mapAiDraftDtoToVm, mapAiStatusDtoToVm, mapPetHistorySummaryDtoToVm } from '@/app/entities/ai/data/ai.mapper';
import { mapPetSearchInterpretationDtoToVm, mapPetSearchResultDtoToVm } from '@/app/entities/ai/data/ai-pet-search.mapper';
import type {
    AiDraftAcceptRequestDto,
    AiDraftDto,
    AiNoteDraftRequestDto,
    AiStatusDto,
    PetHistorySummaryDto,
    PetSearchFilterDto,
    PetSearchInterpretationDto,
    PetSearchInterpretRequestDto,
    PetSearchRequestDto,
    PetSearchResultDto
} from '@/app/entities/ai/models/ai-api.model';
import type { AiDraftVm, AiStatusVm, PetHistorySummaryVm, PetSearchInterpretationVm, PetSearchResultVm } from '@/app/entities/ai/models/ai-vm.model';

/**
 * Yapay zekâ uçları (`AI_HISTORY_SUMMARY_API_CONTRACT.md`, `AI_DRAFTS_API_CONTRACT.md`). Hatalar ham `HttpErrorResponse` olarak
 * iletilir: panel kodu (`Ai.RateLimited`, `AiDrafts.Expired` …) `aiProblemFromError` ile yalnız AI alanında gösterir.
 */
@Injectable({ providedIn: 'root' })
export class AiService {
    private readonly api = inject(ApiClient);

    getStatus(): Observable<AiStatusVm> {
        return this.api.get<AiStatusDto>(ApiEndpoints.ai.status()).pipe(map(mapAiStatusDtoToVm));
    }

    /** Kaydedilmeyen taslak özet; kayıt yoksa model çağrılmaz (`hasRecords: false`, kota harcanmaz). */
    summarizePetHistory(petId: string): Observable<PetHistorySummaryVm> {
        return this.api.post<PetHistorySummaryDto>(ApiEndpoints.ai.petHistorySummary(petId), null).pipe(map(mapPetHistorySummaryDtoToVm));
    }

    /** AI-001: serbest notu muayene alanlarına ayıran taslak; yalnız kaydedilmiş, kesinleşmemiş muayenede. */
    draftExamNote(examinationId: string, note: string): Observable<AiDraftVm> {
        return this.postDraft(ApiEndpoints.ai.examNoteDraft(examinationId), note);
    }

    /** AI-003: muayeneden hasta sahibine sade açıklama taslağı; `emphasis` hekimin vurgulamak istedikleri (isteğe bağlı). */
    draftOwnerExplanation(examinationId: string, emphasis: string): Observable<AiDraftVm> {
        return this.postDraft(ApiEndpoints.ai.ownerExplanationDraft(examinationId), emphasis);
    }

    /** AI-004: taburcu / evde bakım talimatı taslağı; kabulde talimat kaynağa (muayene ya da yatış) bağlanır. */
    draftCareInstruction(source: { examinationId: string } | { hospitalizationId: string }, emphasis: string): Observable<AiDraftVm> {
        const path = 'examinationId' in source ? ApiEndpoints.ai.examinationCareInstructionDraft(source.examinationId) : ApiEndpoints.ai.hospitalizationCareInstructionDraft(source.hospitalizationId);

        return this.postDraft(path, emphasis);
    }

    getDraft(id: string): Observable<AiDraftVm> {
        return this.api.get<AiDraftDto>(ApiEndpoints.ai.draftById(id)).pipe(map(mapAiDraftDtoToVm));
    }

    /** Kaydın karar bekleyen taslakları (yeniden eskiye, en çok 20): ekran yeniden açılınca bekleyen taslağa dönmek için. */
    getPendingDrafts(targetType: string, targetId: string): Observable<AiDraftVm[]> {
        const params = new HttpParams().set('targetType', targetType).set('targetId', targetId);

        return this.api.get<AiDraftDto[]>(ApiEndpoints.ai.drafts(), params).pipe(map((rows) => (rows ?? []).map(mapAiDraftDtoToVm)));
    }

    /** `editedContent` verilmezse üretilen içerik yazılır; farklıysa `AcceptedWithEdits`. Hedef komutun hataları aynen döner. */
    acceptDraft(id: string, editedContent?: Record<string, unknown>): Observable<AiDraftVm> {
        const body: AiDraftAcceptRequestDto = editedContent ? { editedContent } : {};

        return this.api.post<AiDraftDto>(ApiEndpoints.ai.draftAccept(id), body).pipe(map(mapAiDraftDtoToVm));
    }

    /** Hiçbir kayda yazılmaz; içerik sunucuda silinir. */
    discardDraft(id: string): Observable<AiDraftVm> {
        return this.api.post<AiDraftDto>(ApiEndpoints.ai.draftDiscard(id), null).pipe(map(mapAiDraftDtoToVm));
    }

    /** AI-006: cümleyi filtreye çevirir (kota harcar); model kayıt görmez, arama yapmaz. Filtre sunucuda doğrulanmış gelir. */
    interpretPetSearch(query: string): Observable<{ filter: PetSearchFilterDto; interpretation: PetSearchInterpretationVm }> {
        const body: PetSearchInterpretRequestDto = { query: query.trim() };

        return this.api
            .post<PetSearchInterpretationDto>(ApiEndpoints.ai.petSearchInterpret(), body)
            .pipe(map((dto) => ({ filter: dto.filter ?? {}, interpretation: mapPetSearchInterpretationDtoToVm(dto) })));
    }

    /** AI-006: filtreyle arama; AI çağırmaz. Yanıttaki `filter` sunucunun uyguladığıdır (geçersiz değerler atılmış). */
    searchPets(filter: PetSearchFilterDto, page: number, pageSize: number): Observable<{ filter: PetSearchFilterDto; result: PetSearchResultVm }> {
        const body: PetSearchRequestDto = { filter, page, pageSize };

        return this.api
            .post<PetSearchResultDto>(ApiEndpoints.ai.petSearchResults(), body)
            .pipe(map((dto) => ({ filter: dto.filter ?? filter, result: mapPetSearchResultDtoToVm(dto) })));
    }

    /** Boş not gövdesiz gider (isteğe bağlı notlu uçlar); not saklanmaz. */
    private postDraft(path: string, note: string): Observable<AiDraftVm> {
        const text = note.trim();
        const body: AiNoteDraftRequestDto = text ? { text } : {};

        return this.api.post<AiDraftDto>(path, body).pipe(map(mapAiDraftDtoToVm));
    }
}
