import { Routes } from '@angular/router';
import { ClientDetailPageComponent } from '@/app/features/clients/pages/client-detail-page/client-detail-page.component';
import { ClientsListPageComponent } from '@/app/features/clients/pages/clients-list-page/clients-list-page.component';

export default [
    { path: '', component: ClientsListPageComponent },
    { path: ':id', component: ClientDetailPageComponent }
] as Routes;
