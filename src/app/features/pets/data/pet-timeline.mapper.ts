import { HttpParams } from '@angular/common/http';
import { istanbulDateRangeToUtcIso } from '@/app/shared/utils/date.utils';
import type { PetTimelineItemDto, PetTimelinePageDto } from '@/app/features/pets/models/pet-timeline-api.model';
import type { PetTimelineItemVm, PetTimelinePageVm, PetTimelineQuery } from '@/app/features/pets/models/pet-timeline-vm.model';

function trimOrNull(v: string | null | undefined): string | null {
    const t = v?.trim();
    return t ? t : null;
}

/** Sözleşme: `types` tekrarlı parametre, `fromUtc`/`toUtc` yarı açık İstanbul günü aralığı, `includeVoided` yalnız `true` iken, `cursor` aynen (opak) geri gönderilir. */
export function petTimelineQueryToHttpParams(query: PetTimelineQuery): HttpParams {
    let params = new HttpParams();
    for (const type of query.types ?? []) {
        params = params.append('types', type);
    }
    const range = istanbulDateRangeToUtcIso(query.fromDate, query.toDate);
    if (range.fromUtc) {
        params = params.set('fromUtc', range.fromUtc);
    }
    if (range.toUtc) {
        params = params.set('toUtc', range.toUtc);
    }
    if (query.includeVoided) {
        params = params.set('includeVoided', 'true');
    }
    if (query.limit != null) {
        params = params.set('limit', String(query.limit));
    }
    if (query.cursor) {
        params = params.set('cursor', query.cursor);
    }
    return params;
}

function mapItem(dto: PetTimelineItemDto): PetTimelineItemVm | null {
    const type = trimOrNull(dto.type);
    const sourceId = trimOrNull(dto.sourceId);
    if (!type || !sourceId) {
        return null;
    }
    return {
        key: `${type}:${sourceId}`,
        type,
        sourceId,
        eventAtUtc: trimOrNull(dto.eventAtUtc),
        clinicName: trimOrNull(dto.clinicName),
        title: trimOrNull(dto.title) ?? '—',
        summary: trimOrNull(dto.summary),
        status: trimOrNull(dto.status),
        isVoided: dto.isVoided === true,
        linkType: trimOrNull(dto.linkRef?.type) ?? type,
        linkId: trimOrNull(dto.linkRef?.id) ?? sourceId,
        relatedExaminationId: trimOrNull(dto.relatedExaminationId)
    };
}

export function mapPetTimelinePageDtoToVm(dto: PetTimelinePageDto): PetTimelinePageVm {
    return {
        items: (dto.items ?? []).map(mapItem).filter((x): x is PetTimelineItemVm => x !== null),
        nextCursor: trimOrNull(dto.nextCursor),
        omittedTypes: (dto.omittedTypes ?? []).map((t) => t.trim()).filter((t) => t.length > 0)
    };
}
