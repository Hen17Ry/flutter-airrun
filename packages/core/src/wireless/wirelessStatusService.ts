import {
  AdbDeviceService,
  type AdbDevice,
} from '../devices/adbDeviceService';

import {
  MdnsDiscoveryService,
} from './mdnsDiscoveryService';

import {
  type AdbMdnsService,
} from './mdnsService';

export interface WirelessStatusReport {
  inspectedAt: string;
  adbPath: string;
  mdnsAvailable: boolean;
  mdnsDiagnostic: string;
  pairingServices:
    readonly AdbMdnsService[];
  connectionServices:
    readonly AdbMdnsService[];
  legacyServices:
    readonly AdbMdnsService[];
  unknownServices:
    readonly AdbMdnsService[];
  connectedWirelessDevices:
    readonly AdbDevice[];
}

export class WirelessStatusService {
  public constructor(
    private readonly mdnsDiscoveryService =
      new MdnsDiscoveryService(),
    private readonly adbDeviceService =
      new AdbDeviceService(),
  ) {}

  public async inspect(): Promise<WirelessStatusReport> {
    const [mdnsResult, adbResult] =
      await Promise.all([
        this.mdnsDiscoveryService.discover(),
        this.adbDeviceService.listDevices(),
      ]);

    return {
      inspectedAt: new Date().toISOString(),
      adbPath: mdnsResult.adbPath,
      mdnsAvailable: mdnsResult.available,
      mdnsDiagnostic:
        mdnsResult.diagnosticOutput,
      pairingServices:
        mdnsResult.services.filter(
          service =>
            service.serviceType === 'pairing',
        ),
      connectionServices:
        mdnsResult.services.filter(
          service =>
            service.serviceType === 'connect',
        ),
      legacyServices:
        mdnsResult.services.filter(
          service =>
            service.serviceType === 'legacy',
        ),
      unknownServices:
        mdnsResult.services.filter(
          service =>
            service.serviceType === 'unknown',
        ),
      connectedWirelessDevices:
        adbResult.devices.filter(
          device =>
            device.connectionType ===
            'wireless',
        ),
    };
  }
}
