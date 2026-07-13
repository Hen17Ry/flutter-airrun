import { randomBytes } from 'node:crypto';

import type {
  NativeHelperQrSession,
} from '@flutter-airrun/core';

import * as QRCode from 'qrcode';
import * as vscode from 'vscode';

const QR_SESSION_VIEW_TYPE =
  'flutterAirRun.qrSessionPreview';

export async function showQrSessionPanel(
  session: NativeHelperQrSession,
): Promise<void> {
  const qrSvg = await QRCode.toString(
    session.qrPayload,
    {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 320,
    },
  );

  const panel =
    vscode.window.createWebviewPanel(
      QR_SESSION_VIEW_TYPE,
      'Flutter AirRun — QR Session',
      vscode.ViewColumn.Beside,
      {
        enableScripts: false,
        retainContextWhenHidden: false,
      },
    );

  panel.webview.html = buildHtml(
    panel.webview,
    session,
    qrSvg,
  );
}

function buildHtml(
  webview: vscode.Webview,
  session: NativeHelperQrSession,
  qrSvg: string,
): string {
  const nonce =
    randomBytes(18).toString('base64');

  const serviceName =
    escapeHtml(session.serviceName);

  const helperVersion =
    escapeHtml(session.helperVersion);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >

  <meta
    http-equiv="Content-Security-Policy"
    content="
      default-src 'none';
      style-src 'nonce-${nonce}';
    "
  >

  <title>Flutter AirRun — QR Session</title>

  <style nonce="${nonce}">
    :root {
      color-scheme: light dark;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 32px 20px;
      color: var(--vscode-foreground);
      background:
        var(--vscode-editor-background);
      font-family:
        var(--vscode-font-family);
    }

    main {
      width: min(100%, 620px);
      margin: 0 auto;
    }

    header {
      margin-bottom: 24px;
      text-align: center;
    }

    h1 {
      margin: 0 0 8px;
      font-size: 24px;
      font-weight: 650;
    }

    .subtitle {
      margin: 0;
      color:
        var(--vscode-descriptionForeground);
      line-height: 1.5;
    }

    .card {
      padding: 24px;
      border:
        1px solid
        var(--vscode-panel-border);
      border-radius: 12px;
      background:
        var(--vscode-sideBar-background);
    }

    .qr-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 352px;
      padding: 16px;
      overflow: hidden;
      border-radius: 10px;
      background: white;
    }

    .qr-container svg {
      display: block;
      width: min(320px, 100%);
      height: auto;
    }

    dl {
      display: grid;
      grid-template-columns:
        minmax(110px, auto) 1fr;
      gap: 10px 16px;
      margin: 24px 0 0;
    }

    dt {
      color:
        var(--vscode-descriptionForeground);
    }

    dd {
      min-width: 0;
      margin: 0;
      overflow-wrap: anywhere;
      font-family:
        var(--vscode-editor-font-family);
    }

    .notice {
      margin-top: 20px;
      padding: 14px 16px;
      border:
        1px solid
        var(--vscode-inputValidation-warningBorder);
      border-radius: 8px;
      background:
        var(--vscode-inputValidation-warningBackground);
      color:
        var(--vscode-inputValidation-warningForeground);
      line-height: 1.5;
    }

    .security {
      margin-top: 16px;
      color:
        var(--vscode-descriptionForeground);
      font-size: 12px;
      line-height: 1.5;
      text-align: center;
    }

    @media (max-width: 480px) {
      body {
        padding: 20px 12px;
      }

      .card {
        padding: 16px;
      }

      dl {
        grid-template-columns: 1fr;
        gap: 4px;
      }

      dd {
        margin-bottom: 10px;
      }
    }
  </style>
</head>

<body>
  <main>
    <header>
      <h1>Session QR ADB</h1>

      <p class="subtitle">
        Prévisualisation de la session générée
        par Flutter AirRun.
      </p>
    </header>

    <section class="card">
      <div
        class="qr-container"
        role="img"
        aria-label="Code QR de la session ADB"
      >
        ${qrSvg}
      </div>

      <dl>
        <dt>Service</dt>
        <dd>${serviceName}</dd>

        <dt>Helper</dt>
        <dd>${helperVersion}</dd>

        <dt>Protocole</dt>
        <dd>${session.protocolVersion}</dd>
      </dl>

      <div class="notice">
        <strong>Prévisualisation uniquement.</strong>
        Le serveur natif d’association ADB
        n’est pas encore démarré. Scanner ce QR
        maintenant ne pourra donc pas terminer
        l’association.
      </div>

      <p class="security">
        Le secret est encodé dans le QR,
        mais il n’est pas affiché en clair.
        Fermer ce panneau détruit cette
        prévisualisation.
      </p>
    </section>
  </main>
</body>
</html>`;
}

function escapeHtml(
  value: string,
): string {
  return value.replace(
    /[&<>"']/g,
    character => {
      switch (character) {
        case '&':
          return '&amp;';

        case '<':
          return '&lt;';

        case '>':
          return '&gt;';

        case '"':
          return '&quot;';

        case "'":
          return '&#039;';

        default:
          return character;
      }
    },
  );
}
