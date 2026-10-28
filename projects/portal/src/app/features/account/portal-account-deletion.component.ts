import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PortalSessionService } from '@portal/app/core/auth/portal-session.service';
import { PortalAuthApi } from '@portal/app/core/auth/portal-auth.api';
import { portalErrorMessage } from '@portal/app/core/errors/portal-errors';
import { PortalClinicApi } from '@portal/app/features/clinic/portal-clinic.api';
import { PortalResendTimer } from '@portal/app/features/auth/portal-resend-timer';
import { telHref } from '@portal/app/shared/format/portal-labels';
import { normalizeOneTimeCode, portalFieldError, portalOneTimeCodeValidator } from '@portal/app/shared/validation/portal-form-rules';

type DeletionStep = 'info' | 'confirm';

/** Silme ekranında gösterilen klinik iletişimi; bilgi alınamazsa yalnız ad. */
export interface PortalDeletionClinicContact {
    readonly linkId: string;
    readonly name: string;
    readonly phone: string | null;
    readonly phoneHref: string | null;
    readonly email: string | null;
}

export const DELETION_CODE_SENT_MESSAGE = 'Onay kodu e-posta adresinize gönderildi. Kod 10 dakika geçerlidir.';

/**
 * Hesabı sil (sözleşme §5.10, ADR-041): silinecekleri ve kalacakları sayar, bağlı kliniklerin iletişimini gösterir,
 * e-postaya gelen kodla ve son onayla hesabı siler. Başarıda yerel oturum biter ve giriş sayfası silindiğini söyler.
 */
@Component({
    selector: 'portal-account-deletion',
    standalone: true,
    imports: [ReactiveFormsModule, RouterLink, ButtonModule, InputTextModule, MessageModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './portal-account-deletion.component.html'
})
export class PortalAccountDeletionComponent {
    private readonly session = inject(PortalSessionService);
    private readonly authApi = inject(PortalAuthApi);
    private readonly clinicApi = inject(PortalClinicApi);
    private readonly router = inject(Router);

    readonly step = signal<DeletionStep>('info');
    readonly busy = signal(false);
    readonly submitted = signal(false);
    readonly error = signal<string | null>(null);
    readonly clinics = signal<readonly PortalDeletionClinicContact[]>([]);
    readonly resend = new PortalResendTimer(inject(DestroyRef));

    readonly codeSentMessage = DELETION_CODE_SENT_MESSAGE;

    readonly form = new FormGroup({
        code: new FormControl('', { nonNullable: true, validators: [Validators.required, portalOneTimeCodeValidator()] }),
        understood: new FormControl(false, { nonNullable: true, validators: Validators.requiredTrue })
    });

    constructor() {
        const links = this.session.links();

        const nameOnly = (linkId: string, name: string): PortalDeletionClinicContact => ({ linkId, name, phone: null, phoneHref: null, email: null });

        this.clinics.set(links.map((l) => nameOnly(l.linkId, l.clinicName)));

        if (links.length > 0) {
            forkJoin(
                links.map((l) =>
                    this.clinicApi.clinic(l.linkId).pipe(
                        map((c): PortalDeletionClinicContact => ({ linkId: l.linkId, name: c.name, phone: c.phone, phoneHref: telHref(c.phone), email: c.email })),
                        catchError(() => of(nameOnly(l.linkId, l.clinicName)))
                    )
                )
            ).subscribe((contacts) => this.clinics.set(contacts));
        }
    }

    codeError(): string | null {
        const control = this.form.controls.code;

        return this.submitted() || control.touched ? portalFieldError(control.errors, 'code') : null;
    }

    understoodError(): boolean {
        return this.submitted() && this.form.controls.understood.invalid;
    }

    requestCode(): void {
        if (this.busy() || !this.resend.canSend()) {
            return;
        }

        this.busy.set(true);
        this.error.set(null);
        this.authApi.requestDeletionCode().subscribe({
            next: () => {
                this.busy.set(false);
                this.step.set('confirm');
                this.resend.start();
            },
            error: (err: unknown) => {
                this.busy.set(false);
                this.error.set(portalErrorMessage(err));
            }
        });
    }

    deleteAccount(): void {
        this.submitted.set(true);
        this.form.markAllAsTouched();

        if (this.form.invalid || this.busy()) {
            return;
        }

        this.busy.set(true);
        this.error.set(null);
        this.session.deleteAccount(normalizeOneTimeCode(this.form.controls.code.value)).subscribe({
            next: () => void this.router.navigate(['/login'], { queryParams: { reason: 'deleted' }, replaceUrl: true }),
            error: (err: unknown) => {
                this.busy.set(false);
                this.error.set(portalErrorMessage(err));
            }
        });
    }
}
