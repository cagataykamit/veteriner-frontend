/**
 * Bölüm alternatiflerinin ortak sınıfları; her bileşen `styles`'ına ekler. Yalnız token kullanır. `.band` içinde token'lar yeniden
 * tanımlanır: koyu bantta çizilen bölüm aynı değişkenleri okur, ayrı renk düşünmez. `.s-head` bölümün kendi başlığıdır; alt
 * sayfada sayfa başlığı zaten olduğu için gizlenir.
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
        --s-primary: var(--s-band-btn);
        --s-on-primary: var(--s-on-band-btn);
        --s-primary-text: var(--s-band-accent);
        --s-accent-text: var(--s-band-accent);
        --s-secondary-text: var(--s-band-accent);
        --s-focus: var(--s-on-band);
        background: var(--s-band);
        color: var(--s-on-band);
    }

    .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-height: 48px;
        padding: 0 22px;
        border: 1px solid transparent;
        border-radius: var(--s-radius-btn);
        font: 600 15px/1.2 var(--s-body);
        text-decoration: none;
        white-space: nowrap;
        cursor: pointer;
        transition: 0.2s ease;
    }

    .btn:hover {
        transform: translateY(-1px);
    }

    .btn.main {
        background: var(--s-primary);
        color: var(--s-on-primary);
    }

    .btn.acc {
        background: var(--s-accent);
        color: var(--s-on-accent);
    }

    .btn.line {
        border-color: currentColor;
        background: transparent;
    }

    .tlink {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-height: 44px;
        font-weight: 600;
        text-decoration: underline;
        text-decoration-thickness: 1px;
        text-underline-offset: 5px;
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

/** Mobil menü düğmesi ve açılır liste gibi navigasyonların ortak parçası. */
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
        font: 600 14px/1 var(--s-body);
        cursor: pointer;
    }
`;
