# Formulários Advanx

Páginas estáticas de captação publicadas exclusivamente em `form.advanx.com.br`.

## Rotas

- `/form/<id>` continua reservado ao HeyForm.
- Cada diretório de primeiro nível é um formulário customizado e publica em `/<slug>/`.

## Tracking

Todas as páginas devem importar `/assets/tracking.js`. Ele usa o contrato de eventos sem PII:

`page_view`, `view_content`, `form_start`, `generate_lead`, `schedule`.

Nunca adicione Pixel, GA4 ou conversões manualmente dentro de um formulário. O identificador do container e os destinos ficam centralizados em `assets/tracking.js` e no GTM.
