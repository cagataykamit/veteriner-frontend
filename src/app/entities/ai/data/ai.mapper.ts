import type { AiDraftDto, AiSourceRefDto, AiStatusDto, PetHistorySummaryDto } from '@/app/entities/ai/models/ai-api.model';
import type { AiDraftVm, AiSourceVm, AiStatusVm, PetHistorySummaryVm } from '@/app/entities/ai/models/ai-vm.model';
import { AI_SUMMARY_ALERT_SECTION, aiDayMonthLabel, aiRecordCountsLabel, aiSummarySectionTitle, aiTypeListLabel } from '@/app/entities/ai/utils/ai-labels';
import { petTimelineTypeDefinition } from '@/app/entities/pet/utils/pet-timeline-types';

const PET_SOURCE_TYPE = 'Pet';

export function mapAiStatusDtoToVm(dto: AiStatusDto): AiStatusVm {
    return {
        isAvailable: dto.isAvailable === true,
        unavailableCode: dto.unavailableCode?.trim() || null,
        clinicMonthUsedPercent: Number.isFinite(dto.clinicMonthUsedPercent) ? dto.clinicMonthUsedPercent : 0
    };
}

/**
 * Kaynak → çip: `Pet` hasta kartına, zaman çizelgesi türleri ortak tür listesindeki detay sayfasına gider ("Muayene · 10 Kas").
 * Detay sayfası olmayan ya da bilinmeyen tür bağlantısız kalır.
 */
export function mapAiSourceToVm(ref: AiSourceRefDto): AiSourceVm {
    if (ref.type === PET_SOURCE_TYPE) {
        return { type: ref.type, id: ref.id, label: 'Hasta kartı', icon: 'pi-id-card', link: ['/panel/pets', ref.id] };
    }

    const def = petTimelineTypeDefinition(ref.type);
    const name = def?.label ?? ref.type;
    const date = aiDayMonthLabel(ref.occurredAtUtc);

    return {
        type: ref.type,
        id: ref.id,
        label: date ? `${name} · ${date}` : name,
        icon: def?.icon ?? 'pi-circle',
        link: def?.detailPath ? [def.detailPath, ref.id] : null
    };
}

export function mapPetHistorySummaryDtoToVm(dto: PetHistorySummaryDto): PetHistorySummaryVm {
    const coverage = dto.coverage;
    const omitted = (coverage?.omittedTypes ?? []).filter((t) => !!t?.trim());

    return {
        petId: dto.petId,
        hasRecords: dto.status !== 'NoRecords',
        generatedAtUtc: dto.generatedAtUtc,
        coverage: {
            fromUtc: coverage?.fromUtc ?? null,
            toUtc: coverage?.toUtc ?? null,
            recordCount: coverage?.recordCount ?? 0,
            countsLabel: aiRecordCountsLabel(coverage?.recordCounts),
            omittedTypesLabel: omitted.length ? aiTypeListLabel(omitted) : null,
            truncated: coverage?.truncated === true
        },
        sections: (dto.sections ?? [])
            .map((s) => ({
                kind: s.kind,
                title: aiSummarySectionTitle(s.kind, s.title ?? ''),
                isAlert: s.kind === AI_SUMMARY_ALERT_SECTION,
                items: (s.items ?? []).filter((i) => !!i.text?.trim()).map((i) => ({ text: i.text.trim(), sources: (i.sources ?? []).map(mapAiSourceToVm) }))
            }))
            .filter((s) => s.items.length > 0),
        droppedItemCount: dto.droppedItemCount > 0 ? dto.droppedItemCount : 0
    };
}

export function mapAiDraftDtoToVm(dto: AiDraftDto): AiDraftVm {
    return {
        id: dto.id,
        feature: dto.feature,
        status: dto.status,
        targetType: dto.targetType,
        targetId: dto.targetId,
        sources: (dto.sources ?? []).map(mapAiSourceToVm),
        content: dto.content ?? null,
        createdAtUtc: dto.createdAtUtc,
        expiresAtUtc: dto.expiresAtUtc,
        decidedByUserId: dto.decidedByUserId ?? null,
        decidedAtUtc: dto.decidedAtUtc ?? null,
        appliedRecordId: dto.appliedRecordId ?? null
    };
}

/**
 * Panoya kopyalanan düz metin: bölüm başlığı, madde ve kaynak tarihleri ("Kopyala (kaynak tarihleriyle)").
 * Taslak olduğu ilk satırda yazar; panoya giden metin kayıt değildir.
 */
export function petHistorySummaryToPlainText(vm: PetHistorySummaryVm): string {
    const lines = ['Geçmiş özeti (AI taslağı, kontrol edin)'];

    for (const s of vm.sections) {
        lines.push('', s.title.toLocaleUpperCase('tr-TR'));

        for (const item of s.items) {
            const refs = item.sources.map((src) => src.label).join(', ');

            lines.push(refs ? `- ${item.text} (${refs})` : `- ${item.text}`);
        }
    }

    return lines.join('\n');
}
