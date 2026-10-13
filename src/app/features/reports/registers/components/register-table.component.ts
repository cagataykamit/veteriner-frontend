import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, input } from '@angular/core';
import { registerHeaderLayout, type RegisterCellLine } from '@/app/features/reports/registers/data/register-definition';
import type { AnyRegisterDefinition } from '@/app/features/reports/registers/data/register-definitions';

/**
 * Ortak defter tablosu. Ekranda `screenColumns` (birleşik, çok satırlı hücreler), yazdırmada `columns` (tüm sütunlar ayrı, ızgaralı) çizilir.
 * Hangi alanların birleşeceğini defter tanımı söyler; hücre şablonu burada tek yerde yaşar.
 */
@Component({
    selector: 'app-register-table',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    styleUrl: './register-table.component.scss',
    encapsulation: ViewEncapsulation.None,
    template: `
        <div class="register-scroll overflow-x-auto">
            <table class="register-screen-table">
                <thead>
                    <tr>
                        @for (col of definition().screenColumns; track $index) {
                            <th>{{ col.header }}</th>
                        }
                    </tr>
                </thead>
                <tbody>
                    @for (row of rows(); track row.rowNumber) {
                        <tr>
                            @for (col of definition().screenColumns; track $index) {
                                <td [style.min-width]="col.minWidth">
                                    @for (line of filled(col.lines(row)); track $index) {
                                        <div [class]="'register-line register-line-' + (line.tone ?? 'plain')">
                                            @if (line.items) {
                                                @for (item of line.items; track $index) {
                                                    <span class="register-item">{{ item }}</span>
                                                }
                                            } @else {
                                                {{ line.text }}
                                            }
                                        </div>
                                    } @empty {
                                        <span class="register-line-muted">—</span>
                                    }
                                </td>
                            }
                        </tr>
                    }
                </tbody>
            </table>
        </div>

        <table class="register-print-table">
            <thead>
                <tr class="register-head-row">
                    @for (cell of header().top; track $index) {
                        <th [attr.colspan]="cell.colSpan" [attr.rowspan]="cell.rowSpan">{{ cell.label }}</th>
                    }
                </tr>
                @if (header().sub.length) {
                    <tr class="register-head-row">
                        @for (label of header().sub; track $index) {
                            <th>{{ label }}</th>
                        }
                    </tr>
                }
            </thead>
            <tbody>
                @for (row of rows(); track row.rowNumber) {
                    <tr>
                        @for (col of definition().columns; track $index) {
                            <td>{{ col.cell(row) }}</td>
                        }
                    </tr>
                }
            </tbody>
        </table>
    `
})
export class RegisterTableComponent {
    readonly definition = input.required<AnyRegisterDefinition>();
    readonly rows = input.required<readonly { readonly rowNumber: number }[]>();

    readonly header = computed(() => registerHeaderLayout(this.definition().columns));

    filled(lines: readonly RegisterCellLine[]): readonly RegisterCellLine[] {
        return lines.filter((l) => l.text || l.items?.length);
    }
}
