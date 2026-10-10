import { HttpParams } from '@angular/common/http';
import type {
    ExaminationDetailDto,
    ExaminationListItemDto,
    ExaminationListItemDtoPagedResult,
    ExaminationRelatedHospitalizationItemDto,
    ExaminationRelatedSummaryDto,
    ExaminationUpdateRequestDto,
    ExaminationUpsertRequestDto,
    ExaminationWriteResultDto
} from '@/app/features/examinations/models/examination-api.model';
import type {
    CreateExaminationRequest,
    ExaminationVitalsInput,
    UpdateExaminationRequest
} from '@/app/features/examinations/models/examination-create.model';
import type { ExaminationWorkspaceFormValue } from '@/app/features/examinations/models/examination-form.model';
import type { ExaminationsListQuery } from '@/app/features/examinations/models/examination-query.model';
import type {
    ExaminationDetailVm,
    ExaminationEditVm,
    ExaminationListItemVm,
    ExaminationRelatedSummaryVm,
    ExaminationWriteResultVm
} from '@/app/features/examinations/models/examination-vm.model';
import {
    addGregorianDaysToYmd,
    dateOnlyInputToIstanbulStartUtcIso,
    fromIstanbulDateAndTimeToUtcIso,
    fromIstanbulDateTimeLocalInputToUtcIso,
    toIstanbulDateTimeLocalInputValue
} from '@/app/shared/utils/date.utils';

const EM = '—';

function finiteNumberOrNull(v: unknown): number | null {
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function trimmedOrNull(v: string | null | undefined): string | null {
    const t = v?.trim();
    return t ? t : null;
}

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

function readDtoString(dto: ExaminationListItemDto | ExaminationDetailDto, keys: string[]): string | null {
    const o = dto as unknown as Record<string, unknown>;
    for (const k of keys) {
        const v = o[k];
        if (typeof v === 'string' && v.trim()) {
            return v.trim();
        }
    }
    return null;
}

function readNestedName(dto: Record<string, unknown>, objectKeys: string[], nameKeys: string[]): string | null {
    for (const ok of objectKeys) {
        const inner = dto[ok];
        if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
            const io = inner as Record<string, unknown>;
            for (const nk of nameKeys) {
                const v = io[nk];
                if (typeof v === 'string' && v.trim()) {
                    return v.trim();
                }
            }
        }
    }
    return null;
}

function canonicalClientId(dto: ExaminationListItemDto | ExaminationDetailDto): string | null {
    return firstTrimmed(dto.clientId, dto.ownerId, readDtoString(dto, ['ClientId', 'OwnerId', 'CustomerId', 'customerId']));
}

function canonicalClinicId(dto: ExaminationListItemDto | ExaminationDetailDto): string | null {
    return firstTrimmed(dto.clinicId);
}

function canonicalClinicName(dto: ExaminationListItemDto | ExaminationDetailDto): string | null {
    return firstTrimmed(dto.clinicName);
}

function rawClientName(dto: ExaminationListItemDto | ExaminationDetailDto): string | null {
    const nested = readNestedName(dto as unknown as Record<string, unknown>, ['client', 'Client', 'owner', 'Owner', 'customer', 'Customer'], [
        'name',
        'Name',
        'fullName',
        'FullName'
    ]);
    return firstTrimmed(
        dto.clientName,
        dto.ownerName,
        readDtoString(dto, ['ClientName', 'OwnerName', 'CustomerName', 'customerName']),
        nested
    );
}

function canonicalClientName(dto: ExaminationListItemDto | ExaminationDetailDto): string {
    return str(rawClientName(dto));
}

function canonicalPetId(dto: ExaminationListItemDto | ExaminationDetailDto): string | null {
    return firstTrimmed(dto.petId, dto.animalId, readDtoString(dto, ['PetId', 'AnimalId']));
}

function rawPetName(dto: ExaminationListItemDto | ExaminationDetailDto): string | null {
    const nested = readNestedName(dto as unknown as Record<string, unknown>, ['pet', 'Pet', 'animal', 'Animal'], [
        'name',
        'Name',
        'fullName',
        'FullName'
    ]);
    return firstTrimmed(
        dto.petName,
        dto.animalName,
        readDtoString(dto, ['PetName', 'AnimalName', 'PatientName', 'patientName']),
        nested
    );
}

