import { Component, ViewChild, ChangeDetectorRef } from '@angular/core';
import { BleClient, ScanResult } from '@capacitor-community/bluetooth-le';
import { AlertController, Platform, ToastController, IonModal } from '@ionic/angular';
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
  isScanning: boolean = false;
  wifiSSID: string = '';
  wifiPassword: string = '';
  chatId: string = '';
  currentDeviceId: string | null = null;

  // Definición de constantes para los UUIDs
  private readonly SERVICE_UUID = "12345678-1234-5678-1234-56789abcdef0";
  private readonly SSID_CHAR_UUID = "87654321-4321-6789-4321-fedcba987654";
  private readonly PASSWORD_CHAR_UUID = "fedcba98-7654-4321-5678-123456789abc";
  private readonly CHATID_CHAR_UUID = "abcdef12-1234-5678-4321-fedcba987654";
  private readonly STATUS_CHAR_UUID = "abcdef12-3456-7890-abcd-ef1234567890"; // UUID para la característica de estado

  constructor(
    private alertController: AlertController,
    private toastController: ToastController,
    private platform: Platform,
    private cdr: ChangeDetectorRef,
  ) {
    this.platform.ready().then(async () => {
      try {
        await BleClient.initialize({ androidNeverForLocation: true });
        console.log('BleClient initialized');
        this.blueInitial();
      } catch (error) {
        console.error('Error initializing BleClient', error);
      }
    });
  }

  blueInitial() {
    try {
      BleClient.isEnabled().then(
        response => {
          console.log('Bluetooth is enabled');
          this.listDevices();
        },
        error => {
          console.error('Error checking if Bluetooth is enabled', error);
          this.showAlert('Bluetooth is turned off', 'activar');
        }
      );
    } catch (error) {
      console.error('Error in blueInitial', error);
    }
  }

  habilitar() {
    BleClient.enable().then(
      response => {
        this.presentToast('Bluetooth está encendido');
        console.log("encendido");
      },
      error => {
        this.presentToast('Error al intentar encender');
        BleClient.requestEnable();
        console.log("no se pudo");
      }
    );
  }

  async connect(deviceId: string) {
    const device = this.devices.find(dev => dev.device.device.deviceId === deviceId);
    if (device) {
      device.isConnected = true;
      this.isConnecting = true;
      try {
        await BleClient.connect(deviceId, (deviceId) => this.onDisconnect(deviceId));
        this.presentToast('Conectado al dispositivo');
        this.currentDeviceId = deviceId; // Establecer el ID del dispositivo conectado
        this.subscribeToStatusCharacteristic(); // Suscribirse a las notificaciones de estado
        this.modal.present();
        this.stopScan();
      } catch (error) {
        this.presentToast('Error al intentar conectar');
        console.error('Error al conectar al dispositivo:', error);
        device.isConnected = false;
        this.isConnecting = false;
      }
    }
  }

  onDisconnect(deviceId: string) {
    console.log(`device ${deviceId} disconnected`);
    this.isConnecting = false;
    this.currentDeviceId = null; // Restablecer el ID del dispositivo conectado
  }

  listDevices() {
    const options = {
      services: [],
      allowDuplicates: true,
    };
  
    this.isScanning = true;
    this.devices = []; // Limpiar la lista antes de escanear
  
    BleClient.requestLEScan(options, (result: ScanResult) => {
      const deviceExists = this.devices.some(device => device.device.device.deviceId === result.device.deviceId);
  
      // Filtrar por nombre del dispositivo
      const deviceName = result.device.name || '';
      const isDesiredDevice = deviceName.includes('ESP32');
  
      if (!deviceExists && isDesiredDevice) {
        this.devices.push({ device: result, isConnected: false });
        this.presentToast("Dispositivo encontrado: " + deviceName);
      }
      this.cdr.detectChanges();
    }).catch((error: any) => {
      this.showAlert('Error listando dispositivos: ' + error, 'reintentar');
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

  cancel() {
    this.modal.dismiss(null, 'cancel');
    this.stopScan();
  }

  confirm() {
    this.modal.dismiss(null, 'confirm');
    this.writeWifiCredentials();
  }

  onWillDismiss(event: Event) {
    const ev = event as CustomEvent<OverlayEventDetail<string>>;
    if (ev.detail.role === 'confirm') {
      // this.message = `Hello, ${ev.detail.data}!`;
    }
  }

  async writeWifiCredentials() {
    if (!this.wifiSSID || !this.wifiPassword || !this.chatId ) {
      this.presentToast('Por favor, introduce el SSID, la contraseña y el chatID');
      return;
    }

    try {
      const ssidBytes = this.stringToBytes(this.wifiSSID);
      const passwordBytes = this.stringToBytes(this.wifiPassword);
      const chatIdBytes = this.stringToBytes(this.chatId);
      const ssidDataView = new DataView(ssidBytes.buffer);
      const passwordDataView = new DataView(passwordBytes.buffer);
      const chatIdDataView = new DataView(chatIdBytes.buffer);

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

      this.presentToast('Credenciales de WiFi actualizadas correctamente.');
    } catch (error) {
      console.error('Error al escribir en las características Bluetooth:', error);
      this.presentToast('Error al actualizar credenciales de WiFi.');
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
        (value) => this.handleStatusNotification(value)
      );

      console.log('Suscripción a la característica de estado iniciada');
    } catch (error) {
      console.error('Error al suscribirse a la característica de estado:', error);
    }
  }

  handleStatusNotification(value: DataView) {
    const status = new TextDecoder().decode(value.buffer);
    console.log('Estado recibido:', status);

    if (status === 'Wi-Fi Connected') {
      this.presentToast('Conectado a Wi-Fi exitosamente.');
    } else if (status === 'Wi-Fi Connection Failed') {
      this.presentToast('Fallo en la conexión a Wi-Fi.');
    } else {
      this.presentToast('Estado no reconocido: ' + status);
    }
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
}
