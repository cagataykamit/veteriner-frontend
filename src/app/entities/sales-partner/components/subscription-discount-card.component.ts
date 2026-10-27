import { Component, computed, inject, input, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DiscountCodeFieldComponent } from '@/app/entities/sales-partner/components/discount-code-field.component';
import type { SubscriptionDiscountDto } from '@/app/entities/sales-partner/models/sales-partner.model';
import { DiscountCodesService } from '@/app/entities/sales-partner/services/discount-codes.service';
import { discountNoteText } from '@/app/entities/sales-partner/utils/discount-code.utils';
import { TrDatePipe } from '@/app/shared/pipes/tr-date.pipe';

/**
 * Abonelik sayfasında satış ortağı kodu (ADR-037): uygulanmış kod ve indirim penceresi, ya da ilk ücretli ödemeden önce kod girişi.
 * Kurumun kodu yoksa ve kod girilemiyorsa hiçbir şey göstermez. Ortak bilgisi ve komisyon gösterilmez.
 */
@Component({
    selector: 'app-subscription-discount-card',
    standalone: true,
    imports: [ButtonModule, DiscountCodeFieldComponent, TrDatePipe],
    // Gösterilecek bir şey yoksa ızgarada boş satır (aralık) bırakmasın.
    host: { '[class.hidden]': '!visible()' },
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        @if (state(); as s) {
            @if (s.applied) {
                <div class="card mb-0" data-testid="subscription-discount-applied">
                    <h5 class="mt-0 mb-3">Ortak kodu</h5>
                    <p class="m-0 text-sm">
                        <span class="font-semibold">{{ s.code }}</span
                        >: {{ note(s) }}.
                        @if (s.windowEndsAtUtc) {
                            İndirim {{ s.windowEndsAtUtc | trDate }} tarihine kadar uygulanır.
                        } @else {
                            İndirim ilk ücretli ödemeyle başlar.
                        }
                    </p>
                </div>
            } @else if (s.canApply && canManage()) {
                <div class="card mb-0" data-testid="subscription-discount-apply">
                    <h5 class="mt-0 mb-3">Ortak kodu</h5>
                    <p class="text-sm text-muted-color mt-0 mb-3">Satış ortağınızdan aldığınız kodu ilk ödemeden önce girebilirsiniz.</p>
                    <div class="flex flex-col md:flex-row md:items-start gap-3">
                        <div class="w-full md:max-w-sm">
                            <app-discount-code-field inputId="subscriptionDiscountCode" [disabled]="applying()" [(code)]="code" (validated)="valid.set(!!$event)" />
                        </div>
                        <button pButton type="button" class="max-md:self-start md:mt-7" [disabled]="!valid() || applying()" (click)="apply()" data-testid="subscription-discount-apply-button"><i class="p-button-icon" [class]="applying() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>Uygula</button>
                    </div>
                    @if (error()) {
                        <p class="text-red-500 text-sm mt-2 mb-0" role="alert">{{ error() }}</p>
                    }
                </div>
            }
        }
    `
})
export class SubscriptionDiscountCardComponent implements OnInit {
    /** `Subscriptions.Manage`: kod girebilir. */
    readonly canManage = input(false);

    readonly state = signal<SubscriptionDiscountDto | null>(null);
    readonly code = signal('');
    readonly valid = signal(false);
    readonly applying = signal(false);
    readonly error = signal<string | null>(null);

    readonly visible = computed(() => {
        const s = this.state();

        return !!s && (s.applied || (s.canApply && this.canManage()));
    });

    private readonly codes = inject(DiscountCodesService);

    ngOnInit(): void {
        // Kod bilgisi yan bilgidir: yüklenemezse kart görünmez, abonelik sayfası etkilenmez.
        this.codes.getSubscriptionDiscount().subscribe({ next: (s) => this.state.set(s), error: () => this.state.set(null) });
    }

    note(s: SubscriptionDiscountDto): string {
        return discountNoteText(s.discountPercent ?? 0, s.discountMonths ?? 12);
    }

    apply(): void {
        if (!this.valid() || this.applying()) {
            return;
        }

        this.applying.set(true);
        this.error.set(null);
        this.codes.applySubscriptionDiscount(this.code()).subscribe({
            next: (s) => {
                this.applying.set(false);
                this.state.set(s);
            },
            error: (e: unknown) => {
                this.applying.set(false);
                this.error.set(e instanceof Error ? e.message : 'Ortak kodu uygulanamadı.');
            }
        });
    }
}
