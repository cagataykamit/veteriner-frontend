import { HttpParams } from '@angular/common/http';
import type {
    DischargeHospitalizationRequestDto,
    HospitalizationDetailDto,
    HospitalizationListItemDto,
    HospitalizationListItemDtoPagedResult,
    HospitalizationWriteRequestDto,
    HospitalizationWriteResultDto
} from '@/app/entities/hospitalization/models/hospitalization-api.model';
import type {
    CreateHospitalizationRequest,
    DischargeHospitalizationRequest,
    HospitalizationWriteResult
} from '@/app/entities/hospitalization/models/hospitalization-create.model';
import type { HospitalizationsListQuery } from '@/app/entities/hospitalization/models/hospitalization-query.model';
import type {
    HospitalizationDetailVm,
    HospitalizationEditVm,
    HospitalizationListItemVm
} from '@/app/entities/hospitalization/models/hospitalization-vm.model';
import { dateOnlyInputToIstanbulEndUtcIso, dateOnlyInputToIstanbulStartUtcIso } from '@/app/shared/utils/date.utils';

const EM = '—';

function str(v: string | null | undefined): string {
    return v?.trim() ? v : EM;
}

function firstTrimmed(...vals: Array<string | null | undefined>): string | null {
    for (const v of vals) {
        if (typeof v === 'string' && v.trim()) {
            return v.trim();
        }
    }

    return null;
}

function readDtoString(dto: HospitalizationListItemDto | HospitalizationDetailDto, keys: string[]): string | null {
    const o = dto as unknown as Record<string, unknown>;

    for (const k of keys) {
        const v = o[k];

        if (typeof v === 'string' && v.trim()) {
            return v.trim();
        }
    }

    return null;
}

function readDtoBoolean(dto: HospitalizationListItemDto | HospitalizationDetailDto, keys: string[]): boolean | null {
    const o = dto as unknown as Record<string, unknown>;

    for (const k of keys) {
        const v = o[k];

        if (typeof v === 'boolean') {
            return v;
        }

        if (v === 'true' || v === true) {
            return true;
        }

        if (v === 'false' || v === false) {
            return false;
        }
    }

    return null;
}

function canonicalClinicId(dto: HospitalizationListItemDto | HospitalizationDetailDto): string | null {
    return firstTrimmed(dto.clinicId, readDtoString(dto, ['ClinicId']));
}

function canonicalClientId(dto: HospitalizationListItemDto | HospitalizationDetailDto): string | null {
    return firstTrimmed(dto.clientId, readDtoString(dto, ['ClientId', 'OwnerId']));
}

function canonicalClientName(dto: HospitalizationListItemDto | HospitalizationDetailDto): string {
    return str(firstTrimmed(dto.clientName, readDtoString(dto, ['ClientName', 'OwnerName'])));
}

function canonicalPetId(dto: HospitalizationListItemDto | HospitalizationDetailDto): string | null {
    return firstTrimmed(dto.petId, readDtoString(dto, ['PetId', 'AnimalId']));
}

function canonicalPetName(dto: HospitalizationListItemDto | HospitalizationDetailDto): string {
    const raw = firstTrimmed(dto.petName, readDtoString(dto, ['PetName', 'AnimalName']));

    return raw ?? '';
}

function canonicalExaminationId(dto: HospitalizationListItemDto | HospitalizationDetailDto): string | null {
    return firstTrimmed(dto.examinationId, readDtoString(dto, ['ExaminationId']));
}

function canonicalVisitId(dto: HospitalizationListItemDto | HospitalizationDetailDto): string | null {
    return firstTrimmed(dto.visitId, readDtoString(dto, ['VisitId']));
}

function canonicalLocation(dto: HospitalizationListItemDto | HospitalizationDetailDto): string {
    return firstTrimmed(dto.location, readDtoString(dto, ['Location'])) ?? '';
}

function canonicalRoomId(dto: HospitalizationListItemDto | HospitalizationDetailDto): string | null {
    return firstTrimmed(dto.roomId, readDtoString(dto, ['RoomId']));
}

function canonicalRoomName(dto: HospitalizationListItemDto | HospitalizationDetailDto): string | null {
    return firstTrimmed(dto.roomName, readDtoString(dto, ['RoomName']));
}

function canonicalWardName(dto: HospitalizationListItemDto | HospitalizationDetailDto): string | null {
    return firstTrimmed(dto.wardName, readDtoString(dto, ['WardName']));
}

