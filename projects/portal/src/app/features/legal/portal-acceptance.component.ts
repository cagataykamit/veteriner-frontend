import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { PortalSessionService } from '@portal/app/core/auth/portal-session.service';
import { PORTAL_ERROR_CODES, portalErrorMessage, portalProblemCode } from '@portal/app/core/errors/portal-errors';
import { PortalBrandHeader, PortalFooter } from '@portal/app/layout/portal-brand.component';
import { PortalErrorState, PortalLoadingState } from '@portal/app/shared/ui/portal-states.component';
import { PortalLegalConsent } from './portal-legal-consent.component';
import { isAcceptanceComplete, PortalAcceptanceStatus, PortalClinicDisclosure, PortalLegalApi } from './portal-legal.api';

type AcceptanceStep = 'loading' | 'error' | 'documents' | 'disclosure';

/**
 * Engelleyici kabul adımları (ADR-031 K4): önce portal belgeleri (sürümlü kabul, ADR-029), sonra her aktif bağ için
 * kliniğin aydınlatma metni (bilgilendirme onayı; açık rıza değildir). İkisi boşalınca portal açılır. Kapatma/atlama
 * yoktur; yalnız çıkış yapılabilir.
 */
@Component({
    selector: 'portal-acceptance',
    standalone: true,
    imports: [ButtonModule, MessageModule, PortalBrandHeader, PortalFooter, PortalLegalConsent, PortalLoadingState, PortalErrorState],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './portal-acceptance.component.html'
})
export class PortalAcceptanceComponent implements OnInit {
    private readonly legalApi = inject(PortalLegalApi);
    private readonly session = inject(PortalSessionService);
    private readonly router = inject(Router);

    readonly step = signal<AcceptanceStep>('loading');
    readonly status = signal<PortalAcceptanceStatus | null>(null);
    readonly disclosure = signal<PortalClinicDisclosure | null>(null);
    readonly loadError = signal('');
    readonly actionError = signal<string | null>(null);
    readonly busy = signal(false);
    readonly submitted = signal(false);

    readonly consent = new FormControl(false, { nonNullable: true, validators: Validators.requiredTrue });

    readonly pendingDocuments = computed(() => this.status()?.pendingDocuments ?? []);
    /** "2 / 3" gibi ilerleme metni için kalan aydınlatma sayısı. */
    readonly remainingDisclosures = computed(() => this.status()?.pendingClinicDisclosures.length ?? 0);

    ngOnInit(): void {
        this.reload();
    }

    reload(): void {
        this.step.set('loading');
        this.actionError.set(null);
        this.legalApi.myAcceptances().subscribe({
            next: (status) => this.apply(status),
            error: (err: unknown) => this.fail(err)
        });
    }

    acceptDocuments(): void {
        this.submitted.set(true);

        if (this.consent.invalid || this.busy()) {
            return;
        }

        this.busy.set(true);
        this.actionError.set(null);
        this.legalApi.accept(this.pendingDocuments()).subscribe({
            next: (status) => {
                this.busy.set(false);
                this.apply(status);
            },
            error: (err: unknown) => {
                this.busy.set(false);
                this.actionError.set(portalErrorMessage(err));

                if (portalProblemCode(err) === PORTAL_ERROR_CODES.legalVersionOutdated) {
                    this.reload();
                }
            }
        });
    }

    acknowledgeDisclosure(): void {
        const disclosure = this.disclosure();

        if (!disclosure || this.busy()) {
            return;
        }

        this.busy.set(true);
        this.actionError.set(null);
        this.legalApi.acknowledgeClinicDisclosure(disclosure.linkId).subscribe({
            next: () => {
                this.busy.set(false);
                this.reload();
            },
            error: (err: unknown) => {
                this.busy.set(false);
                this.actionError.set(portalErrorMessage(err));
            }
        });
    }

    logout(): void {
        this.session.logout().subscribe(() => void this.router.navigateByUrl('/login'));
    }

    private apply(status: PortalAcceptanceStatus): void {
        this.status.set(status);

        if (isAcceptanceComplete(status)) {
            this.session.markAcceptanceCleared();
            void this.router.navigateByUrl('/', { replaceUrl: true });

            return;
        }

        if (status.requiresAcceptance || status.pendingDocuments.length > 0) {
            this.consent.reset(false);
            this.submitted.set(false);
            this.step.set('documents');

            return;
        }

        const next = status.pendingClinicDisclosures[0];

        this.step.set('loading');
        this.legalApi.clinicDisclosure(next.linkId).subscribe({
            next: (disclosure) => {
                this.disclosure.set(disclosure);
                this.step.set('disclosure');
            },
            error: (err: unknown) => this.fail(err)
        });
    }

    private fail(err: unknown): void {
        this.loadError.set(portalErrorMessage(err));
        this.step.set('error');
    }
}
