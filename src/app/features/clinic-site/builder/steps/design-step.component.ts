import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { designFromConcept, SITE_CONCEPTS, type SiteConfig } from '@site-engine';
import { SiteBuilderStore } from '@/app/features/clinic-site/builder/site-builder.store';
import { SiteThumbComponent } from '@/app/features/clinic-site/builder/site-preview.component';
import { WIZARD_STYLES } from '@/app/features/clinic-site/builder/wizard-kit';

/**
 * 3. adım: konseptler. Sitenin tek düzeni vardır; konsept renk, zemin, yazı, köşe ve düğme biçimini getirir (K-01). Küçük resimler
 * gerçek bileşenlerin canlı çizimidir.
 */
@Component({
    selector: 'app-design-step',
    standalone: true,
    imports: [SiteThumbComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section class="group">
            <h3 class="group-title">Konsept</h3>
            <p class="hint">Konsept başlangıçtır: renkleri, yazıyı, köşeleri ve düğme biçimini getirir. Düzen, metinleriniz ve fotoğraflarınız aynı kalır.</p>
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
    `,
    styles: [
        ...WIZARD_STYLES,
        `
            .concepts {
                display: grid;
                gap: 10px;
            }

            .concept {
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

            .concept:hover {
                border-color: var(--w-line-strong);
            }

            .concept[aria-pressed='true'] {
                border-color: var(--w-ink);
                box-shadow: 0 0 0 1px var(--w-ink);
            }

            .c-text {
                display: grid;
                gap: 3px;
                padding: 10px 12px 12px;
                border-top: 1px solid var(--w-line);
                font-size: 13px;
                line-height: 1.4;
            }

            .c-text strong {
                font-size: 14px;
            }

            .c-text span {
                color: var(--w-muted);
            }
        `
    ]
})
export class DesignStepComponent {
    protected readonly store = inject(SiteBuilderStore);

    protected readonly conceptKey = computed(() => this.store.stored().design.conceptKey);
    protected readonly concepts = computed(() => {
        const config = this.store.renderConfig();

        return SITE_CONCEPTS.map((concept) => ({ key: concept.key, name: concept.name, idea: concept.idea, config: { ...config, design: designFromConcept(concept) } as SiteConfig }));
    });
}
