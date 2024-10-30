import { Component, OnInit } from '@angular/core';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-congifuracion',
  templateUrl: './congifuracion.page.html',
  styleUrls: ['./congifuracion.page.scss'],
})
export class CongifuracionPage implements OnInit {
  exitTime: number = 60;
  prealarmTime: number = 60;

  constructor(private toastController: ToastController) {}

  ngOnInit() {
    this.loadConfig();
  }

  loadConfig() {
    const savedExitTime = localStorage.getItem('exitTime');
    const savedPrealarmTime = localStorage.getItem('prealarmTime');

    if (savedExitTime) {
      this.exitTime = parseInt(savedExitTime, 10);
    }

    if (savedPrealarmTime) {
      this.prealarmTime = parseInt(savedPrealarmTime, 10);
    }
  }

  async saveConfig() {
    if (this.validateConfig()) {
      localStorage.setItem('exitTime', this.exitTime.toString());
      localStorage.setItem('prealarmTime', this.prealarmTime.toString());
      await this.presentToast('Configuración guardada exitosamente', 'success');
    } else {
      await this.presentToast('Error: Valores fuera de rango', 'danger');
    }
  }

  validateConfig(): boolean {
    return (
      this.exitTime >= 0 &&
      this.exitTime <= 180 &&
      this.prealarmTime >= 10 &&
      this.prealarmTime <= 600
    );
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      color: color,
      position: 'bottom',
    });
    toast.present();
  }
}
