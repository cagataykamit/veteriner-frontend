import { inject, Injectable, signal, type TemplateRef } from '@angular/core';
import type { Subscription } from 'rxjs';
import type { PetHistorySummaryVm } from '@/app/entities/ai/models/ai-vm.model';
import { AiService } from '@/app/entities/ai/services/ai.service';
import { AiStatusService } from '@/app/entities/ai/services/ai-status.service';
import { type AiProblem, aiProblemFromError } from '@/app/entities/ai/utils/ai-error.utils';

/** Yan panelin genişliği (tasarım A: sağdan 440 px, sayfa sola kayar); düzen bu kadar sağ boşluk bırakır. */
export const AI_PANEL_WIDTH_PX = 440;

/** Geçmiş özeti isteğinin durumu; panel kapansa da tutulur, aynı hastada yeniden açılınca kota harcanmaz. */
export interface AiHistoryState {
    petId: string;
    petName: string;
    status: 'loading' | 'ready' | 'problem';
    result: PetHistorySummaryVm | null;
    problem: AiProblem | null;
    /** 429 sonrası "Yeniden dene" bu ana (ms) kadar pasif. */
    retryAvailableAt: number | null;
}

/** Sayfanın kendi taslak içeriği (AI-009 deseni: muayene notu, açıklama, talimat); şablon sayfanın bağlamında çalışır. */
export interface AiPanelCustomContent {
    kind: 'custom';
    title: string;
    template: TemplateRef<unknown>;
    /** Açan sayfa; sayfa kapanınca içerik de kapanır (`closeFor`). */
    owner: object;
    /** Kullanıcı paneli kapattı (× / Esc). */
    onClose?: () => void;
}

/** `search`: doğal dille hasta araması (AI-006); durumu `AiPetSearchService`'te, sayfalar arasında korunur. */
export type AiPanelContent = { kind: 'history' } | { kind: 'search' } | AiPanelCustomContent;

/**
 * Yapay zekâ yan paneli (tasarım A) tek yerden yönetilir: düzen bileşeni paneli çizer, sayfalar yalnız ne açılacağını söyler.
 * Geçmiş özeti sayfalar arasında korunur (hasta kartından muayene formuna geçince özet açık kalır); sayfaya ait taslak içerik
 * sayfa kapanınca kapanır. AI hataları yalnız bu panelde görünür.
 */
@Injectable({ providedIn: 'root' })
export class AiPanelService {
    private readonly ai = inject(AiService);
    private readonly aiStatus = inject(AiStatusService);

    readonly content = signal<AiPanelContent | null>(null);
    readonly history = signal<AiHistoryState | null>(null);
    /** Panelin kısa bildirimi ("Taslak atıldı; hiçbir şey kaydedilmedi."); panel bileşeni toast olarak gösterir. */
    readonly notice = signal<{ severity: 'success' | 'info' | 'warn'; text: string } | null>(null);

    private historySub: Subscription | null = null;

    /** Aynı hastanın hazır ya da süren özeti varsa yeniden istenmez (kota harcanmaz); yoksa özet istenir. */
    openHistory(petId: string, petName: string): void {
        this.content.set({ kind: 'history' });
        const h = this.history();

        if (h?.petId === petId && h.status !== 'problem') {
            return;
        }

        this.summarize(petId, petName);
    }

    /** "Yeniden özetle" / "Tekrar dene": yeni istek (kota harcar). */
    resummarize(): void {
        const h = this.history();

        if (h) {
            this.summarize(h.petId, h.petName);
        }
    }

    /** Yüklenirken "Vazgeç": istek bırakılır, panel kapanır. */
    cancelHistory(): void {
        this.historySub?.unsubscribe();
        this.historySub = null;
        this.history.set(null);
        this.content.set(null);
    }

    /** Hasta araması paneli; önceki arama ve sonuçları korunur (yeni istek atılmaz). */
    openSearch(): void {
        this.content.set({ kind: 'search' });
    }

    openCustom(content: Omit<AiPanelCustomContent, 'kind'>): void {
        this.content.set({ kind: 'custom', ...content });
    }

    /** Sayfanın AI işi için kısa bildirim (ör. "Taslak atıldı; hiçbir şey kaydedilmedi."). */
    notify(text: string, severity: 'success' | 'info' | 'warn' = 'success'): void {
        this.notice.set({ severity, text });
    }

    /** Sayfa kapanınca onun içeriği kapanır; geçmiş özeti etkilenmez. */
    closeFor(owner: object): void {
        const c = this.content();

        if (c?.kind === 'custom' && c.owner === owner) {
            this.content.set(null);
        }
    }

    /** × / Esc: panel kapanır; geçmiş özeti sonucu saklanır, sayfa içeriğine haber verilir. */
    close(): void {
        const c = this.content();

        this.content.set(null);

        if (c?.kind === 'custom') {
            c.onClose?.();
        }
    }

    private summarize(petId: string, petName: string): void {
        this.historySub?.unsubscribe();
        this.history.set({ petId, petName, status: 'loading', result: null, problem: null, retryAvailableAt: null });
        this.historySub = this.ai.summarizePetHistory(petId).subscribe({
            next: (result) => this.history.set({ petId, petName, status: 'ready', result, problem: null, retryAvailableAt: null }),
            error: (err: unknown) => {
                const problem = aiProblemFromError(err, 'summary');

                this.history.set({
                    petId,
                    petName,
                    status: 'problem',
                    result: null,
                    problem,
                    retryAvailableAt: problem.retryAfterSeconds ? Date.now() + problem.retryAfterSeconds * 1000 : null
                });

                if (problem.refreshStatus) {
                    this.aiStatus.refresh();
                }
            }
        });
    }
}
