# US02 — Consultar, corrigir e baixar notas fiscais

Fluxo do app e o que o backend precisa entregar. O app está em `src/features/serviceInvoices` (telas de Relatórios em `src/features/reports`).

Todas as rotas exigem `Authorization: Bearer <idToken>`. O dono vem do token: o app **nunca** envia `userId`, e o backend deve devolver `404` para nota de outra conta. Erros seguem o envelope do ADR-07 (`code` estável, `message`, `details`).

> O que já existe no backend (usado pela US01) e o que é **novo/alterado** para a US02 está marcado em cada rota.

## 1. Visão geral do fluxo

```
Relatórios
 ├─ Botão redondo no topo ── abre a Listagem ── GET /service-invoices
 │    ├─ toca num card ───────────────┐
 │    (busca, filtro por status, paginação; botão fixo "Adicionar nota")
 │                                    ▼
 │                              Detalhes da nota ── GET /service-invoices/:id
 │                                    │
 │      ┌─────────────────────────────┼───────────────────────────────┐
 │      ▼                             ▼                               ▼
 │  Baixar PDF                     Corrigir                        Excluir
 │  GET …/:id/download-url         PATCH /service-invoices/:id     DELETE /service-invoices/:id
 │  (salva o PDF no aparelho)      (volta aos detalhes)            (volta à listagem)
 └─ "Adicionar nota" (US01, já existente)
```

- Listagem, detalhes e correção abrem num único `SlideInModal` com uma pilha pequena (`ServiceInvoicesNavigator`). Só a tela do topo fica montada: ao voltar para detalhes ou listagem os dados são lidos de novo, e é isso que mostra a nota corrigida/removida.
- "Adicionar nota" na aba Relatórios usa o fluxo da US01 sem alteração (`useServiceInvoiceUpload` + `ServiceInvoiceUploadFlow`).

## 2. Telas e comportamento

### 2.1 Entrada pela aba Relatórios

- Um botão redondo marrom com ícone de nota, no topo à direita do título (mesmo padrão do cabeçalho de Finanças), abre a listagem.
- O botão **Adicionar nota** fica fixo no fim da listagem, em qualquer estado. Ao tocar, a listagem fecha e o fluxo de upload da US01 começa.

### 2.2 Listagem completa

- Cada linha: título ("Nota Fiscal {número}"), data de emissão, tomador, local, valor, selo de status e ícone de PDF quando `hasFile`.
- Ordenada por `issueDate` decrescente (o app reordena também o que vem do aparelho).
- Busca por **nome do tomador**, **número da nota** ou **data** (aceita `22/04/2026`, `22/04`, `2204`; ≥ 2 dígitos). Debounce de 300 ms; o termo vai ao backend em `search` e o app aplica o mesmo filtro localmente às notas do aparelho.
- Chips de status: Todas / Sincronizadas / Não sincronizadas / Com erro (filtro só no app, ver §4).
- Paginação por rolagem (`pageSize=20`).
- Vazio sem filtro → estado vazio; vazio com busca/filtro → "Nada encontrado".
- Sem conexão: mostra a última lista guardada no aparelho (até 50 notas) com um aviso.

### 2.3 Detalhes

- Card do arquivo: nome, tamanho, selo de status e botão **Baixar PDF**.
- Dados: data de emissão, número (se houver), tomador, CNPJ do tomador (se houver), local (se houver) e valor total.
- **Baixar PDF** pede a URL assinada ao backend, deixa a pessoa **escolher a pasta** (seletor de pastas do sistema) e salva o arquivo lá com o nome devolvido em `filename` (se já existir, acrescenta um sufixo numérico). Na web, abre a URL e o navegador baixa pelo `Content-Disposition: attachment`. Cancelar o seletor não é erro.
- Os dois ficam desabilitados, com o motivo escrito, quando:
  - sem internet → "O download exige conexão com a internet." (o app não guarda cópia para abrir offline);
  - nota ainda não enviada (`PENDING`/`ERROR`) → "O PDF ainda não foi enviado…";
  - `hasFile = false` → "Esta nota não tem PDF original."
