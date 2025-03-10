import { FirestoreService } from '../services/firebase.service';
import { booleanAttribute, Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { AlertController, NavController, LoadingController, ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';

// Define el componente principal para la página de dispositivos
@Component({
  selector: 'app-divices', // Identificador del componente en las plantillas HTML
  templateUrl: './divices.page.html', // Ruta al archivo de plantilla HTML
  styleUrls: ['./divices.page.scss'], // Ruta al archivo de estilos SCSS
})
export class DivicesPage implements OnInit {
  // Propiedad que controla el estado del toggle (Armado/Desarmado)
  isArmed: boolean = false;
  // Almacena el estado real del sistema leído desde Firestore
  actualState: boolean = false;
  // ID del usuario, obtenido de almacenamiento local o de sesión
  userId: string | null = null;
  // MAC del dispositivo actual, que será leída desde Firestore
  deviceMAC: string | null = null;
  // Lista de dispositivos, almacenados como objetos
  devices = [];
  // Lista de suscripciones para manejarlas y evitar fugas de memoria
  subscriptions: Subscription[] = [];
  // Controla si se puede realizar una escritura en Firestore
  canWrite: boolean = true;
  alarmActive: boolean = false; // Estado inicial de la alarma

  // Constructor: inicializa servicios necesarios
  constructor(
    private toastController: ToastController, // Controlador para mostrar notificaciones
    private firestoreService: FirestoreService, // Servicio para interactuar con Firestore
    private navCtrl: NavController, // Navegación entre páginas
    private cdr: ChangeDetectorRef, // Inyectar ChangeDetectorRef
    private alertController: AlertController
  ) { }

  // Método que se ejecuta al inicializar el componente
  ngOnInit() {
    // Obtiene el ID del usuario desde almacenamiento local o de sesión
    this.userId = localStorage.getItem('uid') || sessionStorage.getItem('uid');
    // Define la ruta en Firestore para obtener datos del usuario
    const userPath = 'Usuarios/' + this.userId;
    // Llama al método para agregar dispositivos al panel
    this.addDevicesPanel(userPath);

    // Suscripción a cambios en tiempo real desde la colección "/Estado"
    const stateSubscription = this.firestoreService.dataChanges$.subscribe((data) => {
      console.log('Cambio detectado en /Estado:', data); // Log para depuración
      this.actualState = data.Estado; // Actualiza el estado actual del sistema
      this.isArmed = this.actualState;
      this.cdr.detectChanges(); // Notifica a Angular de cambios para actualizar la vista 

    });
    this.subscriptions.push(stateSubscription); // Almacena la suscripción para manejarla luego
  }

  // Método para agregar los dispositivos al panel de la interfaz
  async addDevicesPanel(userPath: string) {
    // Lee los datos del usuario desde Firestore
    const readData = await this.firestoreService.readData(userPath);

    // Verifica si existen dispositivos asociados al usuario
    if (readData.Dispositivos) {
      // Si es un array, lo asigna directamente; si no, lo convierte en array
      this.deviceMAC = Array.isArray(readData.Dispositivos)
        ? readData.Dispositivos
        : readData.Dispositivos.split(',');
    }

    console.log('Lista de dispositivos:', this.deviceMAC); // Muestra los dispositivos en consola
    // Si no es un array válido, muestra un error y detiene la ejecución
    if (!Array.isArray(this.deviceMAC)) {
      console.error('deviceMAC no es un array:', this.deviceMAC);
      return;
    }
    // Itera sobre cada MAC del dispositivo
    this.deviceMAC?.forEach((mac: string) => {
      // Define la ruta específica del dispositivo en Firestore
      const devicePath = `ESP32/${mac}`;
      // Guarda la MAC del dispositivo en almacenamiento local
      localStorage.setItem('mac', mac);
      console.log('Mac guardada: ', mac); // Log para depuración

      // Configura la lógica para escuchar cambios en el dispositivo específico
      this.firestoreService.readDataAndSubscribe(devicePath);

      // Suscripción para manejar los datos actualizados del dispositivo
      this.firestoreService.dataChanges$.subscribe((deviceData) => {
        console.log(`Datos actualizados para ${mac}:`, deviceData); // Log de datos actualizados

        // Busca si el dispositivo ya existe en la lista
        const existingDevice = this.devices.find((device) => device.Mac === mac);

        if (existingDevice) {
          // Si existe, actualiza su estado y color
          existingDevice.status = deviceData.Estado ? 'Armado' : 'Desarmado';
          existingDevice.color = deviceData.Estado ? 'success' : 'danger';
        } else {
          // Si no existe, lo agrega como un nuevo dispositivo
          this.devices.push({
            name: deviceData.Nombre, // Nombre del dispositivo
            icon: 'home', // Ícono para mostrar en la interfaz
            status: deviceData.Estado ? 'Armado' : 'Desarmado', // Estado
            color: deviceData.Estado ? 'success' : 'danger', // Color según el estado
            Mac: mac, // MAC del dispositivo
          });
        }
      });
    });
  }

  // Método para leer el estado del sistema desde Firestore
  readStatus() {
    const path = 'ESP32/' + this.deviceMAC + '/Estado'; // Ruta a los datos de estado
    this.firestoreService.readDataAndSubscribe(path); // Lee y escucha cambios en la ruta
  }

  // Método para escribir el estado del sistema en Firestore
  async handleToggleChange() {
    const previousState = this.isArmed; // Guarda el estado anterior del toggle
    this.canWrite = false; // Desactiva el toggle
    const path = 'ESP32/' + this.deviceMAC + '/Answer'; // Ruta para escribir el estado

    try {
      // Intenta escribir el nuevo estado en Firestore
      await this.firestoreService.writeData(path, this.isArmed);

      // Simula un retraso de 6 segundos para esperar confirmación
      setTimeout(async () => {
        // Después del retraso, verifica si el estado en Firestore coincide con el esperado
        const currentState = await this.firestoreService.readData('ESP32/' + this.deviceMAC + '/Estado');
        if (currentState === this.isArmed) {
          console.log('El estado de la alarma:', currentState); // Confirmación exitosa
          this.actualState = this.isArmed; // Actualiza el estado real
          this.presentToast(`Estado cambiado a: ${this.isArmed ? 'Armado' : 'Desarmado'}`);
        } else {
          this.isArmed = currentState; // Revertir el toggle al estado anterior
          this.cdr.detectChanges(); // Forzar la detección de cambios
          this.presentToast('No tuvimos respuesta de la alarma.');
          await this.firestoreService.writeData(path, this.isArmed);
          console.log('Este es el estado revestido: ', this.isArmed);
        }
        this.canWrite = true; // Reactiva el toggle
      }, 6000);
    } catch (error) {
      console.error('Error al cambiar el estado:', error);
      this.isArmed = previousState; // Revertir el toggle al estado anterior en caso de error
      this.presentToast('Ocurrió un error al cambiar el estado.');
      this.canWrite = true; // Reactiva el toggle
    }
  }
  /*async handleAlarmActivation() {
    // Mostrar alerta de confirmación
    const alert = await this.alertController.create({
      header: 'Confirmación',
      message: '¿Desea activar la bengala?',
      buttons: [
        {
          text: 'No',
          role: 'cancel',
          handler: async () => {
            await alert.dismiss(); // Cierra la alerta
            this.canWrite = true; // Reactivar el botón si se cancela
          }
        },
        {
          text: 'Sí',
          handler: async () => {
            await alert.dismiss(); // Cierra la alerta inmediatamente

            this.canWrite = false; // Desactivar el botón temporalmente
            const pathApp = 'ESP32/' + this.deviceMAC + '/DisparoApp';
            const pathESP = 'ESP32/' + this.deviceMAC + '/DisparoESP';

            try {
              // Escribir "true" en la ruta /DisparoApp
              await this.firestoreService.writeData(pathApp, true);
              console.log('Disparo solicitado en /DisparoApp');

              // Esperar 6 segundos antes de verificar la respuesta
              await this.sleep(6000);

              // Leer el estado desde /DisparoESP
              const currentState = await this.firestoreService.readData(pathESP);
              console.log('Estado de /DisparoESP:', currentState);

              if (currentState === true) {
                // Confirmación exitosa
                this.presentToastP('BENGALAS DISPARADAS', 'danger');

                // Poner DisparoApp y DisparoESP en false para resetear
                await this.firestoreService.writeData(pathApp, false);
                await this.firestoreService.writeData(pathESP, false);
              } else {
                // No se obtuvo respuesta esperada
                this.presentToastP('No obtuvimos respuesta de la alarma. Verifica la conexión.', 'warning');

                // Poner DisparoApp en false para resetear
                await this.firestoreService.writeData(pathApp, false);
              }
            } catch (error) {
              console.error('Error al activar la alarma:', error);
              this.presentToastP('Ocurrió un error. Inténtalo de nuevo.', 'danger');
            } finally {
              this.canWrite = true; // Reactivar el botón
            }
          }
        }
      ]
    });

    await alert.present();
  }*/
//AQUI CAMBIO
async handleAlarm() {
  if (this.alarmActive) {
    // Lógica para desactivar la alarma
    await this.deactivateAlarm();
  } else {
    // Lógica para activar la alarma
    await this.activateAlarm();
  }
}

async activateAlarm() {
  const alert = await this.alertController.create({
    header: 'Confirmación',
    message: '¿Desea activar la bengala?',
    buttons: [
      {
        text: 'No',
        role: 'cancel',
        handler: async () => {
          await alert.dismiss();
          this.canWrite = true; // Reactivar el botón si se cancela
        }
      },
      {
        text: 'Sí',
        handler: async () => {
          await alert.dismiss();
          this.canWrite = false; // Desactivar el botón temporalmente

          const pathApp = 'ESP32/' + this.deviceMAC + '/DisparoApp';

          try {
            // Leer el valor actual de DisparoApp
            const currentData = (await this.firestoreService.readData(pathApp)) || {};
            await this.sleep(500); // Espera de 500 ms

            // Obtener la fecha y hora actual
            let timestamp = new Date().toISOString();
            timestamp = timestamp.replace(/[:.]/g, '_').replace('T', '_').replace('Z', '');

            // Agregar la nueva entrada con valor `true`
            currentData[timestamp] = true;

            // Escribir el diccionario actualizado en Firestore
            await this.firestoreService.writeData(pathApp, currentData);
            console.log('Disparo solicitado en /DisparoApp con datos:', currentData);
            await this.sleep(500); // Espera de 500 ms

            // Cambiar el estado de la alarma a activa
            this.alarmActive = true;

            // Mostrar notificación de éxito
            this.presentToastP('Alarma activada.', 'success');
          } catch (error) {
            console.error('Error al activar la alarma:', error);
            this.presentToastP('Ocurrió un error al activar la alarma. Inténtalo de nuevo.', 'danger');
          } finally {
            this.canWrite = true; // Reactivar el botón
          }
        }
      }
    ]
  });

  await alert.present();
}

async deactivateAlarm() {
  const pathApp = 'ESP32/' + this.deviceMAC + '/DisparoApp';

  try {
    // Leer el valor actual de DisparoApp
    const currentData = (await this.firestoreService.readData(pathApp)) || {};
    await this.sleep(500); // Espera de 500 ms

    // Obtener la fecha y hora actual
    let timestamp = new Date().toISOString();
    timestamp = timestamp.replace(/[:.]/g, '_').replace('T', '_').replace('Z', '');

    // Agregar la nueva entrada con valor `false`
    currentData[timestamp] = false;

    // Escribir el diccionario actualizado en Firestore
    await this.firestoreService.writeData(pathApp, currentData);
    console.log('Desactivación solicitada en /DisparoApp con datos:', currentData);
    await this.sleep(500); // Espera de 500 ms

    // Cambiar el estado de la alarma a inactiva
    this.alarmActive = false;

    // Mostrar notificación de éxito
    this.presentToastP('Alarma desactivada.', 'success');
  } catch (error) {
    console.error('Error al desactivar la alarma:', error);
    this.presentToastP('Ocurrió un error al desactivar la alarma. Inténtalo de nuevo.', 'danger');
  } finally {
    this.canWrite = true; // Reactivar el botón
  }
}

//TERMINA CAMBIO
  // Función sleep para manejar retrasos
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Función para mostrar notificaciones (Toast)
  private async presentToastP(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }


  // Método para obtener el estado del sistema como texto
  getSystemStatus() {
    return this.actualState ? 'Armado' : 'Desarmado'; // Devuelve el estado como texto
  }

  // Método para obtener el color del estado del sistema
  getSystemStatusColor() {
    return this.actualState ? 'success' : 'danger'; // Devuelve el color según el estado
  }

  // Método que se ejecuta al destruir el componente
  ngOnDestroy() {
    // Desuscribe todas las suscripciones para evitar fugas de memoria
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  // Navega a la página de configuración
  navConfig() {
    this.navCtrl.navigateRoot('/congifuracion');
  }

  // Navega a la página de inicio
  addDevices() {
    this.navCtrl.navigateRoot('/home');
  }

  async confirmLogout() {
    // Crear la alerta de confirmación
    const alert = await this.alertController.create({
      header: 'Confirmación',
      message: '¿Está seguro de que desea cerrar sesión?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          handler: () => {
            console.log('Cierre de sesión cancelado'); // Log si cancela
          }
        },
        {
          text: 'Cerrar sesión',
          handler: async () => {
            // Llamar al método de cierre de sesión
            await this.logout();
          }
        }
      ]
    });
  
    // Mostrar la alerta
    await alert.present();
  }

  // Método para cerrar la sesión del usuario
  async logout() {
    try {
      // Espera hasta que la sesión se cierre completamente
      await this.firestoreService.logOut();
      console.log('Sesión cerrada con éxito'); // Log de éxito

      // Añadir un pequeño retraso para asegurar que los tokens se eliminen
      await new Promise(resolve => setTimeout(resolve, 200));

      // Redirige al login después de cerrar sesión correctamente
      this.navCtrl.navigateRoot('/login');
    } catch (error) {
      console.log('Error al cerrar sesión:', error); // Log de error
    }
  }

  // Método para mostrar un mensaje emergente en pantalla
  async presentToast(msg: string) {
    const toast = await this.toastController.create({
      message: msg, // Mensaje a mostrar
      duration: 2000, // Duración del mensaje en milisegundos
      position: 'bottom', // Posición del mensaje en pantalla
    });
    await toast.present(); // Muestra el mensaje
  }
}