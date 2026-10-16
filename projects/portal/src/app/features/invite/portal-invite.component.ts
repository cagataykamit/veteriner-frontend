import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { switchMap } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PortalSessionService } from '@portal/app/core/auth/portal-session.service';
import { PORTAL_ERROR_CODES, PORTAL_ERROR_MESSAGES, portalErrorMessage, portalProblemCode } from '@portal/app/core/errors/portal-errors';
import { PortalBrandHeader, PortalFooter } from '@portal/app/layout/portal-brand.component';
import { PortalLegalConsent } from '@portal/app/features/legal/portal-legal-consent.component';
import { formatPortalDate } from '@portal/app/shared/format/portal-date';
import { PortalErrorState, PortalLoadingState } from '@portal/app/shared/ui/portal-states.component';
import {
    PORTAL_DISPLAY_NAME_MAX_LENGTH,
    PORTAL_PASSWORD_HINT,
    PORTAL_PASSWORD_MISMATCH_MESSAGE,
    portalFieldError,
    portalPasswordsMatch,
    portalStrongPasswordValidator
} from '@portal/app/shared/validation/portal-form-rules';
import { PortalAcceptInviteRequest, PortalInviteApi, PortalInvitePreview } from './portal-invite.api';

type InviteState = 'loading' | 'invalid' | 'error' | 'ready';
type SignInMethod = 'code' | 'password';

/** Davet kabulünde parola/ad doğrulama hatası (400) için bağlam metni. */
const INVITE_ERROR_OVERRIDES = {
    [PORTAL_ERROR_CODES.validation]: 'Bilgiler kabul edilmedi: parola kurallara uymuyor ya da ad çok uzun.'
};

/**
 * Davet bağlantısı (`/invite?token=…`, sözleşme §5.2–5.3): önizleme → hesap oluşturma/bağlama + portal belgelerinin
 * engelleyici kabulü. E-posta doğrulaması davet bağlantısının kendisidir (ayrı kod istenmez). Başarıda oturum açılır;
 * klinik aydınlatma metni onayı kabul adımında (`/accept`) istenir.
 */
@Component({
    selector: 'portal-invite',
    standalone: true,
    imports: [ReactiveFormsModule, RouterLink, ButtonModule, InputTextModule, MessageModule, PortalBrandHeader, PortalFooter, PortalLegalConsent, PortalLoadingState, PortalErrorState],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './portal-invite.component.html'
})
export class PortalInviteComponent implements OnInit {
    private readonly inviteApi = inject(PortalInviteApi);
    private readonly session = inject(PortalSessionService);
    private readonly router = inject(Router);

    /** `?token=` (component input binding). Konsola/loga yazılmaz. */
    readonly token = input<string | undefined>();

    readonly state = signal<InviteState>('loading');
    readonly preview = signal<PortalInvitePreview | null>(null);
    readonly loadError = signal<string>('');
    readonly submitError = signal<string | null>(null);
    readonly submitting = signal(false);
    readonly submitted = signal(false);

    readonly invalidMessage = PORTAL_ERROR_MESSAGES[PORTAL_ERROR_CODES.inviteNotFound];
    readonly passwordHint = PORTAL_PASSWORD_HINT;
    readonly mismatchMessage = PORTAL_PASSWORD_MISMATCH_MESSAGE;
    readonly displayNameMax = PORTAL_DISPLAY_NAME_MAX_LENGTH;

    readonly expiresText = computed(() => formatPortalDate(this.preview()?.expiresAtUtc));
    readonly requiredDocuments = computed(() => this.preview()?.requiredLegalDocuments ?? []);

    readonly form = new FormGroup(
        {
            displayName: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(PORTAL_DISPLAY_NAME_MAX_LENGTH)] }),
            method: new FormControl<SignInMethod>('code', { nonNullable: true }),
            password: new FormControl('', { nonNullable: true }),
            confirmPassword: new FormControl('', { nonNullable: true }),
            legalAccepted: new FormControl(false, { nonNullable: true })
        },
        { validators: portalPasswordsMatch('password', 'confirmPassword') }
    );

    ngOnInit(): void {
        this.form.controls.method.valueChanges.subscribe((method) => this.applyMethod(method));
        this.load();
    }

    load(): void {
        const token = this.token()?.trim();

        if (!token) {
            this.state.set('invalid');

            return;
        }

        this.state.set('loading');
        this.inviteApi.preview(token).subscribe({
            next: (preview) => {
                this.preview.set(preview);
                this.form.controls.legalAccepted.setValidators(preview.requiredLegalDocuments.length > 0 ? Validators.requiredTrue : null);
                this.form.controls.legalAccepted.updateValueAndValidity();
                this.state.set('ready');
            },
            error: (err: unknown) => {
                if (err instanceof HttpErrorResponse && err.status === 404) {
                    this.state.set('invalid');

                    return;
                }

                this.loadError.set(portalErrorMessage(err));
                this.state.set('error');
            }
        });
    }

    fieldError(name: 'displayName' | 'password'): string | null {
        const control = this.form.controls[name];

        if (!this.submitted() && !control.touched) {
            return null;
        }

        return portalFieldError(control.errors, name);
    }

    showMismatch(): boolean {
        return (this.submitted() || this.form.controls.confirmPassword.touched) && this.form.hasError('passwordMismatch');
    }

    showLegalError(): boolean {
        return this.submitted() && this.form.controls.legalAccepted.invalid;
    }

    submit(): void {
        this.submitted.set(true);
        this.submitError.set(null);
        const token = this.token()?.trim();
        const preview = this.preview();

        if (!token || !preview || this.form.invalid || this.submitting()) {
            this.form.markAllAsTouched();

            return;
        }

        this.submitting.set(true);
        this.inviteApi
            .accept(token, this.buildRequest(preview))
            .pipe(switchMap((res) => {
                this.session.selectLink(res.linkId);

                return this.session.startSession(res);
            }))
            .subscribe({
                // Adres çubuğundan davet anahtarı kalkar; kabul adımları guard ile istenir.
                next: () => void this.router.navigateByUrl('/', { replaceUrl: true }),
                error: (err: unknown) => {
                    this.submitting.set(false);

                    if (portalProblemCode(err) === PORTAL_ERROR_CODES.legalVersionOutdated) {
                        this.form.controls.legalAccepted.setValue(false);
                        this.load();
                    }

                    this.submitError.set(portalErrorMessage(err, INVITE_ERROR_OVERRIDES));
                }
            });
    }

    private buildRequest(preview: PortalInvitePreview): PortalAcceptInviteRequest {
        const value = this.form.getRawValue();
        const displayName = value.displayName.trim();
        const usePassword = !preview.hasAccount && value.method === 'password';

        return {
            ...(displayName && !preview.hasAccount ? { displayName } : {}),
            ...(usePassword ? { password: value.password } : {}),
            acceptedLegalDocuments: preview.requiredLegalDocuments
        };
    }

    private applyMethod(method: SignInMethod): void {
        const { password, confirmPassword } = this.form.controls;

        password.setValidators(method === 'password' ? [Validators.required, portalStrongPasswordValidator()] : null);
        confirmPassword.setValidators(method === 'password' ? Validators.required : null);

        if (method === 'code') {
            password.reset('');
            confirmPassword.reset('');
        }

        password.updateValueAndValidity();
        confirmPassword.updateValueAndValidity();
    }
}
