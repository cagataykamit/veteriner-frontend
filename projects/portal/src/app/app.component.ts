import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PortalNetworkStatus } from './core/network/portal-network-status.service';

@Component({
    selector: 'portal-root',
    standalone: true,
    imports: [RouterOutlet],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (!network.online()) {
            <div class="portal-offline-band" role="status">
                <i class="fa-solid fa-wifi" aria-hidden="true"></i>
                Çevrimdışısınız. Bilgiler bağlantı gelince güncellenir.
            </div>
        }
        <router-outlet />
    `
})
export class PortalAppComponent {
    protected readonly network = inject(PortalNetworkStatus);
}
