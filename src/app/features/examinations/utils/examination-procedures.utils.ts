import type { ExaminationDetailVm, ExaminationRelatedSummaryVm } from '@/app/entities/examination/models/examination-vm.model';
import { imagingModalityLabel } from '@/app/entities/imaging/utils/imaging.utils';

/** Ziyaret çalışma alanında muayeneye eklenen işlem türleri (uygulama kendi bölümünde, gerekçeli ekleme kuralı orada). */
export type ProcedureKind = 'treatment' | 'prescription' | 'vaccination' | 'lab' | 'imaging' | 'hospitalization';

export const PROCEDURE_KINDS: readonly ProcedureKind[] = ['treatment', 'prescription', 'vaccination', 'lab', 'imaging', 'hospitalization'];

export const PROCEDURE_LABEL: Record<ProcedureKind, string> = {
    treatment: 'Tedavi',
    prescription: 'Reçete',
    vaccination: 'Aşı',
    lab: 'Lab istemi',
    imaging: 'Görüntüleme',
    hospitalization: 'Yatış'
};

/** Detay sayfası rotası (`/panel/<segment>/<id>`). */
export const PROCEDURE_ROUTE_SEGMENT: Record<ProcedureKind, string> = {
    treatment: 'treatments',
    prescription: 'prescriptions',
    vaccination: 'vaccinations',
    lab: 'lab-results',
    imaging: 'imaging',
    hospitalization: 'hospitalizations'
};

/** Kesinleşmiş muayenede ekleme kuralının özeti (ADR-043 K3, ADR-013 Ek 2); kesinleştirme onayı bu metni gösterir. */
export const FINALIZED_LOCK_MESSAGE =
    'Muayene kesinleşti: tedavi, reçete, aşı ve uygulama yalnız gerekçeyle "sonradan eklendi" olarak eklenir; lab ve görüntüleme serbesttir, ek not her zaman eklenebilir.';

export const READ_ONLY_TENANT_MESSAGE = 'İşletme salt okunur modda; kayıt oluşturulamaz.';

/** Kesinleşmiş muayeneye tedavi edici kayıt (reçete, tedavi, aşı) zorunlu gerekçeyle "kesinleştirmeden sonra eklendi" olarak yazılır (ADR-043 AK-6); gerekçe alanı formda. */
export const FINALIZED_LATE_ENTRY_NOTE = 'Kesinleşmiş muayeneye gerekçeyle, "sonradan eklendi" olarak yazılır.';

/** Tedavi edici kayıt türleri: kesinleşmiş muayeneye gerekçeli geç kayıtla eklenir. Kural backend'de (ADR-043 K3); burada yalnız ipucu metni seçilir. */
const LATE_ENTRY_KINDS: readonly ProcedureKind[] = ['treatment', 'prescription', 'vaccination'];

export const FINALIZED_HOSPITALIZATION_NOTE = 'Kesinleşmiş muayeneye bağlanmaz; yatış muayenesiz başlatılır.';

/** Kesinleşmiş muayeneye görüntüleme bağlamak yeni (ek) kayıt sayılır (ADR-013 uyumu; IMAGING_API_CONTRACT.md §1). */
export const FINALIZED_IMAGING_NOTE = 'Kesinleşmiş muayeneye görüntüleme yeni (ek) kayıt olarak eklenir.';

/** Kesinleşmiş muayeneye lab istemi yeni (ek) kayıt olarak eklenir ve rozet taşır (ADR-043 AK-4). */
export const FINALIZED_LAB_NOTE = 'Kesinleşmiş muayeneye lab istemi yeni (ek) kayıt olarak eklenir.';

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

    if (ctx.finalized && LATE_ENTRY_KINDS.includes(kind)) {
        return { disabled: false, reason: null, note: FINALIZED_LATE_ENTRY_NOTE };
    }

    if (ctx.finalized && kind === 'lab') {
        return { disabled: false, reason: null, note: FINALIZED_LAB_NOTE };
    }

    if (ctx.finalized && kind === 'imaging') {
        return { disabled: false, reason: null, note: FINALIZED_IMAGING_NOTE };
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
    /** Kesinleştirmeden sonra eklenen kayıt (ADR-013 uyumu) rozetle işaretlenir. */
    addedAfterFinalization?: boolean;
    /** İptal edilmiş kayıt gizlenmez; silik ve üstü çizili gösterilir. */
    cancelled?: boolean;
}

