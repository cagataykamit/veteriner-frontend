import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Routes } from '@angular/router';

@Component({
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="card">
            <h5 class="mb-4">Appointments</h5>
            <p class="m-0 text-muted-color">Randevu listesi ve lifecycle durumlari bu ekranda listelenecek.</p>
        </div>
    `
})
class AppointmentsListPage {}

export default [{ path: '', component: AppointmentsListPage }] as Routes;
