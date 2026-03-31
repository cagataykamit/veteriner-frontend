import { HttpParams } from '@angular/common/http';
import type {
    PetCreateRequestDto,
    PetDetailDto,
    PetListItemDto,
    PetListItemDtoPagedResult
} from '@/app/features/pets/models/pet-api.model';
import type { PetUpsertFormValue } from '@/app/features/pets/forms/pet-upsert-form.model';
import type { CreatePetRequest } from '@/app/features/pets/models/pet-create.model';
import { parseDecimalFormInput } from '@/app/shared/utils/decimal-form.utils';
import type { PetsListQuery } from '@/app/features/pets/models/pet-query.model';
import type { PetDetailVm, PetEditVm, PetListItemVm } from '@/app/features/pets/models/pet-vm.model';
import { normalizePetGender, resolvePetGenderFormValue } from '@/app/features/pets/utils/pet-status.utils';

const EM = '—';

function str(v: string | null | undefined): string {
    return v?.trim() ? v : EM;
}

function speciesName(v: string | null | undefined): string {
    return v?.trim() ? v : '-';
}

/** Form/raw değer → güvenli trim (`type="date"` / `number` kenar durumları). */
function trimFormText(value: unknown): string {
    if (value == null) {
        return '';
    }
    if (typeof value === 'string') {
        return value.trim();
    }
    return String(value).trim();
}

function firstTrimmed(...vals: Array<string | null | undefined>): string | null {
    for (const v of vals) {
        if (typeof v === 'string' && v.trim()) {
            return v.trim();
        }
    }
    return null;
}

function readDtoString(dto: PetListItemDto | PetDetailDto, keys: string[]): string | null {
    const o = dto as unknown as Record<string, unknown>;
    for (const k of keys) {
        const v = o[k];
        if (typeof v === 'string' && v.trim()) {
            return v.trim();
        }
    }
    return null;
}

function canonicalBreedId(dto: PetListItemDto | PetDetailDto): string {
    return firstTrimmed(dto.breedId, readDtoString(dto, ['BreedId'])) ?? '';
}

function canonicalBreedDisplay(dto: PetListItemDto | PetDetailDto): string {
    return str(firstTrimmed(dto.breedName, dto.breed, readDtoString(dto, ['BreedName', 'Breed'])));
}

/** GET DTO: `gender` / `Gender` sayı (1/2) veya metin. */
function readPetGenderRaw(dto: PetListItemDto | PetDetailDto): string | number | null | undefined {
    const o = dto as unknown as Record<string, unknown>;
    const g = o['gender'] ?? o['Gender'];
    if (g === null || g === undefined) {
        return undefined;
    }
    if (typeof g === 'number' && !Number.isNaN(g)) {
        return g;
    }
    if (typeof g === 'string' && g.trim()) {
        return g.trim();
    }
    return undefined;
}

/** Detay/liste VM: `petGenderLabel` için canonical `male`/`female` veya boşta EM. */
function canonicalGenderRaw(dto: PetListItemDto | PetDetailDto): string {
    const resolved = resolvePetGenderFormValue(readPetGenderRaw(dto));
    return resolved ? resolved : EM;
}

/** Okuma: canonical `birthDate` (DateOnly); yalnızca eski API için `birthDateUtc` yedeği. */
function canonicalPetBirthDateRead(dto: PetListItemDto | PetDetailDto): string | null {
    return firstTrimmed(
        dto.birthDate,
        readDtoString(dto, ['BirthDate']),
        dto.birthDateUtc,
        readDtoString(dto, ['BirthDateUtc'])
    );
}

function canonicalColorId(dto: PetListItemDto | PetDetailDto): string | null {
    return firstTrimmed(dto.colorId, readDtoString(dto, ['ColorId']));
}

/** Gösterim: önce `colorName`, yoksa eski düz `color` metni. */
function canonicalColorDisplayName(dto: PetListItemDto | PetDetailDto): string {
    return str(
        firstTrimmed(dto.colorName, readDtoString(dto, ['ColorName']), dto.color, readDtoString(dto, ['Color']))
    );
}

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

/** Tür/ırk seçicide `value`/`label` — `SelectOption` ile uyumlu. */
export interface PetBreedOptionLike {
    value: string;
    label: string;
}

/** Seçili `breedId` için legacy `breed` metin alanı (ırk adı). */
export function resolvePetBreedWriteLabel(breedId: string, options: ReadonlyArray<PetBreedOptionLike>): string | undefined {
    const id = breedId?.trim();
    if (!id) {
        return undefined;
    }
    const opt = options.find((x) => x.value === id);
    const label = opt?.label?.trim();
    return label ? label : undefined;
}

/** Typed form değeri → `CreatePetRequest` (`parseDecimalFormInput`, `birthDateInput`, breed legacy metni). */
export function mapPetUpsertFormToCreateRequest(
    v: Readonly<PetUpsertFormValue>,
    breedOptions: ReadonlyArray<PetBreedOptionLike>
): CreatePetRequest {
    const wNum = parseDecimalFormInput(v.weightStr);
    const breedLabel = resolvePetBreedWriteLabel(v.breedId, breedOptions);
    const birthRaw = trimFormText(v.birthDate);
    const notesRaw = trimFormText(v.notes);
    return {
        clientId: v.clientId.trim(),
        name: v.name.trim(),
        speciesId: v.speciesId.trim(),
        breedId: v.breedId.trim() || undefined,
        breed: breedLabel,
        gender: v.gender.trim() || undefined,
        birthDateInput: birthRaw || undefined,
        colorId: v.colorId.trim() || undefined,
        weight: wNum,
        notes: notesRaw || undefined
    };
}

