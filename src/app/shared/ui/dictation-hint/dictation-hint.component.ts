import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Windows masaüstünde mi (dokunmatik birincil işaretçi değil). Sunucu tarafında ya da tarayıcı API'si yoksa `false`. */
export function isWindowsDesktop(): boolean {
    if (typeof navigator === 'undefined' || typeof window === 'undefined') {
        return false;
    }

    const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;

    return /Windows/i.test(navigator.userAgent) && !coarse;
}

/**
 * Not alanları için sesle yazma ipucu (kullanıcı kararı 2026-11-19): web'de kendi mikrofon düğmemiz yok; Windows'un yerleşik
 * diktesi (Win + H) kullanılır, ses Vetinity'ye gelmez. Yalnız Windows masaüstünde görünür.
 */
@Component({
    selector: 'app-dictation-hint',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (visible) {
            <span class="inline-flex items-center gap-1.5 text-xs text-muted-color" data-testid="dictation-hint">
                <i class="pi pi-microphone !text-xs" aria-hidden="true"></i>
                Sesle yazmak için alana tıklayıp <kbd class="px-1 rounded border border-surface-300 dark:border-surface-600 font-sans text-[11px]">Win</kbd> +
                <kbd class="px-1 rounded border border-surface-300 dark:border-surface-600 font-sans text-[11px]">H</kbd>
                tuşlarına basın
            </span>
        }
    `
})
export class DictationHintComponent {
    protected readonly visible = isWindowsDesktop();
}
