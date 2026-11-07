/** Otomatik hatırlatıcı kuralı — `AUTOMATED_REMINDERS_API_CONTRACT.md` §3. Kural ve sınırlar backend'dedir. */
export type ClinicReminderRuleType = 'FollowUp' | 'Debt' | 'NoReturn';

export interface ClinicReminderRuleDto {
    readonly ruleType: ClinicReminderRuleType;
    readonly isEnabled: boolean;
    readonly days: number;
    readonly defaultDays: number;
    readonly minDays: number;
    readonly maxDays: number;
    /** `false`: ticari ileti gönderimi merkezi olarak kapalı, kural açık olsa da e-posta gitmez. */
    readonly sendingAvailable: boolean;
    readonly updatedAtUtc: string | null;
}

export interface ClinicReminderRulesDto {
    readonly clinicId: string;
    readonly rules: readonly ClinicReminderRuleDto[];
}

export interface ClinicReminderRuleUpdateDto {
    readonly ruleType: ClinicReminderRuleType;
    readonly isEnabled: boolean;
    readonly days: number;
}

/** Ayar ekranı metni: başlık, N'in iki yanı ve ne zaman gittiği. */
export const CLINIC_REMINDER_RULE_TEXT: Readonly<Record<ClinicReminderRuleType, { title: string; before: string; after: string; detail: string }>> = {
    FollowUp: {
        title: 'Kontrol muayenesi',
        before: 'Kontrol tarihinden',
        after: 'gün önce',
        detail: 'Tedavide kontrol tarihi yazılıysa hasta sahibine gider. Hayvanın planlı randevusu varsa gitmez.'
    },
    Debt: {
        title: 'Ödenmemiş bakiye',
        before: 'Ücretin üzerinden',
        after: 'gün geçince',
        detail: 'İletide tutar yazılmaz. Aynı borç için bir kez gider; bağlanmamış ödemesi ya da kredisi olan müşteriye gitmez.'
    },
    NoReturn: {
        title: 'Uzun süredir gelmedi',
        before: 'Son gelişin üzerinden',
        after: 'gün geçince',
        detail: 'Planlı randevusu olmayan hayvanın sahibine gider.'
    }
};
