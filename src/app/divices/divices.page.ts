
import { Component } from '@angular/core';

@Component({
  selector: 'app-divices',
  templateUrl: './divices.page.html',
  styleUrls: ['./divices.page.scss'],
})
export class DivicesPage{
  isArmed: boolean = false;

  devices = [
    { name: 'Puerta Principal', icon: 'home', status: 'Cerrada', color: 'success' },
    { name: 'Habitacion', icon: 'home', status: 'Abierta', color: 'danger' },
    
  ];

  constructor() {}

  toggleArmed() {
    this.isArmed = !this.isArmed;
  }

  getSystemStatus() {
    return this.isArmed ? 'Armado' : 'Desarmado';
  }

  getSystemStatusColor() {
    return this.isArmed ? 'success' : 'danger';
  }
}