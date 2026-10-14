import type { ExaminationDetailVm, ExaminationRelatedSummaryVm } from '@/app/features/examinations/models/examination-vm.model';

/** Ziyaret çalışma alanında muayeneye eklenen işlem türleri (uygulama kendi bölümünde, gerekçeli ekleme kuralı orada). */
export type ProcedureKind = 'treatment' | 'prescription' | 'vaccination' | 'lab' | 'hospitalization';

export const PROCEDURE_KINDS: readonly ProcedureKind[] = ['treatment', 'prescription', 'vaccination', 'lab', 'hospitalization'];

export const PROCEDURE_LABEL: Record<ProcedureKind, string> = {
    treatment: 'Tedavi',
    prescription: 'Reçete',
    vaccination: 'Aşı',
    lab: 'Lab istemi',
    hospitalization: 'Yatış'
};

/** Detay sayfası rotası (`/panel/<segment>/<id>`). */
export const PROCEDURE_ROUTE_SEGMENT: Record<ProcedureKind, string> = {
    treatment: 'treatments',
    prescription: 'prescriptions',
    vaccination: 'vaccinations',
    lab: 'lab-results',
    hospitalization: 'hospitalizations'
};

/** Kesinleşmiş muayenede kilit nedeni (ADR-013); düğme ve kesinleştirme onayı aynı metni kullanır. */
export const FINALIZED_LOCK_MESSAGE =
    'Muayene kesinleşti: tedavi, reçete ve aşı eklenemez; yalnız gerekçeli uygulama ve ek not eklenebilir.';

export const READ_ONLY_TENANT_MESSAGE = 'İşletme salt okunur modda; kayıt oluşturulamaz.';

export const FINALIZED_HOSPITALIZATION_NOTE = 'Kesinleşmiş muayeneye bağlanmaz; yatış muayenesiz başlatılır.';

/** Kesinleşmiş muayeneye eklenemeyen türler. Lab sonucu serbest, yatış muayeneye bağlanmadan başlar. */
const LOCKED_WHEN_FINALIZED: readonly ProcedureKind[] = ['treatment', 'prescription', 'vaccination'];

export interface ProcedureAddState {
    disabled: boolean;
    /** Düğme devre dışıysa nedeni; kullanıcıya görünür. */
    reason: string | null;
    /** Etkin düğmenin yanında gösterilen kısa not. */
    note: string | null;
}

export function procedureAddState(kind: ProcedureKind, ctx: { finalized: boolean; mutationBlocked: boolean }): ProcedureAddState {
    if (ctx.mutationBlocked) {
        return { disabled: true, reason: READ_ONLY_TENANT_MESSAGE, note: null };
    }
    if (ctx.finalized && LOCKED_WHEN_FINALIZED.includes(kind)) {
        return { disabled: true, reason: FINALIZED_LOCK_MESSAGE, note: null };
    }
    if (ctx.finalized && kind === 'hospitalization') {
        return { disabled: false, reason: null, note: FINALIZED_HOSPITALIZATION_NOTE };
    }
    return { disabled: false, reason: null, note: null };
}

export interface ProcedureRowVm {
    kind: ProcedureKind;
    id: string;
    atUtc: string | null;
    title: string;
    detail: string | null;
    /** Durum etiketi (aşı: Planlı / İptal); yoksa null. */
    stateLabel?: string | null;
    /** İptal edilmiş kayıt gizlenmez; silik ve üstü çizili gösterilir. */
    cancelled?: boolean;
}

/** İlgili özetten tek işlem listesi; eski kayıt önce, tarihsiz sonda. */
export function buildProcedureRows(summary: ExaminationRelatedSummaryVm | null): ProcedureRowVm[] {
    const rows: ProcedureRowVm[] = [
        ...(summary?.treatments ?? []).map((r) => ({ kind: 'treatment' as const, id: r.id, atUtc: r.treatmentDateUtc, title: r.title, detail: null })),
        ...(summary?.prescriptions ?? []).map((r) => ({ kind: 'prescription' as const, id: r.id, atUtc: r.prescribedAtUtc, title: r.title, detail: null })),
        ...(summary?.labResults ?? []).map((r) => ({
            kind: 'lab' as const,
            id: r.id,
            atUtc: r.resultDateUtc ?? r.requestedAtUtc,
            title: r.testName,
            detail: r.awaitingInterpretation ? 'Yorum bekliyor' : null
        })),
        ...(summary?.hospitalizations ?? []).map((r) => ({
            kind: 'hospitalization' as const,
            id: r.id,
            atUtc: r.admittedAtUtc,
            title: r.reason,
            detail: r.dischargedAtUtc ? 'Taburcu' : r.isActive ? 'Aktif yatış' : null
        })),
        ...(summary?.vaccinations ?? []).map((r) => ({
            kind: 'vaccination' as const,
            id: r.id,
            atUtc: r.appliedAtUtc ?? r.dueAtUtc,
            title: r.vaccineName,
            detail: null,
            stateLabel: r.status === 'Cancelled' ? 'İptal' : r.status === 'Scheduled' ? 'Planlı' : null,
            cancelled: r.status === 'Cancelled'
        }))
    ];
    return rows.sort((a, b) => {
        if (!a.atUtc || !b.atUtc) {
            return a.atUtc ? -1 : b.atUtc ? 1 : 0;
        }
        return a.atUtc.localeCompare(b.atUtc);
    });
}

const EMPTY_TEXT_MARK = '—';

function isBlank(value: string | null | undefined): boolean {
    const v = value?.trim() ?? '';
    return v === '' || v === EMPTY_TEXT_MARK;
}

/**
 * Kesinleştirme öncesi tamamlanma kontrolü (uyarı, engel değil). Ücretlenmemiş kalem kontrolü ücret önerisi modeli
 * (ADR-018) gelince eklenecek; uygulama özet uç yanıtında olmadığından "işlem yok" denetimine girmez.
 */
export function finalizeWarnings(
    exam: Pick<ExaminationDetailVm, 'assessment' | 'plan'>,
    summary: ExaminationRelatedSummaryVm | null
): string[] {
    const warnings: string[] = [];
    if (isBlank(exam.assessment)) {
        warnings.push('Değerlendirme / tanı girilmemiş.');
    }
    if (isBlank(exam.plan)) {
        warnings.push('Plan / takip bilgisi girilmemiş.');
    }
    if (summary && !buildProcedureRows(summary).some((r) => !r.cancelled)) {
        warnings.push('Muayeneye bağlı tedavi, reçete, aşı, lab istemi veya yatış kaydı yok (uygulama bu denetime dahil değildir).');
    }
    return warnings;
}
