export type AirRunTarget =
  | 'linux-x64'
  | 'linux-arm64'
  | 'win32-x64'
  | 'win32-arm64'
  | 'darwin-x64'
  | 'darwin-arm64';

export interface AirRunPlatformInfo {
  target: AirRunTarget;
  cliBinaryName: string;
  isWindows: boolean;
  isPosix: boolean;
}

export function getAirRunPlatformInfo(
  platform: NodeJS.Platform =
    process.platform,

  architecture: NodeJS.Architecture =
    process.arch,
): AirRunPlatformInfo {
  const key =
    `${platform}-${architecture}`;

  switch (key) {
    case 'linux-x64':
      return createInfo(
        'linux-x64',
        false,
      );

    case 'linux-arm64':
      return createInfo(
        'linux-arm64',
        false,
      );

    case 'win32-x64':
      return createInfo(
        'win32-x64',
        true,
      );

    case 'win32-arm64':
      return createInfo(
        'win32-arm64',
        true,
      );

    case 'darwin-x64':
      return createInfo(
        'darwin-x64',
        false,
      );

    case 'darwin-arm64':
      return createInfo(
        'darwin-arm64',
        false,
      );

    default:
      throw new Error(
        [
          'Cette plateforme n’est pas encore prise en charge.',
          `Plateforme détectée : ${platform}`,
          `Architecture détectée : ${architecture}`,
        ].join('\n'),
      );
  }
}

function createInfo(
  target: AirRunTarget,
  isWindows: boolean,
): AirRunPlatformInfo {
  return {
    target,

    cliBinaryName:
      isWindows
        ? 'airrun.exe'
        : 'airrun',

    isWindows,

    isPosix:
      !isWindows,
  };
}
