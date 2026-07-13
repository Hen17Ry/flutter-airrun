import {
  type QrPairingSession,
} from '@flutter-airrun/core';

import * as QRCode from 'qrcode';

import * as vscode from 'vscode';

export type QrSessionPanelMode =
  | 'preview'
  | 'pairing';

export async function showQrSessionPanel(
  session: QrPairingSession,
  mode: QrSessionPanelMode =
    'preview',
): Promise<vscode.WebviewPanel> {
  const title =
    mode === 'pairing'
      ? 'Flutter AirRun — Association QR'
      : 'Flutter AirRun — Prévisualisation QR';

  const panel =
    vscode.window.createWebviewPanel(
      'flutterAirRun.qrSession',
      title,
      vscode.ViewColumn.Active,
      {
        enableScripts:
          false,

        retainContextWhenHidden:
          true,
      },
    );

  const qrDataUrl =
    await QRCode.toDataURL(
      session.qrPayload,
      {
        type:
          'image/png',

        width:
          480,

        margin:
          2,

        errorCorrectionLevel:
          'M',
      },
    );

  panel.webview.html =
    createWebviewHtml(
      panel.webview,
      session,
      qrDataUrl,
      mode,
    );

  return panel;
}

function createWebviewHtml(
  webview: vscode.Webview,
  session: QrPairingSession,
  qrDataUrl: string,
  mode: QrSessionPanelMode,
): string {
  const escapedServiceName =
    escapeHtml(
      session.serviceName,
    );

  const escapedGeneratorVersion =
    escapeHtml(
      session.generatorVersion,
    );

  const heading =
    mode === 'pairing'
      ? 'Associer le téléphone'
      : 'Session QR AirRun';

  const description =
    mode === 'pairing'
      ? [
          'Sur votre téléphone Android, ouvrez',
          'Débogage sans fil, puis sélectionnez',
          'Associer un appareil avec un code QR.',
        ].join(' ')
      : [
          'Cette session QR a été générée',
          'localement par Flutter AirRun.',
        ].join(' ');

  const statusMessage =
    mode === 'pairing'
      ? 'AirRun attend le scan du téléphone…'
      : 'Prévisualisation uniquement';

  return /* html */ `
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="UTF-8" />

        <meta
          http-equiv="Content-Security-Policy"
          content="
            default-src 'none';
            img-src ${webview.cspSource} data:;
            style-src 'unsafe-inline';
          "
        />

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        />

        <title>
          ${escapeHtml(heading)}
        </title>

        <style>
          :root {
            color-scheme:
              light dark;
          }

          * {
            box-sizing:
              border-box;
          }

          body {
            margin:
              0;

            padding:
              32px 20px;

            color:
              var(
                --vscode-foreground
              );

            background:
              var(
                --vscode-editor-background
              );

            font-family:
              var(
                --vscode-font-family
              );
          }

          .page {
            width:
              min(
                100%,
                620px
              );

            margin:
              0 auto;
          }

          .header {
            margin-bottom:
              24px;

            text-align:
              center;
          }

          .eyebrow {
            margin:
              0 0 8px;

            color:
              var(
                --vscode-descriptionForeground
              );

            font-size:
              12px;

            font-weight:
              700;

            letter-spacing:
              0.12em;

            text-transform:
              uppercase;
          }

          h1 {
            margin:
              0;

            font-size:
              28px;

            line-height:
              1.2;
          }

          .description {
            max-width:
              520px;

            margin:
              12px auto 0;

            color:
              var(
                --vscode-descriptionForeground
              );

            font-size:
              14px;

            line-height:
              1.6;
          }

          .qr-card {
            padding:
              24px;

            border:
              1px solid
              var(
                --vscode-panel-border
              );

            border-radius:
              16px;

            background:
              var(
                --vscode-sideBar-background
              );

            box-shadow:
              0 12px 32px
              rgba(
                0,
                0,
                0,
                0.16
              );

            text-align:
              center;
          }

          .qr-wrapper {
            display:
              inline-flex;

            align-items:
              center;

            justify-content:
              center;

            width:
              min(
                100%,
                420px
              );

            padding:
              18px;

            border-radius:
              14px;

            background:
              #ffffff;
          }

          .qr-wrapper img {
            display:
              block;

            width:
              100%;

            height:
              auto;
          }

          .status {
            display:
              inline-flex;

            align-items:
              center;

            gap:
              8px;

            margin-top:
              20px;

            padding:
              8px 12px;

            border-radius:
              999px;

            color:
              var(
                --vscode-notificationsInfoIcon-foreground
              );

            background:
              var(
                --vscode-badge-background
              );

            font-size:
              13px;

            font-weight:
              600;
          }

          .status-dot {
            width:
              8px;

            height:
              8px;

            border-radius:
              50%;

            background:
              currentColor;
          }

          .details {
            display:
              grid;

            gap:
              12px;

            margin-top:
              20px;

            text-align:
              left;
          }

          .detail {
            padding:
              12px 14px;

            border:
              1px solid
              var(
                --vscode-panel-border
              );

            border-radius:
              10px;

            background:
              var(
                --vscode-editor-background
              );
          }

          .detail-label {
            display:
              block;

            margin-bottom:
              5px;

            color:
              var(
                --vscode-descriptionForeground
              );

            font-size:
              11px;

            font-weight:
              700;

            letter-spacing:
              0.08em;

            text-transform:
              uppercase;
          }

          .detail-value {
            display:
              block;

            overflow-wrap:
              anywhere;

            font-family:
              var(
                --vscode-editor-font-family
              );

            font-size:
              13px;
          }

          .instructions {
            margin-top:
              24px;

            padding:
              18px;

            border-left:
              3px solid
              var(
                --vscode-focusBorder
              );

            border-radius:
              8px;

            background:
              var(
                --vscode-textBlockQuote-background
              );
          }

          .instructions h2 {
            margin:
              0 0 10px;

            font-size:
              15px;
          }

          .instructions ol {
            margin:
              0;

            padding-left:
              20px;

            color:
              var(
                --vscode-descriptionForeground
              );

            font-size:
              13px;

            line-height:
              1.7;
          }

          .security {
            margin-top:
              18px;

            color:
              var(
                --vscode-descriptionForeground
              );

            font-size:
              12px;

            line-height:
              1.5;

            text-align:
              center;
          }
        </style>
      </head>

      <body>
        <main class="page">
          <header class="header">
            <p class="eyebrow">
              Flutter AirRun
            </p>

            <h1>
              ${escapeHtml(heading)}
            </h1>

            <p class="description">
              ${escapeHtml(description)}
            </p>
          </header>

          <section class="qr-card">
            <div class="qr-wrapper">
              <img
                src="${qrDataUrl}"
                alt="Code QR d’association Flutter AirRun"
              />
            </div>

            <div class="status">
              <span class="status-dot"></span>

              <span>
                ${escapeHtml(statusMessage)}
              </span>
            </div>

            <div class="details">
              <div class="detail">
                <span class="detail-label">
                  Service temporaire
                </span>

                <span class="detail-value">
                  ${escapedServiceName}
                </span>
              </div>

              <div class="detail">
                <span class="detail-label">
                  Générateur
                </span>

                <span class="detail-value">
                  TypeScript ${escapedGeneratorVersion}
                </span>
              </div>

              <div class="detail">
                <span class="detail-label">
                  Protocole
                </span>

                <span class="detail-value">
                  ${session.protocolVersion}
                </span>
              </div>
            </div>
          </section>

          ${
            mode === 'pairing'
              ? `
                <section class="instructions">
                  <h2>
                    Étapes sur Android
                  </h2>

                  <ol>
                    <li>
                      Ouvrez les Options pour les développeurs.
                    </li>

                    <li>
                      Ouvrez Débogage sans fil.
                    </li>

                    <li>
                      Choisissez Associer un appareil avec un code QR.
                    </li>

                    <li>
                      Scannez le QR affiché dans cette fenêtre.
                    </li>

                    <li>
                      Gardez cette fenêtre ouverte pendant la connexion.
                    </li>
                  </ol>
                </section>
              `
              : ''
          }

          <p class="security">
            Le secret d’association est généré localement et
            n’est pas affiché en clair dans cette fenêtre.
          </p>
        </main>
      </body>
    </html>
  `;
}

function escapeHtml(
  value: string,
): string {
  return value
    .replaceAll(
      '&',
      '&amp;',
    )
    .replaceAll(
      '<',
      '&lt;',
    )
    .replaceAll(
      '>',
      '&gt;',
    )
    .replaceAll(
      '"',
      '&quot;',
    )
    .replaceAll(
      "'",
      '&#039;',
    );
}