function canonicalPetName(dto: ExaminationListItemDto | ExaminationDetailDto): string {
    return str(rawPetName(dto));
}

function canonicalExaminedAt(dto: ExaminationListItemDto | ExaminationDetailDto): string | null {
    return firstTrimmed(dto.examinedAtUtc, dto.examinationDateUtc);
}

function canonicalVisitReason(dto: ExaminationListItemDto | ExaminationDetailDto): string {
    return str(firstTrimmed(dto.visitReason));
}

function canonicalFindings(dto: ExaminationListItemDto | ExaminationDetailDto): string {
    return str(firstTrimmed(dto.findings, dto.finding));
}

function canonicalAssessment(dto: ExaminationListItemDto | ExaminationDetailDto): string {
    return str(firstTrimmed(dto.assessment, dto.diagnosis));
}

function canonicalNotes(dto: ExaminationListItemDto | ExaminationDetailDto): string {
    return str(firstTrimmed(dto.notes, dto.note));
}

function canonicalDetailCreatedAtUtc(dto: ExaminationDetailDto): string | null {
    return firstTrimmed(dto.createdAtUtc, readDtoString(dto, ['CreatedAtUtc']));
}

function canonicalDetailUpdatedAtUtc(dto: ExaminationDetailDto): string | null {
    return firstTrimmed(dto.updatedAtUtc, readDtoString(dto, ['UpdatedAtUtc']));
}

function canonicalExaminationListItemId(dto: ExaminationListItemDto): string {
    return (
        firstTrimmed(
            dto.examinationId,
            dto.id,
            readDtoString(dto, ['examinationId', 'ExaminationId', 'id', 'Id'])
        ) ?? ''
    );
}

export function mapExaminationListItemDtoToVm(dto: ExaminationListItemDto): ExaminationListItemVm {
    return {
        id: canonicalExaminationListItemId(dto),
        clinicId: canonicalClinicId(dto),
        clinicName: canonicalClinicName(dto),
        examinedAtUtc: canonicalExaminedAt(dto),
        clientId: canonicalClientId(dto),
        clientName: canonicalClientName(dto),
        petId: canonicalPetId(dto),
        petName: canonicalPetName(dto),
        appointmentId: dto.appointmentId?.trim() ? dto.appointmentId : null,
        visitReason: canonicalVisitReason(dto)
    };
}

export function mapExaminationDetailDtoToVm(dto: ExaminationDetailDto): ExaminationDetailVm {
    return {
        id: dto.id,
        clinicId: canonicalClinicId(dto),
        clinicName: canonicalClinicName(dto),
        examinedAtUtc: canonicalExaminedAt(dto),
        clientId: canonicalClientId(dto),
        clientName: canonicalClientName(dto),
        petId: canonicalPetId(dto),
        petName: canonicalPetName(dto),
        appointmentId: dto.appointmentId?.trim() ? dto.appointmentId : null,
        visitReason: canonicalVisitReason(dto),
        notes: canonicalNotes(dto),
        findings: canonicalFindings(dto),
        assessment: canonicalAssessment(dto),
        anamnesis: str(dto.anamnesis),
        plan: str(dto.plan),
        weightKg: finiteNumberOrNull(dto.weightKg),
        temperatureC: finiteNumberOrNull(dto.temperatureC),
        heartRateBpm: finiteNumberOrNull(dto.heartRateBpm),
        respiratoryRatePerMin: finiteNumberOrNull(dto.respiratoryRatePerMin),
        vitalsMeasuredAtUtc: trimmedOrNull(dto.vitalsMeasuredAtUtc),
        rowVersion: trimmedOrNull(dto.rowVersion),
        createdAtUtc: canonicalDetailCreatedAtUtc(dto),
        updatedAtUtc: canonicalDetailUpdatedAtUtc(dto)
    };
}

