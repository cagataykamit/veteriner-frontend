import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Navigation, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import type { ClinicSummary } from '@/app/core/auth/auth.models';
import { AuthService } from '@/app/core/auth/auth.service';
import { AUTH_NO_ACCESSIBLE_CLINICS_MESSAGE, authFailureMessage } from '@/app/core/auth/auth-error.utils';
import { DEFAULT_PANEL_AFTER_AUTH, panelReturnUrlOrDefault } from '@/app/core/auth/auth-return-url.utils';
import { PublicAuthShellComponent } from '@/app/pages/public/components/public-auth-shell.component';

@Component({
    selector: 'app-select-clinic-page',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, SelectModule, PublicAuthShellComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <app-public-auth-shell>
            <div class="public-auth-header">
                <h1 class="public-auth-title">Klinik seçimi</h1>
                <p class="public-auth-subtitle">Devam etmek için çalışacağınız kliniği seçin.</p>
            </div>

            @if (loading()) {
                <p class="m-0 text-center text-muted-color">Klinikler yükleniyor…</p>
            } @else if (clinics().length === 0) {
                <p class="m-0 text-center text-danger">{{ noClinicsMessage }}</p>
            } @else {
                <div class="public-auth-form">
                    <div class="public-auth-field-before-action">
                        <label for="clinicSelect" class="public-auth-label">Aktif klinik</label>
                        <p-select
                            inputId="clinicSelect"
                            [options]="clinics()"
                            [(ngModel)]="selectedClinicId"
                            optionLabel="name"
                            optionValue="id"
                            placeholder="Klinik seçin"
                            [showClear]="false"
                            class="w-full"
                            [fluid]="true"
                            [disabled]="submitting()"
                        />
                    </div>
                    <button pButton type="button" class="w-full public-auth-submit" [disabled]="!selectedClinicId || submitting()" (click)="onContinue()"><i class="p-button-icon" [class]="submitting() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>Devam et</button>
                </div>
            }

            @if (error()) {
                <p class="mt-4 mb-0 text-center text-danger" role="alert">{{ error() }}</p>
            }
        </app-public-auth-shell>
    `
})
export class SelectClinicPage implements OnInit {
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    /**
     * Login çoklu klinik dalında `navigate(..., { state: { clinics } })` ile taşınır;
     * geçerliyse `/me/clinics` ikinci kez çağrılmaz.
     */
    private readonly clinicsFromLogin = clinicsFromNavigationState(this.router.getCurrentNavigation());

    readonly noClinicsMessage = AUTH_NO_ACCESSIBLE_CLINICS_MESSAGE;

    readonly loading = signal(true);
    readonly submitting = signal(false);
    readonly error = signal<string | null>(null);
    readonly clinics = signal<ClinicSummary[]>([]);
    selectedClinicId: string | null = null;

    ngOnInit(): void {
        this.loadClinicsAndBranch();
    }

    onContinue(): void {
        const clinicId = this.selectedClinicId?.trim() ?? '';

        if (!clinicId) {
            return;
        }

        const selected = this.clinics().find((x) => x.id === clinicId) ?? null;

        if (!selected) {
            this.error.set('Seçilen klinik artık listede yok veya pasif. Lütfen sayfayı yenileyin veya listeden tekrar seçin.');

            return;
        }

        this.submitting.set(true);
        this.error.set(null);
        this.auth
            .selectClinic(clinicId, selected.name)
            .pipe(finalize(() => this.submitting.set(false)))
            .subscribe({
                next: () => {
                    const inviteToken = this.inviteTokenQuery();

                    if (inviteToken) {
                        void this.router.navigate(['/join', inviteToken]);

                        return;
                    }

                    void this.router.navigateByUrl(this.safeReturnUrl());
                },
                error: (e: unknown) => {
                    this.error.set(this.resolveError(e, 'Klinik seçimi yapılamadı.'));
                }
            });
    }

    private loadClinicsAndBranch(): void {
        const fromLogin = this.clinicsFromLogin;

        if (fromLogin) {
            this.error.set(null);
            this.applyClinicsList(fromLogin);

            return;
        }

        this.loading.set(true);
        this.error.set(null);
        this.auth
            .getMyClinics()
            .pipe(finalize(() => this.loading.set(false)))
            .subscribe({
                next: (items) => {
                    this.applyClinicsList(items);
                },
                error: (e: unknown) => {
                    this.error.set(this.resolveError(e, 'Klinikler yüklenemedi.'));
                }
            });
    }

    private applyClinicsList(items: ClinicSummary[]): void {
        const selectable = filterClinicsForSelection(items);

        this.clinics.set(selectable);
        this.loading.set(false);
        const decision = this.auth.resolveClinicDecision(selectable);

        if (decision.kind === 'none') {
            if (this.auth.isPlatformAdmin()) {
                this.auth.startPlatformOnlySession();
                void this.router.navigateByUrl(DEFAULT_PANEL_AFTER_AUTH);

                return;
            }

            this.error.set(AUTH_NO_ACCESSIBLE_CLINICS_MESSAGE);

            return;
        }

        if (decision.kind === 'single') {
            this.selectedClinicId = decision.clinic.id;
            this.onContinue();

            return;
        }

        this.selectedClinicId = selectable[0]?.id ?? null;
    }

    private safeReturnUrl(): string {
        return panelReturnUrlOrDefault(this.route.snapshot.queryParamMap.get('returnUrl'));
    }

    /** Davet akışı: `inviteToken` varken panel `returnUrl` kullanılmaz. */
    private inviteTokenQuery(): string {
        return this.route.snapshot.queryParamMap.get('inviteToken')?.trim() ?? '';
    }

    private resolveError(e: unknown, fallback: string): string {
        if (e instanceof HttpErrorResponse) {
            return authFailureMessage(e, fallback);
        }

        return e instanceof Error ? e.message : fallback;
    }
}

function clinicsFromNavigationState(nav: Navigation | null): ClinicSummary[] | null {
    const raw = nav?.extras?.state?.['clinics'];

    if (!Array.isArray(raw) || raw.length === 0) {
        return null;
    }

    const out: ClinicSummary[] = [];

    for (const item of raw) {
        if (!item || typeof item !== 'object') {
            return null;
        }

        const o = item as Record<string, unknown>;
        const id = o['id'];
        const name = o['name'];

        if (typeof id !== 'string' || typeof name !== 'string' || !id.trim() || !name.trim()) {
            return null;
        }

        const row: ClinicSummary = { id: id.trim(), name: name.trim() };
        const active = readClinicIsActiveFromState(o);

        if (active !== null) {
            row.isActive = active;
        }

        out.push(row);
    }

    return filterClinicsForSelection(out);
}

function readClinicIsActiveFromState(o: Record<string, unknown>): boolean | null {
    for (const k of ['isActive', 'IsActive', 'active', 'Active']) {
        const v = o[k];

        if (typeof v === 'boolean') {
            return v;
        }

        if (typeof v === 'string') {
            const t = v.trim().toLowerCase();

            if (t === 'true' || t === '1') {
                return true;
            }

            if (t === 'false' || t === '0') {
                return false;
            }
        }
    }

    return null;
}

/** Yanıtta `isActive` yoksa tüm kayıtlar kalır; `false` olanlar seçimde gösterilmez. */
function filterClinicsForSelection(list: ClinicSummary[]): ClinicSummary[] {
    return list.filter((c) => c.isActive !== false);
}
