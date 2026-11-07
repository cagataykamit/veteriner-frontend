import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import type { SiteImage } from '@site-engine';
import { findClaims } from '@/app/features/clinic-site/builder/site-claims';
import { SiteBuilderStore } from '@/app/features/clinic-site/builder/site-builder.store';

/** Sihirbaz adımlarının ortak görünümü. Sitenin token'larından bağımsızdır; yalnız `--w-*`. Bütçe stil öğesi başına ölçüldüğünden bölünmüştür. */
const WIZARD_LAYOUT_STYLES = `
    :host {
        display: block;
    }

    *,
    *::before,
    *::after {
        box-sizing: border-box;
    }

    h3, h4, p, ul, ol {
        margin: 0;
        padding: 0;
        color: inherit;
    }

    ul, ol {
        list-style: none;
    }

    .group {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 14px;
        padding-block: 20px;
        border-top: 1px solid var(--w-line);
    }

    .group:first-child {
        padding-top: 0;
        border-top: 0;
    }

    .group-title {
        font-size: 15px;
        font-weight: 650;
        letter-spacing: -0.01em;
    }

    .hint {
        color: var(--w-muted);
        font-size: 13px;
        line-height: 1.45;
    }

    .two {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 12px;
    }

    .warn,
    .ok,
    .bad-note {
        display: flex;
        gap: 10px;
        padding: 12px 14px;
        border-radius: 10px;
        font-size: 13px;
        line-height: 1.45;
    }

    .warn {
        background: var(--w-warn-bg);
        color: var(--w-warn-ink);
    }

    .ok {
        background: var(--w-ok-bg);
        color: var(--w-ok-ink);
    }

    .bad-note {
        background: var(--w-bad-bg);
        color: var(--w-bad);
    }

    .warn .pi,
    .ok .pi,
    .bad-note .pi {
        margin-top: 2px;
        font-size: 13px;
    }

    @media (prefers-reduced-motion: reduce) {
        *,
        *::before,
        *::after {
            transition: none !important;
            animation: none !important;
        }
    }
`;

const WIZARD_CONTROL_STYLES = `
    .wbtn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-height: 44px;
        padding: 0 16px;
        border: 1px solid var(--w-line-strong);
        border-radius: 10px;
        background: var(--w-panel);
        color: var(--w-ink);
        font-family: inherit;
        font-size: 14px;
        font-weight: 600;
        line-height: 1.2;
        text-decoration: none;
        cursor: pointer;
        transition: background-color 0.15s ease, border-color 0.15s ease;
    }

    .wbtn:hover:not(:disabled) {
        border-color: var(--w-ink);
    }

    .wbtn:disabled {
        color: var(--w-muted);
        cursor: not-allowed;
        opacity: 0.6;
    }

    .wbtn.main {
        border-color: var(--w-ink);
        background: var(--w-ink);
        color: var(--w-panel);
    }

    .wbtn.ghost {
        border-color: transparent;
        background: transparent;
    }

    .wbtn.small {
        min-height: 36px;
        padding: 0 12px;
        font-size: 13px;
    }

    .seg {
        display: flex;
        gap: 2px;
        padding: 3px;
        border-radius: 12px;
        background: var(--w-soft);
    }

    .seg button {
        flex: 1;
        min-height: 40px;
        padding: 0 12px;
        border: 0;
        border-radius: 9px;
        background: transparent;
        color: var(--w-muted);
        font-family: inherit;
        font-size: 13px;
        font-weight: 600;
        line-height: 1.2;
        cursor: pointer;
    }

    .seg button[aria-pressed='true'] {
        background: var(--w-panel);
        color: var(--w-ink);
        box-shadow: 0 1px 3px rgb(0 0 0 / 12%);
    }
`;

const WIZARD_FOLD_STYLES = `
    button:focus-visible,
    a:focus-visible,
    summary:focus-visible,
    input:focus-visible,
    select:focus-visible,
    textarea:focus-visible {
        outline: 2px solid var(--w-focus);
        outline-offset: 2px;
    }

    details.fold {
        border: 1px solid var(--w-line);
        border-radius: 12px;
        background: var(--w-panel);
    }

    details.fold > summary {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        min-height: 52px;
        padding: 8px 14px;
        font-size: 14px;
        font-weight: 650;
        list-style: none;
        cursor: pointer;
    }

    details.fold > summary::-webkit-details-marker {
        display: none;
    }

    details.fold > summary .pi {
        color: var(--w-muted);
        font-size: 12px;
        transition: transform 0.15s ease;
    }

    details.fold[open] > summary .pi {
        transform: rotate(180deg);
    }

    .fold-body {
        display: grid;
        gap: 14px;
        padding: 4px 14px 16px;
    }
`;

export const WIZARD_STYLES: readonly string[] = [WIZARD_LAYOUT_STYLES, WIZARD_CONTROL_STYLES, WIZARD_FOLD_STYLES];