/** Konum gösterimi tek kural (sözleşme §10.3): oda varsa "Bölüm / Oda" (adlar tanımın o anki adı), yoksa `location` metni. */
export function hospitalizationLocationLabel(input: { roomId: string | null; roomName: string | null; wardName: string | null; location: string }): string {
    if (input.roomId) {
        const parts = [input.wardName, input.roomName].filter((p): p is string => !!p?.trim());

        if (parts.length > 0) {
            return parts.join(' / ');
        }
    }

    return input.location;
}

function canonicalLocationFields(dto: HospitalizationListItemDto | HospitalizationDetailDto): Pick<HospitalizationListItemVm, 'location' | 'roomId' | 'roomName' | 'wardName' | 'locationLabel'> {
    const fields = {
        location: canonicalLocation(dto),
        roomId: canonicalRoomId(dto),
        roomName: canonicalRoomName(dto),
        wardName: canonicalWardName(dto)
    };

    return { ...fields, locationLabel: hospitalizationLocationLabel(fields) };
}

function canonicalAdmittedAt(dto: HospitalizationListItemDto | HospitalizationDetailDto): string | null {
    return firstTrimmed(dto.admittedAtUtc, readDtoString(dto, ['AdmittedAtUtc']));
}

function canonicalPlannedDischargeAt(dto: HospitalizationListItemDto | HospitalizationDetailDto): string | null {
    return firstTrimmed(dto.plannedDischargeAtUtc, readDtoString(dto, ['PlannedDischargeAtUtc']));
}

function canonicalDischargedAt(dto: HospitalizationListItemDto | HospitalizationDetailDto): string | null {
    return firstTrimmed(dto.dischargedAtUtc, readDtoString(dto, ['DischargedAtUtc']));
}

function canonicalReason(dto: HospitalizationListItemDto | HospitalizationDetailDto): string {
    return str(firstTrimmed(dto.reason, readDtoString(dto, ['Reason'])));
}

function canonicalNotes(dto: HospitalizationDetailDto): string {
    return str(firstTrimmed(dto.notes, readDtoString(dto, ['Notes', 'Note'])));
}

function canonicalDischargeNote(dto: HospitalizationDetailDto): string {
    return firstTrimmed(dto.dischargeNote, readDtoString(dto, ['DischargeNote'])) ?? '';
}

function canonicalRowVersion(dto: HospitalizationDetailDto): string {
    return firstTrimmed(dto.rowVersion, readDtoString(dto, ['RowVersion'])) ?? '';
}

function canonicalCreatedAt(dto: HospitalizationDetailDto): string | null {
    return firstTrimmed(dto.createdAtUtc, readDtoString(dto, ['CreatedAtUtc']));
}

function canonicalUpdatedAt(dto: HospitalizationDetailDto): string | null {
    return firstTrimmed(dto.updatedAtUtc, readDtoString(dto, ['UpdatedAtUtc']));
}

/**
 * UI durumu: önce API `isActive`; yoksa `dischargedAtUtc` boşluğuna göre türetim (ayrı status enum yok).
 */
function canonicalIsActive(dto: HospitalizationListItemDto | HospitalizationDetailDto): boolean {
    const explicit = readDtoBoolean(dto, ['isActive', 'IsActive']);

    if (explicit !== null) {
        return explicit;
    }

    return !canonicalDischargedAt(dto);
}

export function mapHospitalizationListItemDtoToVm(dto: HospitalizationListItemDto): HospitalizationListItemVm {
    return {
        id: dto.id,
        clinicId: canonicalClinicId(dto),
        petId: canonicalPetId(dto),
        petName: canonicalPetName(dto),
        clientId: canonicalClientId(dto),
        clientName: canonicalClientName(dto),
        examinationId: canonicalExaminationId(dto),
        visitId: canonicalVisitId(dto),
        ...canonicalLocationFields(dto),
        admittedAtUtc: canonicalAdmittedAt(dto),
        plannedDischargeAtUtc: canonicalPlannedDischargeAt(dto),
        dischargedAtUtc: canonicalDischargedAt(dto),
        reason: canonicalReason(dto),
        isActive: canonicalIsActive(dto)
    };
}

