import { Routes } from '@angular/router';
import { NotificationsPageComponent } from '@/app/features/notifications/pages/notifications-page.component';

/** Bildirim merkezi oturumdaki kullanıcının kendi bildirimleridir; ek izin gerekmez. */
export default [{ path: '', title: 'Bildirimler', component: NotificationsPageComponent }] as Routes;
