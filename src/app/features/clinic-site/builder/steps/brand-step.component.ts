import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { type CharacterKey, colorWarnings, GROUNDS, type GroundKey, isHex, RADIUS_OPTIONS, SITE_FONTS, type SiteColors } from '@site-engine';
import { type DesignSuggestion, suggestDesign } from '@/app/features/clinic-site/builder/design-suggest';
import { SiteBuilderStore } from '@/app/features/clinic-site/builder/site-builder.store';
import { WIZARD_STYLES } from '@/app/features/clinic-site/builder/wizard-kit';

const PALETTES: readonly { readonly name: string; readonly colors: SiteColors; readonly ground: GroundKey }[] = [
    { name: 'Modern Medical', colors: { primary: '#0f4c81', secondary: '#5b7083', accent: '#e4572e' }, ground: 'beyaz' },
    { name: 'Natural & Organic', colors: { primary: '#2f4a36', secondary: '#8a9a6b', accent: '#a9582f' }, ground: 'adacayi' },
    { name: 'Premium Veterinary', colors: { primary: '#c7a66b', secondary: '#7d6f5c', accent: '#c7a66b' }, ground: 'gece' },
    { name: 'Warm & Friendly', colors: { primary: '#c8401f', secondary: '#f2b233', accent: '#0f6b62' }, ground: 'krem' },
    { name: 'Minimal & Elegant', colors: { primary: '#1f2328', secondary: '#8b8f94', accent: '#9c6b3f' }, ground: 'kagit' }
];

const CHARACTERS: readonly { readonly key: CharacterKey; readonly label: string }[] = [
    { key: 'sade', label: 'Sade ve net' },
    { key: 'zarif', label: 'Zarif ve özenli' },
    { key: 'samimi', label: 'Sıcak ve samimi' },
    { key: 'dogal', label: 'Doğal ve sakin' }
];

const COLOR_FIELDS: readonly { readonly key: keyof SiteColors; readonly label: string }[] = [
    { key: 'primary', label: 'Ana renk' },
    { key: 'secondary', label: 'İkincil renk' },
    { key: 'accent', label: 'Vurgu rengi' }
];

