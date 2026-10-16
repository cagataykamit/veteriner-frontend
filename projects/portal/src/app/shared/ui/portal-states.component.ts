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
                <p-button [label]="retryLabel()!" severity="secondary" [outlined]="true" styleClass="portal-button-block" (onClick)="retry.emit()" />
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
