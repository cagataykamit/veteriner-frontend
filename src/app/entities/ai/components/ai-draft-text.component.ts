import { ChangeDetectionStrategy, Component, effect, input, signal } from '@angular/core';

/**
 * Tek metinli taslak gövdesi (AI-003 açıklama, AI-004 talimat): kesik çerçeveli, düzenlenebilir; düzenlenince düz çerçeve ve
 * "düzenlendi". Kabulde sayfa `editedText()` ile düzenlenmiş metni (yoksa `null`) alır.
 */
@Component({
    selector: 'app-ai-draft-text',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="flex flex-col gap-1">
            <label for="ai-draft-text" class="flex items-center gap-2 text-sm font-semibold">
                {{ label() }}
                @if (edited()) {
                    <span class="text-xs font-semibold text-muted-color" data-testid="ai-draft-text-edited">· düzenlendi</span>
                }
            </label>
            <textarea
                id="ai-draft-text"
                class="w-full p-inputtext p-component ai-draft-input"
                [class.ai-draft-edited]="edited()"
                [rows]="rows()"
                [attr.maxlength]="maxLength()"
                [value]="value()"
                (input)="onInput($any($event.target).value)"
                data-testid="ai-draft-text"
            ></textarea>
            <small class="block text-right text-xs text-muted-color">{{ value().length }} / {{ maxLength() }}</small>
        </div>
    `,
    styles: `
        .ai-draft-input {
            border-style: dashed;
            border-color: var(--p-ai-border-color);
            background: var(--p-ai-background);
            resize: vertical;
        }

        .ai-draft-input.ai-draft-edited,
        .ai-draft-input:focus {
            border-style: solid;
            background: var(--p-inputtext-background);
        }

        .ai-draft-input.ai-draft-edited:not(:focus) {
            border-color: var(--p-inputtext-border-color);
        }
    `
})
export class AiDraftTextComponent {
    readonly label = input.required<string>();
    /** Taslağın metni; değişince düzenleme sıfırlanır. */
    readonly text = input.required<string>();
    readonly rows = input(13);
    readonly maxLength = input(4000);

    protected readonly value = signal('');
    protected readonly edited = signal(false);

    constructor() {
        effect(() => {
            this.value.set(this.text());
            this.edited.set(false);
        });
    }

    /** Düzenlenmiş metin; düzenlenmediyse (ya da aynı kaldıysa) `null` → üretilen içerik yazılır. */
    editedText(): string | null {
        return this.edited() && this.value() !== this.text() ? this.value() : null;
    }

    protected onInput(value: string): void {
        this.value.set(value);
        this.edited.set(true);
    }
}