/** İlgili özetten tek işlem listesi; eski kayıt önce, tarihsiz sonda. İptal edilen kayıt gizlenmez, silik ve "İptal" etiketiyle gösterilir. */
export function buildProcedureRows(summary: ExaminationRelatedSummaryVm | null): ProcedureRowVm[] {
    const rows: ProcedureRowVm[] = [
        ...(summary?.treatments ?? []).map((r) => ({
            kind: 'treatment' as const,
            id: r.id,
            atUtc: r.treatmentDateUtc,
            title: r.title,
            detail: null,
            stateLabel: r.isCancelled ? 'İptal' : null,
            cancelled: r.isCancelled === true,
            addedAfterFinalization: r.addedAfterFinalization === true
        })),
        ...(summary?.prescriptions ?? []).map((r) => ({
            kind: 'prescription' as const,
            id: r.id,
            atUtc: r.prescribedAtUtc,
            title: r.title,
            detail: null,
            stateLabel: r.isCancelled ? 'İptal' : null,
            cancelled: r.isCancelled === true,
            addedAfterFinalization: r.addedAfterFinalization === true
        })),
        ...(summary?.labResults ?? []).map((r) => ({
            kind: 'lab' as const,
            id: r.id,
            atUtc: r.resultDateUtc ?? r.requestedAtUtc,
            title: r.testName,
            detail: r.awaitingInterpretation ? 'Yorum bekliyor' : null,
            addedAfterFinalization: r.addedAfterFinalization === true
        })),
        ...(summary?.hospitalizations ?? []).map((r) => ({
            kind: 'hospitalization' as const,
            id: r.id,
            atUtc: r.admittedAtUtc,
            title: r.reason,
            detail: r.isCancelled ? null : r.dischargedAtUtc ? 'Taburcu' : r.isActive ? 'Aktif yatış' : null,
            stateLabel: r.isCancelled ? 'İptal' : null,
            cancelled: r.isCancelled
        })),
        ...(summary?.imaging ?? []).map((r) => ({
            kind: 'imaging' as const,
            id: r.id,
            atUtc: r.performedAtUtc,
            title: imagingModalityLabel(r.modality),
            detail: r.description,
            stateLabel: r.cancelled ? 'İptal' : null,
            cancelled: r.cancelled,
            addedAfterFinalization: r.addedAfterFinalization
        })),
        ...(summary?.vaccinations ?? []).map((r) => ({
            kind: 'vaccination' as const,
            id: r.id,
            atUtc: r.appliedAtUtc ?? r.dueAtUtc,
            title: r.vaccineName,
            detail: null,
            stateLabel: r.status === 'Cancelled' ? 'İptal' : r.status === 'Scheduled' ? 'Planlı' : null,
            cancelled: r.status === 'Cancelled',
            addedAfterFinalization: r.addedAfterFinalization === true
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

export type FinalizeCheckKey = 'assessment' | 'plan' | 'procedures' | 'pendingCharges';

/** Kesinleştirme kontrol listesi maddesi: `ok` değilse `warning` metni gösterilir (engel değil). */
export interface FinalizeCheckItem {
    key: FinalizeCheckKey;
    ok: boolean;
    /** Madde tamamken gösterilen kısa metin. */
    okLabel: string;
    warning: string;
}

/**
 * Kesinleştirme öncesi tamamlanma kontrolü (uyarı, engel değil). Uygulama özet uç yanıtında olmadığından "işlem yok"
 * denetimine girmez; ücret bekleyen kalem sayısı (ADR-018) ayrı maddedir. Özet yüklenmemişse (veya sayı bilinmiyorsa)
 * ona dayanan madde listede yer almaz.
 */
export function finalizeChecklist(
    exam: Pick<ExaminationDetailVm, 'assessment' | 'plan'>,
    summary: ExaminationRelatedSummaryVm | null
): FinalizeCheckItem[] {
    const items: FinalizeCheckItem[] = [
        { key: 'assessment', ok: !isBlank(exam.assessment), okLabel: 'Değerlendirme / tanı girildi', warning: 'Değerlendirme / tanı girilmemiş.' },
        { key: 'plan', ok: !isBlank(exam.plan), okLabel: 'Plan / takip girildi', warning: 'Plan / takip bilgisi girilmemiş.' }
    ];

    if (summary) {
        items.push({
            key: 'procedures',
            ok: buildProcedureRows(summary).some((r) => !r.cancelled),
            okLabel: 'Muayeneye bağlı işlem var',
            warning: 'Muayeneye bağlı tedavi, reçete, aşı, lab istemi, görüntüleme veya yatış kaydı yok (uygulama bu denetime dahil değildir).'
        });
    }

    const pending = summary?.pendingChargeCount;

    if (pending !== null && pending !== undefined) {
        items.push({
            key: 'pendingCharges',
            ok: pending === 0,
            okLabel: 'Ücret bekleyen işlem yok',
            warning: `${pending} ücret bekliyor (resepsiyon ücrete çevirmedi veya ücretsiz saymadı).`
        });
    }

    return items;
}

/** Kesinleştirme onayında gösterilen uyarılar: kontrol listesinin eksik maddeleri. */
export function finalizeWarnings(
    exam: Pick<ExaminationDetailVm, 'assessment' | 'plan'>,
    summary: ExaminationRelatedSummaryVm | null
): string[] {
    return finalizeChecklist(exam, summary)
        .filter((i) => !i.ok)
        .map((i) => i.warning);
}
