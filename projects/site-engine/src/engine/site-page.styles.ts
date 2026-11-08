/**
 * Alt sayfa stilleri. Bileşen stil bütçesi `styles` dizisinin öğesi başına ölçülür (`anyComponentStyle`), bu yüzden sayfa türlerine
 * göre ayrı öğelerdir.
 */
export const PAGE_HEAD_STYLES = `
    /* Sayfa başlığı: duruşu seçili hero'dan gelir. */
    .page-head {
        padding-block: clamp(40px, 7cqi, 96px) clamp(24px, 3cqi, 48px);
        color: var(--s-ink);
    }

    .ttl {
        font-size: calc(var(--s-head-scale) * clamp(42px, 7cqi, 112px));
    }

    .ld {
        max-width: 48ch;
        margin-top: 16px;
        font-size: 18px;
        line-height: 1.5;
    }

    .back {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-height: 44px;
        margin-bottom: 12px;
        font-size: 14px;
        font-weight: 600;
        text-decoration: none;
    }

    .back .pi {
        font-size: 12px;
    }

    .page-head[data-style='modern'] {
        border-bottom: 1px solid var(--s-line);
    }

    .page-head[data-style='premium'] {
        border-bottom: 1px solid var(--s-line);
        text-align: center;
    }

    .page-head[data-style='premium'] .ld {
        margin-inline: auto;
        color: var(--s-muted);
    }

    .page-head[data-style='friendly'] .inner {
        padding-block: clamp(24px, 4cqi, 56px);
        border-radius: var(--s-radius-img);
        background: var(--s-tint);
        color: var(--s-on-tint);
    }

    .page-head[data-style='friendly'] {
        padding-inline: var(--s-gutter);
        padding-top: 16px;
    }

    .page-head[data-style='nature'] .ttl {
        font-style: italic;
        color: var(--s-primary-text);
    }

    .lost {
        display: grid;
        gap: 20px;
        justify-items: start;
        padding-block: var(--s-space);
    }

    .lost h1 {
        font-size: calc(var(--s-head-scale) * clamp(36px, 6cqi, 80px));
    }
`;

export const PAGE_READING_STYLES = `
    /* Hizmet detayı, yazı, biyografi. */
    .detail {
        display: grid;
        gap: 28px;
        padding-block: clamp(24px, 4cqi, 56px) clamp(32px, 5cqi, 72px);
    }

    .prose p,
    .reading p {
        margin-bottom: 18px;
        font-size: 18px;
        line-height: 1.6;
    }

    .prose .btn {
        margin-top: 8px;
    }

    .detail figure,
    .reading figure {
        aspect-ratio: 4 / 3;
        overflow: hidden;
        border-radius: var(--s-radius-img);
        background: var(--s-surface);
    }

    .others {
        padding-bottom: var(--s-space);
    }

    .others h2 {
        margin-bottom: 14px;
        font-size: calc(var(--s-head-scale) * 26px);
    }

    .others li {
        border-top: 1px solid var(--s-line);
    }

    .others a {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        min-height: 52px;
        text-decoration: none;
    }

    .others .pi {
        font-size: 12px;
    }

    .reading {
        max-width: 760px;
        padding-block: 8px var(--s-space);
    }

    .reading figure {
        margin-bottom: 28px;
        aspect-ratio: 16 / 9;
    }

    .bios {
        display: grid;
        gap: 24px;
        padding-bottom: var(--s-space);
    }

    .bios article {
        max-width: 680px;
        padding-top: 18px;
        border-top: 1px solid var(--s-line);
    }

    .bios h2 {
        font-size: calc(var(--s-head-scale) * 26px);
    }

    .bios p:last-child {
        margin-top: 10px;
        font-size: 17px;
        line-height: 1.55;
    }

    @container site (min-width: 860px) {
        .detail {
            grid-template-columns: minmax(0, 6fr) minmax(0, 6fr);
            align-items: start;
            gap: clamp(32px, 6cqi, 96px);
        }
    }
`;

export const PAGE_INFO_STYLES = `
    /* SSS, acil ve randevu çağrısı, şubeler. */
    .faq {
        max-width: 880px;
        padding-block: 8px var(--s-space);
    }

    details {
        border-bottom: 1px solid var(--s-line);
    }

    summary {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        min-height: 60px;
        padding-block: 12px;
        font-size: calc(var(--s-head-scale) * clamp(20px, 2cqi, 26px));
        list-style: none;
        cursor: pointer;
    }

    summary::-webkit-details-marker {
        display: none;
    }

    summary .pi {
        flex: none;
        font-size: 13px;
        transition: transform 0.2s ease;
    }

    details[open] summary .pi {
        transform: rotate(45deg);
    }

    details p {
        padding-bottom: 18px;
        font-size: 17px;
        line-height: 1.55;
    }

    .callout {
        display: grid;
        gap: 20px;
        max-width: 880px;
        padding-block: 8px var(--s-space);
    }

    .note {
        font-size: 19px;
        line-height: 1.55;
    }

    .call {
        display: inline-flex;
        align-items: center;
        gap: 14px;
        min-height: 72px;
        color: var(--s-primary-text);
        font-size: calc(var(--s-head-scale) * clamp(36px, 7cqi, 80px));
        font-variant-numeric: tabular-nums;
        text-decoration: none;
    }

    .call .pi {
        font-size: 0.5em;
    }

    /* En yakın müsait saatler (TIER-017): her saat talep formuna gider. */
    .slots {
        display: grid;
        gap: 16px;
        padding: clamp(18px, 3cqi, 28px);
        border: 1px solid var(--s-line);
        border-radius: var(--s-radius);
        background: var(--s-surface);
    }

    .slots h2 {
        font-size: calc(var(--s-head-scale) * clamp(22px, 2.4cqi, 28px));
    }

    .slot-day {
        display: grid;
        gap: 8px;
    }

    .slot-day h3 {
        color: var(--s-muted);
        font: 600 14px/1.3 var(--s-body);
    }

    .slot-day ul {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
    }

    .slot {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 76px;
        min-height: 44px;
        padding: 0 14px;
        border: 1px solid var(--s-line);
        border-radius: var(--s-radius-btn);
        color: var(--s-primary-text);
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        text-decoration: none;
    }

    .slot:hover,
    .slot:focus-visible {
        border-color: var(--s-primary);
    }

    .branches {
        display: grid;
        gap: 20px;
        padding-block: 8px var(--s-space);
    }

    .branches article {
        padding-top: 16px;
        border-top: 1px solid var(--s-line);
    }

    .branches h2 {
        font-size: calc(var(--s-head-scale) * 28px);
    }

    .branches address {
        margin-top: 6px;
    }

    @container site (min-width: 860px) {
        .branches {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 28px;
        }

        site-map {
            grid-column: 1 / -1;
            min-height: 360px;
        }
    }
`;
