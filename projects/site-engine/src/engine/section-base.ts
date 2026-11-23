/**
 * Bölümlerin ortak sınıfları; her bileşen `styles`'ına ekler. Yalnız token kullanır. Bileşen stil bütçesi `styles` dizisinin öğesi başına
 * ölçülür (`anyComponentStyle`), bu yüzden temel ve kit ayrı öğelerdir. `.s-head` bölümün kendi başlığıdır; alt sayfada sayfa başlığı
 * zaten olduğu için gizlenir. `.tinted` üst çubuk ve giriş bölümünün yumuşak zeminidir: soluk ve ana renk metni o zemine göre okunur.
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

    .tinted {
        --s-muted: var(--s-tint-muted);
        --s-primary-text: var(--s-tint-primary);
        background: var(--s-tint);
        color: var(--s-on-tint);
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
 * Düğme, bölüm başlığı, kart ve ikon kabarcığı. Düğmenin biçimi ve tonu konsept token'ından gelir (`--s-radius-btn`, `--s-btn-*`):
 * dolgun `.main` ana eylem, çerçeveli `.line` ikinci eylem. Altı çizili metin bağlantı düğme yerine kullanılmaz.
 */
export const SECTION_KIT = `
    .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        max-width: 100%;
        min-height: 48px;
        padding: 0 22px;
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

    .btn.main:hover {
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

    .head {
        margin-bottom: clamp(24px, 2.8cqi, 36px);
    }

    .head .title {
        font-size: calc(var(--s-head-scale) * clamp(27px, 3cqi, 38px));
    }

    .head .intro {
        max-width: 56ch;
        margin-top: 8px;
        color: var(--s-muted);
        font-size: 17px;
    }

    .more {
        margin-top: 28px;
    }

    .card {
        border: 1px solid var(--s-line);
        border-radius: var(--s-radius);
        background: var(--s-bg);
        color: var(--s-ink);
    }

    .bub {
        display: grid;
        place-items: center;
        flex: none;
        width: 44px;
        height: 44px;
        border-radius: calc(var(--s-radius) * 0.7);
        background: var(--s-tint);
        color: var(--s-tint-primary);
        --icon: 22px;
    }
`;
