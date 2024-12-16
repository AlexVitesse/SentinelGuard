import { FirestoreService } from '../services/firebase.service';
import { booleanAttribute, Component,  OnInit } from '@angular/core';
import { NavController, LoadingController, ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-divices',
  templateUrl: './divices.page.html',
  styleUrls: ['./divices.page.scss'],
})
export class DivicesPage implements OnInit {
  isArmed: boolean = false; // Control del toggle
  actualState: boolean = false; // Estado real del sistema leído de /Estado
  userId: string | null = null;
  deviceMAC: string | null = null;
  devices = [];
  subscriptions: Subscription[] = []; // Array para manejar múltiples suscripciones

  constructor(
    private toastController: ToastController,
    private firestoreService: FirestoreService,
    private navCtrl: NavController
  ) {}

  ngOnInit() {
    this.userId = localStorage.getItem('uid') || sessionStorage.getItem('uid');
    const userPath = 'Usuarios/' + this.userId;
    this.addDevicesPanel(userPath);

    // Suscripción general para leer cambios en tiempo real desde /Estado
    const stateSubscription = this.firestoreService.dataChanges$.subscribe((data) => {
      console.log('Cambio detectado en /Estado:', data);
      this.actualState = data; // Actualiza el estado general del sistema
    });
    this.subscriptions.push(stateSubscription);
  }

  async addDevicesPanel(userPath: string) {
    const readData = await this.firestoreService.readData(userPath);
  
    if (readData.Dispositivos) {
      this.deviceMAC = Array.isArray(readData.Dispositivos)
        ? readData.Dispositivos
        : readData.Dispositivos.split(','); // Convierte a array si es necesario
    }
  
    console.log('Lista de dispositivos:', this.deviceMAC);
    if (!Array.isArray(this.deviceMAC)) {
      console.error('deviceMAC no es un array:', this.deviceMAC);
      return;
    }
    this.deviceMAC?.forEach((mac: string) => {
      const devicePath = `ESP32/${mac}`;
  
      // Configura la lógica para escuchar cambios en el dispositivo específico
      this.firestoreService.readDataAndSubscribe(devicePath);
  
      // Suscríbete al Observable `dataChanges$` para manejar los cambios
      this.firestoreService.dataChanges$.subscribe((deviceData) => {
        console.log(`Datos actualizados para ${mac}:`, deviceData);
  
        const existingDevice = this.devices.find((device) => device.Mac === mac);
  
        if (existingDevice) {
          existingDevice.status = deviceData.Estado ? 'Armado' : 'Desarmado';
          existingDevice.color = deviceData.Estado ? 'success' : 'danger';
        } else {
          this.devices.push({
            name: deviceData.Nombre,
            icon: 'home',
            status: deviceData.Estado ? 'Armado' : 'Desarmado',
            color: deviceData.Estado ? 'success' : 'danger',
            Mac: mac,
          });
        }
      });
    });
  }
  

  readStatus() {
    const path = 'ESP32/' + this.deviceMAC + '/Estado';
    this.firestoreService.readDataAndSubscribe(path); // Lee y escucha los cambios en /Estado
  }

  writeStatus() {
    const path = 'ESP32/' + this.deviceMAC + '/Answer';
    this.firestoreService.writeData(path, this.isArmed); // Escribe en /Answer basado en el toggle
    this.presentToast('Cambiando estado a: ' + (this.isArmed ? 'Armado' : 'Desarmado'));
  }

  getSystemStatus() {
    return this.actualState ? 'Armado' : 'Desarmado'; // Basado en el estado real del sistema
  }

  getSystemStatusColor() {
    return this.actualState ? 'success' : 'danger';
  }

  ngOnDestroy() {
    // Desuscribe todas las suscripciones para evitar fugas de memoria
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
  navConfig(){
    this.navCtrl.navigateRoot('/congifuracion');
  }

  addDevices(){
    this.navCtrl.navigateRoot('/home');
  }

  async logout() {
    try {
      // Espera hasta que la sesión se cierre completamente
      await this.firestoreService.logOut();
      console.log('Sesión cerrada con éxito');
      
      // Añadir un pequeño retraso (por ejemplo, 200ms) para asegurar que los tokens se eliminen antes de la redirección
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Redirigir al login solo después de cerrar sesión correctamente
      this.navCtrl.navigateRoot('/login');
    } catch (error) {
      console.log('Error al cerrar sesión:', error);
    }
  }

  async presentToast(msg: string) {
    const toast = await this.toastController.create({
      message: msg,
      duration: 2000,
      position: 'bottom',
    });
    await toast.present();
  }
}
