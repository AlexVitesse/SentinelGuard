import { Component, OnInit } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { FirestoreService } from '../services/firebase.service';

@Component({
  selector: 'app-congifuracion',
  templateUrl: './congifuracion.page.html',
  styleUrls: ['./congifuracion.page.scss'],
})
export class CongifuracionPage implements OnInit {
  exitTime: number = 60;
  prealarmTime: number = 60;
  nombre: string = '';
  telegramId: string = '';
  groupId: string = '';
  mac: string = '';

  constructor(
    private toastController: ToastController,
    private firestoreService: FirestoreService
  ) {}

  ngOnInit() {
    this.mac = localStorage.getItem('mac') || ''; // Carga la MAC desde el almacenamiento local
    this.loadConfig();
  }

  async loadConfig() {
    const path = `ESP32/${this.mac}`; // Ruta en Firebase basada en la MAC
    try {
      // Intenta cargar los datos desde Firebase
      const firebaseData = await this.firestoreService.readData(path);
      if (firebaseData) {
        // Asigna los datos desde Firebase
        this.exitTime = firebaseData.Tiempo_Bomba || this.exitTime;
        this.prealarmTime = firebaseData.Tiempo_pre || this.prealarmTime;
        this.nombre = firebaseData.Nombre || this.nombre;
        this.telegramId = firebaseData.Telegram_ID || this.telegramId;
        this.groupId = firebaseData.Group_ID || this.groupId;

        console.log('Datos cargados desde Firebase:', firebaseData);
      } else {
        // Si no hay datos en Firebase, carga los valores locales
        this.loadLocalConfig();
        console.log('No se encontraron datos en Firebase, usando valores locales.');
      }
    } catch (error) {
      console.error('Error al leer los datos desde Firebase:', error);
      // Si hay un error, también carga los valores locales
      this.loadLocalConfig();
    }
  }

  loadLocalConfig() {
    const savedExitTime = localStorage.getItem('exitTime');
    const savedPrealarmTime = localStorage.getItem('prealarmTime');
    const savedNombre = localStorage.getItem('nombre');
    const savedTelegramId = localStorage.getItem('telegramId');
    const savedGroupId = localStorage.getItem('groupId');

    if (savedExitTime) {
      this.exitTime = parseInt(savedExitTime, 10);
    }

    if (savedPrealarmTime) {
      this.prealarmTime = parseInt(savedPrealarmTime, 10);
    }

    if (savedNombre) {
      this.nombre = savedNombre;
    }

    if (savedTelegramId) {
      this.telegramId = savedTelegramId;
    }

    if (savedGroupId) {
      this.groupId = savedGroupId;
    }

    console.log('Datos cargados desde almacenamiento local.');
  }

  async saveConfig() {
    if (this.validateConfig()) {
      // Guarda los datos en el almacenamiento local
      localStorage.setItem('exitTime', this.exitTime.toString());
      localStorage.setItem('prealarmTime', this.prealarmTime.toString());
      localStorage.setItem('nombre', this.nombre);
      localStorage.setItem('telegramId', this.telegramId);
      localStorage.setItem('groupId', this.groupId);

      // Datos a enviar a Firebase
      const data = {
        Group_ID: this.groupId,
        Nombre: this.nombre,
        Telegram_ID: this.telegramId,
        Tiempo_Bomba: this.exitTime,
        Tiempo_pre: this.prealarmTime,
      };

      // Ruta donde se almacenarán los datos
      const path = `ESP32/${this.mac}`;

      try {
        // Actualiza los datos en Firebase
        await this.firestoreService.updateData(path, data);
        console.log('Configuración guardada exitosamente en Firebase');
        await this.presentToast('Configuración guardada exitosamente', 'success');
      } catch (error) {
        console.error('Error al guardar configuración en Firebase:', error);
        await this.presentToast('Error al guardar configuración en Firebase', 'danger');
      }
    } else {
      await this.presentToast('Error: Valores fuera de rango o campos vacíos', 'danger');
    }
  }

  validateConfig(): boolean {
    return (
      this.exitTime >= 0 &&
      this.exitTime <= 180 &&
      this.prealarmTime >= 10 &&
      this.prealarmTime <= 600 &&
      this.nombre.trim() !== '' &&
      this.telegramId.trim() !== '' &&
      this.groupId.trim() !== ''
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
