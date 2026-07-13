<h1 align="center">Flutter AirRun</h1>

<p align="center">
  <strong>The CLI-first wireless workflow for Flutter on Android.</strong>
</p>

<p align="center">
  Pair, diagnose, connect, and run Flutter applications on Android devices
  without repeatedly reconnecting a USB cable.
</p>

<p align="center">
  <code>Flutter</code>
  <code>Android</code>
  <code>ADB</code>
  <code>Wireless Debugging</code>
  <code>VS Code</code>
  <code>Standalone CLI</code>
</p>

<p align="center">
  <a href="#english">English</a> · <a href="#français">Français</a>
</p>

---

> [!IMPORTANT]
> **Flutter AirRun is CLI-first.** The standalone `airrun` command is the main
> experience. The VS Code extension installs, opens, updates, and manages it.
>
> **Flutter AirRun privilégie la CLI.** La commande autonome `airrun` constitue
> l’expérience principale. L’extension VS Code l’installe, l’ouvre, la met à
> jour et la gère.

<a id="english"></a>

# English

## Overview

Flutter AirRun simplifies Android wireless debugging for Flutter development.

Instead of repeatedly finding ADB ports, copying IP addresses, reconnecting
phones, and typing several commands, start one interactive tool:

```bash
airrun
```

Flutter AirRun combines:

| Component | Role |
|---|---|
| **Standalone AirRun CLI** | Main workflow for diagnostics, pairing, discovery, connection, and `flutter run` |
| **VS Code extension** | Installs and manages the CLI and provides visual actions |
| **Shared Core library** | Reuses Flutter, ADB, mDNS, pairing, and recovery logic |
| **Built-in TypeScript QR generator** | Creates secure temporary QR pairing sessions without a separate native binary |

## Architecture

```text
Shared Flutter AirRun Core
ADB · mDNS · Flutter · QR pairing
              │
       ┌──────┴──────┐
       │             │
Standalone CLI   VS Code extension
    airrun       visual companion
       │             │
       └──────┬──────┘
              │
 Android Wireless Debugging
```

QR sessions are generated directly in TypeScript using secure random data from
the runtime. Flutter AirRun no longer requires CMake or a platform-specific QR
binary.

## Why CLI-first?

The CLI provides:

- one command for the complete workflow;
- an interactive keyboard-driven menu;
- the same experience in VS Code or any terminal;
- direct access to Flutter output and logs;
- standard hot reload and hot restart controls;
- a standalone executable with no Node.js or Bun requirement after installation;
- a clean foundation for automation and scripting.

The VS Code extension remains the installer, launcher, updater, and visual
companion for the CLI.

## Requirements

You need:

- Flutter available in `PATH`;
- Android SDK Platform Tools;
- `adb` available in `PATH`;
- an Android device with **Wireless debugging** in Developer options;
- the computer and phone on the same local network;
- a Flutter project containing `pubspec.yaml`;
- Visual Studio Code only when using the extension.

> The installed CLI is standalone. Node.js and Bun are not required after
> installation.

## What the VSIX installs

Each platform-specific VSIX contains one executable:

```text
Linux / macOS
└── airrun
```

```text
Windows
└── airrun.exe
```

The QR generator is integrated into the CLI and extension. No additional QR
binary is installed.

### Installation locations

