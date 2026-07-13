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

export interface DeviceDiscoveryReport {
  discoveredAt: string;
  adbPath: string;
  flutterPath: string;
  adbDevices: readonly AdbDevice[];
  flutterDevices:
    readonly FlutterDevice[];
  androidFlutterDevices:
    readonly FlutterDevice[];
}

export class DeviceDiscoveryService {
  public constructor(
    private readonly adbDeviceService =
      new AdbDeviceService(),
    private readonly flutterDeviceService =
      new FlutterDeviceService(),
    private readonly transportService =
      new WirelessTransportService(),
  ) {}

  public async discover():
    Promise<DeviceDiscoveryReport> {
    await this.transportService
      .ensureTcpTransport();

    const [adbResult, flutterResult] =
      await Promise.all([
        this.adbDeviceService.listDevices(),
        this.flutterDeviceService.listDevices(),
      ]);

    const androidFlutterDevices =
      flutterResult.devices.filter(
        device =>
          device.isSupported &&
          this.isAndroidDevice(device),
      );

    return {
      discoveredAt:
        new Date().toISOString(),
      adbPath: adbResult.adbPath,
      flutterPath:
        flutterResult.flutterPath,
      adbDevices: adbResult.devices,
      flutterDevices:
        flutterResult.devices,
      androidFlutterDevices,
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
}