export function mapHospitalizationDetailDtoToVm(dto: HospitalizationDetailDto): HospitalizationDetailVm {
    return {
        id: dto.id,
        clinicId: canonicalClinicId(dto),
        petId: canonicalPetId(dto),
        petName: canonicalPetName(dto),
        clientId: canonicalClientId(dto),
        clientName: canonicalClientName(dto),
        examinationId: canonicalExaminationId(dto),
        visitId: canonicalVisitId(dto),
        ...canonicalLocationFields(dto),
        admittedAtUtc: canonicalAdmittedAt(dto),
        plannedDischargeAtUtc: canonicalPlannedDischargeAt(dto),
        dischargedAtUtc: canonicalDischargedAt(dto),
        reason: canonicalReason(dto),
        notes: canonicalNotes(dto),
        dischargeNote: canonicalDischargeNote(dto),
        createdAtUtc: canonicalCreatedAt(dto),
        updatedAtUtc: canonicalUpdatedAt(dto),
        isActive: canonicalIsActive(dto),
        rowVersion: canonicalRowVersion(dto)
    };
}

export function mapHospitalizationDetailDtoToEditVm(dto: HospitalizationDetailDto): HospitalizationEditVm {
    return {
        id: dto.id,
        clinicId: canonicalClinicId(dto) ?? '',
        clientId: canonicalClientId(dto) ?? '',
        petId: canonicalPetId(dto) ?? '',
        clientName: firstTrimmed(dto.clientName, readDtoString(dto, ['ClientName'])),
        petName: firstTrimmed(dto.petName, readDtoString(dto, ['PetName'])),
        examinationId: canonicalExaminationId(dto) ?? '',
        visitId: canonicalVisitId(dto) ?? '',
        location: canonicalLocation(dto),
        roomId: canonicalRoomId(dto) ?? '',
        admittedAtUtc: canonicalAdmittedAt(dto),
        plannedDischargeAtUtc: canonicalPlannedDischargeAt(dto),
        reason: firstTrimmed(dto.reason, readDtoString(dto, ['Reason'])) ?? '',
        notes: firstTrimmed(dto.notes, readDtoString(dto, ['Notes', 'Note'])) ?? '',
        isActive: canonicalIsActive(dto),
        rowVersion: canonicalRowVersion(dto)
    };
}

