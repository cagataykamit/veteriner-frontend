import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, input, signal, type TemplateRef, untracked, viewChild } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { AiDraftFlowComponent } from '@/app/entities/ai/components/ai-draft-flow.component';
import { AiDraftTextComponent } from '@/app/entities/ai/components/ai-draft-text.component';
import { AiEntryButtonComponent } from '@/app/entities/ai/components/ai-entry-button.component';
import { AiProvenanceChipComponent } from '@/app/entities/ai/components/ai-provenance-chip.component';
import { AI_FEATURE_OWNER_EXPLANATION } from '@/app/entities/ai/models/ai-vm.model';
import { AiService } from '@/app/entities/ai/services/ai.service';
import { injectAiDraftFlow } from '@/app/entities/ai/services/ai-draft-flow';
import { AiPanelService } from '@/app/entities/ai/services/ai-panel.service';
import { AiStatusService } from '@/app/entities/ai/services/ai-status.service';
import type { OwnerExplanationVm } from '@/app/entities/owner-explanation/models/owner-explanation-vm.model';
import { OwnerExplanationsService } from '@/app/entities/owner-explanation/services/owner-explanations.service';
import { TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { copyTextToClipboard } from '@/app/shared/utils/clipboard.utils';
import { printElement } from '@/app/shared/utils/print.utils';

/**
 * Hasta sahibine sade açıklama (AI-003, `AI_DRAFTS_API_CONTRACT.md` §7.2): muayeneye bağlı ayrı kayıt, yalnız AI taslağının
 * kabulüyle oluşur ve değişmez. Taslak yan panelde hazırlanır (tasarım A); kayıtta Kopyala, Yazdır ve "AI taslağından" izi.
 * Kayıt yoksa ve hazırlanamıyorsa (izin / AI kapalı) bölüm hiç görünmez.
 */
@Component({
    selector: 'app-owner-explanations-section',
    standalone: true,
    imports: [ButtonModule, AiDraftFlowComponent, AiDraftTextComponent, AiEntryButtonComponent, AiProvenanceChipComponent, AppErrorStateComponent, TrDateTimePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (visible()) {
            <section class="card mb-0" aria-labelledby="owner-explanations-title" data-testid="owner-explanations-section">
                <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <h5 id="owner-explanations-title" class="m-0">Hasta sahibine açıklama</h5>
                    @if (canCreate()) {
                        <app-ai-entry-button label="Açıklama hazırla" [active]="panelOpen()" (pressed)="openPanel()" />
                    }
                </div>
                <p class="text-sm text-muted-color mt-0 mb-3">Muayenenin hasta sahibi için sade dille anlatımı; muayene kaydını değiştirmez.</p>

                @if (error()) {
                    <app-error-state [detail]="error()!" (retry)="reload()" />
                } @else if (loading() && rows().length === 0) {
                    <p class="text-muted-color text-sm m-0">Yükleniyor…</p>
                } @else if (rows().length === 0) {
                    <p class="field-empty m-0" data-testid="owner-explanations-empty">Henüz açıklama yok.</p>
                } @else {
                    <ul class="list-none m-0 p-0">
                        @for (row of rows(); track row.id) {
                            <li #item class="mb-4 last:mb-0 pb-4 last:pb-0 border-b last:border-b-0 border-surface-200 dark:border-surface-700" data-testid="owner-explanation-row">
                                <p class="mt-0 mb-2 whitespace-pre-wrap break-words">{{ row.text }}</p>
                                <div class="flex flex-wrap items-center gap-2 print-hidden">
                                    <span class="text-sm text-muted-color mr-auto">
                                        {{ row.createdAtUtc | trDateTime }}
                                        @if (row.createdByName) {
                                            · {{ row.createdByName }}
                                        }
                                        @for (p of row.aiProvenance; track p.draftId) {
                                            <app-ai-provenance-chip [edited]="p.edited" [acceptedByName]="p.acceptedByName" [acceptedAtUtc]="p.acceptedAtUtc" />
                                        }
                                    </span>
                                    <button pButton type="button" size="small" class="p-button-text p-button-secondary" (click)="copy(row)" data-testid="owner-explanation-copy"><i class="pi pi-copy"></i>Kopyala</button>
                                    <button pButton type="button" size="small" class="p-button-text p-button-secondary" (click)="print(item)" data-testid="owner-explanation-print"><i class="pi pi-print"></i>Yazdır</button>
                                </div>
                            </li>
                        }
                    </ul>
                }
            </section>
        }

        <ng-template #aiTpl>
            <app-ai-draft-flow
                [flow]="flow"
                hint="Muayene kaydından hasta sahibine sade dille bir açıklama taslağı hazırlanır. İsterseniz vurgulamak istediklerinizi yazın."
                noteLabel="Vurgulamak istedikleriniz (isteğe bağlı)"
                [noteMax]="2000"
                [noteRows]="4"
                loadingText="Açıklama hazırlanıyor…"
                noticeText="Muayene kaydına dayanır, sade dille yazar; kayıtta olmayan tanı, ilaç ya da doz eklemez. Hasta sahibine vermeden önce okuyun."
                (accept)="accept()"
            >
                @if (flow.draft()) {
                    <app-ai-draft-text label="Açıklama" [text]="draftText()" />
                }
            </app-ai-draft-flow>
        </ng-template>
    `
})
export class OwnerExplanationsSectionComponent {
    readonly examinationId = input.required<string>();
    /** Açıklama hazırlayabilir mi (`Examinations.Update`, yazılabilir kiracı); AI'nın görünürlüğünü ayrıca durum belirler. */
    readonly canCreate = input(false);

    private readonly service = inject(OwnerExplanationsService);
    private readonly ai = inject(AiService);
    private readonly aiPanel = inject(AiPanelService);
    private readonly aiStatus = inject(AiStatusService);

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly rows = signal<OwnerExplanationVm[]>([]);

    readonly flow = injectAiDraftFlow({
        feature: AI_FEATURE_OWNER_EXPLANATION,
        target: () => ({ type: 'Examination', id: this.examinationId() }),
        generate: (note) => this.ai.draftOwnerExplanation(this.examinationId(), note)
    });

    private readonly aiTemplate = viewChild.required<TemplateRef<unknown>>('aiTpl');
    private readonly draftEditor = viewChild(AiDraftTextComponent);

    protected readonly draftText = computed(() => {
        const text = this.flow.draft()?.content?.['text'];

        return typeof text === 'string' ? text : '';
    });

    protected readonly panelOpen = computed(() => {
        const c = this.aiPanel.content();

        return c?.kind === 'custom' && c.owner === this;
    });

    /** Kayıt varsa ya da hazırlanabiliyorsa görünür; hata da gösterilir (kayıt okunamadı). */
    protected readonly visible = computed(() => this.rows().length > 0 || !!this.error() || (this.canCreate() && this.aiStatus.entry().kind !== 'hidden'));

    constructor() {
        effect(() => {
            this.examinationId();
            untracked(() => this.reload());
        });
        // Hazırlama hakkı varsa AI durumu sorulur: bölüm boşken yalnız AI açıksa görünür.
        effect(() => {
            if (this.canCreate()) {
                untracked(() => this.aiStatus.ensureLoaded());
            }
        });
        inject(DestroyRef).onDestroy(() => this.aiPanel.closeFor(this));
    }

    reload(): void {
        this.loading.set(true);
        this.error.set(null);
        this.service.getForExamination(this.examinationId()).subscribe({
            next: (rows) => {
                this.rows.set(rows);
                this.loading.set(false);
            },
            error: (e: Error) => {
                this.error.set(e.message || 'Hasta sahibine açıklamalar yüklenemedi.');
                this.loading.set(false);
            }
        });
    }

    openPanel(): void {
        this.aiPanel.openCustom({ title: 'Hasta sahibine açıklama', template: this.aiTemplate(), owner: this });
        this.flow.resumePending();
    }

    /** Kabul: muayeneye bağlı açıklama kaydı oluşur; düzenlendiyse düzenlenmiş metin yazılır. */
    accept(): void {
        const edited = this.draftEditor()?.editedText() ?? null;

        this.flow.accept(edited !== null ? { text: edited } : undefined, () => {
            this.aiPanel.closeFor(this);
            this.aiPanel.notify('Açıklama kaydedildi.');
            this.reload();
        });
    }

    async copy(row: OwnerExplanationVm): Promise<void> {
        const ok = await copyTextToClipboard(row.text);

        this.aiPanel.notify(ok ? 'Açıklama panoya kopyalandı.' : 'Tarayıcı panoya kopyalamaya izin vermedi.', ok ? 'success' : 'warn');
    }

    print(el: HTMLElement): void {
        printElement(el);
    }
}
