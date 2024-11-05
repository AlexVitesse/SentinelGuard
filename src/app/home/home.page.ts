import { Component, ViewChild, ChangeDetectorRef } from '@angular/core';
import { BleClient, ScanResult } from '@capacitor-community/bluetooth-le';
import { AlertController, Platform, ToastController, IonModal, LoadingController, NavController } from '@ionic/angular';
import { OverlayEventDetail } from '@ionic/core/components';


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
  
    // Definición de constantes para los UUIDs
    private readonly SERVICE_UUID = "12345678-1234-5678-1234-56789abcdef0";
    private readonly SSID_CHAR_UUID = "87654321-4321-6789-4321-fedcba987654";
    private readonly PASSWORD_CHAR_UUID = "fedcba98-7654-4321-5678-123456789abc";
    private readonly CHATID_CHAR_UUID = "abcdef12-1234-5678-4321-fedcba987654";
    private readonly CHATID_GROUP_CHAR_UUID = "8da38bf8-fa8d-456e-aac9-77d3fc1a345d";
    private readonly LOCATION_CHAR_UUID =     "12345678-8765-4321-8765-1234567890ab"; // UUID para la Ubicación
    private readonly STATUS_CHAR_UUID = "abcdef12-3456-7890-abcd-ef1234567890"; // UUID para la característica de estado
    private readonly LIST_CHAR_UUID = "b2b9ccea-27e3-426e-adca-5ca11863133a";
    private scanInterval: any; // Variable para almacenar el intervalo de escaneo
    private bluetoothMonitorInterval: any; // Variable para almacenar el intervalo de monitorización
  
    constructor(
      private alertController: AlertController,
      private toastController: ToastController,
      private platform: Platform,
      private cdr: ChangeDetectorRef,
      private loadingController: LoadingController, // Agrega el LoadingController
      private navCtrl: NavController,
    ) 
  {
        this.platform.ready().then(async () => {
          try {
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
                  if(this.isBreak == true){
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
  

  

              async connect(deviceId: string) {
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
              }
              

  // Nueva función para leer las características BLE
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
    this.isConnecting = false;
    this.currentDeviceId = null;
    this.clearInputFields();
    this.devices.forEach(device => device.isConnected = false);
    this.startBluetoothMonitor();
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
      this.isScanning= true;
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

  confirm() {
    console.log('Confirmado');
    this.isConfirming = true;
    this.presentLoading("Cargando...");
    this.writeWifiCredentials();
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

  handleStatusNotification(value: DataView) {
    const status = new TextDecoder().decode(value.buffer);
    console.log('Estado recibido:', status);

    if (status === 'Wi-Fi Connected') {
      this.presentToast('Conectado a Wi-Fi exitosamente.');
      this.modal.dismiss(null, 'confirm');
      this.dismissLoading();
      this.clearInputFields();
      this.stopScan();
      this.navCtrl.navigateRoot('/divices');
    } else if (status === 'Wi-Fi Connection Failed') {
      this.dismissLoading();
      this.presentToast('SSID o PASSWORD incorrecta.');
    } else {
      this.dismissLoading();
      //this.presentToast('Estado no reconocido: ' + status);
      console.log('Estado recibido:', status);
      this.SSIDsList = status.split(',');
    }
    this.isConfirming = false;
  }

  stringToBytes(str: string): Uint8Array {
    const encoder = new TextEncoder();
    return encoder.encode(str);
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