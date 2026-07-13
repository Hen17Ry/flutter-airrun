import {
  WirelessTransportService,
} from '../wireless/wirelessTransportService';

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
    private readonly transportService =
      new WirelessTransportService(),
  ) {}

  public async listDevices():
    Promise<WirelessFlutterDeviceList> {
    /*
     * Corrige automatiquement le cas où ADB expose
     * un identifiant mDNS contenant un espace, que
     * certaines versions de Flutter tronquent.
     */
    await this.transportService.ensureTcpTransport();

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
          /*
           * Les appareils fantômes créés par le bug Flutter
           * sont explicitement ignorés.
           */
          if (
            !flutterDevice.isSupported ||
            !this.isAndroidDevice(
              flutterDevice,
            )
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
      flutterPath:
        flutterResult.flutterPath,
      devices:
        this.preferTcpDevices(devices),
    };
  }

  private preferTcpDevices(
    devices:
      readonly WirelessFlutterDevice[],
  ): readonly WirelessFlutterDevice[] {
    return [...devices].sort(
      (first, second) =>
        this.transportPriority(second) -
        this.transportPriority(first),
    );
  }

  private transportPriority(
    device: WirelessFlutterDevice,
  ): number {
    const id =
      device.flutterDevice.id;

    if (
      /^\[[^\]]+\]:\d+$/.test(id) ||
      /^[^\s]+:\d+$/.test(id)
    ) {
      return 3;
    }

    if (
      id.includes(
        '._adb-tls-connect._tcp',
      )
    ) {
      return 2;
    }

    return 1;
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
      adbDevice.serial ===
      flutterDevice.id
    ) {
      return true;
    }

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
