import {
  clearLine,
  cursorTo,
  emitKeypressEvents,
  moveCursor,
} from 'node:readline';

import {
  createInterface as createPromiseInterface,
} from 'node:readline/promises';

import {
  stdin,
  stdout,
} from 'node:process';

interface TerminalKey {
  name?: string;
  ctrl?: boolean;
  shift?: boolean;
  sequence?: string;
}

const RESET = '\u001B[0m';
const BOLD = '\u001B[1m';
const DIM = '\u001B[2m';
const HIDE_CURSOR = '\u001B[?25l';
const SHOW_CURSOR = '\u001B[?25h';

export function printTitle(
  title: string,
): void {
  const colorsEnabled =
    supportsColors();

  const accent = colorsEnabled
    ? '\u001B[38;2;56;189;248m'
    : '';

  const bold = colorsEnabled
    ? BOLD
    : '';

  const muted = colorsEnabled
    ? `${DIM}\u001B[38;2;100;116;139m`
    : '';

  const reset = colorsEnabled
    ? RESET
    : '';

  const availableWidth =
    stdout.columns ?? 64;

  const lineLength =
    Math.min(
      Math.max(
        title.length + 8,
        34,
      ),
      Math.max(
        34,
        availableWidth - 4,
      ),
    );

  console.log();

  console.log(
    `${accent}◆${reset} ${bold}${title}${reset}`,
  );

  console.log(
    `${muted}${'─'.repeat(
      lineLength,
    )}${reset}`,
  );

  console.log();
}

export function success(
  message: string,
): void {
  console.log(
    `${green('✓')} ${message}`,
  );
}

export function warning(
  message: string,
): void {
  console.log(
    `${yellow('!')} ${message}`,
  );
}

export function failure(
  message: string,
): void {
  console.error(
    `${red('✗')} ${message}`,
  );
}

export async function ask(
  message: string,
): Promise<string> {
  const interfaceInstance =
    createPromiseInterface({
      input: stdin,
      output: stdout,
    });

  try {
    return (
      await interfaceInstance.question(
        message,
      )
    ).trim();
  } finally {
    interfaceInstance.close();
  }
}

export async function choose<T>(
  title: string,
  items: readonly T[],
  label: (item: T) => string,
): Promise<T> {
  if (items.length === 0) {
    throw new Error(
      'Aucun élément disponible.',
    );
  }

  if (items.length === 1) {
    const onlyItem =
      items[0];

    if (onlyItem === undefined) {
      throw new Error(
        'Élément introuvable.',
      );
    }

    return onlyItem;
  }

  if (
    !stdin.isTTY ||
    !stdout.isTTY ||
    typeof stdin.setRawMode !==
      'function'
  ) {
    return chooseByNumber(
      title,
      items,
      label,
    );
  }

  return chooseWithKeyboard(
    title,
    items,
    label,
  );
}

async function chooseWithKeyboard<T>(
  title: string,
  items: readonly T[],
  label: (item: T) => string,
): Promise<T> {
  console.log(title);
  console.log();

  return new Promise<T>(
    (resolve, reject) => {
      let selectedIndex = 0;
      let renderedLineCount = 0;
      let completed = false;

      const previousRawMode =
        stdin.isRaw;

      const render = (): void => {
        if (renderedLineCount > 0) {
          moveCursor(
            stdout,
            0,
            -renderedLineCount,
          );
        }

        for (
          let index = 0;
          index < items.length;
          index += 1
        ) {
          const item =
            items[index];

          if (item === undefined) {
            continue;
          }

          clearLine(stdout, 0);
          cursorTo(stdout, 0);

          const itemLabel =
            label(item);

          if (
            index ===
            selectedIndex
          ) {
            stdout.write(
              `${selectedMarker()} ${selectedText(itemLabel)}\n`,
            );
          } else {
            stdout.write(
              `  ${normalText(itemLabel)}\n`,
            );
          }
        }

        clearLine(stdout, 0);
        cursorTo(stdout, 0);
        stdout.write('\n');

        clearLine(stdout, 0);
        cursorTo(stdout, 0);

        stdout.write(
          `${mutedText(
            '↑↓ naviguer',
          )}  ${mutedText('•')}  ${mutedText(
            'Entrée sélectionner',
          )}  ${mutedText('•')}  ${mutedText(
            'Échap annuler',
          )}\n`,
        );

        renderedLineCount =
          items.length + 2;
      };

      const cleanup = (): void => {
        stdin.off(
          'keypress',
          handleKeypress,
        );

        stdin.setRawMode(
          previousRawMode ?? false,
        );

        stdin.pause();

        stdout.write(
          SHOW_CURSOR,
        );
      };

      const finish = (
        item: T,
      ): void => {
        if (completed) {
          return;
        }

        completed = true;
        cleanup();

        stdout.write('\n');
        resolve(item);
      };

      const cancel = (): void => {
        if (completed) {
          return;
        }

        completed = true;
        cleanup();

        stdout.write('\n');

        reject(
          new Error(
            'Opération annulée.',
          ),
        );
      };

      const moveSelection = (
        direction: number,
      ): void => {
        selectedIndex =
          (
            selectedIndex +
            direction +
            items.length
          ) %
          items.length;

        render();
      };

      const handleKeypress = (
        character: string | undefined,
        key: TerminalKey,
      ): void => {
        if (
          key.ctrl === true &&
          key.name === 'c'
        ) {
          cancel();
          return;
        }

        switch (key.name) {
          case 'up':
            moveSelection(-1);
            return;

          case 'down':
            moveSelection(1);
            return;

          case 'home':
            selectedIndex = 0;
            render();
            return;

          case 'end':
            selectedIndex =
              items.length - 1;

            render();
            return;

          case 'return':
          case 'enter': {
            const selectedItem =
              items[selectedIndex];

            if (
              selectedItem !==
              undefined
            ) {
              finish(
                selectedItem,
              );
            }

            return;
          }

          case 'escape':
            cancel();
            return;

          default:
            break;
        }

        if (
          character === 'k' ||
          character === 'K'
        ) {
          moveSelection(-1);
          return;
        }

        if (
          character === 'j' ||
          character === 'J'
        ) {
          moveSelection(1);
          return;
        }

        if (
          character &&
          /^[1-9]$/.test(
            character,
          )
        ) {
          const numericIndex =
            Number(character) - 1;

          const selectedItem =
            items[numericIndex];

          if (
            selectedItem !==
            undefined
          ) {
            selectedIndex =
              numericIndex;

            render();
            finish(
              selectedItem,
            );
          }
        }
      };

      /*
       * emitKeypressEvents transforme les séquences
       * ANSI des flèches en événements exploitables.
       */
      emitKeypressEvents(
        stdin,
      );

      stdin.setRawMode(true);
      stdin.resume();

      stdin.on(
        'keypress',
        handleKeypress,
      );

      stdout.write(
        HIDE_CURSOR,
      );

      render();
    },
  );
}