- **Corrigir** só habilita para nota `SYNCED` com conexão. **Excluir** sempre.
- Erros: `404` → "Esta nota não existe mais." (botão Voltar); falha de rede/5xx → mensagem + "Tentar novamente". Sem rede, abre pelo cache da listagem (sem nome/tamanho do arquivo).

### 2.4 Correção

- Formulário com o que está salvo: **data de emissão**, **valor**, **tomador** (autocomplete dos tomadores existentes) e **local** (texto livre). O número da nota não é editável.
- O card do PDF original continua na tela, com o mesmo botão de download, para conferência.
- Validação (no app, antes de enviar): data real em DD/MM/AAAA; valor numérico `> 0`; tomador obrigatório; tomador cadastrado offline ainda sem id real é recusado (`pending`).
- **Confirmar** → `PATCH`. Sucesso: volta aos detalhes, já com os valores novos. Falhas: sem conexão ("conecte-se para salvar"), `404`, genérica.
- **Cancelar**/voltar não envia nada; se há alteração não salva, pede confirmação antes de sair.

### 2.5 Exclusão

- Diálogo "Excluir nota fiscal?" avisando que o **PDF original** e o **lançamento financeiro vinculado** também serão excluídos. Nota ainda não sincronizada mostra só o item do PDF.
- Confirmar → `DELETE`; sucesso → diálogo "Nota fiscal excluída com sucesso" → **Entendi** → volta à listagem (que recarrega sem a nota).
- Sem conexão: a exclusão entra numa fila local, a nota some das listas na hora e o aviso informa que será enviada quando a conexão voltar (`syncPendingInvoiceDeletions`, junto da sincronização das notas, a cada abertura/volta ao app/30 s). `404` na fila conta como já excluída.
- Nota pendente/recusada (só no aparelho) é descartada localmente, sem chamar o backend.

## 3. Contrato das rotas

Tipos: `date` = `YYYY-MM-DD`; `amount` = número em reais (ex.: `1284.5`); `id` = UUID gerado pelo app (ADR-09).

### 3.1 `GET /service-invoices` — listagem (**alterada**)

Query:

| Parâmetro  | Tipo   | Obrig. | Descrição                                                                                       |
| ---------- | ------ | ------ | ----------------------------------------------------------------------------------------------- |
| `status`   | string | sim    | O app sempre envia `CONFIRMED`. Rascunhos nunca entram na listagem.                             |
| `sort`     | string | sim    | O app envia `issueDate:desc`. Desempate estável por `id`.                                       |
| `page`     | int    | sim    | Começa em 1.                                                                                    |
| `pageSize` | int    | sim    | O app usa 20 na listagem.                                                                       |
| `search`   | string | não    | Casa (sem acento, sem diferenciar caixa) com nome do tomador **ou** `number` **ou** a data de emissão em `DD/MM/AAAA` (parcial, só dígitos, ≥ 2). |

Resposta `200`:

```json
{
  "items": [
    {
      "id": "6f1c…",
      "number": "000458",
      "issueDate": "2026-04-22",
      "amount": 1284.5,
      "client": { "id": "c1…", "name": "HospVet Sul" },
      "location": "São Paulo, SP",
      "hasFile": true
    }
  ],
  "total": 37
}
```

| Campo               | Tipo           | Observação                                                                 |
| ------------------- | -------------- | -------------------------------------------------------------------------- |
| `items[].id`        | string         |                                                                            |
| `items[].number`    | string \| null | Número da nota, se houver.                                                 |
| `items[].issueDate` | date           |                                                                            |
| `items[].amount`    | number         |                                                                            |
| `items[].client`    | `{id, name}`   | Tomador. `taxId` é opcional aqui.                                          |
| `items[].location`  | string \| null | Texto exibido como "Cidade, UF". Ver §5.1 (de onde sai).                   |
| `items[].hasFile`   | boolean        | `true` quando o PDF original está guardado no bucket (selo no card).       |
| `total`             | int            | Total que casa com os filtros (não só da página) — o app pagina por ele.   |

### 3.2 `GET /service-invoices/:id` — detalhes (**alterada**, compatível)

Hoje devolve `{ status, uploadedAt, review }` (usado pela US01 para retomar rascunhos). Acrescentar o campo `invoice`, presente **só** quando `status = CONFIRMED`:

