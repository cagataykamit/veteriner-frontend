import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { AiDraftNoticeComponent } from '@/app/entities/ai/components/ai-draft-notice.component';
import { AiSourceLinkComponent } from '@/app/entities/ai/components/ai-source-link.component';
import { AiStateComponent } from '@/app/entities/ai/components/ai-state.component';
import type { AiSourceVm } from '@/app/entities/ai/models/ai-vm.model';
import type { AiProblem } from '@/app/entities/ai/utils/ai-error.utils';

/**
 * Ortak taslak → onay paneli (AI-009): her özellik aynı görünür ve aynı sözcükleri kullanır. Üstte "Taslak — kontrol edin"
 * şeridi, ortada özelliğin içerik bileşeni (`ng-content`: muayene notu alanları, açıklama ya da talimat metni), altta kaynak
 * satırı; en altta solda **At**, sağda **Yeniden** ve birincil **Kabul et**. Karar sayfanındır: bileşen yalnız olay yayar.
 */
@Component({
    selector: 'app-ai-draft-panel',
    standalone: true,
    imports: [ButtonModule, AiDraftNoticeComponent, AiSourceLinkComponent, AiStateComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'flex flex-col min-h-0 h-full' },
    template: `
        <div class="flex-1 min-h-0 overflow-y-auto px-4 pb-4 flex flex-col gap-3">
            <app-ai-draft-notice [text]="noticeText()" />
            <ng-content />
            @if (sources().length) {
                <div class="flex flex-wrap items-center gap-1 text-xs text-muted-color" data-testid="ai-draft-sources">
                    <span class="mr-1">Kaynak:</span>
                    @for (src of sources(); track src.type + src.id) {
                        <app-ai-source-link [source]="src" />
                    }
                </div>
            }
            @if (problem(); as p) {
                <app-ai-state icon="pi-exclamation-circle" tone="warn" [title]="p.title" [message]="p.message" />
            }
        </div>
        <div class="flex items-center gap-2 px-4 py-3 border-t border-surface">
            <button pButton type="button" size="small" class="p-button-text p-button-secondary" [disabled]="busy()" (click)="discard.emit()" data-testid="ai-draft-discard"><i class="pi pi-trash"></i>At</button>
            <span class="flex-1"></span>
            @if (canRegenerate()) {
                <button pButton type="button" size="small" class="p-button-outlined p-button-secondary" [disabled]="busy()" (click)="regenerate.emit()" data-testid="ai-draft-regenerate"><i class="pi pi-refresh"></i>Yeniden</button>
            }
            <button pButton type="button" size="small" [disabled]="busy()" [loading]="busy()" (click)="accept.emit()" data-testid="ai-draft-accept"><i class="pi pi-check"></i>{{ acceptLabel() }}</button>
        </div>
    `
})
export class AiDraftPanelComponent {
    /** Şeridin tek cümlesi: neye dayandığı ve neyi yapmadığı ("bilgi eklemez, tanı ya da doz önermez"). */
    readonly noticeText = input.required<string>();
    /** "Kabul et ve kaydet"; form içinde (AI-001) "Kabul et ve forma aktar". */
    readonly acceptLabel = input('Kabul et ve kaydet');
    readonly sources = input<readonly AiSourceVm[]>([]);
    readonly canRegenerate = input(true);
    /** Kabul / atma isteği sürerken düğmeler pasif. */
    readonly busy = input(false);
    /** Karar isteğinin sorunu (süresi doldu, zaten karar verilmiş…); yalnız panelde görünür. */
    readonly problem = input<AiProblem | null>(null);

    readonly accept = output<void>();
    readonly discard = output<void>();
    readonly regenerate = output<void>();
}
