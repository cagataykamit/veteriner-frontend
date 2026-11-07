import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { HOME_SECTION_LABELS, type HomeSectionType, PAGE_DEFS, type PageKey } from '@site-engine';
import { SiteBuilderStore } from '@/app/features/clinic-site/builder/site-builder.store';
import { WIZARD_STYLES } from '@/app/features/clinic-site/builder/wizard-kit';

/** 4. adım: sayfaları aç-kapat, ana sayfa bölümlerini aç-kapat ve sırala. Site menüsü buna uyar. */
@Component({
    selector: 'app-pages-step',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section class="group">
            <h3 class="group-title">Sayfalar</h3>
            <p class="hint">Ana Sayfa her zaman açık. Kapattığınız ya da içeriği boş sayfa menüden çıkar.</p>
            <ul class="list">
                @for (page of required; track page.key) {
                    <li>
                        <label class="row">
                            <span class="txt"><strong>{{ page.label }}</strong><span>{{ page.hint }}</span></span>
                            <input type="checkbox" role="switch" [checked]="pages()[page.key]" (change)="togglePage(page.key, $any($event.target).checked)" />
                        </label>
                    </li>
                }
            </ul>
            <h3 class="group-title sub">İsteğe bağlı</h3>
            <ul class="list">
                @for (page of optional; track page.key) {
                    <li>
                        <label class="row">
                            <span class="txt"><strong>{{ page.label }}</strong><span>{{ page.hint }}</span></span>
                            <input type="checkbox" role="switch" [checked]="pages()[page.key]" (change)="togglePage(page.key, $any($event.target).checked)" />
                        </label>
                    </li>
                }
            </ul>
        </section>

        <section class="group">
            <h3 class="group-title">Ana sayfa bölümleri</h3>
            <p class="hint">Navigasyon, hero ve footer sabit. Diğerlerini açıp kapatın, okla sıralayın. Boş bölüm sitede görünmez.</p>
            <ol class="list">
                @for (section of sections(); track section.type; let first = $first; let last = $last; let i = $index) {
                    <li class="row sec" [class.is-off]="!section.on">
                        <span class="arrows">
                            <button type="button" [disabled]="first" [attr.aria-label]="labels[section.type] + ' yukarı taşı'" (click)="move(i, -1)"><i class="pi pi-arrow-up" aria-hidden="true"></i></button>
                            <button type="button" [disabled]="last" [attr.aria-label]="labels[section.type] + ' aşağı taşı'" (click)="move(i, 1)"><i class="pi pi-arrow-down" aria-hidden="true"></i></button>
                        </span>
                        <span class="txt"><strong>{{ labels[section.type] }}</strong></span>
                        <input type="checkbox" role="switch" [attr.aria-label]="labels[section.type]" [checked]="section.on" (change)="toggleSection(i, $any($event.target).checked)" />
                    </li>
                }
            </ol>
        </section>
    `,
    styles: [
        ...WIZARD_STYLES,
        `
            .sub {
                margin-top: 6px;
            }

            .list {
                border: 1px solid var(--w-line);
                border-radius: 12px;
                background: var(--w-panel);
            }

            .list > li + li {
                border-top: 1px solid var(--w-line);
            }

            .row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                min-height: 56px;
                padding: 8px 14px;
                cursor: pointer;
            }

            .row.sec {
                padding-left: 6px;
                cursor: default;
            }

            .is-off .txt {
                opacity: 0.55;
            }

            .txt {
                display: grid;
                flex: 1;
                gap: 2px;
                min-width: 0;
                font-size: 14px;
            }

            .txt span {
                color: var(--w-muted);
                font-size: 13px;
            }
        `,
        `
            input[role='switch'] {
                position: relative;
                flex: none;
                width: 44px;
                height: 26px;
                margin: 0;
                border-radius: 999px;
                background: var(--w-line-strong);
                appearance: none;
                cursor: pointer;
                transition: background-color 0.15s ease;
            }

            input[role='switch']::before {
                content: '';
                position: absolute;
                top: 3px;
                left: 3px;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: #ffffff;
                transition: transform 0.15s ease;
            }

            input[role='switch']:checked {
                background: var(--w-ink);
            }

            input[role='switch']:checked::before {
                transform: translateX(18px);
            }

            .arrows {
                display: flex;
                flex: none;
            }

            .arrows button {
                width: 44px;
                height: 44px;
                border: 0;
                background: transparent;
                color: var(--w-ink);
                cursor: pointer;
            }

            .arrows button:disabled {
                color: var(--w-line-strong);
                cursor: default;
            }

            .arrows .pi {
                font-size: 12px;
            }
        `
    ]
})
export class PagesStepComponent {
    private readonly store = inject(SiteBuilderStore);

    protected readonly labels = HOME_SECTION_LABELS;
    protected readonly required = PAGE_DEFS.filter((page) => !page.optional);
    protected readonly optional = PAGE_DEFS.filter((page) => page.optional);
    protected readonly pages = computed(() => this.store.stored().structure.pages);
    protected readonly sections = computed(() => this.store.stored().structure.homeSections);

    protected togglePage(key: PageKey, on: boolean): void {
        this.store.patchStructure({ pages: { ...this.pages(), [key]: on } });
    }

    protected toggleSection(index: number, on: boolean): void {
        this.store.patchStructure({ homeSections: this.sections().map((section, i) => (i === index ? { ...section, on } : section)) });
    }

    protected move(index: number, by: number): void {
        const list = [...this.sections()];
        const [item] = list.splice(index, 1);
        const type: HomeSectionType = item.type;

        list.splice(index + by, 0, item);
        this.store.patchStructure({ homeSections: list });
        this.store.focus(type);
    }
}