/** 2. adım: marka kimliği ve "Bana uygun tasarım öner". Öneri kurallıdır, nedenini söyler; klinik uygular ya da geçer. */
@Component({
    selector: 'app-brand-step',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let d = design();
        <section class="group">
            <div class="suggest">
                <h3 class="group-title">Bana uygun tasarım öner</h3>
                <p class="hint">Yapay zekâ değil, açık kurallar: karakter seçiminiz, ana renginizin tonu ve doygunluğu, hekim, hizmet ve galeri sayısı.</p>
                <p class="field-label">Kliniğinizin karakteri</p>
                <div class="chips">
                    @for (item of characters; track item.key) {
                        <button type="button" class="chip" [attr.aria-pressed]="d.character === item.key" (click)="store.patchDesign({ character: item.key })">{{ item.label }}</button>
                    }
                </div>
                @if (store.stored().content.clinic.logo) {
                    @if (store.logoColor(); as color) {
                        <p class="logo-read"><span class="dot" [style.background]="color"></span>Logonuzdan çıkarılan renk: {{ color }}</p>
                    } @else {
                        <p class="hint">Logoda belirgin bir renk bulunamadı; öneri ana renginize bakıyor.</p>
                    }
                } @else {
                    <p class="hint">1. adımda logo yüklerseniz baskın rengini de hesaba katarız.</p>
                }
                <button type="button" class="wbtn main" (click)="suggest()"><i class="pi pi-sparkles" aria-hidden="true"></i>Öneri al</button>
                @if (suggestion(); as result) {
                    <div class="result" role="status">
                        <p class="r-name">{{ result.conceptName }}</p>
                        <p>{{ result.reason }}</p>
                        <div class="swatches" aria-hidden="true">
                            <span [style.background]="result.design.colors.primary"></span>
                            <span [style.background]="result.design.colors.secondary"></span>
                            <span [style.background]="result.design.colors.accent"></span>
                        </div>
                        <div class="r-acts">
                            <button type="button" class="wbtn main small" (click)="apply(result)">Uygula</button>
                            <button type="button" class="wbtn ghost small" (click)="suggestion.set(null)">Vazgeç</button>
                        </div>
                    </div>
                }
            </div>
        </section>

        <section class="group">
            <h3 class="group-title">Hazır paletler</h3>
            <div class="palettes">
                @for (palette of palettes; track palette.name) {
                    <button type="button" class="palette" [attr.aria-pressed]="isPalette(palette)" (click)="pickPalette(palette)">
                        <span class="stripe" aria-hidden="true">
                            <span [style.background]="groundBg(palette.ground)"></span>
                            <span [style.background]="palette.colors.primary"></span>
                            <span [style.background]="palette.colors.secondary"></span>
                            <span [style.background]="palette.colors.accent"></span>
                        </span>
                        {{ palette.name }}
                    </button>
                }
            </div>
        </section>

        <section class="group">
            <h3 class="group-title">Renkler</h3>
            @for (field of colorFields; track field.key) {
                <div class="color-row">
                    <label class="well">
                        <input type="color" [value]="d.colors[field.key]" [attr.aria-label]="field.label" (input)="setColor(field.key, $any($event.target).value)" />
                    </label>
                    <span class="c-label">{{ field.label }}</span>
                    <input class="hex" type="text" maxlength="7" spellcheck="false" [value]="d.colors[field.key]" [attr.aria-label]="field.label + ', onaltılık kod'" (change)="setHex(field.key, $any($event.target).value)" />
                </div>
            }
            @for (warning of warnings(); track warning.text) {
                <p class="warn"><i class="pi pi-exclamation-triangle" aria-hidden="true"></i>{{ warning.text }}</p>
            } @empty {
                <p class="ok"><i class="pi pi-check" aria-hidden="true"></i>Üç renk de zeminde 4.5:1 kontrastı geçiyor.</p>
            }
            <p class="field-label">Zemin</p>
            <div class="grounds">
                @for (ground of grounds; track ground.key) {
                    <button type="button" class="ground" [attr.aria-pressed]="d.ground === ground.key" (click)="store.patchDesign({ ground: ground.key })">
                        <span [style.background]="ground.bg"></span>{{ ground.label }}
                    </button>
                }
            </div>
        </section>

        <section class="group">
            <h3 class="group-title">Yazı tipi</h3>
            <label class="select">
                <span>Başlık</span>
                <select [value]="d.headFont" (change)="store.patchDesign({ headFont: $any($event.target).value })">
                    @for (font of headFonts; track font.key) {
                        <option [value]="font.key" [selected]="font.key === d.headFont">{{ font.label }}</option>
                    }
                </select>
            </label>
            <label class="select">
                <span>Gövde</span>
                <select [value]="d.bodyFont" (change)="store.patchDesign({ bodyFont: $any($event.target).value })">
                    @for (font of bodyFonts; track font.key) {
                        <option [value]="font.key" [selected]="font.key === d.bodyFont">{{ font.label }}</option>
                    }
                </select>
            </label>
        </section>

        <section class="group">
            <h3 class="group-title">Biçim</h3>
            <p class="field-label">Logo yerleşimi</p>
            <div class="seg">
                <button type="button" [attr.aria-pressed]="d.logoPlacement === 'sol'" (click)="store.patchDesign({ logoPlacement: 'sol' })">Solda</button>
                <button type="button" [attr.aria-pressed]="d.logoPlacement === 'orta'" (click)="store.patchDesign({ logoPlacement: 'orta' })">Ortada</button>
            </div>
            <p class="field-label">Köşeler</p>
            <div class="seg">
                @for (option of radii; track option.key) {
                    <button type="button" [attr.aria-pressed]="d.radius === option.key" (click)="store.patchDesign({ radius: option.key })">{{ option.label }}</button>
                }
            </div>
        </section>
    `,
    styles: [
        ...WIZARD_STYLES,
        `
            .suggest {
                display: grid;
                gap: 12px;
                padding: 16px;
                border-radius: 14px;
                background: var(--w-soft);
            }

            .field-label {
                font-size: 13px;
                font-weight: 600;
            }

            .chips {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
            }

            .chip {
                min-height: 40px;
                padding: 0 14px;
                border: 1px solid var(--w-line-strong);
                border-radius: 999px;
                background: var(--w-panel);
                color: var(--w-ink);
                font-family: inherit;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
            }

            .chip[aria-pressed='true'] {
                border-color: var(--w-ink);
                background: var(--w-ink);
                color: var(--w-panel);
            }

            .logo-read {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 13px;
            }

            .dot {
                width: 16px;
                height: 16px;
                border-radius: 50%;
            }

            .suggest .wbtn.main {
                justify-self: start;
            }

            .result {
                display: grid;
                gap: 10px;
                padding: 14px;
                border: 1px solid var(--w-ink);
                border-radius: 12px;
                background: var(--w-panel);
                font-size: 14px;
                line-height: 1.45;
            }

            .r-name {
                font-weight: 700;
            }

            .swatches {
                display: flex;
                gap: 4px;
            }

            .swatches span {
                width: 32px;
                height: 20px;
                border-radius: 4px;
            }

            .r-acts {
                display: flex;
                gap: 6px;
            }
        `,
        `
            .palettes {
                display: grid;
                gap: 6px;
            }

            .palette {
                display: flex;
                align-items: center;
                gap: 12px;
                min-height: 48px;
                padding: 6px 12px 6px 6px;
                border: 1px solid var(--w-line);
                border-radius: 10px;
                background: var(--w-panel);
                color: var(--w-ink);
                font-family: inherit;
                font-size: 14px;
                font-weight: 600;
                text-align: left;
                cursor: pointer;
            }

            .palette[aria-pressed='true'],
            .ground[aria-pressed='true'] {
                border-color: var(--w-ink);
                box-shadow: inset 0 0 0 1px var(--w-ink);
            }

            .stripe {
                display: flex;
                flex: none;
                width: 96px;
                height: 34px;
                overflow: hidden;
                border: 1px solid var(--w-line);
                border-radius: 6px;
            }

            .stripe span {
                flex: 1;
            }

            .color-row {
                display: grid;
                grid-template-columns: 44px minmax(0, 1fr) 96px;
                align-items: center;
                gap: 12px;
            }

            .well {
                position: relative;
                display: block;
                width: 44px;
                height: 44px;
                overflow: hidden;
                border: 1px solid var(--w-line-strong);
                border-radius: 10px;
            }

            .well input {
                position: absolute;
                inset: -8px;
                width: 60px;
                height: 60px;
                padding: 0;
                border: 0;
                background: none;
                cursor: pointer;
            }

            .c-label {
                font-size: 14px;
                font-weight: 500;
            }
        `,
        `
            .hex {
                width: 100%;
                min-height: 44px;
                padding: 0 10px;
                border: 1px solid var(--w-line-strong);
                border-radius: 10px;
                background: var(--w-panel);
                color: var(--w-ink);
                font-family: ui-monospace, Consolas, monospace;
                font-size: 13px;
            }

            .grounds {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
            }

            .ground {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                min-height: 44px;
                padding: 0 12px 0 8px;
                border: 1px solid var(--w-line);
                border-radius: 10px;
                background: var(--w-panel);
                color: var(--w-ink);
                font-family: inherit;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
            }

            .ground span {
                width: 24px;
                height: 24px;
                border: 1px solid var(--w-line-strong);
                border-radius: 6px;
            }

            .select {
                display: grid;
                gap: 6px;
                font-size: 13px;
                font-weight: 600;
            }

            select {
                width: 100%;
                min-height: 44px;
                padding: 0 10px;
                border: 1px solid var(--w-line-strong);
                border-radius: 10px;
                background: var(--w-panel);
                color: var(--w-ink);
                font-family: inherit;
                font-size: 15px;
            }
        `
    ]
})
export class BrandStepComponent {
    protected readonly store = inject(SiteBuilderStore);
    protected readonly design = computed(() => this.store.stored().design);
    protected readonly warnings = computed(() => colorWarnings(this.design()));
    protected readonly suggestion = signal<DesignSuggestion | null>(null);

    protected readonly palettes = PALETTES;
    protected readonly characters = CHARACTERS;
    protected readonly colorFields = COLOR_FIELDS;
    protected readonly grounds = GROUNDS;
    protected readonly radii = RADIUS_OPTIONS;
    protected readonly headFonts = SITE_FONTS.filter((font) => font.forHeading);
    protected readonly bodyFonts = SITE_FONTS.filter((font) => font.forBody);

    protected groundBg(key: GroundKey): string {
        return GROUNDS.find((ground) => ground.key === key)!.bg;
    }

    protected isPalette(palette: (typeof PALETTES)[number]): boolean {
        const { colors, ground } = this.design();

        return ground === palette.ground && colors.primary === palette.colors.primary && colors.secondary === palette.colors.secondary && colors.accent === palette.colors.accent;
    }

    protected pickPalette(palette: (typeof PALETTES)[number]): void {
        this.store.patchDesign({ colors: palette.colors, ground: palette.ground });
    }

    protected setColor(key: keyof SiteColors, value: string): void {
        this.store.patchDesign({ colors: { ...this.design().colors, [key]: value } }, `color.${key}`);
    }

    protected setHex(key: keyof SiteColors, value: string): void {
        const hex = value.trim().toLowerCase();

        if (isHex(hex)) this.setColor(key, hex);
    }

    protected suggest(): void {
        this.suggestion.set(suggestDesign(this.store.config(), this.store.logoColor()));
    }

    protected apply(result: DesignSuggestion): void {
        this.store.patchDesign(result.design);
        this.suggestion.set(null);
    }
}