| Platform | Application files | Terminal command |
|---|---|---|
| Linux | `~/.local/share/flutter-airrun/bin/` | `~/.local/bin/airrun` |
| macOS | `~/Library/Application Support/Flutter AirRun/bin/` | `~/.local/bin/airrun` |
| Windows | `%LOCALAPPDATA%\FlutterAirRun\bin\` | `%LOCALAPPDATA%\FlutterAirRun\bin\airrun.exe` |

On Windows, Flutter AirRun can add its installation directory to the user
`PATH`. On Linux and macOS, `~/.local/bin` must be available in `PATH`.

## Install a VSIX

Install the package matching your operating system and architecture:

```bash
code --install-extension flutter-airrun-<version>-<target>.vsix --force
```

Example:

```bash
code --install-extension flutter-airrun-0.1.0-linux-x64.vsix --force
```

Then reload VS Code:

1. Open the Command Palette.
2. Run **Developer: Reload Window**.
3. Open Flutter AirRun from the Activity Bar.

## First launch

When the extension activates, it checks whether the AirRun CLI is installed and
up to date.

Select **Install AirRun CLI**, then open a terminal and run:

```bash
airrun
```

VS Code commands:

```text
Flutter AirRun: Open AirRun CLI — Recommended
Flutter AirRun: Install AirRun CLI
Flutter AirRun: Check AirRun CLI
Flutter AirRun: Update AirRun CLI
Flutter AirRun: Uninstall AirRun CLI
```

## Recommended workflow

Inside a Flutter project:

```bash
airrun doctor
airrun pair qr
airrun devices
airrun run
```

Or open the interactive menu:

```bash
airrun
```

```text
Check the environment
        ↓
Enable Wireless debugging
        ↓
Pair by QR code or six-digit code
        ↓
Check available devices
        ↓
