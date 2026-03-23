import { HttpParams } from '@angular/common/http';
import { normalizeFilterKey } from '@/app/shared/utils/normalize-filter-key.utils';
import type {
    PetCreateRequestDto,
    PetDetailDto,
    PetListItemDto,
    PetListItemDtoPagedResult
} from '@/app/features/pets/models/pet-api.model';
import type { CreatePetRequest } from '@/app/features/pets/models/pet-create.model';
import { dateOnlyInputToUtcIso } from '@/app/shared/utils/date.utils';
import type { PetsListQuery } from '@/app/features/pets/models/pet-query.model';
import type { PetDetailVm, PetListItemVm } from '@/app/features/pets/models/pet-vm.model';

const EM = '—';

function str(v: string | null | undefined): string {
    return v?.trim() ? v : EM;
}

function speciesName(v: string | null | undefined): string {
    return v?.trim() ? v : '-';
}

/**
 * Create form → API body.
 * Backend `ownerId` kullanıyorsa `clientId` → `ownerId` eşlemesi burada yapılmalıdır.
 */
/**
 * POST /pets yanıtından oluşturulan hayvan kimliğini çıkarır.
 * `PetDetailDto`, sarmalayıcı `data`/`value` veya `petId` / PascalCase alan adları için uyum katmanı.
 */
export function extractCreatedPetIdFromPostResponse(body: unknown): string | null {
    if (body == null) {
        return null;
    }
    if (typeof body === 'string') {
        const t = body.trim();
        return t ? t : null;
    }
    if (typeof body !== 'object') {
        return null;
    }
    const o = body as Record<string, unknown>;
    const idKeys = ['id', 'Id', 'petId', 'PetId'];
    for (const k of idKeys) {
        const s = pickPetIdString(o[k]);
        if (s) {
            return s;
        }
    }
    const wrappers = ['data', 'Data', 'value', 'Value', 'result', 'Result', 'pet', 'Pet'];
    for (const w of wrappers) {
        const inner = o[w];
        if (inner && typeof inner === 'object') {
            const n = inner as Record<string, unknown>;
            for (const k of idKeys) {
                const s = pickPetIdString(n[k]);
                if (s) {
                    return s;
                }
            }
        }
    }
    return null;
}

function pickPetIdString(v: unknown): string | null {
    if (typeof v === 'string' && v.trim()) {
        return v.trim();
    }
    if (typeof v === 'number' && !Number.isNaN(v)) {
        return String(v);
    }
    return null;
}

export function mapCreatePetToApiBody(req: CreatePetRequest): PetCreateRequestDto {
    const body: PetCreateRequestDto = {
        clientId: req.clientId.trim(),
        name: req.name.trim(),
        speciesId: req.speciesId.trim()
    };
    const breedId = req.breedId?.trim();
    if (breedId) {
        body.breedId = breedId;
    }
    // Geçici geri uyumluluk: text `breed` bekleyen eski backend sürümleri için.
    const breed = req.breed?.trim();
    if (breed) {
        body.breed = breed;
    }
    const gender = req.gender?.trim();
    if (gender) {
        body.gender = gender;
    }
    const birthIn = req.birthDateInput?.trim();
    if (birthIn) {
        const iso = dateOnlyInputToUtcIso(birthIn);
        if (iso) {
            body.birthDateUtc = iso;
        }
    }
    const color = req.color?.trim();
    if (color) {
        body.color = color;
    }
    if (req.weight != null && !Number.isNaN(Number(req.weight))) {
        body.weight = Number(req.weight);
    }
    const status = req.status?.trim();
    if (status) {
        body.status = status;
    }
    const notes = req.notes?.trim();
    if (notes) {
        body.notes = notes;
    }
    return body;
}

export function mapPetListItemDtoToVm(dto: PetListItemDto): PetListItemVm {
    return {
        id: dto.id,
        clientId: dto.clientId?.trim() ? dto.clientId : null,
        name: str(dto.name),
        speciesName: speciesName(dto.speciesName),
        breed: str(dto.breedName ?? dto.breed),
        ownerName: str(dto.ownerName),
        gender: str(dto.gender),
        birthDateUtc: dto.birthDateUtc ?? null,
        status: dto.status?.trim() ? dto.status : null
    };
}

export function mapPetDetailDtoToVm(dto: PetDetailDto): PetDetailVm {
    const vac = dto.vaccinationsSummary;
    const ex = dto.examinationsSummary;
    const ap = dto.appointmentsSummary;

    const weightStr =
        dto.weight != null && !Number.isNaN(Number(dto.weight)) ? String(dto.weight) : EM;

    return {
        id: dto.id,
        name: str(dto.name),
        speciesName: speciesName(dto.speciesName),
        breed: str(dto.breedName ?? dto.breed),
        gender: str(dto.gender),
        birthDateUtc: dto.birthDateUtc ?? null,
        color: str(dto.color),
        weight: weightStr,
        status: dto.status?.trim() ? dto.status : null,
        notes: dto.notes != null && dto.notes.trim().length > 0 ? dto.notes : EM,
        ownerId: dto.ownerId != null && dto.ownerId.trim().length > 0 ? dto.ownerId : null,
        ownerName: str(dto.ownerName),
        ownerPhone: str(dto.ownerPhone),
        vaccinationsSummary: {
            totalCount: vac?.totalCount ?? 0,
            items: (vac?.items ?? []).map((x) => ({
                id: x.id,
                name: str(x.name)
            }))
        },
        examinationsSummary: {
            totalCount: ex?.totalCount ?? 0,
            lastExaminedAtUtc: ex?.lastExaminedAtUtc ?? null
        },
        appointmentsSummary: {
            totalCount: ap?.totalCount ?? 0,
            upcomingCount: ap?.upcomingCount ?? null
        }
    };
}

export function mapPagedPetsToVm(result: PetListItemDtoPagedResult): {
    items: PetListItemVm[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
} {
    return {
        items: (result.items ?? []).map(mapPetListItemDtoToVm),
        page: result.page,
        pageSize: result.pageSize,
        totalItems: result.totalItems,
        totalPages: result.totalPages
    };
}

export function petsQueryToHttpParams(query: PetsListQuery): HttpParams {
    let p = new HttpParams();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    p = p.set('Page', String(page));
    p = p.set('PageSize', String(pageSize));
    if (query.search?.trim()) {
        p = p.set('Search', query.search.trim());
    }
    if (query.sort?.trim()) {
        p = p.set('Sort', query.sort.trim());
    }
    if (query.order?.trim()) {
        p = p.set('Order', query.order.trim());
    }
    if (query.speciesId?.trim()) {
        p = p.set('SpeciesId', query.speciesId.trim());
    }
    // Geçici geri uyumluluk: bazı eski backend sürümleri text `Species` bekleyebilir.
    if (query.species?.trim()) {
        p = p.set('Species', query.species.trim());
    }
    if (query.clientId?.trim()) {
        p = p.set('ClientId', query.clientId.trim());
    }
    return p;
}

export function filterPetListByStatus(items: PetListItemVm[], status: string | null | undefined): PetListItemVm[] {
    const s = status?.trim();
    if (!s) {
        return items;
    }
    const target = normalizeFilterKey(s);
    return items.filter((i) => {
        const st = (i.status ?? '').trim();
        if (!st) {
            return false;
        }
        return normalizeFilterKey(st) === target;
    });
}
