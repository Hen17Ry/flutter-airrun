import {
  createInterface,
} from 'node:readline/promises';

import {
  stdin,
  stdout,
} from 'node:process';

export function printTitle(
  title: string,
): void {
  const line =
    '═'.repeat(
      Math.max(
        title.length + 4,
        34,
      ),
    );

  console.log();
  console.log(`╔${line}╗`);
  console.log(
    `║  ${title.padEnd(
      line.length - 2,
    )}║`,
  );
  console.log(`╚${line}╝`);
  console.log();
}

export function success(
  message: string,
): void {
  console.log(`✓ ${message}`);
}

export function warning(
  message: string,
): void {
  console.log(`! ${message}`);
}

export function failure(
  message: string,
): void {
  console.error(`✗ ${message}`);
}

export async function ask(
  message: string,
): Promise<string> {
  const interfaceInstance =
    createInterface({
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
    const onlyItem = items[0];

    if (onlyItem === undefined) {
      throw new Error(
        'Élément introuvable.',
      );
    }

    return onlyItem;
  }

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

      if (selectedItem !== undefined) {
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
        for (const byte of buffer) {
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
            if (value.length > 0) {
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
