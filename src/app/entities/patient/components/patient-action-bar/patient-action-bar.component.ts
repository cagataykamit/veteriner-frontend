import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '@/app/core/auth/auth.service';
import { VisitArrivalDialogComponent } from '@/app/entities/visit/components/visit-arrival-dialog.component';
import type { PetSuggestion } from '@/app/entities/visit/models/visit-vm.model';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { buildPatientActions } from './patient-actions.utils';

/**
 * Hayvan ve müşteri detayında "şimdi ne yapılır" eylem çubuğu. Eylemler yetki claim'ine göre görünür;
 * her biri müşteri ve hayvan bağlamını sorgu parametresiyle hedef forma taşır (forma önceden doldurulur).
 * Salt okunur kiracıda düğmeler kilitli (devre dışı) kalır ve yanında kısa bilgi yazılır; şerit kart çerçevesi taşımaz.
 */
@Component({
    selector: 'app-patient-action-bar',
    standalone: true,
    imports: [CommonModule, RouterLink, ButtonModule, VisitArrivalDialogComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (actions().length > 0) {
            <!-- Telefonda da satır kırar (MOBILE-004: yatay kaydırma yok); yapışkan şerit yalnız geniş ekranda. -->
            <div class="mb-4 py-2 flex flex-wrap gap-2 items-center" [class]="sticky() ? 'sm:sticky top-16 z-10 bg-[var(--surface-ground)]' : ''" role="toolbar" aria-label="Hızlı eylemler" data-testid="patient-action-bar">
                @for (action of actions(); track action.key; let first = $first) {
                    @if (ro.mutationBlocked()) {
                        <button pButton type="button" [disabled]="true" class="shrink-0" [class]="first ? 'p-button-primary' : 'p-button-outlined p-button-secondary'"><i class="pi pi-lock"></i>{{ action.label }}</button>
                    } @else if (action.route) {
                        <a [routerLink]="action.route" [queryParams]="action.queryParams" pButton type="button" class="shrink-0" [class]="first ? 'p-button-primary' : 'p-button-outlined p-button-secondary'"><i [class]="action.icon"></i>{{ action.label }}</a>
                    } @else {
                        <button pButton type="button" class="shrink-0" [class]="first ? 'p-button-primary' : 'p-button-outlined p-button-secondary'" (click)="arrivalOpen.set(true)"><i [class]="action.icon"></i>{{ action.label }}</button>
                    }
                }
                @if (ro.mutationBlocked()) {
                    <span class="text-amber-700 dark:text-amber-300 text-sm shrink-0" role="status">İşletme salt okunur moddadır; eylemler kapalı.</span>
                }
            </div>
            @if (canArrive()) {
                <app-visit-arrival-dialog [(visible)]="arrivalOpen" [presetPet]="petSuggestion()" (arrived)="onArrived()" />
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
    /** Müşteri sayfasında "Geldi" için önceden seçilecek hasta (müşterinin tek hayvanı varsa); `null` ise hasta diyalogda aranır. */
    readonly arrivalPet = input<PetSuggestion | null>(null);
    /** Hayvan sayfasında: vefat eden hayvanda Geldi, Muayene başlat ve Randevu al gösterilmez. */
    readonly petDeceased = input(false);

    readonly arrivalOpen = signal(false);

    readonly actions = computed(() => buildPatientActions({ clientId: this.clientId(), petId: this.petId(), petDeceased: this.petDeceased() }, (claim) => this.auth.hasOperationClaim(claim)));

    readonly canArrive = computed(() => this.actions().some((a) => a.key === 'arrive'));

    readonly petSuggestion = computed<PetSuggestion | null>(() => {
        const id = this.petId();

        return id ? { id, label: `${this.petLabel()} · Sahip: ${this.clientName() || '—'}`, clientId: this.clientId(), clientName: this.clientName() } : this.arrivalPet();
    });

    onArrived(): void {
        void this.router.navigate(['/panel/today']);
    }
}
