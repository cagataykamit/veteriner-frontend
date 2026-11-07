import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { SiteSection } from './site-context';
import { SECTION_BASE } from './section-base';

/** Logo: yüklenmişse görsel, yoksa adın baş harfi; ad isteğe bağlı. Bütün navigasyon ve footer alternatifleri bunu çizer. */
@Component({
    selector: 'site-logo',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <span class="mark" [style.--size.px]="size()" aria-hidden="true">
            @if (vm().logo; as logo) {
                <img [src]="logo" alt="" />
            } @else {
                {{ vm().initial }}
            }
        </span>
        @if (showName()) {
            <span class="name">{{ vm().name }}</span>
        }
    `,
    styles: `
        :host {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            min-width: 0;
        }

        .mark {
            display: grid;
            place-items: center;
            flex: none;
            width: var(--size);
            height: var(--size);
            overflow: hidden;
            border-radius: var(--s-radius);
            background: var(--s-logo-bg, var(--s-primary));
            color: var(--s-logo-ink, var(--s-on-primary));
            font-family: var(--s-head);
            font-size: calc(var(--size) * 0.56);
            font-weight: 700;
            line-height: 1;
        }

        img {
            display: block;
            width: 100%;
            height: 100%;
            background: #ffffff;
            object-fit: contain;
        }

        .name {
            overflow: hidden;
            font-family: var(--s-head);
            font-size: var(--s-logo-name, 16px);
            font-weight: var(--s-head-weight);
            line-height: 1.15;
            letter-spacing: var(--s-head-track);
            text-overflow: ellipsis;
            white-space: nowrap;
        }
    `
})
export class SiteLogoComponent extends SiteSection {
    readonly size = input(36);
    readonly showName = input(true);
}

/** Sade konum öğesi: gerçek harita gömülmez, elle çizilmiş sokak dokusu ve iğne, altında harita bağlantısı. Renkleri token'dan. */
@Component({
    selector: 'site-map',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <svg viewBox="0 0 640 420" preserveAspectRatio="xMidYMid slice" role="img" [attr.aria-label]="(vm().address || 'Klinik') + ' konumunun sade çizimi; gerçek harita değildir'">
            <rect width="640" height="420" class="land" />
            <path class="park" d="M430 -10 L650 -10 L650 140 C590 170 520 150 470 110 C440 85 425 40 430 -10 Z" />
            <path class="water" d="M-10 330 C80 300 160 340 250 345 C340 350 420 400 470 430 L-10 430 Z" />
            <g class="streets">
                <path d="M-10 70 L650 215" />
                <path d="M-10 210 L650 330" />
                <path d="M120 -10 L60 430" />
                <path d="M300 -10 L250 430" />
                <path d="M480 -10 L560 430" />
            </g>
            <g class="minor">
                <path d="M-10 140 L650 270" />
                <path d="M210 -10 L155 430" />
                <path d="M390 -10 L400 430" />
            </g>
            <g class="pin" transform="translate(320 195)">
                <circle r="44" class="halo" />
                <path d="M0 22 C-16 2 -20 -8 -20 -16 A20 20 0 1 1 20 -16 C20 -8 16 2 0 22 Z" class="drop" />
                <circle cy="-16" r="7" class="dot" />
            </g>
        </svg>
        @if (vm().mapHref; as href) {
            <a class="open" [href]="href" target="_blank" rel="noopener">Haritada aç<i class="pi pi-external-link" aria-hidden="true"></i></a>
        }
    `,
    styles: [
        SECTION_BASE,
        `
            :host {
                position: relative;
                display: block;
                height: 100%;
                min-height: 280px;
                overflow: hidden;
                border-radius: var(--s-map-radius, var(--s-radius-img));
                background: var(--s-surface);
            }

            svg {
                display: block;
                position: absolute;
                inset: 0;
                width: 100%;
                height: 100%;
            }

            .land {
                fill: color-mix(in srgb, var(--s-surface) 92%, var(--s-ink));
            }

            .park {
                fill: color-mix(in srgb, var(--s-secondary) 22%, var(--s-surface));
            }

            .water {
                fill: color-mix(in srgb, var(--s-primary) 16%, var(--s-surface));
            }

            .streets path {
                fill: none;
                stroke: var(--s-surface);
                stroke-width: 11;
            }

            .minor path {
                fill: none;
                stroke: var(--s-surface);
                stroke-width: 5;
            }

            .halo {
                fill: color-mix(in srgb, var(--s-primary) 22%, transparent);
            }

            .drop {
                fill: var(--s-primary);
            }

            .dot {
                fill: var(--s-on-primary);
            }

            .open {
                position: absolute;
                right: 12px;
                bottom: 12px;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                min-height: 44px;
                padding: 0 16px;
                border-radius: var(--s-radius-btn);
                background: var(--s-primary);
                color: var(--s-on-primary);
                font: 600 14px/1 var(--s-body);
                text-decoration: none;
            }

            .open .pi {
                font-size: 12px;
            }
        `
    ]
})
export class SiteMapComponent extends SiteSection {}

/** "Şu an açık · Kapanış 19:00": hero ve üst çubukların ortak durum satırı. */
@Component({
    selector: 'site-status',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <span class="dot" [class.is-open]="isOpen()" [class.is-break]="vm().status.state === 'break'" aria-hidden="true"></span>
        <span
            >{{ vm().status.word }}
            @if (showDetail()) {
                <span class="detail">· {{ vm().status.detail }}</span>
            }
        </span>
    `,
    styles: `
        :host {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            font-weight: 500;
            line-height: 1.3;
        }

        .dot {
            flex: none;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: currentColor;
            opacity: 0.45;
        }

        .dot.is-open {
            background: #18a058;
            opacity: 1;
        }

        .dot.is-break {
            background: #e0a100;
            opacity: 1;
        }

        .detail {
            opacity: 0.86;
        }
    `
})
export class SiteStatusComponent extends SiteSection {
    readonly showDetail = input(true);

    protected readonly isOpen = computed(() => this.vm().status.state === 'open');
}

/** Saat tablosu: footer ve iletişim bölümlerinde aynı veri; görünümü bulunduğu yerden miras alır. */
@Component({
    selector: 'site-hours',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <dl>
            @for (group of vm().groups; track group.label) {
                <div [class.is-today]="group.isToday">
                    <dt>{{ group.label }}</dt>
                    <dd>
                        {{ group.value }}
                        @if (group.note) {
                            <small>{{ group.note }}</small>
                        }
                    </dd>
                </div>
            }
        </dl>
    `,
    styles: `
        :host {
            display: block;
        }

        dl {
            margin: 0;
        }

        dl > div {
            display: flex;
            flex-wrap: wrap;
            justify-content: space-between;
            gap: 2px 16px;
            padding: 10px 0;
            border-top: 1px solid var(--s-line);
            font-size: 15px;
            line-height: 1.4;
        }

        dl > div:first-child {
            border-top: 0;
        }

        dt {
            font-weight: 500;
        }

        dd {
            margin: 0;
            font-variant-numeric: tabular-nums;
            text-align: right;
        }

        small {
            display: block;
            color: var(--s-muted);
            font-size: 13px;
        }

        .is-today dt::after {
            content: ' · bugün';
            color: var(--s-primary-text);
            font-weight: 600;
        }
    `
})
export class SiteHoursComponent extends SiteSection {}
