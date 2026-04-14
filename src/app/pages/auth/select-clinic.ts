import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Navigation, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { AppFloatingConfigurator } from '@/app/layout/component/app.floatingconfigurator';
import type { ClinicSummary } from '@/app/core/auth/auth.models';
import { AuthService } from '@/app/core/auth/auth.service';
import { AUTH_NO_ACCESSIBLE_CLINICS_MESSAGE, authFailureMessage } from '@/app/core/auth/auth-error.utils';
import { panelReturnUrlOrDefault } from '@/app/core/auth/auth-return-url.utils';

@Component({
    selector: 'app-select-clinic-page',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, SelectModule, AppFloatingConfigurator],
    template: `
        <app-floating-configurator />
        <div class="bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen min-w-screen overflow-hidden">
            <div class="w-full max-w-xl px-4">
                <div class="card">
                    <h2 class="mt-0 mb-2 text-2xl">Klinik Seçimi</h2>
                    <p class="mt-0 mb-4 text-muted-color">Devam etmek için aktif kliniği seçin.</p>

                    @if (loading()) {
                        <p class="m-0 text-muted-color">Klinikler yükleniyor…</p>
                    } @else if (clinics().length === 0) {
                        <p class="m-0 text-red-500">{{ noClinicsMessage }}</p>
                    } @else {
                        <label for="clinicSelect" class="block text-sm font-medium text-muted-color mb-2">Aktif klinik</label>
                        <p-select
                            inputId="clinicSelect"
                            [options]="clinics()"
                            [(ngModel)]="selectedClinicId"
                            optionLabel="name"
                            optionValue="id"
                            placeholder="Klinik seçin"
                            [showClear]="false"
                            styleClass="w-full"
                            [disabled]="submitting()"
                        />
                        <div class="flex gap-2 mt-4">
                            <p-button
                                type="button"
                                label="Devam et"
                                icon="pi pi-check"
                                [disabled]="!selectedClinicId || submitting()"
                                [loading]="submitting()"
                                (onClick)="onContinue()"
                            />
                        </div>
                    }

                    @if (error()) {
                        <p class="mt-4 mb-0 text-red-500" role="alert">{{ error() }}</p>
                    }
                </div>
            </div>
        </div>
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
        this.submitting.set(true);
        this.error.set(null);
        this.auth
            .selectClinic(clinicId, selected?.name ?? null)
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
        this.clinics.set(items);
        this.loading.set(false);
        const decision = this.auth.resolveClinicDecision(items);
        if (decision.kind === 'none') {
            this.error.set(AUTH_NO_ACCESSIBLE_CLINICS_MESSAGE);
            return;
        }
        if (decision.kind === 'single') {
            this.selectedClinicId = decision.clinic.id;
            this.onContinue();
            return;
        }
        this.selectedClinicId = items[0]?.id ?? null;
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
        out.push({ id: id.trim(), name: name.trim() });
    }
    return out;
}