export function mapPagedHospitalizationsToVm(result: HospitalizationListItemDtoPagedResult): {
    items: HospitalizationListItemVm[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
} {
    const items = (result.items ?? []).map(mapHospitalizationListItemDtoToVm);

    return {
        items,
        page: result.page,
        pageSize: result.pageSize,
        totalItems: result.totalItems,
        totalPages: result.totalPages
    };
}

/**
 * GET `/api/v1/hospitalizations` — canonical query:
 * `Page`, `PageSize`, `Search`, `dateFromUtc`, `dateToUtc`, `Sort`, `Order` (+ `clinicId`, `PetId`, `ActiveOnly`).
 * Backend `admittedAtUtc >= dateFromUtc` ve `<= dateToUtc` (iki uç dahil); İstanbul günü başı ve günü sonu (23:59:59.999) gönderilir.
 * Filtre: `ActiveOnly` = `true` | `false` (yalnızca ilgili durum seçildiğinde gönderilir).
 */
export function hospitalizationsQueryToHttpParams(query: HospitalizationsListQuery): HttpParams {
    let p = new HttpParams();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    p = p.set('Page', String(page));
    p = p.set('PageSize', String(pageSize));

    if (query.search?.trim()) {
        p = p.set('Search', query.search.trim());
    }

    if (query.clinicId?.trim()) {
        p = p.set('clinicId', query.clinicId.trim());
    }

    if (query.petId?.trim()) {
        p = p.set('PetId', query.petId.trim());
    }

    if (query.activeOnly === true) {
        p = p.set('ActiveOnly', 'true');
    } else if (query.activeOnly === false) {
        p = p.set('ActiveOnly', 'false');
    }

    const fromUtc = query.fromDate?.trim() ? dateOnlyInputToIstanbulStartUtcIso(query.fromDate.trim()) : '';

    if (fromUtc) {
        p = p.set('dateFromUtc', fromUtc);
    }

    const toUtc = query.toDate?.trim() ? dateOnlyInputToIstanbulEndUtcIso(query.toDate.trim()) : '';

    if (toUtc) {
        p = p.set('dateToUtc', toUtc);
    }

    if (query.sort?.trim()) {
        p = p.set('Sort', query.sort.trim());
    }

    if (query.order?.trim()) {
        p = p.set('Order', query.order.trim());
    }

    return p;
}

export function mapCreateHospitalizationToApiBody(req: CreateHospitalizationRequest): HospitalizationWriteRequestDto {
    const clinicId = req.clinicId.trim();
    const petId = req.petId.trim();

    if (!clinicId) {
        throw new Error('HOSPITALIZATION_WRITE_CLINIC_ID_REQUIRED');
    }

    if (!petId) {
        throw new Error('HOSPITALIZATION_WRITE_PET_ID_REQUIRED');
    }

    const admittedAtUtc = req.admittedAtUtc?.trim() ?? '';

    if (!admittedAtUtc) {
        throw new Error('HOSPITALIZATION_WRITE_ADMITTED_AT_REQUIRED');
    }

    const reason = req.reason.trim();

    if (!reason) {
        throw new Error('HOSPITALIZATION_WRITE_REASON_REQUIRED');
    }

    const planned = req.plannedDischargeAtUtc?.trim();
    const dto: HospitalizationWriteRequestDto = {
        clinicId,
        petId,
        admittedAtUtc,
        reason,
        plannedDischargeAtUtc: planned ? planned : null,
        notes: req.notes?.trim() ? req.notes.trim() : null
    };
    const ex = req.examinationId?.trim();

    if (ex) {
        dto.examinationId = ex;
    }

    const visitId = req.visitId?.trim();

    if (visitId) {
        dto.visitId = visitId;
    }

    if (req.location != null) {
        dto.location = req.location.trim();
    }

    const roomId = req.roomId?.trim();

    if (roomId) {
        dto.roomId = roomId;
    } else if (req.clearRoom) {
        // `roomId` ve `clearRoom` birlikte gönderilemez (400); oda seçiliyse kaldırma isteği anlamsızdır.
        dto.clearRoom = true;
    }

    const rowVersion = req.rowVersion?.trim();

    if (rowVersion) {
        dto.rowVersion = rowVersion;
    }

    return dto;
}

export interface HospitalizationUpsertFormAdapterInput {
    clinicId: string;
    petId: string;
    admittedAtUtc: string;
    plannedDischargeAtUtc?: string | null;
    reason: string;
    notes?: string | null;
    examinationId?: string | null;
    visitId?: string | null;
    location?: string | null;
    roomId?: string | null;
    clearRoom?: boolean;
    rowVersion?: string;
}

export function mapHospitalizationUpsertFormToCreateRequest(
    input: HospitalizationUpsertFormAdapterInput
): CreateHospitalizationRequest {
    return {
        clinicId: input.clinicId.trim(),
        petId: input.petId.trim(),
        admittedAtUtc: input.admittedAtUtc.trim(),
        plannedDischargeAtUtc: input.plannedDischargeAtUtc?.trim() ? input.plannedDischargeAtUtc.trim() : null,
        reason: input.reason.trim(),
        notes: input.notes?.trim() ? input.notes.trim() : null,
        examinationId: input.examinationId?.trim() ? input.examinationId.trim() : null,
        visitId: input.visitId?.trim() ? input.visitId.trim() : null,
        location: input.location == null ? null : input.location.trim(),
        roomId: input.roomId?.trim() ? input.roomId.trim() : null,
        clearRoom: input.clearRoom === true,
        rowVersion: input.rowVersion
    };
}

export function mapDischargeHospitalizationToApiBody(req: DischargeHospitalizationRequest): DischargeHospitalizationRequestDto {
    const d = req.dischargedAtUtc.trim();

    if (!d) {
        throw new Error('HOSPITALIZATION_DISCHARGE_DATE_REQUIRED');
    }

    const dto: DischargeHospitalizationRequestDto = {
        dischargedAtUtc: d,
        dischargeNote: req.dischargeNote?.trim() ? req.dischargeNote.trim() : null
    };
    const rowVersion = req.rowVersion?.trim();

    if (rowVersion) {
        dto.rowVersion = rowVersion;
    }

    return dto;
}

export function mapHospitalizationWriteResultDto(dto: HospitalizationWriteResultDto | null | undefined, fallbackId: string): HospitalizationWriteResult {
    return { id: firstTrimmed(dto?.id) ?? fallbackId, rowVersion: firstTrimmed(dto?.rowVersion) };
}