```json
{
  "status": "CONFIRMED",
  "uploadedAt": "2026-04-22T13:02:11.000Z",
  "review": { "…": "como hoje" },
  "invoice": {
    "id": "6f1c…",
    "number": "000458",
    "issueDate": "2026-04-22",
    "amount": 1284.5,
    "client": { "id": "c1…", "name": "HospVet Sul", "taxId": "12345678000190" },
    "location": "São Paulo, SP",
    "hasFile": true,
    "file": { "name": "nota_fiscal.pdf", "bytesSize": 253952 }
  }
}
```

- `file` é `null` quando não há PDF. `client.taxId` é `null`/ausente se o tomador não tem documento.
- Sem `invoice` (rascunho) o app trata como "nota não encontrada". `404` para id inexistente ou de outra conta.

### 3.3 `GET /service-invoices/:id/download-url` — URL do PDF (**nova**)

Resposta `200`:

```json
{
  "url": "https://bucket.s3.amazonaws.com/…?X-Amz-Signature=…",
  "filename": "nota_fiscal.pdf",
  "expiresAt": "2026-04-22T13:12:11.000Z"
}
```

- URL **assinada, de curta duração** (sugestão: 5–10 min), com `Content-Disposition: attachment; filename="…"` e `Content-Type: application/pdf`. O app só lê `url` e `filename` e usa a URL imediatamente para salvar o arquivo. `filename` é o nome com que o arquivo é gravado no aparelho.
- Erros: `404` (nota inexistente/de outra conta/sem arquivo — `SERVICE_INVOICE_FILE_NOT_FOUND`), `409` se a nota ainda é rascunho.

### 3.4 `PATCH /service-invoices/:id` — correção (**alterada**)

Hoje aceita `issueDate`, `amount`, `number`, `clientId` para **rascunhos**. Passa a aceitar também notas `CONFIRMED`.

Body enviado pela correção:

```json
{
  "issueDate": "2026-04-23",
  "amount": 1300,
  "clientId": "c1…",
  "location": "Campinas, SP"
}
```

| Campo       | Tipo           | Regras                                                                 |
| ----------- | -------------- | ---------------------------------------------------------------------- |
| `issueDate` | date           | Obrigatório, data real.                                                |
| `amount`    | number         | Obrigatório, `> 0`, até 2 casas.                                       |
| `clientId`  | string         | Obrigatório; tomador existente e da conta (senão `404`/`422`).         |
| `location`  | string \| null | Opcional; `null` limpa. Máx. 120 caracteres sugerido.                  |

Em nota `CONFIRMED` o backend deve, **na mesma transação**:

1. atualizar a nota;
2. atualizar o lançamento de **Entrada** vinculado no controle financeiro (US03): `occurredOn` ← `issueDate`, `amount` ← `amount`, cliente ← `clientId`;
3. **preservar o vínculo** entre o lançamento e a nota (mesmo `sourceId`/origem), sem criar lançamento novo.

Resposta `200`: o mesmo formato de `GET /service-invoices/:id` (campo `invoice` com os valores novos). O app lê só `invoice`.

Decisões pendentes de regra de negócio:

- a correção **não** revalida duplicidade (`SERVICE_INVOICE_POSSIBLE_DUPLICATE`) — confirmar se deve.
- `number` não é enviado pela correção; se vier num `PATCH` de nota confirmada, pode ser ignorado ou aceito.

### 3.5 `DELETE /service-invoices/:id` — exclusão (**já existe**)

Já exclui rascunho; em nota `CONFIRMED` deve (e a US01 já assume que faz) remover, de forma permanente:

1. a nota;
2. o PDF original no bucket;
3. o lançamento financeiro de Entrada vinculado.

Resposta `204`. `404` se não existe (o app trata `404` como já excluída, importante para a fila offline). A rota precisa ser **idempotente** do ponto de vista do app: repetir após sucesso devolve `404`, nunca `5xx`.

## 4. Status de sincronização (chips e selos)

É um conceito **do app**, não do backend:

