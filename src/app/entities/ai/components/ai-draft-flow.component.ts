import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { AiDraftPanelComponent } from '@/app/entities/ai/components/ai-draft-panel.component';
import { AiStateComponent } from '@/app/entities/ai/components/ai-state.component';
import type { AiDraftFlow } from '@/app/entities/ai/services/ai-draft-flow';
import { AiPanelService } from '@/app/entities/ai/services/ai-panel.service';

/**
 * Taslak üreten özelliğin yan panel içeriği (AI-009 deseni, tasarım A): not yazma → "hazırlanıyor" → ortak taslak paneli.
 * Özelliğin taslak gövdesi `ng-content` ile gelir (muayene alanları ya da tek metin); kabulün ne yazacağı sayfanındır (`accept`).
 * "At" ve "Yeniden" burada: aynı sözcükler, aynı bildirim.
 */
@Component({
    selector: 'app-ai-draft-flow',
    standalone: true,
    imports: [ButtonModule, AiDraftPanelComponent, AiStateComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'flex flex-col min-h-0 h-full' },
    template: `
        @let f = flow();
        @switch (f.step()) {
            @case ('generating') {
                <div class="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
                    <app-ai-state [loadingText]="loadingText()" />
                </div>
                <div class="flex items-center gap-2 px-4 py-3 border-t border-surface">
                    <span class="flex-1"></span>
                    <button pButton type="button" size="small" class="p-button-outlined p-button-secondary" (click)="f.cancel()" data-testid="ai-flow-cancel">Vazgeç</button>
                </div>
            }
            @case ('draft') {
                <app-ai-draft-panel
                    [noticeText]="noticeText()"
                    [acceptLabel]="acceptLabel()"
                    [sources]="f.draft()?.sources ?? []"
                    [busy]="f.deciding()"
                    [problem]="f.problem()"
                    (accept)="accept.emit()"
                    (discard)="discard()"
                    (regenerate)="f.generate()"
                >
                    <ng-content />
                </app-ai-draft-panel>
            }
            @default {
                <div class="flex-1 min-h-0 overflow-y-auto px-4 pb-4 flex flex-col gap-3">
                    <p class="m-0 flex gap-2 text-sm text-muted-color">
                        <i class="pi pi-info-circle mt-0.5" aria-hidden="true"></i><span>{{ hint() }}</span>
                    </p>
                    <div>
                        <label for="ai-flow-note" class="block text-sm font-semibold mb-1">{{ noteLabel() }}</label>
                        <textarea id="ai-flow-note" class="w-full p-inputtext p-component" [rows]="noteRows()" [attr.maxlength]="noteMax()" [value]="f.note()" (input)="f.note.set($any($event.target).value)" data-testid="ai-flow-note"></textarea>
                        <small class="block text-right text-xs text-muted-color">{{ f.note().length }} / {{ noteMax() }}</small>
                    </div>
                    @if (f.problem(); as p) {
                        <app-ai-state
                            [icon]="p.retryAfterSeconds ? 'pi-clock' : 'pi-exclamation-circle'"
                            tone="warn"
                            [title]="p.title"
                            [message]="p.message"
                            [retryLabel]="p.retryable ? (p.retryAfterSeconds ? 'Yeniden dene' : 'Tekrar dene') : null"
                            [retryAvailableAt]="f.retryAvailableAt()"
                            (retry)="f.generate()"
                        />
                    }
                </div>
                <div class="flex items-center gap-2 px-4 py-3 border-t border-surface">
                    <span class="flex-1 text-xs text-muted-color">{{ footerNote() }}</span>
                    <button pButton type="button" size="small" [disabled]="!canGenerate()" (click)="f.generate()" data-testid="ai-flow-generate"><i class="pi pi-sparkles"></i>{{ generateLabel() }}</button>
                </div>
            }
        }
    `
})
export class AiDraftFlowComponent {
    private readonly panel = inject(AiPanelService);

    readonly flow = input.required<AiDraftFlow>();
    /** Not adımının açıklaması: ne hazırlanacağı ve kaydın nasıl oluşacağı. */
    readonly hint = input.required<string>();
    readonly noteLabel = input('Notunuz');
    readonly noteRequired = input(false);
    readonly noteMax = input(2000);
    readonly noteRows = input(6);
    readonly generateLabel = input('Taslak hazırla');
    readonly loadingText = input('Taslak hazırlanıyor…');
    readonly footerNote = input('Not kaydedilmez.');
    /** "Taslak — kontrol edin" şeridinin cümlesi. */
    readonly noticeText = input.required<string>();
    readonly acceptLabel = input('Kabul et ve kaydet');

    readonly accept = output<void>();

    protected readonly canGenerate = computed(() => {
        const note = this.flow().note();
        const waiting = (this.flow().retryAvailableAt() ?? 0) > Date.now();

        return !waiting && note.length <= this.noteMax() && (!this.noteRequired() || note.trim().length > 0);
    });

    protected discard(): void {
        this.flow().discard(() => this.panel.notify('Taslak atıldı; hiçbir şey kaydedilmedi.', 'info'));
    }
}
