import { computed, inject, Injectable, signal } from '@angular/core';
import { AuthService } from '@/app/core/auth/auth.service';
import { AI_USE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import type { AiEntryState, AiStatusVm } from '@/app/entities/ai/models/ai-vm.model';
import { AiService } from '@/app/entities/ai/services/ai.service';
import { aiEntryState, aiUsageWarning } from '@/app/entities/ai/utils/ai-error.utils';

/**
 * AI kullanılabilirliği (`GET /api/v1/ai/status`): oturumda klinik başına bir kez sorulur, istek 429/503 gibi bir engelle dönünce
 * yeniden sorulur. Bütün giriş düğmeleri `entry()`'ye bakar; görünürlük kuralı tek yerde (`aiEntryState`).
 * Durum okunamazsa (ağ, 403, uç yok) giriş görünmez: AI hiçbir zaman klinik işi bozmaz.
 */
@Injectable({ providedIn: 'root' })
export class AiStatusService {
    private readonly ai = inject(AiService);
    private readonly auth = inject(AuthService);

    private readonly status = signal<AiStatusVm | null>(null);
    /** Durumu sorulan (ya da sorulmakta olan) klinik; `undefined` → hiç sorulmadı. */
    private loadedClinicId: string | null | undefined = undefined;

    readonly entry = computed<AiEntryState>(() => aiEntryState(this.status(), this.canUse()));
    /** %80 ve üstünde sonucun altındaki amber not; yoksa `null`. */
    readonly usageWarning = computed(() => aiUsageWarning(this.status()));

    /** İzni olan kullanıcı için durumu (aktif klinik değiştiyse yeniden) sorar; izin yoksa hiç istek atmaz. */
    ensureLoaded(): void {
        const clinicId = this.auth.getClinicId()?.trim() || null;

        if (!this.canUse() || this.loadedClinicId === clinicId) {
            return;
        }

        this.load(clinicId);
    }

    /** Kota, bütçe ya da klinik engeli istek anında geldiyse düğmenin durumu tazelenir. */
    refresh(): void {
        if (this.canUse()) {
            this.load(this.auth.getClinicId()?.trim() || null);
        }
    }

    private load(clinicId: string | null): void {
        // Başka klinikte önceki kliniğin durumu gösterilmez; aynı klinikte tazelerken düğme yanıp sönmesin.
        if (this.loadedClinicId !== clinicId) {
            this.status.set(null);
        }

        this.loadedClinicId = clinicId;
        this.ai.getStatus().subscribe({
            next: (s) => {
                if (this.loadedClinicId === clinicId) {
                    this.status.set(s);
                }
            },
            error: () => this.status.set(null)
        });
    }

    private canUse(): boolean {
        return this.auth.hasOperationClaim(AI_USE_CLAIM);
    }
}
