import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { ToastModule } from 'primeng/toast';
import { AiStateComponent } from '@/app/entities/ai/components/ai-state.component';
import { PetHistorySummaryComponent } from '@/app/entities/ai/components/pet-history-summary.component';
import { petHistorySummaryToPlainText } from '@/app/entities/ai/data/ai.mapper';
import { AiPanelService } from '@/app/entities/ai/services/ai-panel.service';
import { AiStatusService } from '@/app/entities/ai/services/ai-status.service';
import { copyTextToClipboard } from '@/app/shared/utils/clipboard.utils';

/**
 * Yapay zekâ yan paneli (tasarım A): sağdan açılır, sayfayı örtmez (düzen sağ boşluk verir), sayfa kullanılabilir kalır.
 * Düzen bileşeninde bir kez durur; içeriği `AiPanelService` söyler: geçmiş özeti ya da sayfanın taslak şablonu.
 * Dar ekranda (64rem altı) tam genişlikte üstte açılır.
 */
@Component({
    selector: 'app-ai-panel',
    standalone: true,
    imports: [NgTemplateOutlet, ButtonModule, DrawerModule, ToastModule, AiStateComponent, PetHistorySummaryComponent],
    providers: [MessageService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    // Drawer belge düzeyinde Esc dinler; panel sayfayı örtmediği için yalnız panelin içindeki Esc onu kapatır.
    host: { '(keydown.escape)': 'panel.close()' },
    template: `
        <p-toast position="top-right" />
        <p-drawer [visible]="!!content()" (visibleChange)="$event || panel.close()" position="right" [modal]="false" [closeOnEscape]="false" [showCloseIcon]="false" styleClass="ai-panel">
            <ng-template #header>
                <div class="flex items-center gap-2 min-w-0 flex-1">
                    <i class="pi pi-sparkles text-ai" aria-hidden="true"></i>
                    <h2 class="m-0 text-base font-semibold truncate" data-testid="ai-panel-title">{{ title() }}</h2>
                    <span class="inline-flex items-center gap-1 rounded-full border border-ai-border bg-ai-surface px-2 text-xs font-bold text-ai shrink-0"><i class="pi pi-sparkles text-[0.65rem]" aria-hidden="true"></i>Taslak</span>
                </div>
                <button pButton type="button" class="p-button-text p-button-secondary p-button-rounded" aria-label="Paneli kapat" (click)="panel.close()" data-testid="ai-panel-close"><i class="pi pi-times"></i></button>
            </ng-template>

            @if (content(); as c) {
                @if (c.kind === 'custom') {
                    <ng-container *ngTemplateOutlet="c.template" />
                } @else if (history(); as h) {
                    <div class="flex-1 min-h-0 overflow-y-auto px-4 pb-4" data-testid="ai-history-body">
                        @switch (h.status) {
                            @case ('loading') {
                                <app-ai-state loadingText="Kayıtlar okunuyor ve özetleniyor…" />
                            }
                            @case ('problem') {
                                <app-ai-state
                                    [icon]="h.problem!.retryAfterSeconds ? 'pi-clock' : 'pi-exclamation-circle'"
                                    tone="warn"
                                    [title]="h.problem!.title"
                                    [message]="h.problem!.message"
                                    [retryLabel]="h.problem!.retryable ? (h.problem!.retryAfterSeconds ? 'Yeniden dene' : 'Tekrar dene') : null"
                                    [retryAvailableAt]="h.retryAvailableAt"
                                    (retry)="panel.resummarize()"
                                />
                            }
                            @default {
                                @if (h.result!.hasRecords) {
                                    <app-pet-history-summary [summary]="h.result!" [usageWarning]="usageWarning()" />
                                } @else {
                                    <app-ai-state
                                        icon="pi-inbox"
                                        title="Özetlenecek klinik kayıt yok"
                                        message="Bu klinikte bu hasta için muayene, tedavi, reçete, aşı, laboratuvar ya da yatış kaydı bulunmuyor. Hasta kartındaki bilgiler tek başına özetlenmez; kota da harcanmadı."
                                    />
                                }
                            }
                        }
                    </div>
                    <div class="flex items-center gap-2 px-4 py-3 border-t border-surface">
                        <span class="flex-1 text-xs text-muted-color">Özet kayda geçmez.</span>
                        @if (h.status === 'loading') {
                            <button pButton type="button" size="small" class="p-button-outlined p-button-secondary" (click)="panel.cancelHistory()" data-testid="ai-history-cancel">Vazgeç</button>
                        } @else if (h.status === 'ready' && h.result!.hasRecords) {
                            <button pButton type="button" size="small" class="p-button-outlined p-button-secondary" (click)="copy()" data-testid="ai-history-copy"><i class="pi pi-copy"></i>Kopyala</button>
                            <button pButton type="button" size="small" class="p-button-outlined p-button-secondary" title="Yeni özet hazırlanır; kotadan düşer." (click)="panel.resummarize()" data-testid="ai-history-resummarize">
                                <i class="pi pi-refresh"></i>Yeniden özetle
                            </button>
                        }
                    </div>
                }
            }
        </p-drawer>
    `
})
export class AiPanelComponent {
    protected readonly panel = inject(AiPanelService);
    private readonly aiStatus = inject(AiStatusService);
    private readonly messages = inject(MessageService);

    protected readonly content = this.panel.content;
    protected readonly history = this.panel.history;
    protected readonly usageWarning = this.aiStatus.usageWarning;

    protected readonly title = computed(() => {
        const c = this.content();

        if (c?.kind === 'custom') {
            return c.title;
        }

        // Panel sayfalar arasında açık kalır: hangi hastanın özeti olduğu başlıkta yazar.
        const name = this.history()?.petName.trim();

        return name ? `Geçmiş özeti · ${name}` : 'Geçmiş özeti';
    });

    protected async copy(): Promise<void> {
        const result = this.history()?.result;

        if (!result) {
            return;
        }

        const ok = await copyTextToClipboard(petHistorySummaryToPlainText(result));

        this.messages.add(ok ? { severity: 'success', summary: 'Özet panoya kopyalandı (kaynak tarihleriyle).' } : { severity: 'warn', summary: 'Tarayıcı panoya kopyalamaya izin vermedi.' });
    }
}
