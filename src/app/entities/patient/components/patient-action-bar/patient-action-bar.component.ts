import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, signal, ChangeDetectionStrategy, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { type Menu, MenuModule } from 'primeng/menu';
import { AuthService } from '@/app/core/auth/auth.service';
import { VISITS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { VisitArrivalDialogComponent } from '@/app/entities/visit/components/visit-arrival-dialog.component';
import type { PetSuggestion } from '@/app/entities/visit/models/visit-vm.model';
import { VisitsService } from '@/app/entities/visit/services/visits.service';
import { petCardEmphasis } from '@/app/entities/patient/utils/pet-card.utils';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { buildPatientActions, groupPatientActions, type PatientAction, type PatientActionGroup, type PatientOpenVisit, primaryPatientActionKey } from './patient-actions.utils';

/**
 * Hayvan ve müşteri detayında "şimdi ne yapılır" eylem çubuğu. Eylemler yetki claim'ine göre görünür;
 * her biri müşteri ve hayvan bağlamını sorgu parametresiyle hedef forma taşır (forma önceden doldurulur).
 * Hasta kartında (M-02 B) eylemler üç grupta: geliş ve randevu · klinik · para. Kullanıcının rolüne ait grup açık düğmelerle,
 * diğerleri grup adlı menüyle; telefonda tek satır (birincil düğme + grup başlıklı "Diğer" menüsü). Müşteri kartında düz şerit.
 * Salt okunur kiracıda düğmeler kilitli (devre dışı) kalır ve yanında kısa bilgi yazılır; şerit kart çerçevesi taşımaz.
 */
@Component({
    selector: 'app-patient-action-bar',
    standalone: true,
    imports: [CommonModule, RouterLink, ButtonModule, MenuModule, VisitArrivalDialogComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (actions().length > 0) {
            <!-- Telefonda da satır kırar (MOBILE-004: yatay kaydırma yok); yapışkan şerit yalnız geniş ekranda. -->
            <div class="mb-4 py-2 flex flex-wrap gap-2 items-center" [class]="sticky() ? 'sm:sticky top-16 z-10 bg-[var(--surface-ground)]' : ''" role="toolbar" aria-label="Hızlı eylemler" data-testid="patient-action-bar">
                @if (petId()) {
                    <!-- Geniş ekran: gruplar ince çizgiyle ayrılır; açık grubun düğmeleri, kapalı grubun adıyla menü. -->
                    <div class="hidden sm:flex flex-wrap items-center gap-2">
                        @for (g of groups(); track g.key; let firstGroup = $first) {
                            @if (!firstGroup) {
                                <span class="w-px h-6 bg-surface-200 dark:bg-surface-700 mx-1" aria-hidden="true"></span>
                            }
                            <div class="flex flex-wrap items-center gap-2" role="group" [attr.aria-label]="g.label" [attr.data-testid]="'patient-action-group-' + g.key">
                                @if (g.open) {
                                    @for (action of g.actions; track action.key) {
                                        <ng-container *ngTemplateOutlet="actionButton; context: { $implicit: action, primary: action.key === primary()?.key, grow: false }" />
                                    }
                                } @else {
                                    <button
                                        pButton
                                        type="button"
                                        class="p-button-outlined p-button-secondary shrink-0"
                                        aria-haspopup="true"
                                        [disabled]="ro.mutationBlocked()"
                                        (click)="openMenu($event, groupMenuItems(g))"
                                        [attr.data-testid]="'patient-action-menu-' + g.key"
                                    >
                                        {{ g.label }}<i class="pi pi-chevron-down !text-xs" aria-hidden="true"></i>
                                    </button>
                                }
                            </div>
                        }
                    </div>
                    <!-- Telefon: tek satır; rolün ilk işi birincil, kalan eylemler grup başlıklı menüde. -->
                    <div class="flex sm:hidden w-full items-center gap-2" data-testid="patient-action-phone">
                        @if (primary(); as p) {
                            <ng-container *ngTemplateOutlet="actionButton; context: { $implicit: p, primary: true, grow: true }" />
                        }
                        @if (phoneMenuItems().length > 0) {
                            <button
                                pButton
                                type="button"
                                class="p-button-outlined p-button-secondary shrink-0"
                                [class.flex-1]="!primary()"
                                aria-haspopup="true"
                                [disabled]="ro.mutationBlocked()"
                                (click)="openMenu($event, phoneMenuItems())"
                                data-testid="patient-action-menu-phone"
                            >
                                {{ primary() ? 'Diğer' : 'Eylemler' }}<i class="pi pi-chevron-down !text-xs" aria-hidden="true"></i>
                            </button>
                        }
                    </div>
                } @else {
                    @for (action of actions(); track action.key; let first = $first) {
                        <ng-container *ngTemplateOutlet="actionButton; context: { $implicit: action, primary: first, grow: false }" />
                    }
                }
                @if (ro.mutationBlocked()) {
                    <span class="text-amber-700 dark:text-amber-300 text-sm shrink-0" role="status">İşletme salt okunur moddadır; eylemler kapalı.</span>
                }
                @if (actionError(); as e) {
                    <span class="text-red-600 dark:text-red-400 text-sm" role="alert">{{ e }}</span>
                }
            </div>
            <p-menu #actionMenu [model]="menuItems()" [popup]="true" appendTo="body" />
            @if (canArrive()) {
                <app-visit-arrival-dialog [(visible)]="arrivalOpen" [presetPet]="petSuggestion()" (arrived)="onArrived()" />
            }
        }

        <ng-template #actionButton let-action let-isPrimary="primary" let-grow="grow">
            @if (ro.mutationBlocked()) {
                <button pButton type="button" [disabled]="true" [class]="buttonClass(isPrimary, grow)"><i class="pi pi-lock"></i>{{ action.label }}</button>
            } @else if (action.route) {
                <a [routerLink]="action.route" [queryParams]="action.queryParams" pButton type="button" [class]="buttonClass(isPrimary, grow)"><i [class]="action.icon"></i>{{ action.label }}</a>
            } @else {
                <button pButton type="button" [class]="buttonClass(isPrimary, grow)" [disabled]="busy()" (click)="run(action)"><i [class]="action.icon"></i>{{ action.label }}</button>
            }
        </ng-template>
    `
})
export class PatientActionBarComponent {
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly visits = inject(VisitsService);
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
    /** Hayvan sayfasında: hasta klinikteyse (açık geliş) Geldi yerine Bugün'de aç, Muayene başlat yerine Muayeneye al. */
    readonly openVisit = input<PatientOpenVisit | null>(null);

    readonly arrivalOpen = signal(false);
    readonly busy = signal(false);
    readonly actionError = signal<string | null>(null);
    private readonly canStartVisit = this.auth.hasOperationClaim(VISITS_UPDATE_CLAIM);
    /** Rol tek kuraldan (hasta kartı vurgusu): hekim mi ön büro mu; açık grup ve birincil eylem buna göre. */
    private readonly emphasis = petCardEmphasis((claim) => this.auth.hasOperationClaim(claim));
    private readonly actionMenu = viewChild<Menu>('actionMenu');
    readonly menuItems = signal<MenuItem[]>([]);

    readonly actions = computed(() =>
        buildPatientActions({ clientId: this.clientId(), petId: this.petId(), petDeceased: this.petDeceased(), openVisit: this.openVisit() }, (claim) => this.auth.hasOperationClaim(claim))
    );
    readonly groups = computed(() => groupPatientActions(this.actions(), this.emphasis));
    readonly primary = computed<PatientAction | null>(() => {
        const key = primaryPatientActionKey(this.actions(), this.emphasis);

        return this.actions().find((a) => a.key === key) ?? null;
    });
    /** Telefonda birincil dışındaki tüm eylemler, grup başlıklarıyla. */
    readonly phoneMenuItems = computed<MenuItem[]>(() =>
        this.groups()
            .map((g) => ({ label: g.label, items: this.toMenuItems(g.actions.filter((a) => a.key !== this.primary()?.key)) }))
            .filter((g) => g.items.length > 0)
    );

    readonly canArrive = computed(() => this.actions().some((a) => a.key === 'arrive'));

    readonly petSuggestion = computed<PetSuggestion | null>(() => {
        const id = this.petId();

        return id ? { id, label: `${this.petLabel()} · Müşteri: ${this.clientName() || '—'}`, clientId: this.clientId(), clientName: this.clientName() } : this.arrivalPet();
    });

    buttonClass(primary: boolean, grow: boolean): string {
        return (primary ? 'p-button-primary' : 'p-button-outlined p-button-secondary') + (grow ? ' flex-1 min-w-0' : ' shrink-0');
    }

    groupMenuItems(group: PatientActionGroup): MenuItem[] {
        return this.toMenuItems(group.actions);
    }

    openMenu(event: Event, items: MenuItem[]): void {
        this.menuItems.set(items);
        this.actionMenu()?.toggle(event);
    }

    /** Menüden ve rota olmayan düğmelerden: Geldi diyaloğu; Muayeneye al bekleyen gelişte önce bakımı başlatır (Bugün'deki gibi), sonra muayeneyi gelişle açar. */
    run(action: PatientAction): void {
        if (action.route) {
            void this.router.navigate([action.route], { queryParams: action.queryParams });

            return;
        }

        if (action.key === 'arrive') {
            this.arrivalOpen.set(true);

            return;
        }

        const visit = this.openVisit();

        if (action.key !== 'takeIn' || !visit || this.busy()) {
            return;
        }

        const openExamination = () => void this.router.navigate(['/panel/examinations/new'], { queryParams: action.queryParams });

        if (!visit.waiting || !this.canStartVisit) {
            openExamination();

            return;
        }

        this.busy.set(true);
        this.actionError.set(null);
        this.visits.startVisit(visit.visitId).subscribe({
            next: () => {
                this.busy.set(false);
                openExamination();
            },
            error: (e: unknown) => {
                this.busy.set(false);
                this.actionError.set(panelHttpFailureMessage(e, 'Muayeneye alınamadı.'));
            }
        });
    }

    onArrived(): void {
        void this.router.navigate(['/panel/today']);
    }

    private toMenuItems(actions: readonly PatientAction[]): MenuItem[] {
        return actions.map((a) => ({ label: a.label, icon: a.icon, disabled: this.ro.mutationBlocked(), command: () => this.run(a) }));
    }
}
