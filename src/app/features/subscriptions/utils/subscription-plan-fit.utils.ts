import type { SubscriptionPlanFitVm } from '@/app/entities/subscription/models/subscription-vm.model';
import { subscriptionPlanLabel } from '@/app/entities/subscription/utils/subscription-plan.utils';

/** Bağlam: dönem sonu düşürme ya da denemede değişim / ücretliye geçiş (ADR-035 2026-11-08, seçenek A). */
export type PlanFitMode = 'downgrade' | 'change';

/** Fazlayı azaltacak sayfalar (panel yolları). */
export const PLAN_FIT_LINKS = {
    clinics: '/panel/settings/clinics',
    members: '/panel/settings/members',
    invites: '/panel/settings/invites/list'
} as const;

/** Ekranda gösterilen üç cümle: paketin sınırı, bugünkü kullanım, yapılacak iş. */
export interface PlanFitMessage {
    readonly limits: string;
    readonly usage: string;
    readonly action: string;
}

/**
 * Sığma bilgisini düz Türkçe cümleye çevirir. Örnek: "Temel en çok 1 aktif klinik ve 3 kullanıcı içerir. Sizin 2 aktif kliniğiniz ve
 * 5 kullanıcınız var. Paketi düşürmek için önce 1 kliniği pasife alın ve 2 kullanıcıyı çıkarın." Bekleyen davet kullanıcı sayısına
 * dahildir (davet kuralıyla aynı); iptali de sayıyı düşürür. Paket adı panelin metnidir.
 */
export function planFitMessage(fit: SubscriptionPlanFitVm, mode: PlanFitMode): PlanFitMessage {
    const plan = subscriptionPlanLabel(fit.targetPlanCode, null);
    const limits =
        fit.maxActiveClinics === null
            ? `${plan} en çok ${fit.maxUsers} kullanıcı içerir.`
            : `${plan} en çok ${fit.maxActiveClinics} aktif klinik ve ${fit.maxUsers} kullanıcı içerir.`;

    const users =
        fit.pendingInviteCount > 0
            ? `${fit.memberCount + fit.pendingInviteCount} kullanıcınız (${fit.pendingInviteCount} bekleyen davet dahil)`
            : `${fit.memberCount} kullanıcınız`;
    const usage =
        fit.maxActiveClinics === null
            ? `Sizin ${users} var.`
            : `Sizin ${fit.activeClinicCount} aktif kliniğiniz ve ${users} var.`;

    const steps: string[] = [];

    if (fit.excessClinicCount > 0) {
        steps.push(`${fit.excessClinicCount} kliniği pasife alın`);
    }

    if (fit.excessUserCount > 0) {
        steps.push(
            fit.pendingInviteCount > 0
                ? `${fit.excessUserCount} kullanıcıyı çıkarın ya da bekleyen davetleri iptal edin`
                : `${fit.excessUserCount} kullanıcıyı çıkarın`
        );
    }

    const lead = mode === 'downgrade' ? 'Paketi düşürmek için' : 'Bu pakete geçmek için';
    const action = steps.length > 0 ? `${lead} önce ${steps.join(' ve ')}.` : 'Kullanımınız artık bu pakete sığıyor; işlemi yeniden deneyebilirsiniz.';

    return { limits, usage, action };
}
