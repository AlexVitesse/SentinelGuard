import { Component, ViewChild, ChangeDetectorRef } from '@angular/core';
import { BleClient, ScanResult } from '@capacitor-community/bluetooth-le';
import { AlertController, Platform, ToastController, IonModal, LoadingController, NavController } from '@ionic/angular';
import { OverlayEventDetail } from '@ionic/core/components';
import { FirestoreService } from '../services/firebase.service';


@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  @ViewChild(IonModal) modal: IonModal;
  devices: Array<{ device: ScanResult, isConnected: boolean }> = [];
  receivedData: string = '';
  isConnecting: boolean = false;
  bleConnect: boolean = false;
  isScanning: boolean = false;
  wifiSSID: string = '';
  wifiPassword: string = '';
  chatId: string = '';
  chatIdG: string = '';
  location: string = '';
  SSIDs: string = '';
  currentDeviceId: string | null = null;
  isBreak: boolean = false;
  isCorrect: boolean = false;
  SSIDsList = [];  // Definimos la lista para almacenar los SSIDs
  loading: HTMLIonLoadingElement | undefined;
  isConfirming: boolean = false;
  userId: string | null = null;
  isManualInput: boolean = false; // Bandera para mostrar el campo manual
  isWifiConnect: boolean = false;
  //deviceMAC: string | null = null;

  // Definición de constantes para los UUIDs
  private readonly SERVICE_UUID = "12345678-1234-5678-1234-56789abcdef0";
  private readonly SSID_CHAR_UUID = "87654321-4321-6789-4321-fedcba987654";
  private readonly PASSWORD_CHAR_UUID = "fedcba98-7654-4321-5678-123456789abc";
  private readonly CHATID_CHAR_UUID = "abcdef12-1234-5678-4321-fedcba987654";
  private readonly CHATID_GROUP_CHAR_UUID = "8da38bf8-fa8d-456e-aac9-77d3fc1a345d";
  private readonly LOCATION_CHAR_UUID = "12345678-8765-4321-8765-1234567890ab"; // UUID para la Ubicación
  private readonly STATUS_CHAR_UUID = "abcdef12-3456-7890-abcd-ef1234567890"; // UUID para la característica de estado
  private scanInterval: any; // Variable para almacenar el intervalo de escaneo
  private bluetoothMonitorInterval: any; // Variable para almacenar el intervalo de monitorización

  constructor(
    private alertController: AlertController,
    private toastController: ToastController,
    private platform: Platform,
    private cdr: ChangeDetectorRef,
    private loadingController: LoadingController, // Agrega el LoadingController
    private navCtrl: NavController,
    private firestoreService: FirestoreService
  ) {
    this.platform.ready().then(async () => {
      try {
        this.userId = localStorage.getItem('uid') || sessionStorage.getItem('uid');
        await BleClient.initialize({ androidNeverForLocation: true });
        console.log('BleClient initialized');
        this.checkBluetoothEnabled();
        this.scanInterval = setInterval(() => {
          if (!this.isScanning && !this.isConnecting) { // Solo escanear si no está escaneando ni conectando
            this.listDevices();
          }
        }, 6000);
      } catch (error) {
        console.error('Error initializing BleClient', error);
      }
    });
  }


  habilitar() {
    BleClient.enable().then(
      response => {
        this.presentToast('Bluetooth está encendido');
        console.log("Bluetooth está encendido");
        this.bleConnect = true;
        this.startBluetoothMonitor();
      },
      error => {
        this.presentToast('Error al intentar encender, enciende de manera manual');
        BleClient.requestEnable();
        console.log("no se pudo");
      }
    );
  }

  async checkBluetoothEnabled() {
    try {
      const isEnabled = await BleClient.isEnabled();
      if (!isEnabled) {
        await this.showAlert('Bluetooth está apagado. Por favor, enciéndelo.', 'activar');
        return false;
      }
      this.bleConnect = true;
      this.startBluetoothMonitor();
      return true;
    } catch (error) {
      console.error('Error al verificar Bluetooth:', error);
      return false;
    }
  }


  startBluetoothMonitor() {
    this.bluetoothMonitorInterval = setInterval(async () => {
      try {
        if (this.isBreak == true) {
          console.warn("EL MONITOR ESTA ACTIVO PERO EL FRENO SE ACTIVO");
          return;
        }
        console.log("Continua..")
        const isEnabled = await BleClient.isEnabled();

        if (!isEnabled) {
          console.warn('Bluetooth está apagado');
          this.bleConnect = false;
          this.stopScan();
          this.stopBluetoothMonitor();

          const userAction = await this.showAlert('Bluetooth está apagado. Por favor, enciéndelo.', 'activar');
        } else {
          console.log('Bluetooth está encendido');
          this.bleConnect = true;
          this.isScanning = false;
          this.isConnecting = false;
        }
      } catch (error) {
        console.error('Error al verificar el estado de Bluetooth:', error);
      }
    }, 6000);
  }


  stopBluetoothMonitor() {
    this.isBreak = false;
    this.isScanning = true;
    if (this.bluetoothMonitorInterval) {
      clearInterval(this.bluetoothMonitorInterval);
      this.bluetoothMonitorInterval = null;
    }
  }
  /*
  async connect(deviceId: string) {
    this.stopScan();
    const device = this.devices.find(dev => dev.device.device.deviceId === deviceId);
    if (device) {
      device.isConnected = true;
      this.isConnecting = true;
      console.log(device);

      // Mostrar el loading al iniciar la conexión
      this.presentLoading("Conectando...");

      try {
        await BleClient.connect(deviceId, (deviceId) => this.onDisconnect(deviceId));
        this.stopScan();
        this.presentToast('Conectado al dispositivo');
        this.currentDeviceId = deviceId;
        await this.readCharacteristics();
        await this.subscribeToStatusCharacteristic();  // Llamada a la suscripción
        this.dismissLoading(); // Ocultar el loading una vez completada la conexión
        this.modal.present(); // Presentar el modal después de ocultar el loading
      } catch (error) {
        console.error('Error al conectar al dispositivo:', error);
        device.isConnected = false;
        this.isConnecting = false;
        this.dismissLoading(); // Asegurarse de ocultar el loading en caso de error
      }
    }
  }*/

  //Nueva funcion de connect
  async connect(deviceId: string) {
    this.stopScan();
    const device = this.devices.find(dev => dev.device.device.deviceId === deviceId);

    if (device) {
      device.isConnected = false;
      this.isConnecting = true;

      // Mostrar el loading al iniciar la conexión
      await this.presentLoading("Conectando...");

      let attempts = 0;
      const maxAttempts = 3;
      let connected = false;

      while (attempts < maxAttempts && !connected) {
        attempts++;
        console.log(`Intento ${attempts} de conexión al dispositivo: ${deviceId}`);

        try {
          // Intentar conectar
          await BleClient.connect(deviceId, (deviceId) => this.onDisconnect(deviceId));
          connected = true; // Si la conexión es exitosa, marcar como conectado
          device.isConnected = true;
          this.currentDeviceId = deviceId;

          // Leer y suscribir características
          await this.readCharacteristics();
          await this.subscribeToStatusCharacteristic();

          // Mostrar éxito y salir del ciclo
          this.presentToast('Conectado al dispositivo');
          this.modal.present(); // Mostrar el modal tras la conexión
        } catch (error) {
          console.error(`Error al conectar al dispositivo en el intento ${attempts}:`, error);
        }
      }

      // Ocultar el loading después de los intentos (exitosos o no)
      this.dismissLoading();

      if (!connected) {
        console.log('No se pudo conectar al dispositivo después de 3 intentos.');
        this.presentToast('Error: No se pudo conectar al dispositivo después de varios intentos.');
        this.isConnecting = false;
      }
    } else {
      console.error('Dispositivo no encontrado en la lista.');
    }
  }



  async readCharacteristics() {
    if (!this.currentDeviceId) {
      console.error('No hay dispositivo conectado.');
      return;
    }

    try {
      /*// Leer SSID
      const ssidData = await BleClient.read(
          this.currentDeviceId,
          this.SERVICE_UUID,
          this.SSID_CHAR_UUID
      );
      this.wifiSSID = new TextDecoder().decode(ssidData); // Actualiza la variable wifiSSID*/

      // Leer Password
      const passwordData = await BleClient.read(
        this.currentDeviceId,
        this.SERVICE_UUID,
        this.PASSWORD_CHAR_UUID
      );
      this.wifiPassword = new TextDecoder().decode(passwordData); // Actualiza la variable wifiPassword

      // Leer ChatID
      const chatIdData = await BleClient.read(
        this.currentDeviceId,
        this.SERVICE_UUID,
        this.CHATID_CHAR_UUID
      );
      this.chatId = new TextDecoder().decode(chatIdData); // Actualiza la variable chatId

      // Leer ChatID
      const chatIdGData = await BleClient.read(
        this.currentDeviceId,
        this.SERVICE_UUID,
        this.CHATID_GROUP_CHAR_UUID
      );
      this.chatIdG = new TextDecoder().decode(chatIdGData); // Actualiza la variable chatId


      // Leer location
      const locationData = await BleClient.read(
        this.currentDeviceId,
        this.SERVICE_UUID,
        this.LOCATION_CHAR_UUID
      );
      this.location = new TextDecoder().decode(locationData); // Actualiza la variable location

      // Forzar a Angular a actualizar los campos de entrada en la UI
      this.cdr.detectChanges();
      console.log('Valores leídos y actualizados en la UI.');
    } catch (error) {
      console.error('Error al leer las características BLE:', error);
      console.error('Mensaje de error:', error.message);

      this.presentToast('Error al leer los valores almacenados.');
    }
  }

  /*
    onDisconnect(deviceId: string) {
      console.log('device ${deviceId} disconnected');
      this.isConnecting = false;
      this.currentDeviceId = null; // Restablecer el ID del dispositivo conectado
      this.startBluetoothMonitor();
    }
  */
  onDisconnect(deviceId: string) {
    console.log(`device ${deviceId} disconnected`);
    //this.isConnecting = false;
    this.currentDeviceId = null;
    this.clearInputFields();
    this.devices.forEach(device => device.isConnected = false);
    //this.startBluetoothMonitor();
    this.listDevices();
  }


  handleRefresh(event: any, action: string) {
    if (action === 'listDevices') {
      console.log("...");
      this.listDevices(); // Llama a la función específica
    }
    // Completar el refresher después de un tiempo
    setTimeout(() => {
      event.target.complete(); // Detiene la animación del refresher
    }, 3000);
  }

  clearInputFields() {
    this.wifiSSID = '';
    this.wifiPassword = '';
    this.chatId = '';
    this.chatIdG = '';
    this.location = '';
    this.cdr.detectChanges();
  }

  listDevices() {
    const options = {
      services: [],
      allowDuplicates: true,
    };



    this.isScanning = true;
    this.devices = []; // Limpiar la lista antes de escanear

    BleClient.requestLEScan(options, (result: ScanResult) => {
      //console.log("..")
      const deviceExists = this.devices.some(device => device.device.device.deviceId === result.device.deviceId);

      // Filtrar por nombre del dispositivo
      const deviceName = result.device.name || '';
      const isDesiredDevice = deviceName.includes('ESP');

      if (!deviceExists && isDesiredDevice) {
        this.stopBluetoothMonitor(); // Detiene el monitoreo
        this.devices.push({ device: result, isConnected: false });
        console.log("DISPOSTIVO ENCONTRADO");
        this.presentToast("Dispositivo encontrado: " + deviceName);
      }
      this.cdr.detectChanges();
    }).catch((error: any) => {
      this.showAlert('Error listando dispositivos, dispositivo no compatible: ' + error, 'reintentar');
      this.isScanning = true;
      this.isConnecting = true;
      this.stopBluetoothMonitor();
      this.stopScan();
      console.log('Error listando dispositivos: ' + error);
    });
  }


  stopScan() {
    if (this.isScanning) {
      BleClient.stopLEScan();
      this.isScanning = false;
      console.log('Escaneo detenido');
    }
  }

  /*
  cancel() {
    this.modal.dismiss(null, 'cancel');
    this.stopScan();
  }
    */
  cancel(deviceId: string) {
    this.modal.dismiss(null, 'cancel');
    this.stopScan();
    //this.onDisconnect(deviceId);
  }

  /*//Esta funcion funciona pero se mejoro
  confirm() {
    console.log('Confirmado');
    this.isConfirming = true;
    this.presentLoading("Cargando...");
    this.writeWifiCredentials();
  }*/
  
  /*
  async confirm() {
    console.log('Confirmado');
    this.isConfirming = true;
    await this.presentLoading("Cargando...");
  
    // Intentar escribir credenciales hasta 2 veces
    for (let attempt = 1; attempt <= 2; attempt++) {
      await this.writeWifiCredentials();
      console.log('Estado de isconfirming: ', this.isConfirming);
      if (!this.isConfirming) break; // Salir si la conexión fue confirmada
      const success = await this.waitForConfirmation(15000); // Esperar 10 segundos
  
      if (success) {
        console.log('Conexión confirmada.');
        return; // Salir si la confirmación fue exitosa
      } else {
        console.warn(`Intento ${attempt} fallido.`);
      }
    }
  
    this.dismissLoading();
    this.presentToast('No se pudo confirmar la conexión. Inténtalo nuevamente.');
    this.isConfirming = false;
  }*/
  
    async confirm() {
      console.log('Confirmado');
      this.isConfirming = true;
      await this.presentLoading("Cargando...");
    
      // Escribir las credenciales
      await this.writeWifiCredentials();
    
      console.log('Estado inicial de isConfirming: ', this.isConfirming);
    
      // Esperar hasta 20 segundos para confirmar la conexión
      const success = await this.waitForConfirmation(25000); // Espera 20 segundos
    
      if (success) {
        console.log('Conexión confirmada.');
        return; // Salir si la confirmación fue exitosa
      }
    
      // Si no se confirmó, notificar al usuario
      console.warn('Conexión no confirmada después de 20 segundos.');
      this.dismissLoading();
      this.presentToast('No se pudo confirmar la conexión. Inténtalo nuevamente.');
      this.isConfirming = false;
    }
    
    async waitForConfirmation(timeout: number): Promise<boolean> {
      const startTime = Date.now();
    
      while (Date.now() - startTime < timeout) {
        if (!this.isConfirming) {
          return true; // Confirmación exitosa
        }
        await this.sleep(500); // Esperar 500ms antes de verificar nuevamente
      }
    
      return false; // Tiempo agotado
    }
    



  onWillDismiss(event: Event) {
    const ev = event as CustomEvent<OverlayEventDetail<string>>;
    if (ev.detail.role === 'confirm') {
      // this.message = Hello, ${ev.detail.data}!;
    }
  }

  async writeWifiCredentials() {
    if (!this.wifiSSID || !this.wifiPassword) {
      this.presentToast('Por favor, introduce el SSID, la contraseña');
      return;
    }

    try {
      const ssidBytes = this.stringToBytes(this.wifiSSID);
      const passwordBytes = this.stringToBytes(this.wifiPassword);
      const chatIdBytes = this.stringToBytes(this.chatId);
      const chatIdGBytes = this.stringToBytes(this.chatIdG);
      const locationBytes = this.stringToBytes(this.location);
      const ssidDataView = new DataView(ssidBytes.buffer);
      const passwordDataView = new DataView(passwordBytes.buffer);
      const chatIdDataView = new DataView(chatIdBytes.buffer);
      const chatIdGDataView = new DataView(chatIdGBytes.buffer);
      const locationDataView = new DataView(locationBytes.buffer);

      await BleClient.write(
        this.currentDeviceId as string, // deviceId del dispositivo actualmente conectado
        this.SERVICE_UUID,
        this.SSID_CHAR_UUID,
        ssidDataView
      );

      await BleClient.write(
        this.currentDeviceId as string,
        this.SERVICE_UUID,
        this.PASSWORD_CHAR_UUID,
        passwordDataView
      );

      await BleClient.write(
        this.currentDeviceId as string,
        this.SERVICE_UUID,
        this.CHATID_CHAR_UUID,
        chatIdDataView
      );

      await BleClient.write(
        this.currentDeviceId as string,
        this.SERVICE_UUID,
        this.CHATID_GROUP_CHAR_UUID,
        chatIdGDataView
      );

      await BleClient.write(
        this.currentDeviceId as string,
        this.SERVICE_UUID,
        this.LOCATION_CHAR_UUID,
        locationDataView
      );
      this.presentToast('Credenciales de WiFi actualizadas correctamente.');
    } catch (error) {
      console.error('Error al escribir en las características Bluetooth:', error);
    }
  }