Run the Flutter application wirelessly
```

Android may change the wireless-debugging TCP port between sessions. AirRun
tries to recover the current endpoint automatically using ADB and mDNS data.

## Interactive CLI

```bash
airrun
```

Menu:

```text
▶  Launch the application wirelessly
▦  Pair a phone with a QR code
#  Pair a phone with a code
✓  Check the environment
◉  Show devices
≋  Check wireless debugging
×  Quit
```

| Key | Action |
|---|---|
| `↑` / `↓` | Move through menu items |
| `j` / `k` | Move down or up |
| `Enter` | Run the selected action |
| `1` to `7` | Select an action directly |
| `Home` / `End` | Jump to the first or last action |
| `Esc` | Cancel the current selection |

## CLI commands

| Command | Description |
|---|---|
| `airrun` | Open the interactive menu |
| `airrun doctor` | Check Flutter, ADB, the QR generator, and project readiness |
| `airrun devices` | List devices visible to ADB and Flutter |
| `airrun status` | Inspect mDNS and wireless-debugging status |
| `airrun pair qr` | Start QR-code pairing |
| `airrun pair code` | Pair with an Android six-digit code |
| `airrun run` | Launch the current Flutter project wirelessly |
| `airrun run -d <device-id>` | Launch on a specific device |
| `airrun run -- <flutter-args>` | Forward arguments to `flutter run` |
| `airrun --help` | Display help |
| `airrun --version` | Display the installed version |

Examples:

```bash
airrun doctor
airrun pair qr
airrun pair code
airrun devices
airrun status
airrun run
airrun run -d 192.168.0.132:46027
airrun run -- --debug
```

## Pair with a QR code

Run:

```bash
airrun pair qr
```

On the Android phone:

1. Open **Settings**.
2. Open **Developer options**.
3. Open **Wireless debugging**.
4. Select **Pair device with QR code**.
5. Scan the QR code displayed by AirRun.
6. Wait for pairing and connection confirmation.

Flutter AirRun generates the temporary service name and pairing secret locally.

From VS Code, use:

```text
Flutter AirRun: Pair Device with QR Code
```

## Pair with a six-digit code

Run:

```bash
airrun pair code
```

Then enter the address, pairing port, and six-digit code displayed by Android.

## Run wirelessly

Open a terminal in the directory containing `pubspec.yaml`:

```bash
airrun run
```

Target a specific device:

```bash
airrun run -d <device-id>
```

Forward Flutter arguments:

```bash
airrun run -- --debug
```

Standard Flutter controls remain available:

| Key | Action |
|---|---|
| `r` | Hot reload |
| `R` | Hot restart |
| `q` | Stop the application |
| `h` | Display Flutter run help |

## VS Code companion

| Action | Purpose |
|---|---|
| **Open AirRun CLI — Recommended** | Open the interactive CLI in the current workspace |
| **Install AirRun CLI** | Install the standalone CLI |
| **Check AirRun CLI** | Check installation path and version |
| **Update AirRun CLI** | Replace the installed CLI with the VSIX version |
| **Uninstall AirRun CLI** | Remove the managed CLI installation |
| **Run on Wireless Device** | Launch the Flutter project from the extension |
| **Pair Device with QR Code** | Start visual QR pairing |
| **Pair Device with Code** | Start pairing with a six-digit code |
| **Doctor** | Check Flutter, ADB, Android tooling, and the project |
| **Devices** | Display detected devices |
| **Wireless Status** | Inspect mDNS and wireless debugging |
| **QR Generator Doctor** | Validate the built-in TypeScript QR generator |

## Diagnostics

```bash
airrun doctor
```

Healthy output:

```text
✓ Flutter
✓ ADB
✓ TypeScript QR generator
✓ Flutter project
✓ Flutter AirRun environment ready
```

Running `doctor` outside a Flutter project still validates Flutter, ADB, and the
QR generator.

## Troubleshooting

### `airrun` is not found

Linux or macOS:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

Add the line to your shell profile, then open a new terminal.

On Windows, run **Flutter AirRun: Check AirRun CLI**, reinstall when required,
and add the managed directory to `PATH`.

### No device is displayed

```bash
airrun doctor
airrun status
airrun devices
```

Check that Wireless debugging is enabled, both devices are on the same network,
local-device communication is allowed, and `adb devices` works.

### The phone is paired but offline

Disable and re-enable **Wireless debugging**, then run:

```bash
airrun status
airrun devices
```

### Flutter does not detect the phone

```bash
adb devices
flutter devices
airrun doctor
```

### The QR code is not displayed

```bash
airrun doctor
airrun pair qr
```

From VS Code, run:

```text
Flutter AirRun: QR Generator Doctor
```

Then inspect **Output → Flutter AirRun**.

### The current directory is not a Flutter project

Open the directory containing `pubspec.yaml`, then run:

```bash
airrun
```

## Security and privacy

- Pairing happens locally between the computer and Android device.
- AirRun uses the Android Debug Bridge tools installed on the machine.
- Pairing codes and temporary QR secrets are processed locally.
- Secure random QR session data is generated by the runtime.
- Flutter AirRun does not require a cloud account.
- The extension does not use `sudo` for CLI installation.
- Disable Wireless debugging when it is not needed.

## Platform status

| Target | Standalone CLI | VSIX | Validation |
|---|:---:|:---:|---|
| Linux x64 | ✅ Built | ✅ Built | End-to-end workflow validated |
| Linux ARM64 | ✅ Built | 🚧 Pending | Hardware validation pending |
| Windows x64 | ✅ Built | 🚧 Pending | Windows validation pending |
| Windows ARM64 | ✅ Built | 🚧 Pending | Windows ARM64 validation pending |
| macOS Intel | ✅ Built | 🚧 Pending | macOS validation pending |
| macOS Apple Silicon | ✅ Built | 🚧 Pending | Apple Silicon validation pending |

The QR generator is platform-independent. New targets no longer require a
separate native build.

## Project structure

```text
flutter-airrun/
├── apps/
│   ├── cli/
│   │   ├── src/
│   │   ├── scripts/
│   │   └── dist-bin/
│   └── vscode-extension/
│       ├── src/
│       ├── scripts/
│       └── resources/
├── packages/
│   └── core/
│       └── src/
│           └── wireless/
│               └── qrPairingSessionService.ts
└── artifacts/
```

## Development

```bash
pnpm install
pnpm --filter @flutter-airrun/core build
pnpm --filter @flutter-airrun/cli build
pnpm --filter @flutter-airrun/cli build:executables
pnpm --filter flutter-airrun check
pnpm --filter flutter-airrun build
pnpm --filter flutter-airrun package:vsix -- linux-x64
```

Supported targets:

```text
linux-x64
linux-arm64
win32-x64
win32-arm64
darwin-x64
darwin-arm64
```

---

<a id="français"></a>

# Français

## Présentation

Flutter AirRun simplifie le débogage sans fil Android pour le développement
Flutter.

Au lieu de rechercher manuellement les ports ADB, recopier des adresses IP,
reconnecter les appareils et répéter plusieurs commandes, lancez un seul outil :

```bash
airrun
```

Flutter AirRun réunit :

| Composant | Rôle |
|---|---|
| **CLI autonome AirRun** | Diagnostic, association, détection, connexion et `flutter run` |
| **Extension VS Code** | Installation, ouverture, mise à jour et gestion de la CLI |
| **Bibliothèque Core partagée** | Logique Flutter, ADB, mDNS, association et récupération |
| **Générateur QR TypeScript intégré** | Création locale des sessions QR sans binaire natif séparé |

## Architecture

```text
Core Flutter AirRun partagé
ADB · mDNS · Flutter · association QR
              │
       ┌──────┴──────┐
       │             │
 CLI autonome    Extension VS Code
    airrun       compagnon visuel
       │             │
       └──────┬──────┘
              │
 Débogage sans fil Android
