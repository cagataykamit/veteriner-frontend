import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Routes } from '@angular/router';

@Component({
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="card">
            <h5 class="mb-4">Examinations</h5>
            <p class="m-0 text-muted-color">Muayene kayit listesi bu sayfada yer alacak.</p>
        </div>
    `
})
class ExaminationsListPage {}

@Component({
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="card">
            <h5 class="mb-4">Yeni Muayene</h5>
            <p class="m-0 text-muted-color">Muayene olusturma formu burada yer alacak.</p>
        </div>
    `
})
class ExaminationCreatePage {}

@Component({
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="card">
            <h5 class="mb-4">Muayene Detay</h5>
            <p class="m-0 text-muted-color">Muayene notlari, bulgular ve islem gecmisi bu alanda gosterilecek.</p>
        </div>
    `
})
class ExaminationDetailPage {}

export default [
    { path: '', component: ExaminationsListPage },
    { path: 'new', component: ExaminationCreatePage },
    { path: ':id', component: ExaminationDetailPage }
] as Routes;