export function mapExaminationDetailDtoToEditVm(dto: ExaminationDetailDto): ExaminationEditVm {
    return {
        id: dto.id,
        clinicId: canonicalClinicId(dto) ?? '',
        clientId: canonicalClientId(dto) ?? '',
        petId: canonicalPetId(dto) ?? '',
        clientName: rawClientName(dto),
        petName: rawPetName(dto),
        appointmentId: trimmedOrNull(dto.appointmentId),
        examinedAtUtc: canonicalExaminedAt(dto),
        visitReason: firstTrimmed(dto.visitReason) ?? '',
        anamnesis: dto.anamnesis ?? '',
        findings: firstTrimmed(dto.findings, dto.finding) ?? '',
        weightKg: finiteNumberOrNull(dto.weightKg),
        temperatureC: finiteNumberOrNull(dto.temperatureC),
        heartRateBpm: finiteNumberOrNull(dto.heartRateBpm),
        respiratoryRatePerMin: finiteNumberOrNull(dto.respiratoryRatePerMin),
        vitalsMeasuredAtUtc: trimmedOrNull(dto.vitalsMeasuredAtUtc),
        assessment: firstTrimmed(dto.assessment, dto.diagnosis) ?? '',
        plan: dto.plan ?? '',
        notes: firstTrimmed(dto.notes, dto.note) ?? '',
        rowVersion: trimmedOrNull(dto.rowVersion) ?? ''
    };
}

/** POST/PUT yanıtı → `{ id, rowVersion }`. Düz string gövde (eski sözleşme) yalnızca id sayılır. */
export function mapExaminationWriteResultDtoToVm(raw: unknown): ExaminationWriteResultVm | null {
    if (typeof raw === 'string') {
        const id = raw.trim();
        return id ? { id, rowVersion: null } : null;
    }
    if (!raw || typeof raw !== 'object') {
        return null;
    }
    const o = raw as Partial<ExaminationWriteResultDto> & Record<string, unknown>;
    const id = firstTrimmed(
        typeof o.id === 'string' ? o.id : null,
        typeof o['Id'] === 'string' ? (o['Id'] as string) : null,
        typeof o['examinationId'] === 'string' ? (o['examinationId'] as string) : null
    );
    if (!id) {
        return null;
    }
    const rv = firstTrimmed(
        typeof o.rowVersion === 'string' ? o.rowVersion : null,
        typeof o['RowVersion'] === 'string' ? (o['RowVersion'] as string) : null
    );
    return { id, rowVersion: rv };
}

