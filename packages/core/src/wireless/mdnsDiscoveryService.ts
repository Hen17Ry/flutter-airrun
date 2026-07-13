import { ExecutableLocator } from '../executableLocator';
import { ProcessRunner } from '../processRunner';

import {
  MdnsServiceParser,
  type AdbMdnsService,
} from './mdnsService';

export interface MdnsDiscoveryResult {
  adbPath: string;
  available: boolean;
  diagnosticOutput: string;
  services: readonly AdbMdnsService[];
  rawServicesOutput: string;
}

export class MdnsDiscoveryService {
  public constructor(
    private readonly executableLocator =
      new ExecutableLocator(),
    private readonly processRunner =
      new ProcessRunner(),
    private readonly parser =
      new MdnsServiceParser(),
  ) {}

  public async discover(): Promise<MdnsDiscoveryResult> {
    const adbPath =
      await this.executableLocator.findAdb();

    if (!adbPath) {
      throw new Error(
        'ADB est introuvable sur cette machine.',
      );
    }

    const [checkResult, servicesResult] =
      await Promise.all([
        this.processRunner.run(
          adbPath,
          ['mdns', 'check'],
          {
            timeoutMs: 10_000,
          },
        ),
        this.processRunner.run(
          adbPath,
          ['mdns', 'services'],
          {
            timeoutMs: 10_000,
          },
        ),
      ]);

    const diagnosticOutput =
      this.combineOutput(
        checkResult.stdout,
        checkResult.stderr,
      );

    const rawServicesOutput =
      this.combineOutput(
        servicesResult.stdout,
        servicesResult.stderr,
      );

    const available =
      !checkResult.timedOut &&
      checkResult.exitCode === 0;

    if (servicesResult.timedOut) {
      throw new Error(
        'La recherche des services mDNS a dépassé le délai autorisé.',
      );
    }

    if (servicesResult.exitCode !== 0) {
      throw new Error(
        `ADB n’a pas pu rechercher les services mDNS : ${
          rawServicesOutput || 'Erreur inconnue'
        }`,
      );
    }

    return {
      adbPath,
      available,
      diagnosticOutput,
      services:
        this.parser.parseServices(
          servicesResult.stdout,
        ),
      rawServicesOutput,
    };
  }

  private combineOutput(
    stdout: string,
    stderr: string,
  ): string {
    return [stdout, stderr]
      .map(value => value.trim())
      .filter(Boolean)
      .join('\n');
  }
}
