/** Tam ekran oluşturucunun stilleri. Bütçe stil öğesi başına ölçüldüğünden parçalara ayrılmıştır. */
export const SITE_BUILDER_LAYOUT_STYLES = `
    :host {
        --w-ink: #16181b;
        --w-panel: #ffffff;
        --w-canvas: #e8e6df;
        --w-soft: #f4f3ee;
        --w-muted: #5d6167;
        --w-line: #e6e4dc;
        --w-line-strong: #c4c1b7;
        --w-focus: #1d4ed8;
        --w-bad: #b3261e;
        --w-bad-bg: #fce9e7;
        --w-warn-bg: #fdf3dc;
        --w-warn-ink: #6b4a00;
        --w-ok-bg: #e4f3e8;
        --w-ok-ink: #17602b;
        position: fixed;
        inset: 0;
        z-index: 1;
        background: var(--w-canvas);
        color: var(--w-ink);
        font-family: 'Instrument Sans Variable', 'Inter', system-ui, sans-serif;
        font-size: 15px;
        line-height: 1.45;
    }

    .builder {
        display: flex;
        flex-direction: column;
        height: 100%;
    }

    .sr {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip-path: inset(50%);
        white-space: nowrap;
    }

    .steps {
        min-width: 0;
        margin: 0;
        padding: 0;
        border: 0;
    }

    .state {
        display: grid;
        gap: 10px;
        justify-items: start;
        color: var(--w-muted);
        font-size: 14px;
    }

    .head {
        margin-bottom: 20px;
    }

    .count {
        margin: 0 0 6px;
        color: var(--w-muted);
        font-size: 13px;
        font-variant-numeric: tabular-nums;
    }

    h1 {
        margin: 0;
        color: inherit;
        font-size: 28px;
        font-weight: 600;
        line-height: 1.1;
        letter-spacing: -0.03em;
    }

    .text {
        margin: 8px 0 0;
        color: var(--w-muted);
        font-size: 15px;
    }
`;

export const SITE_BUILDER_BAR_STYLES = `
    .top {
        position: relative;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: 8px 12px;
        padding: 8px 12px;
        border-bottom: 1px solid var(--w-line);
        background: var(--w-panel);
    }

    .brand {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 4px 8px;
        min-width: 0;
        font-size: 14px;
    }

    .brand strong {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .back {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-height: 44px;
        padding: 0 8px 0 4px;
        border-radius: 8px;
        color: var(--w-ink);
        font-size: 13px;
        font-weight: 600;
        text-decoration: none;
    }

    .back:hover {
        background: var(--w-soft);
    }

    .back span {
        display: none;
    }

    .draft {
        flex: none;
        padding: 2px 8px;
        border-radius: 999px;
        background: var(--w-warn-bg);
        color: var(--w-warn-ink);
        font-size: 12px;
        font-weight: 600;
    }

    .draft.is-live {
        background: var(--w-ok-bg);
        color: var(--w-ok-ink);
    }

    .clinic select {
        max-width: 180px;
        min-height: 36px;
        padding: 0 8px;
        border: 1px solid var(--w-line-strong);
        border-radius: 8px;
        background: var(--w-panel);
        color: var(--w-ink);
        font-family: inherit;
        font-size: 13px;
    }

    .stepper {
        display: none;
    }

    .tools {
        display: flex;
        align-items: center;
        gap: 2px;
    }

    .save {
        display: none;
        margin-right: 8px;
        color: var(--w-muted);
        font-size: 13px;
        white-space: nowrap;
    }

    .save.is-bad {
        display: inline;
        color: var(--w-bad);
    }

    .icon {
        display: grid;
        place-items: center;
        width: 44px;
        height: 44px;
        border: 0;
        border-radius: 10px;
        background: transparent;
        color: var(--w-ink);
        cursor: pointer;
    }

    .icon:hover:not(:disabled) {
        background: var(--w-soft);
    }

    .icon:disabled {
        color: var(--w-line-strong);
        cursor: default;
    }

    .icon .pi-refresh {
        transform: scaleX(-1);
    }

    .progress {
        position: absolute;
        right: 0;
        bottom: -1px;
        left: 0;
        height: 2px;
    }

    .progress span {
        display: block;
        height: 100%;
        background: var(--w-ink);
        transition: width 0.3s ease;
    }
`;

