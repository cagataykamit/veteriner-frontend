import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SECTION_DIRECTIVES, SiteSection } from '../../site-context';
import { SECTION_BASE } from '../../section-base';

/** Nature: koyu yosun bandında iri italik slogan, köşede ince çizilmiş bir dal; üstü yumuşak kemerle başlar. */
@Component({
    selector: 'site-nature-footer',
    standalone: true,
    imports: [SECTION_DIRECTIVES],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let v = vm();
        <footer class="band foot">
            <svg class="sprig" viewBox="0 0 200 320" aria-hidden="true">
                <path d="M110 320 C105 240 100 160 118 10" />
                <path d="M106 250 C80 240 56 214 48 176 C78 182 102 208 106 250 Z" />
                <path d="M104 190 C128 180 152 154 158 118 C130 124 106 150 104 190 Z" />
                <path d="M108 126 C88 116 70 94 66 64 C90 70 108 92 108 126 Z" />
            </svg>
            <div class="inner">
                <p class="h line">{{ v.slogan || v.name }}</p>
                <div class="cols">
                    <nav aria-label="Alt menü">
                        @for (link of v.menu; track link.path) {
                            <a [siteLink]="link.path">{{ link.label }}</a>
                        }
                    </nav>
                    <div class="stack">
                        @if (v.telHref) {
                            <a [href]="v.telHref">{{ v.phone }}</a>
                        }
                        @if (v.mailHref) {
                            <a [href]="v.mailHref">{{ v.email }}</a>
                        }
                        @for (link of v.social; track link.key) {
                            <a [href]="link.href" target="_blank" rel="noopener">{{ link.label }}</a>
                        }
                    </div>
                    <div class="stack hours">
                        @for (group of v.groups; track group.label) {
                            <p><span>{{ group.label }}</span> <span class="muted">{{ group.value }}</span></p>
                        }
                    </div>
                </div>
                <p class="made muted">© {{ v.siteName }} · Vetinity ile hazırlandı</p>
            </div>
        </footer>
    `,
    styles: [
        SECTION_BASE,
        `
            .foot {
                position: relative;
                overflow: hidden;
                padding-block: clamp(56px, 8cqi, 112px) 20px;
                border-radius: clamp(40px, 9cqi, 140px) clamp(40px, 9cqi, 140px) 0 0;
            }

            .sprig {
                position: absolute;
                top: 24px;
                right: 2%;
                width: clamp(88px, 16cqi, 200px);
                fill: none;
                stroke: var(--s-line);
                stroke-width: 1.5;
            }

            .line {
                position: relative;
                max-width: 16ch;
                font-size: calc(var(--s-head-scale) * clamp(40px, 6.4cqi, 104px));
                font-style: italic;
            }

            .cols {
                position: relative;
                display: grid;
                gap: 20px;
                margin-top: 32px;
            }

            nav {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                column-gap: 16px;
            }

            a {
                display: inline-flex;
                align-items: center;
                min-height: 44px;
                text-decoration: none;
            }

            a:hover {
                text-decoration: underline;
                text-underline-offset: 4px;
            }

            .stack {
                display: flex;
                flex-direction: column;
                align-items: flex-start;
            }

            .hours p {
                display: flex;
                justify-content: space-between;
                gap: 20px;
                width: 100%;
                padding: 8px 0;
                font-size: 15px;
            }

            .made {
                position: relative;
                margin-top: 24px;
                font-size: 13px;
            }

            @container site (min-width: 860px) {
                .cols {
                    grid-template-columns: minmax(0, 5fr) minmax(0, 3fr) minmax(0, 4fr);
                    gap: clamp(24px, 5cqi, 80px);
                }
            }
        `
    ]
})
export class NatureFooterComponent extends SiteSection {}
