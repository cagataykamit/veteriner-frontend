import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LayoutService } from '@/app/layout/service/layout.service';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterModule],
    template: `<router-outlet></router-outlet>`
})
export class AppComponent {
    /** Her route'ta (auth refresh dahil) tema tercihini geri yüklemek için kök seviyede başlat */
    private readonly _layoutService = inject(LayoutService);
}
