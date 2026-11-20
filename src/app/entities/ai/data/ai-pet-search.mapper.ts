import { mapAiSourceToVm } from '@/app/entities/ai/data/ai.mapper';
import type { PetSearchInterpretationDto, PetSearchItemDto, PetSearchResultDto } from '@/app/entities/ai/models/ai-api.model';
import type { PetSearchInterpretationVm, PetSearchItemVm, PetSearchResultVm } from '@/app/entities/ai/models/ai-vm.model';
import { aiTypeListLabel } from '@/app/entities/ai/utils/ai-labels';

const SEX_LABELS: Readonly<Record<string, string>> = { Male: 'Erkek', Female: 'Dişi' };

function texts(list: (string | null | undefined)[] | null | undefined): string[] {
    return (list ?? []).map((x) => x?.trim() ?? '').filter((x) => !!x);
}

export function mapPetSearchInterpretationDtoToVm(dto: PetSearchInterpretationDto): PetSearchInterpretationVm {
    return { isEmpty: dto.isEmpty === true, unsupported: texts(dto.unsupported), dropped: texts(dto.dropped) };
}

/** "Dişi · kısır · 3 yaş · Tekir": bilinen bilgiler, boşlar atlanır. */
function petDetail(dto: PetSearchItemDto): string {
    const parts: string[] = [];

    if (dto.sex && SEX_LABELS[dto.sex]) {
        parts.push(SEX_LABELS[dto.sex]);
    }

    if (dto.isNeutered) {
        parts.push('kısır');
    }

    if (typeof dto.ageYears === 'number') {
        parts.push(dto.ageYears < 1 ? '1 yaşından küçük' : `${dto.ageYears} yaş`);
    }

    if (dto.breed?.trim()) {
        parts.push(dto.breed.trim());
    }

    return parts.join(' · ');
}

function mapItem(dto: PetSearchItemDto): PetSearchItemVm {
    return {
        petId: dto.petId,
        name: dto.name?.trim() || '—',
        speciesName: dto.speciesName?.trim() || '',
        detail: petDetail(dto),
        isDeceased: dto.status === 'Deceased',
        clientId: dto.clientId || null,
        clientName: dto.clientName?.trim() || '',
        matches: (dto.matches ?? []).map((m) => ({
            source: mapAiSourceToVm({ type: m.type, id: m.id, occurredAtUtc: m.occurredAtUtc }),
            text: m.text?.trim() ?? '',
            isOverdue: m.isOverdue === true
        }))
    };
}

export function mapPetSearchResultDtoToVm(dto: PetSearchResultDto): PetSearchResultVm {
    const omitted = texts(dto.omittedTypes);

    return {
        items: (dto.items ?? []).map(mapItem),
        totalCount: Number.isFinite(dto.totalCount) ? dto.totalCount : 0,
        page: dto.page || 1,
        pageSize: dto.pageSize || 0,
        dropped: texts(dto.dropped),
        truncated: dto.truncated === true,
        omittedTypesLabel: omitted.length ? aiTypeListLabel(omitted) : null
    };
}