/** Form canonical (`male` / `female`) → API `PetGender` sayısı (Male=1, Female=2). Bilinmeyen/boş → gönderilmez. */
function petGenderFormToApiEnum(gender: string | null | undefined): 1 | 2 | null {
    const t = gender?.trim();
    if (!t) {
        return null;
    }
    const n = normalizePetGender(t);
    if (n === 'male') {
        return 1;
    }
    if (n === 'female') {
        return 2;
    }
    return null;
}

/** `CreatePetRequest` → API gövdesi. `clientId`↔`ownerId` write farkı backend teyidi gerektirir; şimdilik `clientId`. */
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
    const genderNum = petGenderFormToApiEnum(req.gender);
    if (genderNum != null) {
        body.gender = genderNum;
    }
    const birthIn = trimFormText(req.birthDateInput);
    if (birthIn) {
        body.birthDate = birthIn;
    }
    const colorId = req.colorId?.trim();
    if (colorId) {
        body.colorId = colorId;
    }
    if (req.weight != null && !Number.isNaN(Number(req.weight))) {
        body.weight = Number(req.weight);
    }
    const notes = trimFormText(req.notes);
    if (notes) {
        body.notes = notes;
    }
    return body;
}

export function mapPetListItemDtoToVm(dto: PetListItemDto): PetListItemVm {
    const weightStr =
        dto.weight != null && !Number.isNaN(Number(dto.weight)) ? String(dto.weight) : EM;
    return {
        id: dto.id,
        clientId: dto.clientId?.trim() ? dto.clientId : null,
        name: str(dto.name),
        speciesName: speciesName(dto.speciesName),
        breed: canonicalBreedDisplay(dto),
        ownerName: str(dto.ownerName),
        gender: canonicalGenderRaw(dto),
        birthDate: canonicalPetBirthDateRead(dto),
        colorName: canonicalColorDisplayName(dto),
        weight: weightStr
    };
}

/** GET detay: sahip adı — önce `clientName`, sonra `ownerName`. */
function canonicalPetDetailOwnerName(dto: PetDetailDto): string {
    return str(
        firstTrimmed(
            dto.clientName,
            readDtoString(dto, ['ClientName']),
            dto.ownerName,
            readDtoString(dto, ['OwnerName'])
        )
    );
}

/** GET detay: telefon — önce `clientPhone`, sonra `ownerPhone`. */
function canonicalPetDetailOwnerPhone(dto: PetDetailDto): string {
    return str(
        firstTrimmed(
            dto.clientPhone,
            readDtoString(dto, ['ClientPhone']),
            dto.ownerPhone,
            readDtoString(dto, ['OwnerPhone'])
        )
    );
}

/** GET detay: e-posta — `clientEmail` (PascalCase yedeği). */
function canonicalPetDetailClientEmail(dto: PetDetailDto): string {
    return str(firstTrimmed(dto.clientEmail, readDtoString(dto, ['ClientEmail'])));
}

function canonicalPetDetailOwnerNavId(dto: PetDetailDto): string | null {
    const id = firstTrimmed(
        dto.ownerId,
        readDtoString(dto, ['OwnerId']),
        dto.clientId,
        readDtoString(dto, ['ClientId'])
    );
    return id ?? null;
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
        breed: canonicalBreedDisplay(dto),
        gender: canonicalGenderRaw(dto),
        birthDate: canonicalPetBirthDateRead(dto),
        colorName: canonicalColorDisplayName(dto),
        weight: weightStr,
        notes: dto.notes != null && dto.notes.trim().length > 0 ? dto.notes : EM,
        ownerId: canonicalPetDetailOwnerNavId(dto),
        clientName: canonicalPetDetailOwnerName(dto),
        clientPhone: canonicalPetDetailOwnerPhone(dto),
        clientEmail: canonicalPetDetailClientEmail(dto),
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

export function mapPetDetailDtoToEditVm(dto: PetDetailDto): PetEditVm {
    const birthDateInput = toBirthDateFormInput(canonicalPetBirthDateRead(dto));
    const speciesId = dto.speciesId?.trim() ?? '';
    const breedId = canonicalBreedId(dto);
    const breedNameLabel =
        firstTrimmed(dto.breedName, dto.breed, readDtoString(dto, ['BreedName', 'Breed'])) ?? null;
    const clientId = dto.clientId?.trim() || dto.ownerId?.trim() || '';
    const weightStr =
        dto.weight != null && !Number.isNaN(Number(dto.weight)) ? String(dto.weight) : '';
    return {
        id: dto.id,
        clientId,
        name: dto.name?.trim() ?? '',
        speciesId,
        breedId,
        breedName: breedNameLabel,
        gender: resolvePetGenderFormValue(readPetGenderRaw(dto)),
        birthDateInput,
        colorId: canonicalColorId(dto) ?? '',
        colorName:
            firstTrimmed(dto.colorName, readDtoString(dto, ['ColorName']), dto.color, readDtoString(dto, ['Color'])) ??
            null,
        weightStr,
        notes: dto.notes?.trim() ?? ''
    };
}

/** `YYYY-MM-dd` veya ISO string → form `type="date"` değeri. */
function toBirthDateFormInput(raw: string | null | undefined): string {
    const t = firstTrimmed(raw);
    if (!t) {
        return '';
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
        return t;
    }
    const d = new Date(t);
    if (Number.isNaN(d.getTime())) {
        return '';
    }
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
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

