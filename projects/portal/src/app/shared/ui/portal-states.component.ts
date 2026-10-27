import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';

/** Yükleniyor durumu: ekran okuyucuya `status` olarak duyurulur. */
@Component({
    selector: 'portal-loading-state',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="portal-state" role="status" aria-live="polite">
            <i class="fa-solid fa-circle-notch fa-spin portal-state-icon" aria-hidden="true"></i>
            <p class="portal-muted">{{ message() }}</p>
        </div>
    `
})
export class PortalLoadingState {
    readonly message = input('Yükleniyor…');
}

/**
 * İçerik iskeleti: yüklenen kartların yerini tutan sakin gri bloklar. Ekran okuyucuya yalnız metin duyurulur;
 * hareket azaltma tercihinde animasyon durur.
 */
@Component({
    selector: 'portal-skeleton',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: `
        .portal-skeleton {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }
        .portal-skeleton-card {
            display: flex;
            flex-direction: column;
            gap: 0.625rem;
            padding: 1rem;
            background: var(--portal-surface);
            border: 1px solid var(--portal-border);
            border-radius: var(--portal-radius);
        }
        .portal-skeleton-line {
            display: block;
            height: 0.875rem;
            width: 70%;
            border-radius: 0.375rem;
            background: linear-gradient(90deg, #eef2f6 25%, #e2e8f0 50%, #eef2f6 75%);
            background-size: 200% 100%;
            animation: portal-skeleton-pulse 1.4s ease-in-out infinite;
        }
        .portal-skeleton-line--title {
            width: 45%;
            height: 1rem;
        }
        @keyframes portal-skeleton-pulse {
            from {
                background-position: 100% 0;
            }
            to {
                background-position: -100% 0;
            }
        }
        @media (prefers-reduced-motion: reduce) {
            .portal-skeleton-line {
                animation: none;
            }
        }
    `,
    template: `
        <div class="portal-skeleton" role="status" aria-live="polite">
            <span class="sr-only">{{ message() }}</span>
            @for (row of rowList(); track $index) {
                <div class="portal-skeleton-card" aria-hidden="true">
                    <span class="portal-skeleton-line portal-skeleton-line--title"></span>
                    <span class="portal-skeleton-line"></span>
                </div>
            }
        </div>
    `
})
export class PortalSkeleton {
    readonly rows = input(3);
    readonly message = input('Yükleniyor…');

    protected rowList(): number[] {
        return Array.from({ length: Math.max(1, this.rows()) }, (_, i) => i);
    }
}

/** Hata durumu: mesaj `alert` olarak duyurulur; isteğe bağlı "Tekrar dene". */
@Component({
    selector: 'portal-error-state',
    standalone: true,
    imports: [ButtonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="portal-state" role="alert">
            <i class="fa-solid fa-triangle-exclamation portal-state-icon portal-state-icon--error" aria-hidden="true"></i>
            <p>{{ message() }}</p>
            @if (retryLabel()) {
                <button pButton type="button" severity="secondary" [outlined]="true" class="portal-button-block" (click)="retry.emit()">{{ retryLabel()! }}</button>
            }
        </div>
    `
})
export class PortalErrorState {
    readonly message = input.required<string>();
    readonly retryLabel = input<string | null>('Tekrar dene');
    readonly retry = output<void>();
}

/** Boş durum: içerik henüz yok. */
@Component({
    selector: 'portal-empty-state',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="portal-state">
            <i class="fa-solid portal-state-icon" [class]="icon()" aria-hidden="true"></i>
            <p class="portal-subtitle">{{ title() }}</p>
            @if (message()) {
                <p class="portal-muted">{{ message() }}</p>
            }
            <ng-content />
        </div>
    `
})
export class PortalEmptyState {
    readonly title = input.required<string>();
    readonly message = input<string | null>(null);
    readonly icon = input('fa-paw');
}
