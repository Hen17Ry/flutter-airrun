import { ExecutableLocator } from './executableLocator';

export type FlutterRunMode =
  | 'debug'
  | 'profile'
  | 'release';

export interface FlutterRunConfiguration {
  mode?: FlutterRunMode;
  target?: string;
  flavor?: string;
  dartDefines?: readonly string[];
  extraArgs?: readonly string[];
}

export interface FlutterRunPlan {
  executablePath: string;
  args: readonly string[];
  cwd: string;
  deviceId: string;
  displayCommand: string;
}

export class FlutterRunService {
  public constructor(
    private readonly executableLocator =
      new ExecutableLocator(),
  ) {}

  public async createRunPlan(
    projectRoot: string,
    deviceId: string,
    configuration:
      FlutterRunConfiguration = {},
  ): Promise<FlutterRunPlan> {
    const normalizedDeviceId =
      deviceId.trim();

    if (!normalizedDeviceId) {
      throw new Error(
        'L’identifiant de l’appareil Flutter est vide.',
      );
    }

    const executablePath =
      await this.executableLocator.findFlutter();

    if (!executablePath) {
      throw new Error(
        'Flutter est introuvable sur cette machine.',
      );
    }

    const args: string[] = [
      'run',
      '-d',
      normalizedDeviceId,
    ];

    switch (configuration.mode) {
      case 'profile':
        args.push('--profile');
        break;

      case 'release':
        args.push('--release');
        break;

      case 'debug':
      case undefined:
        break;
    }

    const target =
      configuration.target?.trim();

    if (target) {
      args.push(
        '--target',
        target,
      );
    }

    const flavor =
      configuration.flavor?.trim();

    if (flavor) {
      args.push(
        '--flavor',
        flavor,
      );
    }

    for (
      const dartDefine of
      configuration.dartDefines ?? []
    ) {
      const normalizedDefine =
        dartDefine.trim();

      if (normalizedDefine) {
        args.push(
          '--dart-define',
          normalizedDefine,
        );
      }
    }

    for (
      const extraArg of
      configuration.extraArgs ?? []
    ) {
      const normalizedArg =
        extraArg.trim();

      if (normalizedArg) {
        args.push(normalizedArg);
      }
    }

    return {
      executablePath,
      args,
      cwd: projectRoot,
      deviceId: normalizedDeviceId,
      displayCommand: [
        executablePath,
        ...args,
      ]
        .map(value =>
          this.quoteForDisplay(value),
        )
        .join(' '),
    };
  }

  private quoteForDisplay(
    value: string,
  ): string {
    if (
      /^[a-zA-Z0-9_./:@=-]+$/.test(value)
    ) {
      return value;
    }

    return JSON.stringify(value);
  }
}
