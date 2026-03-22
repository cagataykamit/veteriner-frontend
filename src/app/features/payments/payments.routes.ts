import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Routes } from '@angular/router';

@Component({
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="card">
            <h5 class="mb-4">Payments</h5>
            <p class="m-0 text-muted-color">Odeme kayitlari ve durumlari bu sayfada listelenecek.</p>
        </div>
    `
})
class PaymentsListPage {}

@Component({
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="card">
            <h5 class="mb-4">Yeni Odeme</h5>
            <p class="m-0 text-muted-color">Odeme olusturma formu burada yer alacak.</p>
        </div>
    `
})
class PaymentCreatePage {}

@Component({
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="card">
            <h5 class="mb-4">Odeme Detay</h5>
            <p class="m-0 text-muted-color">Odeme kalemleri, yontem ve islem gecmisi bu alanda gosterilecek.</p>
        </div>
    `
})
class PaymentDetailPage {}

export default [
    { path: '', component: PaymentsListPage },
    { path: 'new', component: PaymentCreatePage },
    { path: ':id', component: PaymentDetailPage }
] as Routes;
