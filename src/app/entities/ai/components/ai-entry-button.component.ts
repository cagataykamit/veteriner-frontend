import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { AiStatusService } from '@/app/entities/ai/services/ai-status.service';

/**
 * Yapay zekâ giriş düğmesi ("Geçmişi özetle", "Notu alanlara ayır"): işin yanında durur, görünürlüğü `AiStatusService.entry()`
 * belirler. İzin yok / yapılandırılmamış / klinikte kapalı → hiç çizilmez; kota doldu gibi geçici engelde soluk ve nedeni altında.
 */
@Component({
    selector: 'app-ai-entry-button',
    standalone: true,
    imports: [ButtonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'contents' },
    template: `
        @switch (entry().kind) {
            @case ('available') {
                <button pButton type="button" class="p-button-outlined p-button-secondary" [class.ai-entry-active]="active()" [attr.aria-pressed]="active()" (click)="pressed.emit()" data-testid="ai-entry-button">
                    <i class="pi pi-sparkles text-ai"></i>{{ label() }}
                </button>
            }
            @case ('disabled') {
                <span class="inline-flex flex-col items-end gap-1" data-testid="ai-entry-disabled">
                    <button pButton type="button" class="p-button-outlined p-button-secondary" [disabled]="true" [attr.aria-describedby]="reasonId"><i class="pi pi-sparkles"></i>{{ label() }}</button>
                    <small class="text-xs text-muted-color" [id]="reasonId">{{ reason() }}</small>
                </span>
            }
        }
    `,
    styles: `
        .ai-entry-active {
            border-color: var(--p-ai-border-color);
            background: var(--p-ai-background);
        }
    `
})
export class AiEntryButtonComponent {
    private static nextId = 0;

    private readonly aiStatus = inject(AiStatusService);

    readonly label = input.required<string>();
    /** Panel bu iş için açıkken düğme mor zeminle işaretlenir. */
    readonly active = input(false);
    readonly pressed = output<void>();

    protected readonly entry = this.aiStatus.entry;
    protected readonly reasonId = `ai-entry-reason-${AiEntryButtonComponent.nextId++}`;

    constructor() {
        this.aiStatus.ensureLoaded();
    }

    protected reason(): string {
        const e = this.entry();

        return e.kind === 'disabled' ? e.reason : '';
    }
}
