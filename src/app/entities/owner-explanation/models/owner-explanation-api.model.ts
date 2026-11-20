import type { AiProvenanceDto } from '@/app/entities/ai/models/ai-api.model';

/**
 * Hasta sahibine sade açıklama (AI-003) — Veteriner `docs/AI_DRAFTS_API_CONTRACT.md` §7.2. Muayeneye bağlı ayrı kayıt; yalnız
 * AI taslağının kabulüyle oluşur, sonra değişmez. Yalnızca mapper ve servis kullanır.
 */
export interface OwnerExplanationDto {
    id: string;
    examinationId: string;
    petId: string;
    text: string;
    sourceAiDraftId?: string | null;
    createdByUserId?: string | null;
    createdByName?: string | null;
    createdAtUtc: string;
    aiProvenance?: AiProvenanceDto[] | null;
}
