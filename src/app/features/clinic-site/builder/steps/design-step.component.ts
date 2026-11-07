import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { designFromConcept, HOME_SECTION_LABELS, sectionAlternatives, type SectionType, SITE_CONCEPTS, type SiteConfig } from '@site-engine';
import { SiteBuilderStore } from '@/app/features/clinic-site/builder/site-builder.store';
import { SiteThumbComponent } from '@/app/features/clinic-site/builder/site-preview.component';
import { WIZARD_STYLES } from '@/app/features/clinic-site/builder/wizard-kit';

const SECTION_ORDER: readonly SectionType[] = ['hero', 'services', 'team', 'gallery', 'footer', 'nav', 'about', 'features', 'guide', 'contact'];

/** 3. adım: konseptler ve bölüm alternatifleri. Seçenekler kayıt defterinden gelir; küçük resimler gerçek bileşenlerin canlı çizimidir. */
@Component({
    selector: 'app-design-step',
    standalone: true,
    imports: [SiteThumbComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section class="group">
            <h3 class="group-title">Konsept</h3>
            <p class="hint">Konsept başlangıçtır: bölümleri, renkleri ve yazıyı getirir. Metinleriniz ve fotoğraflarınız aynı kalır.</p>
            <div class="concepts">
                @for (concept of concepts(); track concept.key) {
                    <button type="button" class="concept" [attr.aria-pressed]="concept.key === conceptKey()" (click)="store.applyConcept(concept.key)">
                        <app-site-thumb [config]="concept.config" />
                        <span class="c-text">
                            <strong>{{ concept.name }}</strong>
                            <span>{{ concept.idea }}</span>
                        </span>
                    </button>
                }
            </div>
        </section>

        <section class="group">
            <h3 class="group-title">Bölüm alternatifleri</h3>
            <p class="hint">Farklı konseptlerin bölümlerini karıştırabilirsiniz; renk, yazı ve köşe ortak kalır. Seçince önizleme o bölüme gider.</p>
            <div class="tabs" role="group" aria-label="Bölüm türü">
                @for (type of sectionOrder; track type) {
                    <button type="button" class="tab" [attr.aria-pressed]="type === activeType()" (click)="openType(type)">{{ labels[type] }}</button>
                }
            </div>
            <div class="alts">
                @for (alternative of alternatives(); track alternative.key) {
                    <button type="button" class="alt" [attr.aria-pressed]="alternative.key === activeKey()" (click)="store.setSection(activeType(), alternative.key)">
                        <app-site-thumb [config]="withAlternative(alternative.key)" [only]="activeType()" [logicalHeight]="560" />
                        <span class="a-text">
                            <strong>{{ alternative.label }}</strong>
                            <span>{{ alternative.note }}</span>
                        </span>
                    </button>
                }
            </div>
        </section>
    `,
    styles: [
        ...WIZARD_STYLES,
        `
            .concepts,
            .alts {
                display: grid;
                gap: 10px;
            }

            .concept,
            .alt {
                display: block;
                width: 100%;
                padding: 0;
                overflow: hidden;
                border: 1px solid var(--w-line);
                border-radius: 12px;
                background: var(--w-panel);
                color: var(--w-ink);
                font-family: inherit;
                text-align: left;
                cursor: pointer;
                transition: border-color 0.15s ease, box-shadow 0.15s ease;
            }

            .concept:hover,
            .alt:hover {
                border-color: var(--w-line-strong);
            }

            .concept[aria-pressed='true'],
            .alt[aria-pressed='true'] {
                border-color: var(--w-ink);
                box-shadow: 0 0 0 1px var(--w-ink);
            }

            .c-text,
            .a-text {
                display: grid;
                gap: 3px;
                padding: 10px 12px 12px;
                border-top: 1px solid var(--w-line);
                font-size: 13px;
                line-height: 1.4;
            }

            .c-text strong,
            .a-text strong {
                font-size: 14px;
            }

            .c-text span,
            .a-text span {
                color: var(--w-muted);
            }

            .tabs {
                display: flex;
                flex-wrap: wrap;
                gap: 4px;
            }

            .tab {
                min-height: 40px;
                padding: 0 12px;
                border: 1px solid var(--w-line);
                border-radius: 999px;
                background: var(--w-panel);
                color: var(--w-ink);
                font-family: inherit;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
            }

            .tab[aria-pressed='true'] {
                border-color: var(--w-ink);
                background: var(--w-ink);
                color: var(--w-panel);
            }
        `
    ]
})
export class DesignStepComponent {
    protected readonly store = inject(SiteBuilderStore);
    protected readonly labels = HOME_SECTION_LABELS;
    protected readonly sectionOrder = SECTION_ORDER;
    protected readonly activeType = signal<SectionType>('hero');

    protected readonly conceptKey = computed(() => this.store.stored().design.conceptKey);
    protected readonly concepts = computed(() => {
        const config = this.store.renderConfig();

        return SITE_CONCEPTS.map((concept) => ({ key: concept.key, name: concept.name, idea: concept.idea, config: { ...config, design: designFromConcept(concept) } as SiteConfig }));
    });
    protected readonly alternatives = computed(() => sectionAlternatives(this.activeType()));
    protected readonly activeKey = computed(() => this.store.stored().design.sections[this.activeType()]);

    protected openType(type: SectionType): void {
        this.activeType.set(type);
        this.store.focus(type);
    }

    /** Küçük resim: yalnız bu bölümün alternatifi değişir, tasarımın kalanı kliniğin seçimi olarak kalır. */
    protected withAlternative(key: string): SiteConfig {
        const config = this.store.renderConfig();

        return { ...config, design: { ...config.design, sections: { ...config.design.sections, [this.activeType()]: key } } };
    }
}