| Selo no app        | Origem                                                                                  |
| ------------------ | --------------------------------------------------------------------------------------- |
| `SYNCED` Sincronizado     | Veio de `GET /service-invoices` (`CONFIRMED`).                                    |
| `PENDING` Não sincronizado | Nota digitada offline, ainda na fila local (`outbox`) sem recusa.                |
| `ERROR` Erro no envio      | Nota na fila local recusada pelo backend (`rejection`).                          |

O backend não precisa expor esse campo. Notas `PENDING`/`ERROR` aparecem na lista com os dados locais, sem local/arquivo baixável.

## 5. Pontos de atenção para o backend

### 5.1 Campo `location` (novo)

A US pede "local" na listagem e na correção, e o app o trata como texto livre (`"São Paulo, SP"`). O backend precisa:

- persistir `location` (string nullable) na nota confirmada;
- devolvê-lo em listagem e detalhes;
- na **confirmação** (`/confirm`) preencher por padrão com `"{cidade}, {UF}"` do tomador quando existir, já que o fluxo de cadastro da US01 não pede esse campo. Se preferir derivar sempre do tomador em vez de guardar, o `PATCH` de `location` deixa de fazer sentido e a correção do app deve esconder o campo — alinhar antes.

### 5.2 `hasFile` / `file`

`hasFile` deve refletir se o objeto existe no bucket (nota criada manualmente pelo app sempre tem PDF). O app mostra o selo "PDF original disponível" a partir dele.

### 5.3 Cache e consistência

O app guarda localmente a primeira página da listagem (até 50 notas) para uso offline e a invalida a cada leitura bem-sucedida. Não há `ETag`/`updatedAt` — se quiser sincronização incremental no futuro, `updatedAt` na listagem ajudaria.

### 5.4 Download offline

O app **não** guarda o PDF baixado. A regra "arquivo não sincronizado no aparelho exige internet" vale para toda nota `SYNCED`. Se o produto quiser abrir PDFs já baixados sem rede, é trabalho de app (cache de arquivo) e não muda este contrato.

## 6. Resumo das mudanças no backend

| Rota                                      | Mudança                                                                                                 |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `GET /service-invoices`                   | **Alterar**: filtros `status`, `sort`, `search`, paginação (`page`/`pageSize`) e resposta `{items,total}`. |
| `GET /service-invoices/:id`               | **Alterar**: incluir `invoice` (com `client.taxId`, `location`, `hasFile`, `file`) para nota confirmada.   |
| `GET /service-invoices/:id/download-url`  | **Criar**: URL assinada do PDF.                                                                         |
| `PATCH /service-invoices/:id`             | **Alterar**: aceitar `location`; permitir em nota confirmada e atualizar o lançamento de Entrada (US03).   |
| `DELETE /service-invoices/:id`            | Já remove nota + PDF + lançamento; garantir `404` (não `5xx`) quando já excluída.                        |
| Modelo da nota                            | **Criar** coluna `location` (nullable).                                                                 |

## 7. Onde está cada coisa no app

| Responsabilidade                         | Arquivo                                                                 |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| Chamadas HTTP da US02                    | `services/serviceInvoiceRecordService.ts`                               |
| Fila de exclusão offline e cache         | `services/offlineServiceInvoiceStore.ts`, `services/invoiceDeletionSyncService.ts` |
| Regras (ordenar, buscar, download, correção) | `domain/serviceInvoiceList.ts`, `invoiceDownload.ts`, `invoiceCorrection.ts`, `pendingSummary.ts` |
| Estado das telas                         | `hooks/useServiceInvoices.ts`, `useServiceInvoiceRecord.ts`, `useServiceInvoiceDownload.ts`, `useServiceInvoiceCorrection.ts`, `useServiceInvoiceDeletion.ts` |
| Formulário reutilizável (adicionar e corrigir) | `hooks/useServiceInvoiceFields.ts` + `components/ServiceInvoiceFormCard.tsx` |
| Diálogo reutilizável (excluir / sucesso) | `app/components/ui/status-dialog.tsx`                                   |
| Telas                                    | `screens/ServiceInvoicesSection.tsx`, `ServiceInvoicesNavigator.tsx`, `ServiceInvoiceListScreen.tsx`, `ServiceInvoiceDetailScreen.tsx`, `ServiceInvoiceCorrectionScreen.tsx` |