```

Les sessions QR sont générées directement en TypeScript avec des données
aléatoires sécurisées. Flutter AirRun ne dépend plus de CMake ni d’un binaire QR
propre à chaque plateforme.

## Pourquoi privilégier la CLI ?

La CLI apporte :

- une seule commande pour tout le parcours sans fil ;
- un menu interactif piloté au clavier ;
- la même expérience dans VS Code ou un autre terminal ;
- un accès direct aux journaux et à la sortie Flutter ;
- le hot reload et le hot restart habituels ;
- un exécutable autonome sans Node.js ni Bun après installation ;
- une base propre pour l’automatisation.

L’extension VS Code reste l’installateur, le lanceur, le gestionnaire de mises à
jour et le compagnon visuel de la CLI.

## Prérequis

Vous devez disposer de :

- Flutter accessible dans le `PATH` ;
- Android SDK Platform Tools ;
- `adb` accessible dans le `PATH` ;
- un appareil Android avec le **Débogage sans fil** ;
- un ordinateur et un téléphone sur le même réseau local ;
- un projet Flutter contenant `pubspec.yaml` ;
- Visual Studio Code uniquement pour utiliser l’extension.

> La CLI installée est autonome. Node.js et Bun ne sont pas nécessaires après
> l’installation.

## Ce que le VSIX installe

Chaque VSIX contient un seul exécutable :

```text
Linux / macOS
└── airrun
```

```text
Windows
└── airrun.exe
```

Aucun binaire QR séparé n’est installé.

### Emplacements

| Plateforme | Fichiers de l’application | Commande du terminal |
|---|---|---|
| Linux | `~/.local/share/flutter-airrun/bin/` | `~/.local/bin/airrun` |
| macOS | `~/Library/Application Support/Flutter AirRun/bin/` | `~/.local/bin/airrun` |
| Windows | `%LOCALAPPDATA%\FlutterAirRun\bin\` | `%LOCALAPPDATA%\FlutterAirRun\bin\airrun.exe` |

## Installer un VSIX

```bash
code --install-extension flutter-airrun-<version>-<cible>.vsix --force
```

Exemple :

```bash
code --install-extension flutter-airrun-0.1.0-linux-x64.vsix --force
```

Rechargez ensuite VS Code avec **Developer: Reload Window**.

## Première activation

Choisissez **Installer la CLI AirRun**, puis lancez :

```bash
airrun
```

Commandes VS Code disponibles :

```text
Flutter AirRun: Open AirRun CLI — Recommended
Flutter AirRun: Install AirRun CLI
Flutter AirRun: Check AirRun CLI
Flutter AirRun: Update AirRun CLI
Flutter AirRun: Uninstall AirRun CLI
```

## Parcours recommandé

```bash
airrun doctor
airrun pair qr
airrun devices
airrun run
```

Ou :

```bash
airrun
```

```text
Vérifier l’environnement
        ↓
