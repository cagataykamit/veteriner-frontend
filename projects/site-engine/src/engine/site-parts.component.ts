import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { SiteSection } from './site-context';
import { SITE_ICONS, type SiteIconName } from './site-icons';
import { SECTION_BASE } from './section-base';

/** Sitenin ikonu: `<site-icon name="phone" />`. Boyutu `--icon` ile, rengi bulunduğu yerden gelir; ekran okuyucuya görünmez. */
@Component({
    selector: 'site-icon',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path [attr.d]="path()" /></svg>`,
    styles: `
        :host {
            display: inline-flex;
            flex: none;
            width: var(--icon, 20px);
            height: var(--icon, 20px);
        }

        svg {
            width: 100%;
            height: 100%;
            fill: none;
            stroke: currentColor;
            stroke-width: 1.7;
            stroke-linecap: round;
            stroke-linejoin: round;
        }
    `
})
export class SiteIconComponent {
    readonly name = input.required<SiteIconName>();

    protected readonly path = computed(() => SITE_ICONS[this.name()]);
}

/**
 * Kliniğin adı yazı işareti olarak: ad büyük, tür eki altında küçük. Logo yüklenmişse adın solunda durur; harfli kare çizilmez (K-01).
 * Yazı konseptin başlık yazısıdır; boyutu `--wm-size` ve `--logo-h` ile bulunduğu yerden gelir. `stack` logoyu üste alır, ortalar
 * (Zarif alt bilgisi gibi).
 */
@Component({
    selector: 'site-logo',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { '[class.is-stack]': 'stack()' },
    template: `
        @if (vm().logo; as logo) {
            <img class="logo" [src]="logo" alt="" />
        }
        <span class="wm">
            <span class="name">{{ vm().wordmark.main }}</span>
            @if (vm().wordmark.sub) {
                <span class="sub">{{ vm().wordmark.sub }}</span>
            }
        </span>
    `,
    styles: `
        :host {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            min-width: 0;
        }

        :host(.is-stack) {
            flex-direction: column;
            gap: 14px;
            text-align: center;
        }

        :host(.is-stack) .wm {
            align-items: center;
            max-width: 100%;
        }

        .logo {
            flex: none;
            width: auto;
            max-width: 132px;
            height: var(--logo-h, 40px);
            padding: var(--s-logo-pad);
            border-radius: var(--s-radius);
            background: var(--s-logo-plate);
            object-fit: contain;
        }

        .wm {
            display: flex;
            flex-direction: column;
            min-width: 0;
            line-height: 1.1;
        }

        /* Taşma gizli olduğu için satır yüksekliği büyük harf işaretlerine ("Ö", "İ") yer bırakır. */
        .name {
            overflow: hidden;
            padding-block: 0.1em;
            margin-block: -0.1em;
            line-height: 1.25;
            font-family: var(--s-head);
            font-size: var(--wm-size, calc(var(--s-head-scale) * 20px));
            font-weight: var(--s-head-weight);
            letter-spacing: var(--s-head-track);
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .sub {
            overflow: hidden;
            margin-top: 3px;
            color: var(--s-muted);
            font-size: 12px;
            letter-spacing: 0.12em;
            text-overflow: ellipsis;
            text-transform: uppercase;
            white-space: nowrap;
        }

        /* Dar ekranda ad kesilmez, en çok iki satıra sarılır; logo varken tür eki yer açmak için düşer. */
        @container site (max-width: 599.98px) {
            .logo {
                max-width: 88px;
                height: 36px;
            }

            .name {
                display: -webkit-box;
                padding-top: 0.08em;
                line-height: 1.2;
                white-space: normal;
                -webkit-box-orient: vertical;
                -webkit-line-clamp: 2;
            }

            .logo + .wm .sub {
                display: none;
            }
        }
    `
})
export class SiteLogoComponent extends SiteSection {
    readonly stack = input(false);
}

/** "Haritada aç" kartı: gerçek harita gömülmez (üçüncü taraf ve çerez yok), kliniğin harita bağlantısı yeni sekmede açılır. */
@Component({
    selector: 'site-map',
    standalone: true,
    imports: [SiteIconComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (vm().mapHref; as href) {
            <a class="map" [href]="href" target="_blank" rel="noopener">
                <span class="pin"><site-icon name="pin" /></span>
                <span class="txt">
                    <b>Haritada aç</b>
                    <span>Konum yeni sekmede ya da harita uygulamanızda açılır</span>
                </span>
                <site-icon class="ext" name="external" />
            </a>
        }
    `,
    styles: [
        SECTION_BASE,
        `
            .map {
                display: flex;
                align-items: center;
                gap: 14px;
                min-height: 64px;
                padding: 14px 16px;
                border-radius: var(--s-radius);
                background: var(--s-tint);
                color: var(--s-on-tint);
                text-decoration: none;
            }

            .pin {
                display: grid;
                place-items: center;
                flex: none;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: var(--s-primary);
                color: var(--s-on-primary);
            }

            .txt {
                flex: 1;
                min-width: 0;
            }

            b {
                display: block;
                font-weight: 600;
                line-height: 1.3;
            }

            .txt span {
                display: block;
                color: var(--s-tint-muted);
                font-size: 14px;
                line-height: 1.35;
            }

            .ext {
                color: var(--s-tint-primary);
            }
        `
    ]
})
export class SiteMapComponent extends SiteSection {}

/** "Açık · Kapanış 19:00": giriş bölümü, üst çubuk ve saat kartının ortak durum satırı. `strong` sözcüğü durum rengiyle yazar. */
@Component({
    selector: 'site-status',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <span class="dot" [attr.data-state]="vm().status.state" aria-hidden="true"></span>
        <span>
            <span class="word" [attr.data-state]="strong() ? vm().status.state : null">{{ vm().status.word }}</span>
            @if (showDetail()) {
                <span class="detail"> · {{ vm().status.detail }}</span>
            }
        </span>
    `,
    styles: `
        :host {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-size: 14.5px;
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

        .dot[data-state='open'] {
            background: var(--s-ok);
            opacity: 1;
        }

        .dot[data-state='break'] {
            background: var(--s-warn);
            opacity: 1;
        }

        .word[data-state] {
            font-weight: 600;
        }

        .word[data-state='open'] {
            color: var(--s-ok);
        }

        .word[data-state='break'] {
            color: var(--s-warn);
        }
    `
})
export class SiteStatusComponent extends SiteSection {
    readonly showDetail = input(true);
    readonly strong = input(false);
}

/** Saat tablosu: iletişim bölümü, acil ve randevu sayfası aynı veriyi çizer. Bugünün satırı işaretli, kapalı gün soluktur. */
@Component({
    selector: 'site-hours',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <dl>
            @for (group of vm().groups; track group.label) {
                <div [class.is-today]="group.isToday" [class.is-closed]="group.isClosed">
                    <dt>
                        {{ group.label }}
                        @if (group.isToday) {
                            <em>Bugün</em>
                        }
                    </dt>
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
            align-items: baseline;
            justify-content: space-between;
            gap: 4px 16px;
            padding: 12px 0;
            border-top: 1px solid var(--s-line);
            font-size: 16px;
            line-height: 1.4;
        }

        dl > div:first-child {
            border-top: 0;
        }

        dt {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 4px 10px;
        }

        dd {
            margin: 0 0 0 auto;
            font-variant-numeric: tabular-nums;
            text-align: right;
        }

        em {
            padding: 2px 8px;
            border-radius: 999px;
            background: var(--s-tint);
            color: var(--s-tint-primary);
            font-size: 12.5px;
            font-style: normal;
            font-weight: 600;
        }

        .is-today {
            font-weight: 600;
        }

        .is-closed dd {
            color: var(--s-muted);
        }

        small {
            display: block;
            color: var(--s-muted);
            font-size: 13.5px;
            font-weight: 400;
        }
    `
})
export class SiteHoursComponent extends SiteSection {}
