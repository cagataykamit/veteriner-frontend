/**
 * Bölüm alternatiflerinin ortak sınıfları; her bileşen `styles`'ına ekler. Yalnız token kullanır. Bileşen stil bütçesi `styles` dizisinin
 * öğesi başına ölçülür (`anyComponentStyle`), bu yüzden temel, düğme ve menü ayrı öğelerdir. `.band` içinde token'lar yeniden tanımlanır:
 * koyu bantta çizilen bölüm aynı değişkenleri okur, ayrı renk düşünmez. `.s-head` bölümün kendi başlığıdır; alt sayfada sayfa başlığı
 * zaten olduğu için gizlenir.
 */
export const SECTION_BASE = `
    :host {
        display: block;
    }

    *,
    *::before,
    *::after {
        box-sizing: border-box;
    }

    h1, h2, h3, p, ul, ol, dl, dd, dt, figure {
        margin: 0;
        padding: 0;
        color: inherit;
    }

    ul, ol {
        list-style: none;
    }

    address {
        font-style: normal;
    }

    img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    a {
        color: inherit;
    }

    .inner {
        width: 100%;
        max-width: var(--s-max);
        margin-inline: auto;
        padding-inline: var(--s-gutter);
    }

    .sec {
        padding-block: var(--s-space);
    }

    .h {
        font-family: var(--s-head);
        font-weight: var(--s-head-weight);
        font-style: var(--s-head-style);
        letter-spacing: var(--s-head-track);
        line-height: var(--s-head-leading);
        text-wrap: balance;
        overflow-wrap: break-word;
    }

    .muted {
        color: var(--s-muted);
    }

    .band {
        --s-bg: var(--s-band);
        --s-surface: color-mix(in srgb, var(--s-band) 90%, var(--s-on-band));
        --s-ink: var(--s-on-band);
        --s-muted: var(--s-band-muted);
        --s-line: var(--s-band-line);
        --s-line-strong: var(--s-band-line-strong);
        --s-primary: var(--s-band-btn);
        --s-on-primary: var(--s-on-band-btn);
        --s-primary-text: var(--s-band-accent);
        --s-accent-text: var(--s-band-accent);
        --s-secondary-text: var(--s-band-accent);
        --s-tint: var(--s-band-tint);
        --s-on-tint: var(--s-band-on-tint);
        --s-tint-muted: var(--s-band-tint-muted);
        --s-tint-primary: var(--s-band-tint-accent);
        --s-ok: var(--s-band-ok);
        --s-warn: var(--s-band-warn);
        --s-focus: var(--s-on-band);
        background: var(--s-band);
        color: var(--s-on-band);
    }

    a:focus-visible,
    button:focus-visible,
    summary:focus-visible {
        outline: 2px solid var(--s-focus);
        outline-offset: 3px;
    }

    :host-context([data-place='page']) .s-head {
        display: none;
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

/**
 * Düğmeler. Biçim ve ton konseptin düğme dilinden gelir (`--s-radius-btn`, `--s-btn-*`; `site-tokens`): dolgun `.main` ana eylem,
 * çerçeveli `.line` ikinci eylem, `.acc` vurgu rengi. Altı çizili metin bağlantı düğme yerine kullanılmaz (K-01).
 */
export const SECTION_KIT = `
    .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        max-width: 100%;
        min-height: 48px;
        padding: 0 var(--s-btn-pad);
        border: 1.5px solid transparent;
        border-radius: var(--s-radius-btn);
        font: var(--s-btn-weight) var(--s-btn-size) / 1.2 var(--s-body);
        letter-spacing: var(--s-btn-track);
        text-transform: var(--s-btn-case);
        text-align: center;
        text-decoration: none;
        white-space: nowrap;
        cursor: pointer;
        transition: filter 0.15s ease, background-color 0.15s ease;
    }

    .btn site-icon {
        --icon: 18px;
    }

    .btn.main {
        background: var(--s-primary);
        color: var(--s-on-primary);
    }

    .btn.acc {
        background: var(--s-accent);
        color: var(--s-on-accent);
    }

    .btn.main:hover,
    .btn.acc:hover {
        filter: brightness(1.08);
    }

    .btn.line {
        border-color: var(--s-line-strong);
        background: transparent;
        color: var(--s-ink);
    }

    .btn.line:hover {
        background: var(--s-surface);
    }
`;

/**
 * Üst menünün ortak kuralı (K-01): geniş ekranda (900 px) çubukta yalnız ana bağlantılar (`navPrimary`, en çok beş) açık durur, kalanı
 * "Diğer" düğmesinin listesindedir (`.has-more`). Dar ekranda ya da ana bağlantılar sığmayınca (`siteNavFit` → `.is-tight`) hepsi
 * "Menü"dedir. Paketler kendi görünümünü yazar; sınıf adları ortaktır: `.nav`, `.links`, `.burger` (`.say-all` / `.say-more`), açılan
 * liste `.panel`, listede ana bağlantı `.prim`.
 */
export const NAV_BASE = `
    .burger {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-width: 44px;
        min-height: 44px;
        padding: 0 10px;
        border: 0;
        background: transparent;
        color: inherit;
        font: 600 15px/1 var(--s-body);
        white-space: nowrap;
        cursor: pointer;
    }

    .burger site-icon {
        --icon: 20px;
    }

    .say-more {
        display: none;
    }

    @container site (min-width: 900px) {
        .nav:not(.has-more):not(.is-tight) .burger,
        .nav:not(.has-more):not(.is-tight) .panel {
            display: none;
        }

        .is-tight .links {
            position: absolute;
            visibility: hidden;
        }

        .has-more:not(.is-tight) .say-all,
        .has-more:not(.is-tight) .panel .prim {
            display: none;
        }

        .has-more:not(.is-tight) .say-more {
            display: inline;
        }
    }
`;
