import {
  stdout,
} from 'node:process';

const RESET = '\u001B[0m';
const BOLD = '\u001B[1m';
const DIM = '\u001B[2m';

const GITHUB_URL =
  'https://github.com/Hen17Ry';

const LINKEDIN_URL =
  'https://www.linkedin.com/in/henrygossou/';

const AIRRUN_LOGO = [
  ' █████╗ ██╗██████╗ ██████╗ ██╗   ██╗███╗   ██╗',
  '██╔══██╗██║██╔══██╗██╔══██╗██║   ██║████╗  ██║',
  '███████║██║██████╔╝██████╔╝██║   ██║██╔██╗ ██║',
  '██╔══██║██║██╔══██╗██╔══██╗██║   ██║██║╚██╗██║',
  '██║  ██║██║██║  ██║██║  ██║╚██████╔╝██║ ╚████║',
  '╚═╝  ╚═╝╚═╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝',
] as const;

const LOGO_COLORS = [
  [56, 189, 248],
  [14, 165, 233],
  [59, 130, 246],
  [99, 102, 241],
  [168, 85, 247],
  [236, 72, 153],
] as const;

export function printBrandBanner(
  version: string,
): void {
  const terminalWidth =
    stdout.columns ?? 80;

  console.log();

  if (terminalWidth < 68) {
    printCompactBanner(version);
  } else {
    printWideBanner(
      version,
      Math.min(
        terminalWidth,
        100,
      ),
    );
  }

  console.log();
}

function printWideBanner(
  version: string,
  terminalWidth: number,
): void {
  const artWidth = 58;

  const indent =
    ' '.repeat(
      Math.max(
        2,
        Math.floor(
          (
            terminalWidth -
            artWidth
          ) / 2,
        ),
      ),
    );

  console.log(
    `${indent}${muted(
      '        ✦',
    )} ${paint(
      'F L U T T E R',
      125,
      211,
      252,
      true,
    )}${muted(
      '                              ·',
    )}`,
  );

  console.log();

  AIRRUN_LOGO.forEach(
    (line, index) => {
      const color =
        LOGO_COLORS[index];

      if (!color) {
        console.log(
          `${indent}${line}`,
        );

        return;
      }

      console.log(
        `${indent}${paint(
          line,
          color[0],
          color[1],
          color[2],
          true,
        )}`,
      );
    },
  );

  console.log();

  console.log(
    `${indent}${muted(
      '                 ·',
    )} ${paint(
      '≋≋≋≋≋▶',
      56,
      189,
      248,
      true,
    )}  ${paint(
      '[▣]',
      168,
      85,
      247,
      true,
    )}  ${successColor(
      'connected',
    )}  ${muted(
      '✦',
    )}`,
  );

  console.log();

  console.log(
    `${indent}${paint(
      'Flutter sans câble',
      241,
      245,
      249,
      true,
    )}${muted(
      ' • Une commande • Zéro friction',
    )}`,
  );

  console.log();

  printAuthorInformation(
    indent,
    version,
  );
}

function printCompactBanner(
  version: string,
): void {
  console.log(
    `${muted('✦')} ${paint(
      'FLUTTER AIRRUN',
      56,
      189,
      248,
      true,
    )} ${paint(
      '≋≋≋▶',
      168,
      85,
      247,
      true,
    )} ${paint(
      '[▣]',
      236,
      72,
      153,
      true,
    )}`,
  );

  console.log(
    muted(
      '  Flutter sans câble • Zéro friction',
    ),
  );

  console.log();

  printAuthorInformation(
    '  ',
    version,
  );
}

function printAuthorInformation(
  indent: string,
  version: string,
): void {
  console.log(
    `${indent}${muted(
      'By',
    )} ${bold(
      'Henry GOSSOU',
    )} ${muted(
      `• v${version}`,
    )}`,
  );

  console.log(
    `${indent}${muted(
      'GitHub   ',
    )} ${terminalLink(
      GITHUB_URL,
      'github.com/Hen17Ry',
    )}`,
  );

  console.log(
    `${indent}${muted(
      'LinkedIn ',
    )} ${terminalLink(
      LINKEDIN_URL,
      'linkedin.com/in/henrygossou',
    )}`,
  );
}

function terminalLink(
  url: string,
  label: string,
): string {
  if (!supportsHyperlinks()) {
    return accent(label);
  }

  const open =
    `\u001B]8;;${url}\u0007`;

  const close =
    '\u001B]8;;\u0007';

  return (
    open +
    accent(label) +
    close
  );
}

function supportsColors(): boolean {
  return (
    stdout.isTTY === true &&
    process.env['NO_COLOR'] ===
      undefined &&
    process.env['TERM'] !==
      'dumb'
  );
}

function supportsHyperlinks(): boolean {
  if (
    stdout.isTTY !== true ||
    process.env['TERM'] ===
      'dumb'
  ) {
    return false;
  }

  return (
    process.env['TERM_PROGRAM'] ===
      'vscode' ||
    process.env['TERM_PROGRAM'] ===
      'iTerm.app' ||
    process.env['WT_SESSION'] !==
      undefined ||
    process.env['VTE_VERSION'] !==
      undefined
  );
}

function paint(
  value: string,
  red: number,
  green: number,
  blue: number,
  makeBold = false,
): string {
  if (!supportsColors()) {
    return value;
  }

  const weight =
    makeBold ? BOLD : '';

  return (
    `${weight}` +
    `\u001B[38;2;${red};${green};${blue}m` +
    value +
    RESET
  );
}

function bold(
  value: string,
): string {
  if (!supportsColors()) {
    return value;
  }

  return `${BOLD}${value}${RESET}`;
}

function muted(
  value: string,
): string {
  if (!supportsColors()) {
    return value;
  }

  return (
    `${DIM}` +
    '\u001B[38;2;148;163;184m' +
    value +
    RESET
  );
}

function accent(
  value: string,
): string {
  return paint(
    value,
    125,
    211,
    252,
  );
}

function successColor(
  value: string,
): string {
  return paint(
    value,
    74,
    222,
    128,
  );
}
