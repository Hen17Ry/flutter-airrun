import {
  AdbDeviceService,
  type AdbDevice,
} from './adbDeviceService';

import {
  FlutterDeviceService,
  type FlutterDevice,
} from './flutterDeviceService';

export interface WirelessFlutterDevice {
  adbDevice: AdbDevice;
  flutterDevice: FlutterDevice;
}

export interface WirelessFlutterDeviceList {
  adbPath: string;
  flutterPath: string;
  devices: readonly WirelessFlutterDevice[];
}

export class WirelessFlutterDeviceService {
  public constructor(
    private readonly adbDeviceService =
      new AdbDeviceService(),
    private readonly flutterDeviceService =
      new FlutterDeviceService(),
  ) {}

  public async listDevices():
    Promise<WirelessFlutterDeviceList> {
    const [adbResult, flutterResult] =
      await Promise.all([
        this.adbDeviceService.listDevices(),
        this.flutterDeviceService.listDevices(),
      ]);

    const wirelessAdbDevices =
      adbResult.devices.filter(
        device =>
          device.state === 'device' &&
          device.connectionType === 'wireless',
      );

    const devices =
      flutterResult.devices.flatMap(
        flutterDevice => {
          if (
            !flutterDevice.isSupported ||
            !this.isAndroidDevice(flutterDevice)
          ) {
            return [];
          }

          const adbDevice =
            wirelessAdbDevices.find(
              candidate =>
                this.matchesDevice(
                  candidate,
                  flutterDevice,
                ),
            );

          if (!adbDevice) {
            return [];
          }

          return [
            {
              adbDevice,
              flutterDevice,
            },
          ];
        },
      );

    return {
      adbPath: adbResult.adbPath,
      flutterPath: flutterResult.flutterPath,
      devices,
    };
  }

  private isAndroidDevice(
    device: FlutterDevice,
  ): boolean {
    return (
      device.targetPlatform
        ?.toLowerCase()
        .startsWith('android') === true ||
      device.platformType
        ?.toLowerCase() === 'android'
    );
  }

  private matchesDevice(
    adbDevice: AdbDevice,
    flutterDevice: FlutterDevice,
  ): boolean {
    if (
      adbDevice.serial === flutterDevice.id
    ) {
      return true;
    }

    /*
     * Compatibilité avec certaines versions ADB/Flutter
     * qui peuvent normaliser différemment l’identifiant.
     */
    return (
      adbDevice.serial.includes(
        flutterDevice.id,
      ) ||
      flutterDevice.id.includes(
        adbDevice.serial,
      )
    );
  }
}
