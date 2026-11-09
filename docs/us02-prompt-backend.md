# Prompt — Backend da US02 (consultar, corrigir, baixar e excluir notas fiscais)

> Cole o conteúdo abaixo (a partir de "Contexto") no agente/dev do backend. O front já está pronto e chama exatamente estas rotas; o detalhamento do fluxo do app está em `docs/us02-notas-fiscais-fluxo-e-backend.md`.

---

## Contexto

O app mobile do veterinário anestesista já cadastra notas fiscais de serviço (NFSe) pela US01: sobe o PDF, o backend lê, o usuário revisa e confirma (`/service-invoices/:id/upload-url`, `/uploaded`, `PATCH`, `/confirm`). Ao confirmar, é criado um lançamento de **Entrada** no controle financeiro (US03) vinculado à nota.

A US02 permite **consultar, baixar o PDF, corrigir e excluir** notas já confirmadas. Preciso que você ajuste/crie as rotas abaixo no módulo `service-invoice`. O app já consome estes contratos, então **não mude nomes de campos nem formatos**.

Regras gerais (valem para todas as rotas):

- Autenticação `Authorization: Bearer <idToken>`. O dono vem do token. **Nunca** aceite `userId` em body/query (responda `400`) e responda `404` para nota de outra conta.
- Erros no envelope do ADR-07 (`code` estável, `message`, `details`).
- Datas `YYYY-MM-DD`. `amount` é número em reais (ex.: `1284.5`). `id` é UUID gerado pelo app (ADR-09).

## Tarefas

### 1. `GET /service-invoices` — listagem (alterar)

Query:

| Parâmetro  | Tipo   | Obrig. | Regra                                                                                                                                      |
| ---------- | ------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `status`   | string | sim    | O app envia `CONFIRMED`. Rascunhos nunca entram.                                                                                           |
| `sort`     | string | sim    | O app envia `issueDate:desc`. Desempate estável por `id`.                                                                                  |
| `page`     | int    | sim    | Começa em 1.                                                                                                                               |
| `pageSize` | int    | sim    | O app usa 5 e 20. Limite máximo sugerido: 100.                                                                                             |
| `search`   | string | não    | Sem acento e sem diferenciar caixa, casa com **nome do tomador** OU **`number`** OU **data de emissão** em `DD/MM/AAAA` (parcial, só dígitos, mínimo 2 dígitos: `22/04`, `2204`). |

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

- `number` e `location`: `string | null`.
- `hasFile`: `true` quando o PDF original existe no bucket.
- `total`: total que casa com os filtros (não o tamanho da página).

### 2. `GET /service-invoices/:id` — detalhes (alterar, compatível)

Hoje devolve `{ status, uploadedAt, review }` e a US01 depende disso para retomar rascunhos: **mantenha**. Acrescente `invoice`, presente **apenas** quando `status = CONFIRMED`:

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

`file` é `null` sem PDF; `client.taxId` é `null` se o tomador não tem documento. `404` para id inexistente ou de outra conta.

### 3. `GET /service-invoices/:id/download-url` — URL do PDF (criar)

Resposta `200`:

```json
{
  "url": "https://…?X-Amz-Signature=…",
  "filename": "nota_fiscal.pdf",
  "expiresAt": "2026-04-22T13:12:11.000Z"
}
```

- URL assinada de curta duração (5–10 min) com `Content-Disposition: attachment; filename="…"` e `Content-Type: application/pdf`.
- `filename` é o nome com que o app grava o arquivo no aparelho: use um nome seguro (sem `/`, sem caracteres de controle).
- Erros: `404` com `code = SERVICE_INVOICE_FILE_NOT_FOUND` (nota inexistente, de outra conta ou sem arquivo); `409` se a nota ainda é rascunho.

### 4. `PATCH /service-invoices/:id` — correção (alterar)

Hoje só aceita rascunho. Passe a aceitar também nota `CONFIRMED`. Body que o app envia na correção:

```json
{ "issueDate": "2026-04-23", "amount": 1300, "clientId": "c1…", "location": "Campinas, SP" }
```

| Campo       | Tipo           | Regra                                                                  |
| ----------- | -------------- | ---------------------------------------------------------------------- |
| `issueDate` | date           | Obrigatório, data real.                                                |
| `amount`    | number         | Obrigatório, `> 0`, no máximo 2 casas decimais.                        |
| `clientId`  | string         | Obrigatório; tomador existente **da mesma conta** (senão `404`/`422`). |
| `location`  | string \| null | Opcional; `null` limpa; máximo 120 caracteres.                         |

Em nota `CONFIRMED`, **na mesma transação**:

1. atualize a nota;
2. atualize o lançamento de **Entrada** vinculado (US03): data (`occurredOn`) ← `issueDate`, valor ← `amount`, cliente ← `clientId`;
3. **preserve o vínculo** lançamento ↔ nota (mesma origem/`sourceId`). Não crie lançamento novo.

Se qualquer passo falhar, nada é alterado. Resposta `200` no mesmo formato do `GET /service-invoices/:id` (com `invoice` já com os valores novos). O app não envia `number` na correção: ignore-o se vier em nota confirmada. Não reexecute a checagem de duplicidade (`SERVICE_INVOICE_POSSIBLE_DUPLICATE`) na correção.

### 5. `DELETE /service-invoices/:id` — exclusão (verificar)

A rota já existe. Garanta que, para nota `CONFIRMED`, remove **de forma permanente e atômica**: a nota, o PDF no bucket e o lançamento de Entrada vinculado. Resposta `204`.

O app guarda exclusões feitas offline numa fila e as reenvia depois, então repetir a chamada após sucesso deve devolver `404` (o app trata como "já excluída"), **nunca `5xx`**.

### 6. Modelo — campo `location` (criar)

- Adicione `location` (string, nullable, máx. 120) à nota confirmada, com migração.
- Devolva-o em listagem e detalhes.
- Na confirmação (`POST /service-invoices/:id/confirm`), se `location` estiver vazio, preencha com `"{cidade}, {UF}"` do tomador quando ele tiver os dois; caso contrário deixe `null`.

## Critérios de aceite

- [ ] A listagem só devolve notas `CONFIRMED` da conta do token, da data de emissão mais recente para a mais antiga, paginada, com `total` correto.
- [ ] `search` encontra por parte do nome do tomador (sem acento), por número e por data parcial (`22/04`).
- [ ] `GET /service-invoices/:id` de rascunho **não** traz `invoice`; de nota confirmada traz. O fluxo de retomada de rascunho da US01 continua funcionando.
- [ ] `download-url` devolve URL que baixa o PDF com o nome em `filename`; expira; `404`/`409` conforme acima.
- [ ] `PATCH` em nota confirmada altera nota **e** o lançamento de Entrada na mesma transação, mantém o vínculo e não duplica lançamento; falha parcial não deixa estado inconsistente.
- [ ] `PATCH` com `amount ≤ 0`, data inválida ou `clientId` de outra conta é recusado.
- [ ] `DELETE` de nota confirmada remove nota + PDF + lançamento; segunda chamada devolve `404`.
- [ ] Nenhuma rota aceita `userId`; nota de outra conta sempre dá `404`.
- [ ] Testes automatizados cobrindo cada item acima, incluindo o isolamento entre contas.

## Fora de escopo

- Qualquer campo de "status de sincronização": é conceito do app (fila offline) e o backend não o expõe.
- Cache de PDF no aparelho e correção offline: são do app.