/** Etiketli metin alanı: sayaç, doğrulama mesajı, ipucu ve K14 uyarısı tek yerde. */
@Component({
    selector: 'app-w-field',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <label>
            <span class="lab">
                <span>{{ label() }}</span>
                @if (limit(); as max) {
                    <span class="count" [class.over]="value().length > max">{{ value().length }}/{{ max }}</span>
                }
            </span>
            @if (rows() > 1) {
                <textarea [rows]="rows()" [value]="value()" [placeholder]="placeholder()" [class.bad]="!!shownError()" (input)="changed($event)" (blur)="blurred()"></textarea>
            } @else {
                <input [type]="type()" [value]="value()" [placeholder]="placeholder()" [class.bad]="!!shownError()" [attr.autocomplete]="autocomplete()" (input)="changed($event)" (blur)="blurred()" />
            }
            @if (shownError(); as message) {
                <span class="err" role="alert">{{ message }}</span>
            } @else if (hint()) {
                <span class="hnt">{{ hint() }}</span>
            }
        </label>
        @for (claim of claims(); track claim.term) {
            <p class="claim" role="status"><i class="pi pi-exclamation-triangle" aria-hidden="true"></i><span>"{{ claim.term }}": {{ claim.why }} Uyarıdır, yayını engellemez.</span></p>
        }
    `,
    styles: [
        `
            :host {
                display: block;
                min-width: 0;
            }

            label {
                display: grid;
                gap: 6px;
            }

            .lab {
                display: flex;
                justify-content: space-between;
                gap: 8px;
                font-size: 13px;
                font-weight: 600;
            }

            .count {
                color: var(--w-muted);
                font-weight: 500;
                font-variant-numeric: tabular-nums;
            }

            .count.over,
            .err {
                color: var(--w-bad);
            }

            .err,
            .hnt {
                font-size: 13px;
                line-height: 1.4;
            }

            .hnt {
                color: var(--w-muted);
            }
        `,
        `
            input,
            textarea {
                width: 100%;
                min-height: 44px;
                padding: 10px 12px;
                border: 1px solid var(--w-line-strong);
                border-radius: 10px;
                background: var(--w-panel);
                color: var(--w-ink);
                font-family: inherit;
                font-size: 15px;
                font-weight: 400;
                line-height: 1.4;
                resize: vertical;
            }

            input:disabled,
            textarea:disabled {
                background: var(--w-soft);
                color: var(--w-muted);
            }

            input::placeholder,
            textarea::placeholder {
                color: var(--w-muted);
            }

            input:focus-visible,
            textarea:focus-visible {
                outline: 2px solid var(--w-focus);
                outline-offset: 1px;
            }

            .bad {
                border-color: var(--w-bad);
            }

            .claim {
                display: flex;
                gap: 8px;
                margin: 6px 0 0;
                padding: 8px 10px;
                border-radius: 8px;
                background: var(--w-warn-bg);
                color: var(--w-warn-ink);
                font-size: 12px;
                line-height: 1.4;
            }

            .claim .pi {
                margin-top: 2px;
                font-size: 11px;
            }
        `
    ]
})
export class WFieldComponent {
    readonly label = input.required<string>();
    readonly value = input.required<string>();
    readonly placeholder = input('');
    readonly type = input('text');
    readonly rows = input(1);
    readonly hint = input('');
    readonly error = input<string | null>(null);
    readonly limit = input<number | null>(null);
    readonly autocomplete = input<string | null>(null);
    /** Telefon, adres, bağlantı gibi alanlarda kapatılır: K14 uyarısı serbest metin içindir. */
    readonly claimCheck = input(true);
    readonly valueChange = output<string>();
    /** Alandan çıkıldı: yazı bitti. */
    readonly committed = output<void>();

    protected readonly touched = signal(false);
    /** Yazmaya başlamadan hata gösterilmez. */
    protected readonly shownError = computed(() => (this.touched() ? this.error() : null));
    protected readonly claims = computed(() => (this.claimCheck() ? findClaims(this.value()) : []));

    protected changed(event: Event): void {
        this.valueChange.emit((event.target as HTMLInputElement).value);
    }

    protected blurred(): void {
        this.touched.set(true);
        this.committed.emit();
    }
}

/** Sürükle-bırak görsel yükleme: küçültür ve sunucuya yükler; yüklenme, başarı, hata ve boş durumları var. Değer `site-image:{id}`. */
@Component({
    selector: 'app-w-image',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="drop" [class.is-over]="over()" [class.has-image]="!!reference()" (dragover)="$event.preventDefault(); over.set(store.canWrite())" (dragleave)="over.set(false)" (drop)="dropped($event)">
            @if (src(); as image) {
                <img [src]="image" alt="" [class.contain]="contain()" />
            } @else if (reference() && state() === 'idle') {
                <span class="gone"><i class="pi pi-image" aria-hidden="true"></i></span>
            } @else if (shownStock(); as photo) {
                <img [src]="photo.src" alt="" />
            }
            <div class="info">
                @switch (state()) {
                    @case ('busy') {
                        <span class="line" role="status"><i class="pi pi-spin pi-spinner" aria-hidden="true"></i>{{ progress() === null ? 'Hazırlanıyor' : 'Yükleniyor %' + progress() }}</span>
                    }
                    @case ('done') {
                        <span class="line good" role="status"><i class="pi pi-check" aria-hidden="true"></i>Eklendi</span>
                    }
                    @default {
                        <span class="line">{{ line() }}</span>
                    }
                }
                <div class="acts">
                    <label class="pick">
                        {{ shownStock() ? 'Kendi fotoğrafını yükle' : 'Dosya seç' }}
                        <input type="file" accept="image/png,image/jpeg,image/webp" (change)="picked($event)" [attr.aria-label]="label()" />
                    </label>
                    @if (reference()) {
                        <button type="button" class="remove" (click)="clear()">Kaldır</button>
                    }
                </div>
            </div>
        </div>
        @if (error(); as message) {
            <p class="err" role="alert">{{ message }}</p>
        }
    `,
    styles: [
        `
            :host {
                display: block;
                min-width: 0;
            }

            .drop {
                display: flex;
                align-items: center;
                gap: 14px;
                min-height: 92px;
                padding: 12px;
                border: 1.5px dashed var(--w-line-strong);
                border-radius: 12px;
                background: var(--w-soft);
                transition: border-color 0.15s ease, background-color 0.15s ease;
            }

            .drop.is-over {
                border-color: var(--w-ink);
                background: var(--w-panel);
            }

            img,
            .gone {
                flex: none;
                width: 68px;
                height: 68px;
                border-radius: 8px;
                background: #ffffff;
                object-fit: cover;
            }

            img.contain {
                object-fit: contain;
            }

            .gone {
                display: grid;
                place-items: center;
                color: var(--w-muted);
            }

            .info {
                display: grid;
                gap: 6px;
                min-width: 0;
            }
        `,
        `
            .line {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                color: var(--w-muted);
                font-size: 13px;
                line-height: 1.35;
            }

            .line.good {
                color: var(--w-ok-ink);
                font-weight: 600;
            }

            .acts {
                display: flex;
                flex-wrap: wrap;
                gap: 4px 12px;
            }

            .pick,
            .remove {
                position: relative;
                display: inline-flex;
                align-items: center;
                min-height: 36px;
                padding: 0;
                border: 0;
                background: transparent;
                color: var(--w-ink);
                font-family: inherit;
                font-size: 13px;
                font-weight: 600;
                line-height: 1;
                text-decoration: underline;
                text-underline-offset: 3px;
                cursor: pointer;
            }

            .pick:focus-within {
                outline: 2px solid var(--w-focus);
                outline-offset: 2px;
            }

            .pick input {
                position: absolute;
                inset: 0;
                opacity: 0;
                cursor: pointer;
            }

            .err {
                margin: 6px 0 0;
                color: var(--w-bad);
                font-size: 13px;
            }
        `
    ]
})
export class WImageComponent {
    protected readonly store = inject(SiteBuilderStore);

