import { Routes } from '@angular/router';
import { PaymentDetailPageComponent } from '@/app/features/payments/pages/payment-detail-page/payment-detail-page.component';
import { PaymentNewPageComponent } from '@/app/features/payments/pages/payment-new-page/payment-new-page.component';
import { PaymentsListPageComponent } from '@/app/features/payments/pages/payments-list-page/payments-list-page.component';

export default [
    { path: '', component: PaymentsListPageComponent },
    { path: 'new', component: PaymentNewPageComponent },
    { path: ':id', component: PaymentDetailPageComponent }
] as Routes;
