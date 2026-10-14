import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '@/app/core/auth/auth.service';
import { VisitArrivalDialogComponent } from '@/app/features/visits/components/visit-arrival-dialog.component';
import type { PetSuggestion } from '@/app/features/visits/models/visit-vm.model';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { buildPatientActions } from './patient-actions.utils';

/**
 * Hayvan ve müşteri detayında "şimdi ne yapılır" eylem çubuğu. Eylemler yetki claim'ine göre görünür;
 * her biri müşteri ve hayvan bağlamını sorgu parametresiyle hedef forma taşır (forma önceden doldurulur).
 */
@Component({
    selector: 'app-patient-action-bar',
    standalone: true,
    imports: [CommonModule, RouterLink, ButtonModule, VisitArrivalDialogComponent],
    template: `
        @if (actions().length > 0) {
            <div
                class="card mb-4 flex flex-wrap gap-2 items-center"
                [class]="sticky() ? 'sticky top-16 z-10 !py-3 shadow-sm' : ''"
                role="toolbar"
                aria-label="Hızlı eylemler"
                data-testid="patient-action-bar"
            >
                @if (ro.mutationBlocked()) {
                    <span class="text-amber-700 dark:text-amber-300 text-sm" role="status">İşletme salt okunur moddadır; eylemler kapalı.</span>
                } @else {
                    @for (action of actions(); track action.key; let first = $first) {
                        @if (action.route) {
                            <a
                                [routerLink]="action.route"
                                [queryParams]="action.queryParams"
                                pButton
                                type="button"
                                [label]="action.label"
                                [icon]="action.icon"
                                [class]="first ? 'p-button-primary' : 'p-button-outlined p-button-secondary'"
                            ></a>
                        } @else {
                            <button
                                pButton
                                type="button"
                                [label]="action.label"
                                [icon]="action.icon"
                                [class]="first ? 'p-button-primary' : 'p-button-outlined p-button-secondary'"
                                (click)="arrivalOpen.set(true)"
                            ></button>
                        }
                    }
                }
            </div>
            @if (petSuggestion(); as pet) {
                <app-visit-arrival-dialog [(visible)]="arrivalOpen" [presetPet]="pet" (arrived)="onArrived()" />
            }
        }
    `
})
export class PatientActionBarComponent {
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly clientId = input.required<string>();
    /** Müşteri sayfasında verilmez. */
    readonly petId = input<string | null>(null);
    /** "Geldi" diyaloğunda önceden seçilecek hasta etiketi ve sahip adı (hayvan sayfasında). */
    readonly petLabel = input<string>('');
    readonly clientName = input<string>('');
    /** Kaydırınca üst çubuğun altında sabit kalır (hasta kartı: eylemler her zaman görünür, ADR-020 karar 2b). */
    readonly sticky = input(false);

    readonly arrivalOpen = signal(false);

    readonly actions = computed(() =>
        buildPatientActions({ clientId: this.clientId(), petId: this.petId() }, (claim) => this.auth.hasOperationClaim(claim))
    );

    readonly petSuggestion = computed<PetSuggestion | null>(() => {
        const id = this.petId();
        return id && this.actions().some((a) => a.key === 'arrive')
            ? { id, label: `${this.petLabel()} · Sahip: ${this.clientName() || '—'}`, clientId: this.clientId(), clientName: this.clientName() }
            : null;
    });

    onArrived(): void {
        void this.router.navigate(['/panel/today']);
    }
}
