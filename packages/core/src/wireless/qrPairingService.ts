import {
  ExecutableLocator,
} from '../executableLocator';

import {
  ProcessRunner,
} from '../processRunner';

import {
  PairingService,
  type PairingResult,
} from './pairingService';

import {
  type AdbMdnsService,
} from './mdnsService';

import {
  MdnsTrackServiceParser,
  type TrackedAdbMdnsService,
} from './mdnsTrackService';

export type QrPairingStage =
  | 'waiting-for-scan'
  | 'service-found'
  | 'pairing'
  | 'paired';

export interface QrPairingOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  onStage?: (
    stage: QrPairingStage,
  ) => void;
}

export interface QrPairingResult
  extends PairingResult {
  service: AdbMdnsService;
}

export class QrPairingService {
  public constructor(
    private readonly executableLocator =
      new ExecutableLocator(),
    private readonly processRunner =
      new ProcessRunner(),
    private readonly trackParser =
      new MdnsTrackServiceParser(),
    private readonly pairingService =
      new PairingService(),
  ) {}

  public async pair(
    serviceName: string,
    password: string,
    options: QrPairingOptions = {},
  ): Promise<QrPairingResult> {
    this.validateServiceName(
      serviceName,
    );

    this.throwIfAborted(
      options.signal,
    );

    const adbPath =
      await this.executableLocator
        .findAdb();

    if (!adbPath) {
      throw new Error(
        'ADB est introuvable sur cette machine.',
      );
    }

    options.onStage?.(
      'waiting-for-scan',
    );

    const service =
      await this.waitForPairingService(
        adbPath,
        serviceName,
        options.timeoutMs ??
          120_000,
        options.signal,
      );

    options.onStage?.(
      'service-found',
    );

    options.onStage?.('pairing');

    const result =
      await this.pairingService
        .pairWithSecret(
          service,
          password,
          {
            timeoutMs: 30_000,
            ...(options.signal
              ? {
                  signal:
                    options.signal,
                }
              : {}),
          },
        );

    options.onStage?.('paired');

    return {
      ...result,
      service,
    };
  }

  private async waitForPairingService(
    adbPath: string,
    expectedServiceName: string,
    timeoutMs: number,
    signal?: AbortSignal,
  ): Promise<TrackedAdbMdnsService> {
    const controller =
      new AbortController();

    const forwardCancellation =
      (): void => {
        controller.abort();
      };

    if (signal) {
      if (signal.aborted) {
        throw new Error(
          'Association QR annulée.',
        );
      }

      signal.addEventListener(
        'abort',
        forwardCancellation,
        {
          once: true,
        },
      );
    }

    let outputBuffer = '';

    let foundService:
      TrackedAdbMdnsService | null =
        null;

    const inspectChunk = (
      chunk: string,
    ): void => {
      outputBuffer += chunk;

      /*
       * Le flux peut rester ouvert longtemps.
       * On conserve une fenêtre suffisamment
       * grande pour contenir plusieurs snapshots.
       */
      if (
        outputBuffer.length >
        512_000
      ) {
        outputBuffer =
          outputBuffer.slice(
            -256_000,
          );
      }

      const services =
        this.trackParser.parse(
          outputBuffer,
        );

      const match =
        services.find(service =>
          this.matchesService(
            service,
            expectedServiceName,
          ),
        );

      if (!match) {
        return;
      }

      foundService = match;

      /*
       * La découverte est terminée :
       * on arrête uniquement le processus
       * track-services.
       */
      controller.abort();
    };

    try {
      const result =
        await this.processRunner.run(
          adbPath,
          [
            'mdns',
            'track-services',
            '--proto-text',
          ],
          {
            timeoutMs,
            signal:
              controller.signal,
            onStdout: inspectChunk,
            onStderr: inspectChunk,
          },
        );

      this.throwIfAborted(signal);

      if (foundService) {
        return foundService;
      }

      const combinedOutput =
        [
          result.stdout,
          result.stderr,
        ]
          .map(value =>
            value.trim(),
          )
          .filter(Boolean)
          .join('\n');

      if (result.timedOut) {
        throw new Error(
          'Aucun téléphone n’a scanné le QR dans le délai de deux minutes.',
        );
      }

      if (
        result.exitCode !== 0 &&
        !result.aborted
      ) {
        throw new Error(
          `La surveillance mDNS a échoué : ${
            combinedOutput ||
            'erreur inconnue'
          }`,
        );
      }

      throw new Error(
        'Le service QR attendu n’a pas été détecté sur le réseau.',
      );
    } finally {
      signal?.removeEventListener(
        'abort',
        forwardCancellation,
      );
    }
  }

  private matchesService(
    service: TrackedAdbMdnsService,
    expectedServiceName: string,
  ): boolean {
    if (
      service.serviceType !==
      'pairing'
    ) {
      return false;
    }

    return (
      service.instanceName ===
        expectedServiceName ||
      service.instanceName.startsWith(
        `${expectedServiceName} (`,
      )
    );
  }

  private validateServiceName(
    serviceName: string,
  ): void {
    if (
      !/^[A-Za-z0-9][A-Za-z0-9-]{1,62}$/
        .test(serviceName)
    ) {
      throw new Error(
        'Le nom du service QR est invalide.',
      );
    }
  }

  private throwIfAborted(
    signal?: AbortSignal,
  ): void {
    if (signal?.aborted) {
      throw new Error(
        'Association QR annulée.',
      );
    }
  }
}