export const SITE_BUILDER_NOTICE_STYLES = `
    .notices:empty {
        display: none;
    }

    .notice {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px 10px;
        margin: 0;
        padding: 8px 16px;
        border-bottom: 1px solid var(--w-line);
        font-size: 13px;
        line-height: 1.4;
    }

    .notice span {
        flex: 1 1 220px;
        min-width: 0;
    }

    .notice.bad {
        background: var(--w-bad-bg);
        color: var(--w-bad);
    }

    .notice.warn {
        background: var(--w-warn-bg);
        color: var(--w-warn-ink);
    }

    .notice.info {
        background: var(--w-soft);
    }

    .notice .wbtn {
        color: var(--w-ink);
    }
`;

export const SITE_BUILDER_CANVAS_STYLES = `
    .split {
        display: grid;
        flex: 1 1 0;
        grid-template-rows: minmax(0, 1fr);
        grid-template-columns: minmax(0, 1fr);
        min-height: 0;
    }

    .panel {
        display: grid;
        grid-template-rows: minmax(0, 1fr) auto;
        min-height: 0;
        background: var(--w-panel);
    }

    .panel-scroll {
        padding: 20px 16px 28px;
        overflow-y: auto;
        scrollbar-width: thin;
    }

    .nav {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: 6px;
        padding: 10px 12px;
        border-top: 1px solid var(--w-line);
        background: var(--w-panel);
    }

    .nav .wbtn {
        padding: 0 12px;
    }

    .next {
        justify-self: end;
    }

    .next .pi {
        font-size: 12px;
    }

    .canvas {
        display: none;
        grid-template-rows: auto minmax(0, 1fr);
        min-height: 0;
        min-width: 0;
    }

    .show-preview .panel {
        display: none;
    }

    .show-preview .canvas {
        display: grid;
    }

    .canvas-bar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
    }

    .devices {
        flex: none;
        background: rgb(0 0 0 / 7%);
    }

    .devices button {
        width: 44px;
        padding: 0;
    }

    .page-pick {
        display: inline-flex;
        flex: 1 1 140px;
        align-items: center;
        gap: 8px;
        min-width: 0;
        font-size: 13px;
        font-weight: 600;
    }

    .page-pick select {
        width: 100%;
        min-width: 0;
        max-width: 240px;
        min-height: 40px;
        padding: 0 8px;
        border: 1px solid var(--w-line-strong);
        border-radius: 10px;
        background: var(--w-panel);
        color: var(--w-ink);
        font-family: inherit;
        font-size: 14px;
    }

    .stage {
        min-height: 0;
        padding: 0 12px 12px;
    }

    .switch {
        margin: 6px 12px 10px;
    }
`;

export const SITE_BUILDER_WIDE_STYLES = `
    @media (min-width: 1040px) {
        .top {
            grid-template-columns: minmax(180px, 1fr) auto minmax(180px, 1fr);
            padding: 6px 16px;
        }

        .back span {
            display: inline;
        }

        .stepper {
            display: flex;
            gap: 2px;
            margin: 0;
            padding: 0;
        }

        .stepper button {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            min-height: 44px;
            padding: 0 10px;
            border: 0;
            border-radius: 10px;
            background: transparent;
            color: var(--w-muted);
            font-family: inherit;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
        }

        .stepper button:hover,
        .stepper .is-on {
            color: var(--w-ink);
        }

        .stepper .n {
            display: grid;
            place-items: center;
            width: 22px;
            height: 22px;
            border: 1px solid var(--w-line-strong);
            border-radius: 50%;
            font-size: 12px;
            font-variant-numeric: tabular-nums;
        }

        .stepper .is-done .n {
            border-color: var(--w-ink);
        }

        .stepper .is-on .n {
            border-color: var(--w-ink);
            background: var(--w-ink);
            color: var(--w-panel);
        }

        .tools {
            justify-content: flex-end;
        }

        .save {
            display: inline;
        }

        .split {
            grid-template-columns: minmax(380px, 460px) minmax(0, 1fr);
        }

        .panel,
        .show-preview .panel {
            display: grid;
            border-right: 1px solid var(--w-line);
        }

        .canvas,
        .show-preview .canvas {
            display: grid;
        }

        .panel-scroll {
            padding: 28px 24px 36px;
        }

        .canvas-bar {
            padding: 10px 16px;
        }

        .stage {
            padding: 0 16px 16px;
        }

        .switch {
            display: none;
        }
    }
`;
