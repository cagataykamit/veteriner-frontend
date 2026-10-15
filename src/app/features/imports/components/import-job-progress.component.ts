import { Component, computed, input } from '@angular/core';
import { MessageModule } from 'primeng/message';
import { ProgressBarModule } from 'primeng/progressbar';

/** Doğrulama, uygulama ve geri alma işinin ilerleme çubuğu; sayılar yoklama yanıtından gelir. */
@Component({
    selector: 'app-import-job-progress',
    standalone: true,
    imports: [MessageModule, ProgressBarModule],
    template: `
        <p-progressbar [mode]="percent() === null ? 'indeterminate' : 'determinate'" [value]="percent() ?? 0" />
        @if (progress(); as pr) {
            <small class="text-muted-color">{{ pr.processed }} / {{ pr.total }} satır işlendi</small>
            @if (stalled()) {
                <p-message severity="info" styleClass="w-full mt-2" role="status">
                    İşlem beklenenden uzun sürüyor; arka plan işi henüz başlamadı. Sayfayı kapatabilirsiniz, iş başladığında kendiliğinden sürer. Uzun süre böyle kalırsa destek ekibiyle iletişime geçin.
                </p-message>
            } @else if (pr.leaseActive === false) {
                <p class="text-sm text-muted-color mb-0">İşlem sırada; birazdan başlayacak. Sayfayı kapatabilirsiniz; işlem arka planda sürer.</p>
            }
        }
    `
})
export class ImportJobProgressComponent {
    /** `leaseActive` yalnız yoklama yanıtında vardır; parti nesnesindeki `progress` ile gelmez. */
    readonly progress = input<{ processed: number; total: number; leaseActive?: boolean } | null>(null);
    readonly stalled = input(false);

    /** İlk sonuç yazılana kadar (toplam veya işlenen 0) belirsiz çubuk: doğrulamada kurallar bellekte çalışırken sayı artmaz. */
    protected readonly percent = computed(() => {
        const pr = this.progress();

        return pr && pr.total > 0 && pr.processed > 0 ? Math.min(100, Math.round((pr.processed / pr.total) * 100)) : null;
    });
}
