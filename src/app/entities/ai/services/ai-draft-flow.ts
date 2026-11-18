import { inject, signal } from '@angular/core';
import type { Observable, Subscription } from 'rxjs';
import type { AiDraftVm } from '@/app/entities/ai/models/ai-vm.model';
import { AiService } from '@/app/entities/ai/services/ai.service';
import { AiStatusService } from '@/app/entities/ai/services/ai-status.service';
import { type AiProblem, aiProblemFromError } from '@/app/entities/ai/utils/ai-error.utils';

/** Paneldeki adım: not yaz → üretiliyor → taslak (düzenle, kabul et ya da at). */
export type AiDraftStep = 'compose' | 'generating' | 'draft';

export interface AiDraftFlowOptions {
    /** `AiDraftDto.feature`; bekleyen taslak bu özelliğe göre seçilir. */
    feature: string;
    /** Taslağın hedef kaydı; bekleyen taslak araması için. Kayıt yoksa (`null`) aranmaz. */
    target: () => { type: string; id: string } | null;
    generate: (note: string) => Observable<AiDraftVm>;
}

/** Bekleyen taslak artık karar verilemez durumda: panel temizlenir, sorun gösterilmez. */
const GONE_CODES: ReadonlySet<string> = new Set(['AiDrafts.NotFound', 'AiDrafts.NotPending', 'AiDrafts.Expired']);

/**
 * Taslak üreten bir özelliğin (AI-001, AI-003, AI-004) panel durumu; AI-009 akışı tek yerde. Sayfa bir örnek tutar,
 * ortak `app-ai-draft-flow` onu çizer. Kabulün ne yazacağı (forma aktar, ayrı kayıt) sayfanındır: `accept` yalnız isteği yürütür.
 * Yeniden üretilince önceki bekleyen taslak atılır; ekran yeniden açılınca kaydın bekleyen taslağına dönülür.
 */
export class AiDraftFlow {
    readonly step = signal<AiDraftStep>('compose');
    /** Hekimin notu (AI-001'de zorunlu serbest not, diğerlerinde isteğe bağlı vurgu); saklanmaz. */
    readonly note = signal('');
    readonly draft = signal<AiDraftVm | null>(null);
    readonly problem = signal<AiProblem | null>(null);
    readonly retryAvailableAt = signal<number | null>(null);
    /** Kabul / atma isteği sürüyor. */
    readonly deciding = signal(false);

    private request: Subscription | null = null;

    constructor(
        private readonly ai: AiService,
        private readonly aiStatus: AiStatusService,
        private readonly options: AiDraftFlowOptions
    ) {}

    /** Panel açılırken: elde taslak yoksa kaydın karar bekleyen taslağına döner (sayfadan çıkıp gelindi). Bulamazsa sessiz. */
    resumePending(): void {
        const target = this.options.target();

        if (!target || this.draft() || this.step() !== 'compose') {
            return;
        }

        this.ai.getPendingDrafts(target.type, target.id).subscribe({
            next: (rows) => {
                const pending = rows.find((d) => d.feature === this.options.feature && d.status === 'Draft' && d.content);

                if (pending && !this.draft() && this.step() === 'compose') {
                    this.showDraft(pending);
                }
            },
            error: () => undefined
        });
    }

    generate(): void {
        this.request?.unsubscribe();
        this.problem.set(null);
        this.retryAvailableAt.set(null);
        this.step.set('generating');
        this.request = this.options.generate(this.note()).subscribe({
            next: (draft) => this.showDraft(draft),
            error: (err: unknown) => {
                const problem = aiProblemFromError(err, 'draft');

                this.problem.set(problem);
                this.retryAvailableAt.set(problem.retryAfterSeconds ? Date.now() + problem.retryAfterSeconds * 1000 : null);
                this.step.set(this.draft() ? 'draft' : 'compose');

                if (problem.refreshStatus) {
                    this.aiStatus.refresh();
                }
            }
        });
    }

    /** Üretim sürerken "Vazgeç": istek bırakılır (sunucuda oluşursa bekleyen taslak olarak kalır, süresi dolunca silinir). */
    cancel(): void {
        this.request?.unsubscribe();
        this.request = null;
        this.step.set(this.draft() ? 'draft' : 'compose');
    }

    /** "At": hiçbir kayda yazılmaz. Taslak zaten karara bağlanmış / süresi dolmuşsa da panel temizlenir. */
    discard(done: () => void): void {
        const draft = this.draft();

        if (!draft || this.deciding()) {
            return;
        }

        this.deciding.set(true);
        this.ai.discardDraft(draft.id).subscribe({
            next: () => {
                this.reset();
                done();
            },
            error: (err: unknown) => {
                const problem = aiProblemFromError(err, 'decision');

                this.deciding.set(false);

                if (problem.code && GONE_CODES.has(problem.code)) {
                    this.reset();
                    done();

                    return;
                }

                this.problem.set(problem);
            }
        });
    }

    /** "Kabul et": `editedContent` yoksa üretilen içerik yazılır. Hata kaydın kuralındansa taslak bekler, sorun panelde yazar. */
    accept(editedContent: Record<string, unknown> | undefined, done: (result: AiDraftVm) => void): void {
        const draft = this.draft();

        if (!draft || this.deciding()) {
            return;
        }

        this.deciding.set(true);
        this.problem.set(null);
        this.ai.acceptDraft(draft.id, editedContent).subscribe({
            next: (result) => {
                this.reset();
                done(result);
            },
            error: (err: unknown) => {
                this.deciding.set(false);
                this.problem.set(aiProblemFromError(err, 'decision'));
            }
        });
    }

    /** Kabul edilemeyen bir durum sayfada fark edildi (ör. kaydedilmemiş form): sorun panelde gösterilir. */
    block(problem: AiProblem): void {
        this.problem.set(problem);
    }

    reset(): void {
        this.request?.unsubscribe();
        this.request = null;
        this.step.set('compose');
        this.note.set('');
        this.draft.set(null);
        this.problem.set(null);
        this.retryAvailableAt.set(null);
        this.deciding.set(false);
    }

    private showDraft(draft: AiDraftVm): void {
        const previous = this.draft();

        // "Yeniden": önceki taslak beklemede kalmasın.
        if (previous && previous.id !== draft.id) {
            this.ai.discardDraft(previous.id).subscribe({ error: () => undefined });
        }

        this.draft.set(draft);
        this.problem.set(null);
        this.step.set('draft');
    }
}

/** Bileşen alanında (enjeksiyon bağlamında) bir akış oluşturur. */
export function injectAiDraftFlow(options: AiDraftFlowOptions): AiDraftFlow {
    return new AiDraftFlow(inject(AiService), inject(AiStatusService), options);
}
