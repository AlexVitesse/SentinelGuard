import { FirestoreService } from '../services/firebase.service';
import { Component,  OnInit } from '@angular/core';
import { NavController, LoadingController, ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-divices',
  templateUrl: './divices.page.html',
  styleUrls: ['./divices.page.scss'],
})

export class DivicesPage implements OnInit{
  isArmed: boolean = false;
  userId: string | null = null;
  deviceMAC: string | null = null;
  devices = [];
  dataSubscription: Subscription | null = null;
  loading: HTMLIonLoadingElement | undefined;
  
  constructor(
    private toastController: ToastController,
    private loadingController: LoadingController, 
    private firestoreService: FirestoreService,
    private navCtrl: NavController,
  ) {}

  ngOnInit() {
    this.userId = localStorage.getItem('uid') || sessionStorage.getItem('uid');
    const userPath = 'Usuarios/' + this.userId;
    
    console.log('User ID:', this.userId);
    this.addDevicesPanel(userPath);
    this.dataSubscription = this.firestoreService.dataChanges$.subscribe((data) => {
      console.log('Cambio detectado en tiempo real:', data);
      this.isArmed = data;
      // Verifica que devices no esté vacío y luego actualiza el estado del primer dispositivo
      if (this.devices.length > 0) {
        this.devices[0].status = data ? 'Armado' : 'Desarmado'; // Actualizar el estado en texto
        this.devices[0].color = data ? 'success' : 'danger';    // Actualizar el color basado en el estado
      }
    });
  }

  async addDevicesPanel(userPath : string){
    const readData = await this.firestoreService.readData(userPath);
    if (readData.Dispositivos && readData.Dispositivos.length > 0) {
      console.log('Dispositivos encontrados:', readData.Dispositivos);
      this.deviceMAC = readData.Dispositivos;
      localStorage.setItem('mac',this.deviceMAC);
    }
    const devicesPath = 'ESP32/'+ this.deviceMAC;
    console.log(devicesPath);
    const readDataDevices = await this.firestoreService.readData(devicesPath);
     // Define el color basado en el estado del dispositivo
    const colorStatus = readDataDevices.Estado === true ? 'success' : 'danger';
    const status = readDataDevices.Estado === true ? 'Armado' : 'Desarmado';
    this.devices.push(
      { 
        name: readDataDevices.Nombre, 
        icon: 'home', 
        status: status, 
        color: colorStatus, 
        Mac:this.deviceMAC
      }
    );
    //sessionStorage.setItem('Device', this.devices );
    console.log(this.devices); //
    this.readStatus();
  }

  readStatus() {
    const path = 'ESP32/' + this.deviceMAC + '/Estado';
    this.firestoreService.readDataAndSubscribe(path);
  }
  /*//Funcion para cambiar el estado de la alarma.
  writeStatus() {
    const path = 'ESP32/' + this.deviceMAC + '/Estado';
    this.firestoreService.writeData(path, this.isArmed);
  }*/
    async writeStatus() {
      const pathStatus = `ESP32/${this.deviceMAC}/Estado`;
      const pathAnswer = `ESP32/${this.deviceMAC}/Answer`;
    
      try {
        // Cambiar el estado de la alarma y establecer Answer en true
        await this.firestoreService.writeData(pathStatus, this.isArmed);
        await this.firestoreService.writeData(pathAnswer, true);
    
        // Mostrar mensaje de espera
        await this.presentLoading("Espera...");
    
        // Pausa de 2 segundos para dar tiempo a la alarma a responder
        await new Promise(resolve => setTimeout(resolve, 4000));
    
        // Leer el valor actual de Answer
        const answerValue = await this.firestoreService.readData(pathAnswer);
    
        if (answerValue === true) {
          // Si sigue en true, la alarma no respondió correctamente
          this.presentToast('La alarma no está conectada a Internet.');
          // Restaurar el valor de Answer y Estado
          await this.firestoreService.writeData(pathAnswer, false);
          await this.firestoreService.writeData(pathStatus, !this.isArmed);
        }
      } catch (error) {
        console.error('Error al escribir estado o verificar respuesta:', error);
        this.presentToast('Ocurrió un error al cambiar el estado.');
      } finally {
        // Cerrar el mensaje de carga
        await this.dismissLoading();
      }
    }

  toggleArmed() {
    this.isArmed = !this.isArmed;
  }

  getSystemStatus() {
    return this.isArmed ? 'Armado' : 'Desarmado';
  }

  getSystemStatusColor() {
    return this.isArmed ? 'success' : 'danger';
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
  

  addDevices(){
    this.navCtrl.navigateRoot('/home');
  }

  navConfig(){
    this.navCtrl.navigateRoot('/congifuracion');
  }

  ngOnDestroy() {
    // Desuscribirse del observable al destruir el componente
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }
  }

  async presentLoading(message: string) {
    this.loading = await this.loadingController.create({
      message: message,
      spinner: 'circular', // Puedes cambiar el estilo del spinner
    });
    await this.loading.present();
  }


  async dismissLoading() {
    if (this.loading) {
      await this.loading.dismiss();
      this.loading = undefined;
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