async function chooseByNumber<T>(
  title: string,
  items: readonly T[],
  label: (item: T) => string,
): Promise<T> {
  console.log(title);
  console.log();

  items.forEach(
    (item, index) => {
      console.log(
        `  ${index + 1}. ${label(item)}`,
      );
    },
  );

  console.log();

  while (true) {
    const answer = await ask(
      `Choix [1-${items.length}] : `,
    );

    const selectedIndex =
      Number(answer) - 1;

    if (
      Number.isInteger(
        selectedIndex,
      ) &&
      selectedIndex >= 0 &&
      selectedIndex < items.length
    ) {
      const selectedItem =
        items[selectedIndex];

      if (
        selectedItem !==
        undefined
      ) {
        return selectedItem;
      }
    }

    warning(
      'Choix invalide.',
    );
  }
}

export async function readSecret(
  message: string,
): Promise<string> {
  if (
    !stdin.isTTY ||
    !stdout.isTTY
  ) {
    return ask(message);
  }

  return new Promise<string>(
    (resolve, reject) => {
      let value = '';

      const previousRawMode =
        stdin.isRaw;

      const cleanup = (): void => {
        stdin.off(
          'data',
          handleData,
        );

        stdin.setRawMode(
          previousRawMode ?? false,
        );

        stdin.pause();
      };

      const handleData = (
        buffer: Buffer,
      ): void => {
        for (
          const byte of buffer
        ) {
          if (byte === 3) {
            cleanup();
            stdout.write('\n');

            reject(
              new Error(
                'Opération annulée.',
              ),
            );

            return;
          }

          if (
            byte === 13 ||
            byte === 10
          ) {
            cleanup();
            stdout.write('\n');

            resolve(value);
            return;
          }

          if (
            byte === 8 ||
            byte === 127
          ) {
            if (
              value.length > 0
            ) {
              value =
                value.slice(0, -1);

              stdout.write(
                '\b \b',
              );
            }

            continue;
          }

          if (
            byte >= 32 &&
            byte <= 126
          ) {
            value +=
              String.fromCharCode(
                byte,
              );

            stdout.write('•');
          }
        }
      };

      stdout.write(message);

      stdin.setRawMode(true);
      stdin.resume();

      stdin.on(
        'data',
        handleData,
      );
    },
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

function selectedMarker(): string {
  if (!supportsColors()) {
    return '>';
  }

  return (
    `${BOLD}` +
    '\u001B[38;2;56;189;248m' +
    '❯' +
    RESET
  );
}

function selectedText(
  value: string,
): string {
  if (!supportsColors()) {
    return value;
  }

  return (
    `${BOLD}` +
    '\u001B[38;2;241;245;249m' +
    value +
    RESET
  );
}

function normalText(
  value: string,
): string {
  if (!supportsColors()) {
    return value;
  }

  return (
    '\u001B[38;2;203;213;225m' +
    value +
    RESET
  );
}

function mutedText(
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

function green(
  value: string,
): string {
  if (!supportsColors()) {
    return value;
  }

  return (
    '\u001B[38;2;74;222;128m' +
    value +
    RESET
  );
}

function yellow(
  value: string,
): string {
  if (!supportsColors()) {
    return value;
  }

  return (
    '\u001B[38;2;250;204;21m' +
    value +
    RESET
  );
}

function red(
  value: string,
): string {
  if (!supportsColors()) {
    return value;
  }

  return (
    '\u001B[38;2;248;113;113m' +
    value +
    RESET
  );
}