/*
  async writeWifiCredentials() {
    if (!this.wifiSSID || !this.wifiPassword) {
      this.presentToast('Por favor, introduce el SSID y la contraseña.');
      return;
    }
  
    try {
      // Crear objetos DataView para las credenciales
      const characteristics = [
        { uuid: this.SSID_CHAR_UUID, value: this.stringToBytes(this.wifiSSID) },
        { uuid: this.PASSWORD_CHAR_UUID, value: this.stringToBytes(this.wifiPassword) },
        { uuid: this.CHATID_CHAR_UUID, value: this.stringToBytes(this.chatId) },
        { uuid: this.CHATID_GROUP_CHAR_UUID, value: this.stringToBytes(this.chatIdG) },
        { uuid: this.LOCATION_CHAR_UUID, value: this.stringToBytes(this.location) }
      ];
  
      // Escribir las credenciales mediante una función reutilizable
      for (const char of characteristics) {
        await this.writeCharacteristic(this.currentDeviceId, this.SERVICE_UUID, char.uuid, char.value);
      }
  
      this.presentToast('Credenciales de WiFi actualizadas correctamente.');
    } catch (error) {
      console.error('Error al escribir las credenciales:', error);
    }
  }
  async writeCharacteristic(deviceId: string, serviceUUID: string, charUUID: string, value: ArrayBuffer) {
    const dataView = new DataView(value);
    await BleClient.write(deviceId, serviceUUID, charUUID, dataView);
  }*/
  /*
      async subscribeToStatusCharacteristic() {
        if (!this.currentDeviceId) {
          console.error('No hay dispositivo conectado.');
          return;
        }
        try {
          await BleClient.startNotifications(
            this.currentDeviceId,
            this.SERVICE_UUID,
            this.STATUS_CHAR_UUID,
            (value) => {
              this.handleStatusNotification(value); // Asigna el valor recibido
              this.cdr.detectChanges();
            }
          );
          console.log('Suscripción a la característica de estado exitosa.');
        } catch (error) {
          console.error('Error al suscribirse a la característica de estado:', error);
          this.presentToast('Error al suscribirse a la característica de estado.');
        }
      }*/

  async subscribeToStatusCharacteristic() {
    if (!this.currentDeviceId) {
      console.error('No hay dispositivo conectado.');
      return;
    }

    const maxAttempts = 3;
    let attempts = 0;
    let subscribed = false;

    while (attempts < maxAttempts && !subscribed) {
      attempts++;
      console.log(`Intento ${attempts} de suscripción a la característica de estado.`);

      try {
        await BleClient.startNotifications(
          this.currentDeviceId,
          this.SERVICE_UUID,
          this.STATUS_CHAR_UUID,
          (value) => {
            this.handleStatusNotification(value); // Asigna el valor recibido
            this.cdr.detectChanges();
          }
        );
        subscribed = true; // Marcar como suscrito si la operación es exitosa
        console.log('Suscripción a la característica de estado exitosa.');
      } catch (error) {
        console.error(`Error en el intento ${attempts} de suscribirse a la característica de estado:`, error);

        if (attempts < maxAttempts) {
          console.log('Esperando antes de reintentar...');
          await this.pause(1000); // Pausa de 1 segundo antes de intentar nuevamente
        }
      }
    }

    if (!subscribed) {
      console.error('No se pudo suscribir a la característica de estado después de varios intentos.');
      this.presentToast('Error: No se pudo suscribir a la característica de estado.');
    }
  }

  pause(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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
  /*
  async handleStatusNotification(value: DataView) {
    const status = new TextDecoder().decode(value.buffer);
    console.log('Estado recibido:', status);

    if (status === 'Wi-Fi Connected') {
      this.presentToast('Conectado a Wi-Fi exitosamente.');
      this.modal.dismiss(null, 'confirm');
      this.stopScan();
      this.createDevice();

      const deviceAdded = await this.addDevice(); // Esperamos el resultado de la operación

      if (deviceAdded) {
        this.clearInputFields();
        this.dismissLoading();
        this.presentLoading('Espera 30 segundos Alarma reiniciando...'); // Mostrar el mensaje de carga
        await this.sleep(30000); // Esperar 30 segundos antes de enviar el comando
        this.dismissLoading();
        this.navCtrl.navigateRoot('/divices'); // Redirigir si el dispositivo fue agregado
      } else {
        this.dismissLoading();
        this.presentToast('No se pudo agregar el dispositivo. Inténtalo de nuevo.');
      }
    } else if (status === 'Wi-Fi Connection Failed') {
      this.dismissLoading();
      this.presentToast('SSID o PASSWORD incorrecta.');
    } else {
      this.dismissLoading();
      console.log('Estado recibido:', status);
      this.SSIDsList = status.split(',');
    }

    this.isConfirming = false;
  }*/
/*
  async handleStatusNotification(value: DataView) {
    const status = new TextDecoder().decode(value.buffer);
    console.log('Estado recibido:', status);
  
    if (status === 'Wi-Fi Connected') {
      this.presentToast('Conectado a Wi-Fi exitosamente.');
      this.modal.dismiss(null, 'confirm');
      this.stopScan();
      this.createDevice();
  
      const deviceAdded = await this.addDevice();
  
      if (deviceAdded) {
        this.clearInputFields();
        this.dismissLoading();
        this.isConfirming = false;
        this.presentLoading('Espera 30 segundos. Alarma reiniciando...');
        await this.sleep(30000);
        this.dismissLoading();
        this.dismissLoading();
        console.log('Redirigiendo a /divices...');
        this.navCtrl.navigateRoot('/divices');
      } else {
        this.dismissLoading();
        this.presentToast('No se pudo agregar el dispositivo. Inténtalo de nuevo.');
      }
    } else if (status === 'Wi-Fi Connection Failed') {
      this.dismissLoading();
      this.presentToast('SSID o PASSWORD incorrecta.');
    } else {
      this.dismissLoading();
      console.log('Estado recibido:', status);
      this.SSIDsList = status.split(',');
    }
  
    //this.isConfirming = false;
  }*/
    async handleStatusNotification(value: DataView) {
      const status = new TextDecoder().decode(value.buffer);
      console.log('Estado recibido:', status);
    
      if (status === 'Wi-Fi Connected') {
        this.presentToast('Conectado a Wi-Fi exitosamente.');
        //this.modal.dismiss(null, 'confirm');
        this.stopScan();
        this.stopBluetoothMonitor();
        this.isConnecting = true;
        this.createDevice();
    
        const deviceAdded = await this.addDevice();
    
        if (deviceAdded) {
          this.dismissLoading();
          this.isConfirming = false;
          
          // Crear y mostrar el loading directamente
          const loadingElement = document.createElement('ion-loading');
          loadingElement.message = 'Espera 30 segundos. Alarma reiniciando...';
          document.body.appendChild(loadingElement);
          await loadingElement.present(); // Mostrar el loading
    
          await this.sleep(30000); // Esperar 30 segundos
    
          await loadingElement.dismiss(); // Cerrar el loading
          document.body.removeChild(loadingElement); // Eliminar el elemento del DOM
    
          console.log('Redirigiendo a /divices...');
          this.clearInputFields();
          this.modal.dismiss(null, 'confirm');
          this.navCtrl.navigateRoot('/divices'); // Navegar después de cerrar el loading
        } else {
          this.presentToast('No se pudo agregar el dispositivo. Inténtalo de nuevo.');
        }
      } else if (status === 'Wi-Fi Connection Failed') {
        this.presentToast('SSID o PASSWORD incorrecta.');
      } else {
        console.log('Estado recibido:', status);
        this.SSIDsList = status.split(',');
      }
    }
    


  stringToBytes(str: string): Uint8Array {
    const encoder = new TextEncoder();
    return encoder.encode(str);
  }
  async addDevice(): Promise<boolean> {
    const userPath = 'Usuarios/' + this.userId;
    const userData = {
      Dispositivos: [this.formatMacAddress(this.currentDeviceId)], // Asocia el dispositivo al usuario
    };

    try {
      // Leer datos del usuario
      const existingUserData = await this.firestoreService.readData(userPath);

      const dispositivos = existingUserData?.Dispositivos || [];

      // Validar si el dispositivo ya existe
      if (!dispositivos.includes(this.formatMacAddress(this.currentDeviceId))) {
        dispositivos.push(this.formatMacAddress(this.currentDeviceId));
        await this.firestoreService.updateData(userPath, { Dispositivos: dispositivos });
        console.log('Dispositivo agregado al usuario.');
        return true; // Operación exitosa
      } else {
        console.log('El dispositivo ya está asociado al usuario.');
        return true; // Ya estaba asociado, pero no es un error
      }
    } catch (error) {
      console.error('Error al verificar o agregar el dispositivo:', error);
      return false;
    }
  }

  async createDevice() {
    const devicesPath = 'ESP32/' + this.formatMacAddress(this.currentDeviceId);
    console.log(devicesPath);

    const deviceWrite = {
      Answer: false, // FALSO ES = APAGADO Y TRUE IGUAL A ENCENDIDO es el de comando
      Estado: false,
      Nombre: this.location,
      Telegram_ID: this.chatId,
      Group_ID: this.chatIdG,
      Tiempo_Bomba: 60,
      Tiempo_pre: 60,
      DisparoApp:false,
      DisparoESP:false
    };

    try {
      // Leer datos del dispositivo
      const existingDeviceData = await this.firestoreService.readData(devicesPath);

      if (existingDeviceData) {
        console.log('El dispositivo ya existe. Verificando si sobrescribir...');

        // Sobrescribir los datos del dispositivo
        await this.firestoreService.updateData(devicesPath, deviceWrite);
        console.log('Datos del dispositivo sobrescritos correctamente.');
        return true; // Operación exitosa
      } else {
        // Crear un nuevo dispositivo si no existe
        await this.firestoreService.writeData(devicesPath, deviceWrite);
        console.log('Datos del dispositivo escritos correctamente.');
        return true; // Operación exitosa
      }
    } catch (error) {
      console.error('Error al verificar o escribir los datos del dispositivo:', error);
      return false;
    }
  }



  formatMacAddress(mac: string): string {
    // Quitar el último carácter y reemplazar ':' con '_'
    return mac.slice(0, -1).replace(/:/g, '_');

  }

  sleep(ms: number): Promise<void> {
    console.log("Tiempo de espera...");
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  handleSSIDChange(event: any): void {
    if (event.detail.value === 'manual') {
      this.isManualInput = true; // Mostrar el input manual
      this.wifiSSID = ''; // Limpiar el valor actual de SSID
    } else {
      this.isManualInput = false; // Ocultar el input manual
    }
  }


  async showAlert(msg: string, opc: string) {
    const alert = await this.alertController.create({
      header: 'Alert',
      message: msg,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => {
            console.log('Acción cancelada');
          }
        },
        {
          text: opc,
          handler: () => {
            if (opc === 'reintentar') {
              this.listDevices();
            } else if (opc === 'activar') {
              this.habilitar();
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async showConfirmAlert(message: string, confirmText: string): Promise<boolean> {
    return new Promise(async (resolve) => {
      const alert = await this.alertController.create({
        header: 'Confirmación',
        message: message,
        buttons: [
          {
            text: 'Cancelar',
            role: 'cancel',
            handler: () => {
              console.log('Acción cancelada por el usuario.');
              resolve(false); // El usuario canceló
            },
          },
          {
            text: confirmText,
            handler: () => {
              console.log('Acción confirmada por el usuario.');
              resolve(true); // El usuario confirmó
            },
          },
        ],
      });
      await alert.present();
    });
  }


  async presentToast(msg: string) {
    const toast = await this.toastController.create({
      message: msg,
      duration: 2000,
      position: 'bottom',
    });

    await toast.present();
  }

  ngOnDestroy() {
    // Detener el intervalo de escaneo cuando el componente se destruye
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
    }
  }
}