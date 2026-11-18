import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import type { EDocumentSource } from '@/app/entities/e-document/models/e-document.model';
import { EDocumentsService } from '@/app/entities/e-document/services/e-documents.service';
import { eDocumentReturnLabel } from '@/app/entities/e-document/utils/e-document-labels';
import { E_DOCUMENT_RETURN_PARAM, eDocumentResumeUrl, isEDocumentReturnUrl, readEDocumentResume } from '@/app/entities/e-document/utils/e-document-resume';

/** Sağlayıcı onayından dönüş adresinin işareti (backend `EDocumentOAuthCallbackController`). */
const E_DOCUMENT_OAUTH_RETURN_PARAM = 'eDocumentConnection';

/**
 * Ayar sayfasının üst şeridi: "Belge kes" penceresinden eksik ayar için gelindiyse belgenin açıldığı sayfaya dönüş yolu. Eksik
 * kalmayınca (önizleme yeniden sorulur) dönüş birincil olur ve pencere aynı seçimle yeniden açılır. Sayfa ayar kaydedilince
 * `recheck()` çağırır.
 */
@Component({
    selector: 'app-e-document-return-banner',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ButtonModule],
    template: `
        @if (returnTo(); as url) {
            <div class="edoc-return mb-4" role="region" aria-label="Belgeye dönüş" data-testid="e-document-return-banner">
                <i class="pi pi-reply edoc-return__icon" aria-hidden="true"></i>
                <span class="text-sm">Belge kesmek için buraya geldiniz. Kaydettikten sonra seçtiğiniz ücretlere dönüp belgeyi kesebilirsiniz.</span>
                <button pButton type="button" size="small" class="shrink-0 sm:ml-auto" [severity]="ready() ? 'primary' : 'secondary'" [outlined]="!ready()" (click)="back(url)" data-testid="e-document-return">
                    <i class="p-button-icon pi pi-arrow-left"></i>{{ ready() ? label() + ' ve belgeyi kes' : label() }}
                </button>
            </div>
        }
    `,
    styles: `
        .edoc-return {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 0.75rem;
            padding: 0.625rem 0.875rem;
            border-radius: var(--p-border-radius-lg, 10px);
            background: color-mix(in srgb, var(--p-primary-color) 8%, transparent);
            border: 1px solid color-mix(in srgb, var(--p-primary-color) 35%, transparent);
        }
        .edoc-return__icon {
            color: var(--p-primary-color);
        }
    `
})
export class EDocumentReturnBannerComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly service = inject(EDocumentsService);

    readonly returnTo = signal<string | null>(null);
    /** Eksik ayar kalmadı: dönüşte belge kesilebilir. */
    readonly ready = signal(false);
    readonly label = computed(() => eDocumentReturnLabel(this.returnTo() ?? ''));

    /** Saklanan seçim (yalnız bu dönüşe aitse); yoksa yalnız adrese dönülür. */
    private source: EDocumentSource | null = null;

    ngOnInit(): void {
        const query = this.route.snapshot.queryParamMap;
        const param = query.get(E_DOCUMENT_RETURN_PARAM);
        const resume = readEDocumentResume();
        // Entegratör onayından dönüşte (sağlayıcı sayfası) sorgu parametresi kaybolur; dönüş adresi saklanandan gelir.
        const returnTo = isEDocumentReturnUrl(param) ? param : query.has(E_DOCUMENT_OAUTH_RETURN_PARAM) ? (resume?.returnTo ?? null) : null;

        this.source = resume && resume.returnTo === returnTo ? resume.source : null;
        this.returnTo.set(returnTo);
        this.recheck();
    }

    recheck(): void {
        if (!this.returnTo() || !this.source) {
            return;
        }

        this.service.preview(this.source).subscribe({
            next: (p) => this.ready.set(p.clinicSetupIssues.length === 0),
            error: () => this.ready.set(false)
        });
    }

    back(returnTo: string): void {
        void this.router.navigateByUrl(this.source ? eDocumentResumeUrl(this.router, returnTo) : returnTo);
    }
}
