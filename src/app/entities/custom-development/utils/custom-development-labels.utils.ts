import type {
    CustomDevelopmentPriority,
    CustomDevelopmentRequestStatus,
    CustomDevelopmentTargetKind,
    MigrationMeetingDay,
    MigrationMeetingTime,
    MigrationRecordVolume,
    MigrationSupportDetailsDto,
    MigrationSupportFee
} from '@/app/entities/custom-development/models/custom-development-request.model';
import type { StatusTagSeverity } from '@/app/shared/ui/status-tag/app-status-tag.component';

export const CUSTOM_DEVELOPMENT_STATUS_LABELS: Readonly<Record<CustomDevelopmentRequestStatus, string>> = {
    Received: 'Alındı',
    InReview: 'İnceleniyor',
    Planned: 'Planlandı',
    OutOfScope: 'Kapsam dışı',
    Completed: 'Tamamlandı'
};

export const CUSTOM_DEVELOPMENT_STATUS_SEVERITIES: Readonly<Record<CustomDevelopmentRequestStatus, StatusTagSeverity>> = {
    Received: 'secondary',
    InReview: 'info',
    Planned: 'warn',
    OutOfScope: 'danger',
    Completed: 'success'
};

export const CUSTOM_DEVELOPMENT_TARGET_LABELS: Readonly<Record<CustomDevelopmentTargetKind, string>> = {
    Screen: 'Ekran',
    Report: 'Rapor',
    Output: 'Çıktı',
    Migration: 'Geçiş desteği'
};

export const CUSTOM_DEVELOPMENT_PRIORITY_LABELS: Readonly<Record<CustomDevelopmentPriority, string>> = {
    Low: 'Düşük',
    Normal: 'Normal',
    High: 'Yüksek'
};

/** Sunucu yeni bir değer eklerse kodun kendisi görünür. */
export function customDevelopmentStatusLabel(status: string): string {
    return CUSTOM_DEVELOPMENT_STATUS_LABELS[status as CustomDevelopmentRequestStatus] ?? status;
}

export function customDevelopmentStatusSeverity(status: string): StatusTagSeverity {
    return CUSTOM_DEVELOPMENT_STATUS_SEVERITIES[status as CustomDevelopmentRequestStatus] ?? 'secondary';
}

export function customDevelopmentTargetLabel(kind: string): string {
    return CUSTOM_DEVELOPMENT_TARGET_LABELS[kind as CustomDevelopmentTargetKind] ?? kind;
}

export function customDevelopmentPriorityLabel(priority: string): string {
    return CUSTOM_DEVELOPMENT_PRIORITY_LABELS[priority as CustomDevelopmentPriority] ?? priority;
}

export const MIGRATION_RECORD_VOLUME_LABELS: Readonly<Record<MigrationRecordVolume, string>> = {
    UpTo1000: '1.000’e kadar',
    UpTo5000: '1.000 – 5.000',
    UpTo10000: '5.000 – 10.000',
    Over10000: '10.000’den fazla',
    Unknown: 'Bilmiyorum'
};

export const MIGRATION_MEETING_DAY_LABELS: Readonly<Record<MigrationMeetingDay, string>> = {
    Monday: 'Pazartesi',
    Tuesday: 'Salı',
    Wednesday: 'Çarşamba',
    Thursday: 'Perşembe',
    Friday: 'Cuma',
    Saturday: 'Cumartesi',
    Sunday: 'Pazar'
};

/** Saat aralıkları backend'deki bayraklarla aynı (§11.2, İstanbul saati). */
export const MIGRATION_MEETING_TIME_LABELS: Readonly<Record<MigrationMeetingTime, string>> = {
    Morning: '09.00 – 12.00',
    Midday: '12.00 – 15.00',
    Afternoon: '15.00 – 18.00'
};

/** Ücret metninin tek yeri; hangi pakette ücretsiz olduğu backend'dedir (§11.3), tutar yazılmaz. */
export const MIGRATION_SUPPORT_FEE_LABELS: Readonly<Record<MigrationSupportFee, string>> = {
    Free: 'Ücretsiz (paketinize dahil)',
    Quoted: 'Ücretli; fiyat size bildirilecek'
};

export function migrationSupportFeeLabel(fee: string): string {
    return MIGRATION_SUPPORT_FEE_LABELS[fee as MigrationSupportFee] ?? fee;
}

/** Bayrak listesi (`"Monday, Thursday"`) → seçili değerler; bilinmeyen değer atlanır. */
export function parseFlagList<T extends string>(value: string | null | undefined, known: Readonly<Record<T, string>>): T[] {
    return (value ?? '')
        .split(',')
        .map((v) => v.trim())
        .filter((v): v is T => v in known);
}

/** Seçili değerler → sunucunun beklediği bayrak listesi; sıra etiket tablosunun sırasıdır. */
export function toFlagList<T extends string>(values: readonly T[], known: Readonly<Record<T, string>>): string {
    return (Object.keys(known) as T[]).filter((k) => values.includes(k)).join(', ');
}

/** Talep satırında tek satırlık özet: kayıt sayısı, uygun gün ve saatler, ücret. */
export function migrationSupportSummary(m: MigrationSupportDetailsDto): string {
    const days = parseFlagList(m.meetingDays, MIGRATION_MEETING_DAY_LABELS).map((d) => MIGRATION_MEETING_DAY_LABELS[d]);
    const times = parseFlagList(m.meetingTimes, MIGRATION_MEETING_TIME_LABELS).map((t) => MIGRATION_MEETING_TIME_LABELS[t]);

    return [
        `Yaklaşık kayıt: ${MIGRATION_RECORD_VOLUME_LABELS[m.recordVolume] ?? m.recordVolume}`,
        `Uygun günler: ${days.join(', ')}`,
        `Saat: ${times.join(', ')}`,
        `Görüşme ${m.meetingDurationMinutes} dk`,
        migrationSupportFeeLabel(m.fee)
    ].join(' · ');
}
