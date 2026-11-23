import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CASH_REGISTER_REPORT_KIND_LABELS, type CashRegisterReportRowDto } from '@/app/entities/cash-register/models/cash-register.model';
import { CashRegistersService } from '@/app/entities/cash-register/services/cash-registers.service';
import { MoneyPipe } from '@/app/shared/pipes/money.pipe';
import { ReasonConfirmDialogComponent } from '@/app/shared/ui/reason-confirm-dialog/reason-confirm-dialog.component';
import { formatUtcIsoAsLocalDateTimeDisplay, toIstanbulTimeInputValue } from '@/app/shared/utils/date.utils';

const MOVEMENT_KINDS: ReadonlySet<string> = new Set(['In', 'Out', 'TransferIn', 'TransferOut']);

/**
 * Kasa hareketi satırları (`CASH_REGISTERS_API_CONTRACT.md` §3.6): Para › Kasa sekmesinde bugünün hareketleri, Raporlar › Kasa hareketleri'nde
 * dönemin satırları. Yalnız kasa giriş/çıkışı ve aktarım gerekçeyle iptal edilir (tahsilat ödeme ekranından); kayıt silinmez.
 */
@Component({
    selector: 'app-cash-report-rows',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ButtonModule, MoneyPipe, ReasonConfirmDialogComponent],
    styles: `
        .cash-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.875rem;

            th,
            td {
                padding: 0.5rem 0.625rem;
                border-bottom: 1px solid var(--surface-border);
                text-align: left;
                vertical-align: top;
            }

            th {
                font-weight: 600;
                color: var(--text-color-secondary);
                white-space: nowrap;
            }

            .num {
                text-align: right;
                white-space: nowrap;
                font-variant-numeric: tabular-nums;
            }
        }
    `,
    template: `
        <!-- relative: başlıktaki sr-only metin kaydırma kutusunda kalır; telefonda sayfa yana taşmaz. -->
        <div class="overflow-x-auto relative">
            <table class="cash-table" [attr.aria-label]="label()" data-testid="cash-report-rows">
                <thead>
                    <tr>
                        <th>{{ timeOnly() ? 'Saat' : 'Tarih' }}</th>
                        @if (showRegister()) {
                            <th>Kasa</th>
                        }
                        <th>Hareket</th>
                        <th>Açıklama</th>
                        <th class="num">Giriş</th>
                        <th class="num">Çıkış</th>
                        <th class="num">Bakiye</th>
                        <th>İşlemi yapan</th>
                        @if (canVoid()) {
                            <th><span class="sr-only">İşlem</span></th>
                        }
                    </tr>
                </thead>
                <tbody>
                    @for (row of shownRows(); track row.referenceId + row.kind) {
                        <tr>
                            <td class="whitespace-nowrap">{{ when(row.atUtc) }}</td>
                            @if (showRegister()) {
                                <td>{{ row.cashRegisterName }}</td>
                            }
                            <td>{{ kindLabel(row) }}</td>
                            <td>{{ row.description }}</td>
                            <td class="num">{{ row.inAmount ? (row.inAmount | money) : '' }}</td>
                            <td class="num">{{ row.outAmount ? (row.outAmount | money) : '' }}</td>
                            <td class="num font-medium">{{ row.balance | money }}</td>
                            <td>{{ row.performedByName || '—' }}</td>
                            @if (canVoid()) {
                                <td>
                                    @if (isMovement(row)) {
                                        <button pButton type="button" class="p-button-text p-button-sm p-button-danger" (click)="openVoid(row)" data-testid="cash-movement-void"><i class="pi pi-times"></i>İptal et</button>
                                    }
                                </td>
                            }
                        </tr>
                    }
                </tbody>
            </table>
        </div>

        <app-reason-confirm-dialog
            [(visible)]="voidVisible"
            header="Kasa hareketini iptal et"
            [summary]="voidTarget() ? kindLabel(voidTarget()!) + ' · ' + voidTarget()!.description : null"
            description="Kayıt silinmez; gerekçeyle iptal edilir ve kasa bakiyesine girmez. Aktarımda iki kasadaki bacak birlikte iptal edilir."
            confirmLabel="İptal et"
            failureFallback="Kasa hareketi iptal edilemedi."
            [execute]="voidMovement"
            (confirmed)="voided.emit()"
        />
    `
})
export class CashReportRowsComponent {
    readonly rows = input.required<readonly CashRegisterReportRowDto[]>();
    /** Tek kasanın raporunda Kasa sütunu gereksiz. */
    readonly showRegister = input(true);
    readonly canVoid = input(false);
    /** Bugünün hareketlerinde yalnız saat; en yeni üstte. */
    readonly timeOnly = input(false);
    readonly label = input('Kasa hareketleri');
    readonly voided = output<void>();

    private readonly service = inject(CashRegistersService);

    readonly shownRows = computed(() => (this.timeOnly() ? [...this.rows()].reverse() : this.rows()));
    readonly voidTarget = signal<CashRegisterReportRowDto | null>(null);
    voidVisible = false;

    readonly voidMovement = (reason: string) => this.service.voidMovement(this.voidTarget()!.referenceId, reason);

    openVoid(row: CashRegisterReportRowDto): void {
        this.voidTarget.set(row);
        this.voidVisible = true;
    }

    isMovement(row: CashRegisterReportRowDto): boolean {
        return MOVEMENT_KINDS.has(row.kind);
    }

    kindLabel(row: CashRegisterReportRowDto): string {
        return CASH_REGISTER_REPORT_KIND_LABELS[row.kind] ?? row.kind;
    }

    when(utcIso: string): string {
        return this.timeOnly() ? toIstanbulTimeInputValue(utcIso) : formatUtcIsoAsLocalDateTimeDisplay(utcIso);
    }
}
