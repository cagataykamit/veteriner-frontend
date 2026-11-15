import { ChangeDetectionStrategy, Component, model } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { DialogFocusReturnDirective } from '@/app/shared/ui/dialog/dialog-focus-return.directive';

export interface KeyboardShortcut {
    readonly keys: readonly string[][];
    readonly description: string;
}

/** Panelde çalışan kısayollar (O8); Mac'te Ctrl yerine Cmd de çalışır. Yeni kısayol eklenince bu liste de güncellenir. */
export const KEYBOARD_SHORTCUTS: readonly KeyboardShortcut[] = [
    { keys: [['Ctrl', 'K'], ['/']], description: 'Müşteri, hasta ve kayıt araması' },
    { keys: [['Ctrl', 'Enter']], description: 'Açık formu ya da diyaloğu kaydet (muayene ve hızlı satış dahil)' },
    { keys: [['Esc']], description: 'Diyaloğu ya da yan paneli kapat; kaydedilmemiş bilgi varsa sorar' },
    { keys: [['Enter']], description: 'Seçicide aranan kayıt yoksa yazılanı ekle' },
    { keys: [['Tab'], ['Shift', 'Tab']], description: 'Sonraki / önceki alana geç' }
];

/** Kullanıcı menüsündeki "Kısayollar" penceresi. */
@Component({
    selector: 'app-keyboard-shortcuts-dialog',
    standalone: true,
    imports: [DialogModule, DialogFocusReturnDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <p-dialog header="Klavye kısayolları" [modal]="true" [dismissableMask]="true" [draggable]="false" [style]="{ width: 'min(520px, 95vw)' }" [(visible)]="visible">
            <dl class="m-0 flex flex-col gap-3" data-testid="keyboard-shortcuts">
                @for (s of shortcuts; track s.description) {
                    <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <dt class="flex flex-wrap items-center gap-1 m-0">
                            @for (combo of s.keys; track $index; let last = $last) {
                                @for (key of combo; track key; let lastKey = $last) {
                                    <kbd class="shortcut-key">{{ key }}</kbd>
                                    @if (!lastKey) {
                                        <span aria-hidden="true">+</span>
                                    }
                                }
                                @if (!last) {
                                    <span class="text-muted-color text-sm">ya da</span>
                                }
                            }
                        </dt>
                        <dd class="m-0 text-sm text-muted-color">{{ s.description }}</dd>
                    </div>
                }
            </dl>
        </p-dialog>
    `,
    styles: `
        .shortcut-key {
            display: inline-block;
            min-width: 1.75rem;
            padding: 0.125rem 0.4rem;
            border: 1px solid var(--p-content-border-color);
            border-bottom-width: 2px;
            border-radius: 4px;
            font: 600 0.8125rem/1.4 inherit;
            text-align: center;
            background: var(--p-content-background);
        }
    `
})
export class AppKeyboardShortcutsDialogComponent {
    readonly visible = model(false);
    protected readonly shortcuts = KEYBOARD_SHORTCUTS;
}