    readonly label = input('Görsel yükle');
    /** `site-image:{id}` ya da boş. */
    readonly reference = input<string | null>(null);
    readonly contain = input(false);
    readonly emptyText = input('Görseli buraya sürükleyin');
    readonly maxSide = input<number | undefined>(undefined);
    /** Alan boşken sitede çizilen hazır fotoğraf (K7). */
    readonly stock = input<SiteImage | null>(null);
    readonly referenceChange = output<string | null>();

    protected readonly src = computed(() => this.store.imageSrc(this.reference()));
    protected readonly shownStock = computed(() => (this.reference() ? null : this.stock()));
    protected readonly line = computed(() => {
        if (this.reference()) return this.stock() ? 'Kaldırırsanız hazır fotoğraf döner.' : 'Değiştirmek için sürükleyin';

        return this.stock() ? 'Hazır fotoğraf, değiştirebilirsiniz.' : this.emptyText();
    });
    protected readonly over = signal(false);
    protected readonly state = signal<'idle' | 'busy' | 'done'>('idle');
    protected readonly progress = signal<number | null>(null);
    protected readonly error = signal<string | null>(null);

    protected picked(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];

        input.value = '';

        if (file) void this.upload(file);
    }

    protected dropped(event: DragEvent): void {
        event.preventDefault();
        this.over.set(false);

        const file = event.dataTransfer?.files?.[0];

        if (file) void this.upload(file);
    }

    protected clear(): void {
        this.state.set('idle');
        this.error.set(null);
        this.referenceChange.emit(null);
    }

    private async upload(file: File): Promise<void> {
        if (!this.store.canWrite() || this.state() === 'busy') return;

        this.error.set(null);
        this.progress.set(null);
        this.state.set('busy');

        try {
            const reference = await this.store.uploadImage(file, this.maxSide(), (percent) => this.progress.set(percent));

            this.referenceChange.emit(reference);
            this.state.set('done');
            setTimeout(() => this.state.set('idle'), 2200);
        } catch (err) {
            this.state.set('idle');
            this.error.set(err instanceof Error && err.message ? err.message : 'Görsel yüklenemedi.');
        }
    }
}
