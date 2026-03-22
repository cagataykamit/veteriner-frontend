import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Routes } from '@angular/router';

@Component({
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="card">
            <h5 class="mb-4">Vaccinations</h5>
            <p class="m-0 text-muted-color">Asi listesi ve yaklasan uygulamalar bu ekranda listelenecek.</p>
        </div>
    `
})
class VaccinationsListPage {}

export default [{ path: '', component: VaccinationsListPage }] as Routes;
