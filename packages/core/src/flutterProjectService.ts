import { constants } from 'node:fs';
import {
  access,
  readFile,
} from 'node:fs/promises';

import * as path from 'node:path';

export interface FlutterProject {
  rootPath: string;
  pubspecPath: string;
  name: string;
  defaultTargetPath: string;
  hasDefaultTarget: boolean;
}

export class FlutterProjectService {
  public async inspect(
    rootPath: string,
  ): Promise<FlutterProject> {
    const normalizedRootPath =
      path.resolve(rootPath);

    const pubspecPath = path.join(
      normalizedRootPath,
      'pubspec.yaml',
    );

    if (!(await this.exists(pubspecPath))) {
      throw new Error(
        `Aucun fichier pubspec.yaml trouvé dans ${normalizedRootPath}.`,
      );
    }

    const pubspecContent =
      await readFile(pubspecPath, 'utf8');

    const projectName =
      this.extractProjectName(
        pubspecContent,
      ) ?? path.basename(normalizedRootPath);

    const defaultTargetPath =
      path.join(
        normalizedRootPath,
        'lib',
        'main.dart',
      );

    return {
      rootPath: normalizedRootPath,
      pubspecPath,
      name: projectName,
      defaultTargetPath,
      hasDefaultTarget:
        await this.exists(
          defaultTargetPath,
        ),
    };
  }

  public async isFlutterProject(
    rootPath: string,
  ): Promise<boolean> {
    const pubspecPath = path.join(
      path.resolve(rootPath),
      'pubspec.yaml',
    );

    return this.exists(pubspecPath);
  }

  private extractProjectName(
    pubspecContent: string,
  ): string | null {
    const match =
      pubspecContent.match(
        /^name:\s*([a-zA-Z0-9_]+)\s*$/m,
      );

    return match?.[1] ?? null;
  }

  private async exists(
    filePath: string,
  ): Promise<boolean> {
    try {
      await access(
        filePath,
        constants.R_OK,
      );

      return true;
    } catch {
      return false;
    }
  }
}
