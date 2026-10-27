import { Component, computed, DestroyRef, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { AuthService } from '@/app/core/auth/auth.service';
import { LegalConsentCheckboxComponent } from '@/app/features/legal-acceptance/components/legal-consent-checkbox.component';
import type { LegalDocumentVersionDto } from '@/app/features/legal-acceptance/models/legal-acceptance.model';
import { LegalAcceptanceService } from '@/app/features/legal-acceptance/services/legal-acceptance.service';
import { isLegalVersionOutdatedError, LEGAL_ACCEPTANCE_CODE_MESSAGES, LEGAL_VERSION_OUTDATED_CODE } from '@/app/entities/legal-document/utils/legal-acceptance-error.utils';
import { LEGAL_DOCUMENTS_BY_TYPE, isDraftLegalVersion } from '@/app/entities/legal-document/utils/legal-documents.utils';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

/**
 * Panel açılırken bekleyen hukuki kabul varsa paneli engelleyen pencere (ADR-029 madde 5–6). Kabul edilene kadar kapanmaz;
 * tek çıkış yolu oturumu kapatmaktır. Durum okunamazsa panel engellenmez (kayıt akışı sunucuda zaten doğrulanır).
 */
@Component({
    selector: 'app-legal-acceptance-gate',
    standalone: true,
    imports: [DialogModule, ButtonModule, LegalConsentCheckboxComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <p-dialog
            header="Hukuki metinler güncellendi"
            [visible]="pending().length > 0"
            [modal]="true"
            [closable]="false"
            [closeOnEscape]="false"
            [dismissableMask]="false"
            [draggable]="false"
            [resizable]="false"
            [style]="{ width: 'min(560px, 95vw)' }"
            styleClass="legal-acceptance-gate"
        >
            <p class="mt-0 mb-3 text-sm text-surface-700 dark:text-surface-200">Vetinity'yi kullanmaya devam etmek için aşağıdaki metinlerin güncel sürümünü onaylamanız gerekiyor.</p>
            <ul class="legal-acceptance-gate-documents m-0 mb-4 pl-5 text-sm leading-6">
                @for (item of documents(); track item.documentType) {
                    <li>
                        <a [href]="item.path" target="_blank" rel="noopener" class="public-brand-link">{{ item.title }}</a>
                        <span class="text-muted-color"> · Sürüm {{ item.version }}{{ item.draft ? ' (taslak)' : '' }}</span>
                    </li>
                }
            </ul>
            <app-legal-consent-checkbox inputId="legalGateConsent" [documents]="documentTypes()" [disabled]="submitting()" [(checked)]="consent" />
            @if (error(); as e) {
                <p class="legal-acceptance-gate-error text-red-500 text-sm mt-3 mb-0" role="alert">{{ e }}</p>
            }
            <ng-template #footer>
                <button pButton type="button" severity="secondary" [text]="true" [disabled]="submitting()" (click)="logout()"><i class="p-button-icon pi pi-sign-out"></i>Çıkış yap</button>
                <button pButton type="button" [disabled]="!consent() || submitting()" (click)="accept()"><i class="p-button-icon" [class]="submitting() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>Kabul et ve devam et</button>
            </ng-template>
        </p-dialog>
    `
})
export class LegalAcceptanceGateComponent implements OnInit {
    private readonly legal = inject(LegalAcceptanceService);
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);

    readonly pending = signal<LegalDocumentVersionDto[]>([]);
    readonly consent = signal(false);
    readonly submitting = signal(false);
    readonly error = signal<string | null>(null);

    readonly documentTypes = computed(() => this.pending().map((d) => d.documentType));
    readonly documents = computed(() =>
        this.pending().map((d) => {
            const doc = LEGAL_DOCUMENTS_BY_TYPE[d.documentType];

            return { documentType: d.documentType, title: doc.shortTitle, path: doc.path, version: d.version, draft: isDraftLegalVersion(d.version) };
        })
    );

    ngOnInit(): void {
        this.loadStatus();
    }

    accept(): void {
        const documents = this.pending();

        if (!this.consent() || this.submitting() || documents.length === 0) {
            return;
        }

        this.error.set(null);
        this.submitting.set(true);
        this.legal
            .accept(documents)
            .pipe(
                finalize(() => this.submitting.set(false)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: (status) => this.applyPending(status.pendingDocuments ?? []),
                error: (err: unknown) => {
                    if (isLegalVersionOutdatedError(err)) {
                        this.error.set(LEGAL_ACCEPTANCE_CODE_MESSAGES[LEGAL_VERSION_OUTDATED_CODE]);
                        this.loadStatus();

                        return;
                    }

                    this.error.set(err instanceof HttpErrorResponse ? messageFromHttpError(err, 'Onay kaydedilemedi.') : 'Onay kaydedilemedi.');
                }
            });
    }

    logout(): void {
        this.auth
            .logoutCurrentSession()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => void this.router.navigate(['/auth/login'], { replaceUrl: true }),
                error: () => {
                    this.auth.logout();
                    void this.router.navigate(['/auth/login'], { replaceUrl: true });
                }
            });
    }

    private loadStatus(): void {
        this.legal
            .getMyStatus()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (status) => this.applyPending(status.requiresAcceptance ? (status.pendingDocuments ?? []) : []),
                error: () => undefined
            });
    }

    private applyPending(documents: LegalDocumentVersionDto[]): void {
        const changed =
            documents.map((d) => `${d.documentType}:${d.version}`).join('|') !==
            this.pending()
                .map((d) => `${d.documentType}:${d.version}`)
                .join('|');

        if (changed) {
            this.consent.set(false);
        }

        this.pending.set(documents);
    }
}
