import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PortalSessionService } from '@portal/app/core/auth/portal-session.service';
import { PortalEmptyState } from '@portal/app/shared/ui/portal-states.component';

/**
 * Ana ekran iskeleti (Dilim 1): selamlama ve klinik. Hayvanlarım, randevu, aşı ve bakiye kartları Dilim 2'dir.
 * Müşteriye dönük dil: "hayvanınız/hayvanlarınız" (ADR-022 madde 5).
 */
@Component({
    selector: 'portal-home',
    standalone: true,
    imports: [RouterLink, PortalEmptyState],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="portal-stack">
            <h1 class="portal-title">{{ greeting() }}</h1>

            @if (session.activeLink(); as link) {
                <section class="portal-card portal-stack" aria-labelledby="home-clinic-title">
                    <p class="portal-muted">Kliniğiniz</p>
                    <h2 id="home-clinic-title" class="portal-subtitle">{{ link.clinicName }}</h2>
                    @if (session.links().length > 1) {
                        <a class="portal-link-button" routerLink="/clinics">Klinik değiştir</a>
                    }
                </section>
                <portal-empty-state
                    title="Hayvanlarınızın bilgileri"
                    message="Aşı, randevu ve hesap bilgileriniz çok yakında burada görünecek."
                    icon="fa-paw"
                />
            } @else {
                <portal-empty-state
                    title="Bağlı klinik yok"
                    message="Hesabınız şu anda hiçbir kliniğe bağlı değil. Kliniğinizden yeni bir portal daveti isteyebilirsiniz."
                    icon="fa-hospital"
                />
            }
        </div>
    `
})
export class PortalHomeComponent {
    protected readonly session = inject(PortalSessionService);

    /** Görünen ad; yoksa bağdaki müşteri adı; ikisi de boşsa yalnız "Merhaba". */
    readonly greeting = computed(() => {
        const name = this.session.me()?.displayName?.trim() || this.session.activeLink()?.clientFullName?.trim();

        return name ? `Merhaba, ${name}` : 'Merhaba';
    });
}