export function mapPagedExaminationsToVm(result: ExaminationListItemDtoPagedResult): {
    items: ExaminationListItemVm[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
} {
    const items = (result.items ?? []).map(mapExaminationListItemDtoToVm);
    return {
        items,
        page: result.page,
        pageSize: result.pageSize,
        totalItems: result.totalItems,
        totalPages: result.totalPages
    };
}

function relatedSafeTrim(v: string | null | undefined): string | null {
    const t = v?.trim();
    return t ? t : null;
}

function relatedHospitalizationIsActive(dto: ExaminationRelatedHospitalizationItemDto, discharged: string | null): boolean {
    if (dto.isActive === true) {
        return true;
    }
    if (dto.isActive === false) {
        return false;
    }
    return discharged == null;
}

/** GET /examinations/{id}/related-summary → VM. */
export function mapExaminationRelatedSummaryDtoToVm(dto: ExaminationRelatedSummaryDto): ExaminationRelatedSummaryVm {
    const examinationId = dto.examinationId?.trim() ?? '';
    return {
        examinationId,
        petId: dto.petId?.trim() ? dto.petId.trim() : null,
        petName: str(dto.petName),
        clientId: dto.clientId?.trim() ? dto.clientId.trim() : null,
        clientName: str(dto.clientName),
        treatments: (dto.treatments ?? [])
            .map((x) => {
                const id = x.id?.trim();
                if (!id) {
                    return null;
                }
                return {
                    id,
                    treatmentDateUtc: relatedSafeTrim(x.treatmentDateUtc),
                    clinicId: x.clinicId?.trim() ? x.clinicId.trim() : null,
                    clinicName: x.clinicName?.trim() ? x.clinicName.trim() : null,
                    title: str(x.title)
                };
            })
            .filter((x): x is NonNullable<typeof x> => x != null),
        prescriptions: (dto.prescriptions ?? [])
            .map((x) => {
                const id = x.id?.trim();
                if (!id) {
                    return null;
                }
                return {
                    id,
                    prescribedAtUtc: relatedSafeTrim(x.prescribedAtUtc),
                    clinicId: x.clinicId?.trim() ? x.clinicId.trim() : null,
                    clinicName: x.clinicName?.trim() ? x.clinicName.trim() : null,
                    title: str(x.title),
                    treatmentId: x.treatmentId?.trim() ? x.treatmentId.trim() : null
                };
            })
            .filter((x): x is NonNullable<typeof x> => x != null),
        labResults: (dto.labResults ?? [])
            .map((x) => {
                const id = x.id?.trim();
                if (!id) {
                    return null;
                }
                return {
                    id,
                    resultDateUtc: relatedSafeTrim(x.resultDateUtc),
                    clinicId: x.clinicId?.trim() ? x.clinicId.trim() : null,
                    clinicName: x.clinicName?.trim() ? x.clinicName.trim() : null,
                    testName: str(x.testName)
                };
            })
            .filter((x): x is NonNullable<typeof x> => x != null),
        hospitalizations: (dto.hospitalizations ?? [])
            .map((x) => {
                const id = x.id?.trim();
                if (!id) {
                    return null;
                }
                const dischargedAtUtc = relatedSafeTrim(x.dischargedAtUtc);
                const isActive = relatedHospitalizationIsActive(x, dischargedAtUtc);
                return {
                    id,
                    admittedAtUtc: relatedSafeTrim(x.admittedAtUtc),
                    clinicId: x.clinicId?.trim() ? x.clinicId.trim() : null,
                    clinicName: x.clinicName?.trim() ? x.clinicName.trim() : null,
                    reason: str(x.reason),
                    dischargedAtUtc,
                    isActive
                };
            })
            .filter((x): x is NonNullable<typeof x> => x != null),
        payments: (dto.payments ?? [])
            .map((x) => {
                const id = x.id?.trim();
                if (!id) {
                    return null;
                }
                const amount = x.amount;
                const num =
                    amount != null && typeof amount === 'number' && !Number.isNaN(amount) ? amount : null;
                return {
                    id,
                    paidAtUtc: relatedSafeTrim(x.paidAtUtc),
                    clinicId: x.clinicId?.trim() ? x.clinicId.trim() : null,
                    clinicName: x.clinicName?.trim() ? x.clinicName.trim() : null,
                    amount: num,
                    currency: x.currency?.trim() ? x.currency.trim() : null,
                    method: x.method
                };
            })
            .filter((x): x is NonNullable<typeof x> => x != null)
    };
}

/**
 * Liste filtresi için İstanbul günü (`yyyy-MM-dd`) → `[dateFromUtc, dateToUtc)`.
 * Bitiş: seçilen bitiş gününün ertesi gününün başlangıcı (hariç sınır).
 * Tek dönüşüm noktası burasıdır; çağıran taraf UTC üretmez.
 */
export function examinationDateRangeToUtcParams(
    fromDate: string | undefined,
    toDate: string | undefined
): { dateFromUtc?: string; dateToUtc?: string } {
    const out: { dateFromUtc?: string; dateToUtc?: string } = {};
    const from = fromDate?.trim();
    if (from) {
        const iso = dateOnlyInputToIstanbulStartUtcIso(from);
        if (iso) {
            out.dateFromUtc = iso;
        }
    }
    const to = toDate?.trim();
    if (to) {
        const next = addGregorianDaysToYmd(to, 1);
        const iso = next ? dateOnlyInputToIstanbulStartUtcIso(next) : '';
        if (iso) {
            out.dateToUtc = iso;
        }
    }
    return out;
}

/**
 * GET `/api/v1/examinations` — canonical query:
 * `Page`, `PageSize`, `Search`, `clinicId`, `PetId`, `ClientId`, `appointmentId`, `dateFromUtc`, `dateToUtc`, `Sort`, `Order`.
 * `examinedOnLocalDate` ile birlikte kullanılamaz; bu istemci yalnızca UTC aralığı gönderir.
 */
export function examinationsQueryToHttpParams(query: ExaminationsListQuery): HttpParams {
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
    if (query.clientId?.trim()) {
        p = p.set('ClientId', query.clientId.trim());
    }
    if (query.appointmentId?.trim()) {
        p = p.set('appointmentId', query.appointmentId.trim());
    }
    const range = examinationDateRangeToUtcParams(query.fromDate, query.toDate);
    if (range.dateFromUtc) {
        p = p.set('dateFromUtc', range.dateFromUtc);
    }
    if (range.dateToUtc) {
        p = p.set('dateToUtc', range.dateToUtc);
    }
    if (query.sort?.trim()) {
        p = p.set('Sort', query.sort.trim());
    }
    if (query.order?.trim()) {
        p = p.set('Order', query.order.trim());
    }
    return p;
}

type VitalKey = 'weightKg' | 'temperatureC' | 'heartRateBpm' | 'respiratoryRatePerMin';
type VitalValues = Pick<ExaminationVitalsInput, VitalKey>;

const VITAL_KEYS: ReadonlyArray<VitalKey> = ['weightKg', 'temperatureC', 'heartRateBpm', 'respiratoryRatePerMin'];

export function hasAnyVital(v: VitalValues): boolean {
    return VITAL_KEYS.some((k) => v[k] != null);
}

/**
 * Kayıtta dolu bir vital boşaltıldı ama başka vital kaldı mı?
 * Sözleşme tek vitali silmeyi desteklemez (yalnızca `clearVitals` ile tümü); `null` gönderilirse eski değer korunur.
 */
export function isPartialVitalClear(form: VitalValues, current: VitalValues): boolean {
    return hasAnyVital(form) && VITAL_KEYS.some((k) => current[k] != null && form[k] == null);
}

function contentFields(
    req: CreateExaminationRequest
): Omit<ExaminationUpsertRequestDto, 'appointmentId' | 'clinicId' | 'petId' | 'visitId'> {
    return {
        examinedAtUtc: req.examinedAtUtc,
        visitReason: req.visitReason.trim(),
        anamnesis: trimmedOrNull(req.anamnesis),
        findings: req.findings?.trim() ?? '',
        weightKg: req.weightKg,
        temperatureC: req.temperatureC,
        heartRateBpm: req.heartRateBpm,
        respiratoryRatePerMin: req.respiratoryRatePerMin,
        // Sözleşme: ölçüm zamanı yalnızca en az bir vital ile gönderilir.
        vitalsMeasuredAtUtc: hasAnyVital(req) ? trimmedOrNull(req.vitalsMeasuredAtUtc) : null,
        assessment: trimmedOrNull(req.assessment),
        plan: trimmedOrNull(req.plan),
        notes: trimmedOrNull(req.notes)
    };
}

export function mapCreateExaminationToApiBody(req: CreateExaminationRequest): ExaminationUpsertRequestDto {
    return {
        appointmentId: trimmedOrNull(req.appointmentId),
        clinicId: trimmedOrNull(req.clinicId),
        petId: trimmedOrNull(req.petId),
        visitId: trimmedOrNull(req.visitId),
        ...contentFields(req)
    };
}

/**
 * PUT gövdesi (kısmi güncelleme sözleşmesi):
 * - metin alanları her zaman string gider; boşaltılan alan `""` olur (null mevcut değeri korurdu);
 * - vitaller: dolu olanlar gider, boş olanlar hiç gönderilmez; tümü bilinçli boşaltıldıysa yalnızca `clearVitals: true`
 *   (vital değerlerle birlikte asla);
 * - `appointmentId` yalnızca mevcut değerle aynı gider (veya hiç gitmez).
 */
export function mapUpdateExaminationToApiBody(req: UpdateExaminationRequest): ExaminationUpdateRequestDto {
    const body: ExaminationUpdateRequestDto = {
        clinicId: req.clinicId.trim(),
        petId: req.petId.trim(),
        examinedAtUtc: req.examinedAtUtc,
        visitReason: req.visitReason.trim(),
        anamnesis: req.anamnesis.trim(),
        findings: req.findings.trim(),
        assessment: req.assessment.trim(),
        plan: req.plan.trim(),
        notes: req.notes.trim(),
        rowVersion: req.rowVersion
    };
    const appt = trimmedOrNull(req.appointmentId);
    if (appt) {
        body.appointmentId = appt;
    }
    if (req.clearVitals) {
        body.clearVitals = true;
        return body;
    }
    if (req.weightKg != null) {
        body.weightKg = req.weightKg;
    }
    if (req.temperatureC != null) {
        body.temperatureC = req.temperatureC;
    }
    if (req.heartRateBpm != null) {
        body.heartRateBpm = req.heartRateBpm;
    }
    if (req.respiratoryRatePerMin != null) {
        body.respiratoryRatePerMin = req.respiratoryRatePerMin;
    }
    const measuredAt = hasAnyVital(req) ? trimmedOrNull(req.vitalsMeasuredAtUtc) : null;
    if (measuredAt) {
        body.vitalsMeasuredAtUtc = measuredAt;
    }
    return body;
}

function numberOrNull(v: number | null | undefined): number | null {
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function vitalsFromForm(
    f: ExaminationWorkspaceFormValue,
    originalVitalsMeasuredAtUtc: string | null | undefined
): ExaminationVitalsInput {
    const vitals = {
        weightKg: numberOrNull(f.weightKg),
        temperatureC: numberOrNull(f.temperatureC),
        heartRateBpm: numberOrNull(f.heartRateBpm),
        respiratoryRatePerMin: numberOrNull(f.respiratoryRatePerMin)
    };
    let measured: string | null = null;
    const local = f.vitalsMeasuredAtLocal?.trim() ?? '';
    if (local) {
        const orig = originalVitalsMeasuredAtUtc?.trim() ?? '';
        // Değişmediyse kayıtlı anı aynen koru (datetime-local saniyeyi keser).
        measured =
            orig && toIstanbulDateTimeLocalInputValue(orig) === local
                ? orig
                : fromIstanbulDateTimeLocalInputToUtcIso(local);
    }
    return { ...vitals, vitalsMeasuredAtUtc: measured };
}

/** Form → create isteği. Geçersiz tarih/saat için `null`. */
export function mapExaminationFormToCreateRequest(
    f: ExaminationWorkspaceFormValue,
    ctx: { clinicId: string; petId: string; appointmentId?: string | null; visitId?: string | null }
): CreateExaminationRequest | null {
    const examinedAtUtc = fromIstanbulDateAndTimeToUtcIso(f.examinationDate, f.examinationTime);
    if (!examinedAtUtc) {
        return null;
    }
    const visitId = trimmedOrNull(ctx.visitId);
    return {
        // Visit bağlamında klinik, hayvan ve randevu sunucuda Visit'ten türetilir; çakışabilecek değer iletilmez.
        ...(visitId
            ? { visitId }
            : {
                  appointmentId: trimmedOrNull(ctx.appointmentId) ?? undefined,
                  clinicId: ctx.clinicId.trim(),
                  petId: trimmedOrNull(ctx.petId) ?? undefined
              }),
        examinedAtUtc,
        visitReason: f.visitReason,
        anamnesis: f.anamnesis,
        findings: f.findings,
        assessment: f.assessment,
        plan: f.plan,
        notes: f.notes,
        ...vitalsFromForm(f, null)
    };
}

/** Form → update isteği. Bağlam (`clinicId`, `petId`, `appointmentId`, `rowVersion`) kayıttan gelir. */
export function mapExaminationFormToUpdateRequest(
    f: ExaminationWorkspaceFormValue,
    current: Pick<
        ExaminationEditVm,
        'clinicId' | 'petId' | 'appointmentId' | 'rowVersion' | 'vitalsMeasuredAtUtc' | VitalKey
    >
): UpdateExaminationRequest | null {
    const examinedAtUtc = fromIstanbulDateAndTimeToUtcIso(f.examinationDate, f.examinationTime);
    if (!examinedAtUtc) {
        return null;
    }
    const vitals = vitalsFromForm(f, current.vitalsMeasuredAtUtc);
    return {
        clinicId: current.clinicId,
        petId: current.petId,
        appointmentId: current.appointmentId,
        rowVersion: current.rowVersion,
        examinedAtUtc,
        visitReason: f.visitReason,
        anamnesis: f.anamnesis,
        findings: f.findings,
        assessment: f.assessment,
        plan: f.plan,
        notes: f.notes,
        // Kayıtta vital varken hepsi boşaltıldıysa bilinçli silme; başka durumda vital alanları hiç gitmez/korunur.
        clearVitals: !hasAnyVital(vitals) && hasAnyVital(current),
        ...vitals
    };
}