Activer le débogage sans fil
        ↓
Associer par QR code ou code à six chiffres
        ↓
Vérifier les appareils
        ↓
Lancer l’application Flutter sans câble
```

## CLI interactive

```bash
airrun
```

```text
▶  Lancer l’application sans fil
▦  Associer un téléphone par QR code
#  Associer un téléphone avec un code
✓  Vérifier l’environnement
◉  Afficher les appareils
≋  Vérifier le débogage sans fil
×  Quitter
```

| Touche | Action |
|---|---|
| `↑` / `↓` | Se déplacer dans le menu |
| `j` / `k` | Descendre ou monter |
| `Entrée` | Exécuter l’action sélectionnée |
| `1` à `7` | Choisir directement une action |
| `Home` / `End` | Aller au premier ou dernier élément |
| `Échap` | Annuler |

## Commandes

| Commande | Description |
|---|---|
| `airrun` | Ouvrir le menu interactif |
| `airrun doctor` | Vérifier Flutter, ADB, le générateur QR et le projet |
| `airrun devices` | Afficher les appareils visibles |
| `airrun status` | Vérifier mDNS et le débogage sans fil |
| `airrun pair qr` | Associer par QR code |
| `airrun pair code` | Associer avec un code à six chiffres |
| `airrun run` | Lancer le projet Flutter sans câble |
| `airrun run -d <device-id>` | Utiliser un appareil précis |
| `airrun run -- <arguments-flutter>` | Transmettre des arguments à Flutter |
| `airrun --help` | Afficher l’aide |
| `airrun --version` | Afficher la version |

## Association par QR code

```bash
airrun pair qr
```

Sur le téléphone :

1. ouvrez **Paramètres** ;
2. ouvrez **Options pour les développeurs** ;
3. ouvrez **Débogage sans fil** ;
4. choisissez **Associer l’appareil avec un QR code** ;
5. scannez le QR affiché ;
6. attendez la confirmation.

Le nom de service et le secret temporaire sont générés localement.

Depuis VS Code :

```text
Flutter AirRun: Pair Device with QR Code
```

## Association avec un code

```bash
airrun pair code
```

Saisissez ensuite l’adresse, le port d’association et le code à six chiffres
affichés par Android.

## Lancer Flutter sans câble

```bash
airrun run
```

Appareil précis :

```bash
airrun run -d <device-id>
```

Arguments Flutter :

```bash
airrun run -- --debug
```

| Touche | Action |
|---|---|
| `r` | Hot reload |
| `R` | Hot restart |
| `q` | Arrêter l’application |
| `h` | Afficher l’aide Flutter |

## Extension VS Code

| Action | Utilité |
|---|---|
| **Open AirRun CLI — Recommended** | Ouvrir la CLI dans le projet actif |
| **Install AirRun CLI** | Installer la CLI autonome |
| **Check AirRun CLI** | Vérifier la version et les chemins |
| **Update AirRun CLI** | Mettre à jour l’installation gérée |
| **Uninstall AirRun CLI** | Supprimer l’installation gérée |
| **Lancer l’application sans fil** | Lancer Flutter depuis l’extension |
| **Associer par QR code** | Ouvrir l’association visuelle |
| **Associer avec un code** | Utiliser un code à six chiffres |
| **Vérifier l’environnement** | Vérifier Flutter, ADB, Android et le projet |
| **Afficher les appareils** | Afficher les appareils détectés |
| **Vérifier le débogage sans fil** | Vérifier mDNS et la connexion |
| **Vérifier le générateur QR** | Valider le générateur TypeScript intégré |

## Diagnostic

```bash
airrun doctor
```

Résultat sain :

```text
✓ Flutter
✓ ADB
✓ Générateur QR TypeScript
✓ Projet Flutter
✓ Environnement Flutter AirRun prêt
```

## Dépannage

### `airrun` est introuvable

Linux ou macOS :

```bash
export PATH="$HOME/.local/bin:$PATH"
```

Ajoutez cette ligne au profil du terminal.

Sous Windows, utilisez **Flutter AirRun: Check AirRun CLI**, puis ajoutez le
dossier géré au `PATH`.

### Aucun appareil n’est affiché

```bash
airrun doctor
airrun status
airrun devices
```

Vérifiez le réseau local, le débogage sans fil et `adb devices`.

### Le téléphone est hors ligne

Désactivez puis réactivez **Débogage sans fil**, puis lancez :

```bash
airrun status
airrun devices
```

### Flutter ne détecte pas le téléphone

```bash
adb devices
flutter devices
airrun doctor
```

### Le QR code ne s’affiche pas

```bash
airrun doctor
airrun pair qr
```

Depuis VS Code :

```text
Flutter AirRun: QR Generator Doctor
```

Consultez ensuite **Output → Flutter AirRun**.

### Le dossier actuel n’est pas un projet Flutter

Ouvrez le dossier contenant `pubspec.yaml`, puis lancez :

```bash
airrun
```

## Sécurité et confidentialité

- L’association s’effectue localement.
- AirRun utilise l’ADB installé sur la machine.
- Les codes et secrets QR temporaires sont traités localement.
- Les données aléatoires sont produites par l’environnement d’exécution.
- Aucun compte cloud AirRun n’est requis.
- L’extension n’utilise pas `sudo`.
- Désactivez le débogage sans fil lorsqu’il n’est pas utilisé.

## État des plateformes

| Cible | CLI autonome | VSIX | Validation |
|---|:---:|:---:|---|
| Linux x64 | ✅ Générée | ✅ Généré | Parcours complet validé |
| Linux ARM64 | ✅ Générée | 🚧 À générer | Validation matérielle à faire |
| Windows x64 | ✅ Générée | 🚧 À générer | Validation Windows à faire |
| Windows ARM64 | ✅ Générée | 🚧 À générer | Validation Windows ARM64 à faire |
| macOS Intel | ✅ Générée | 🚧 À générer | Validation macOS à faire |
| macOS Apple Silicon | ✅ Générée | 🚧 À générer | Validation Apple Silicon à faire |

Le générateur QR est indépendant de la plateforme. Aucune compilation native
séparée n’est désormais nécessaire.

## Structure du projet

```text
flutter-airrun/
├── apps/
│   ├── cli/
│   │   ├── src/
│   │   ├── scripts/
│   │   └── dist-bin/
│   └── vscode-extension/
│       ├── src/
│       ├── scripts/
│       └── resources/
├── packages/
│   └── core/
│       └── src/
│           └── wireless/
│               └── qrPairingSessionService.ts
└── artifacts/
```

## Développement

```bash
pnpm install
pnpm --filter @flutter-airrun/core build
pnpm --filter @flutter-airrun/cli build
pnpm --filter @flutter-airrun/cli build:executables
pnpm --filter flutter-airrun check
pnpm --filter flutter-airrun build
pnpm --filter flutter-airrun package:vsix -- linux-x64
```

Cibles :

```text
linux-x64
linux-arm64
win32-x64
win32-arm64
darwin-x64
darwin-arm64
```

---

## Author / Auteur

**Henry GOSSOU**

- GitHub: `github.com/Hen17Ry`
- LinkedIn: `linkedin.com/in/henrygossou`

## License / Licence

Flutter AirRun is distributed under the MIT License.

Flutter AirRun est distribué sous licence MIT.