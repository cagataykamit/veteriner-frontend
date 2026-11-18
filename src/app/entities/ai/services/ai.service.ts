import { HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiClient } from '@/app/core/api/api.client';
import { ApiEndpoints } from '@/app/core/api/api-endpoints';
import { mapAiDraftDtoToVm, mapAiStatusDtoToVm, mapPetHistorySummaryDtoToVm } from '@/app/entities/ai/data/ai.mapper';
import type { AiDraftAcceptRequestDto, AiDraftDto, AiStatusDto, PetHistorySummaryDto } from '@/app/entities/ai/models/ai-api.model';
import type { AiDraftVm, AiStatusVm, PetHistorySummaryVm } from '@/app/entities/ai/models/ai-vm.model';

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
}
