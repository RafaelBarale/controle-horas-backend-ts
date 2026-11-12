# Fluxo do MÃ³dulo de LanÃ§amento de Horas (Time Entries & SubTimeEntries)

Este documento descreve detalhadamente a arquitetura, os fluxos de requisiÃ§Ã£o e as regras de negÃ³cio do mÃ³dulo de **LanÃ§amento de Horas** (`/time`), cobrindo validaÃ§Ã£o de schemas Zod, controle de acesso JWT, integridade referencial com projetos e usuÃ¡rios, decomposiÃ§Ã£o em intervalos de tempo (**SubTimeEntries**), cÃ¡lculo automÃ¡tico de total de horas, prevenÃ§Ã£o de sobreposiÃ§Ã£o de horÃ¡rios e persistÃªncia transacional com o Prisma.

---

## 1. VisÃ£o Geral dos Componentes

| Camada / Arquivo | Responsabilidade |
| :--- | :--- |
| `src/app.ts` | Registra o prefixo `/time`, aplicando o middleware global de autenticaÃ§Ã£o `authenticate` antes de repassar para o roteador. |
| `src/routes/timeEntryRoutes.ts` | Declara as rotas de lanÃ§amentos de horas (`POST /`, `GET /`, `GET /:id`, `PUT /:id`, `DELETE /:id`) e vincula os validadores e mÃ©todos do controller. |
| `src/middlewares/authenticate.ts` | Valida o JWT (`accessToken`) no cabeÃ§alho `Authorization: Bearer <token>` e injeta `req.user`. |
| `src/middlewares/validateRequest.ts` | Intercepta requisiÃ§Ãµes e valida `body`, `params` e `query` com schemas Zod antes de chegar ao controller. |
| `src/schemas/timeEntry.schema.ts` | Define os schemas Zod de criaÃ§Ã£o (`createTimeEntrySchema`), atualizaÃ§Ã£o (`updateTimeEntrySchema`) e consulta (`getTimeEntrySchema`), incluindo validaÃ§Ã£o de formato `HH:MM`, verificaÃ§Ã£o de `hourFin > hourIni` e detecÃ§Ã£o de sobreposiÃ§Ã£o de intervalos no array `subTimeEntries`. |
| `src/schemas/id.schema.ts` | Valida e faz coerÃ§Ã£o de parÃ¢metros de identificador (`id` inteiro e positivo). |
| `src/controllers/TimeEntryController.ts` | Extrai os dados da requisiÃ§Ã£o, aciona o `TimeEntryService` e retorna os status HTTP apropriados (`200`, `201`). |
| `src/services/TimeEntryService.ts` | Implementa regras de negÃ³cio: validaÃ§Ã£o de IDs de projeto e usuÃ¡rio, integridade relacional, unicidade de lanÃ§amento por dia/projeto/usuÃ¡rio, ordenaÃ§Ã£o e validaÃ§Ã£o de sobreposiÃ§Ã£o de intervalos (`buildIntervals`), cÃ¡lculo do `totalTime` em horas decimais, conversÃ£o de horÃ¡rios (`minutesToTimeDate`), substituiÃ§Ã£o atÃ´mica de sub-itens no update e helper `getTimeOrThrow`. |
| `src/repositories/TimeEntryRepository.ts` | Interage com as tabelas `timeentries` e `subTimeEntries` atravÃ©s do Prisma Client, definindo argumentos de `include` (`timeEntryWithSubEntriesArgs`) para trazer os sub-lanÃ§amentos associados. |
| `src/repositories/ProjectRepository.ts` | Consulta a existÃªncia do projeto associado ao lanÃ§amento (`findById`). |
| `src/repositories/UserRepository.ts` | Consulta a existÃªncia do usuÃ¡rio associado ao lanÃ§amento (`findById`). |
| `src/middlewares/errorHandler.ts` | Captura exceÃ§Ãµes da aplicaÃ§Ã£o (`AppError`) e retorna respostas JSON padronizadas com status code customizado. |

---

## 2. Fluxo 1: CriaÃ§Ã£o de LanÃ§amento com Intervalos (`POST /time`)

Cria um lanÃ§amento de horas atrelado a um projeto e usuÃ¡rio contendo um ou mais intervalos (`subTimeEntries`). O sistema valida que `hourFin > hourIni` em cada perÃ­odo, impede sobreposiÃ§Ã£o entre os intervalos, calcula a soma das duraÃ§Ãµes (`totalTime`) e persiste tudo de forma atÃ´mica no banco de dados.

```mermaid
sequenceDiagram
    autonumber
    actor Cliente as Cliente (Front-end / Postman)
    participant AuthMW as authenticate.ts
    participant Route as timeEntryRoutes.ts
    participant ValMW as validateRequest.ts
    participant Controller as TimeEntryController.ts
    participant Service as TimeEntryService.ts
    participant ProjectRepo as ProjectRepository.ts
    participant UserRepo as UserRepository.ts
    participant TimeRepo as TimeEntryRepository.ts
    participant DB as PostgreSQL (Prisma)

    Cliente->>AuthMW: POST /time (Header: Bearer Token, Body: { date, project, user, subTimeEntries, description? })
    Note over AuthMW: Valida assinatura e expiraÃ§Ã£o do JWT
    AuthMW->>Route: next() -> Encaminha para timeEntryRoutes
    Route->>ValMW: validateRequest(createTimeEntrySchema)

    alt Payload invÃ¡lido (formato de hora, sobreposiÃ§Ã£o no Zod, min 1 perÃ­odo)
        ValMW-->>Cliente: 400 Bad Request { status: "error", message: "Dados invÃ¡lidos", errors: [...] }
    else Payload vÃ¡lido
        ValMW->>Controller: next() -> Chama create(req, res, next)
        Controller->>Service: create({ date, description, project, user, subTimeEntries })

        alt projectId ou userId ausentes
            Service-->>Controller: throw AppError("O ID do projeto e do usuario sao obrigatorios.", 400)
            Controller-->>Cliente: 400 Bad Request
        else IDs fornecidos
            Service->>ProjectRepo: findById(targetProjectId)
            ProjectRepo->>DB: prisma.projects.findUnique(...)
            DB-->>ProjectRepo: Projects ou null

            alt Projeto nÃ£o encontrado
                Service-->>Controller: throw AppError("Id de projeto nao encontrado.", 404)
                Controller-->>Cliente: 404 Not Found
            else Projeto existe
                Service->>UserRepo: findById(targetUserId)
                UserRepo->>DB: prisma.user.findUnique(...)
                DB-->>UserRepo: UserSummary ou null

                alt UsuÃ¡rio nÃ£o encontrado
                    Service-->>Controller: throw AppError("Id de usuario nao encontrado.", 404)
                    Controller-->>Cliente: 404 Not Found
                else UsuÃ¡rio existe
                    Service->>TimeRepo: findByDate(date, targetProjectId, targetUserId)
                    TimeRepo->>DB: prisma.timeEntries.findFirst(...)
                    DB-->>TimeRepo: TimeEntries ou null

                    alt JÃ¡ existe lanÃ§amento nesta data para este projeto e usuÃ¡rio
                        Service-->>Controller: throw AppError("Ja existe lancamento de tempo nesta data para este projeto/usuario", 400)
                        Controller-->>Cliente: 400 Bad Request
                    else Data disponÃ­vel
                        Service->>Service: buildIntervals(subTimeEntries)
                        Note over Service: Converte HH:MM -> minutos, valida fin > ini, ordena e checa sobreposiÃ§Ã£o
                        Service->>Service: totalMinutes = sum(fin - ini)
                        Service->>Service: totalTime = totalMinutes / 60
                        Service->>TimeRepo: create(dataCreate com nested timeSubEntries.create)
                        TimeRepo->>DB: prisma.timeEntries.create({ data, include/create: { timeSubEntries } })
                        DB-->>TimeRepo: LanÃ§amento criado com sub-itens
                        TimeRepo-->>Service: TimeEntries
                        Service-->>Controller: TimeEntries
                        Controller-->>Cliente: 201 Created { timeEntrieId, date, totalTime, description, projectId, userId, ... }
                    end
                end
            end
        end
    end
```

### Passo a Passo:
1. **AutenticaÃ§Ã£o:** O middleware `authenticate` verifica a validade do JWT Bearer no cabeÃ§alho `Authorization`.
2. **ValidaÃ§Ã£o de Schema (Zod):**
   * Transforma a string `date` (`AAAA-MM-DD`) em objeto `Date`.
   * Sanitiza `description` (aplica `trim` e transforma string vazia em `null`).
   * Valida cada item de `subTimeEntries`:
     * `hourIni` e `hourFin` no formato `HH:MM`.
     * `refine`: garante que `hourFin > hourIni`.
   * `.superRefine`: ordena os intervalos e valida que nÃ£o haja sobreposiÃ§Ã£o horÃ¡ria (`current.hourIni < previus.hourFin`).
3. **ValidaÃ§Ã£o de Integridade Relacional:**
   * Verifica se `projectId` e `userId` foram enviados.
   * Consulta `ProjectRepository.findById`. Se nÃ£o existir, lanÃ§a erro `404 Not Found`.
   * Consulta `UserRepository.findById`. Se nÃ£o existir, lanÃ§a erro `404 Not Found`.
4. **PrevenÃ§Ã£o de Duplicidade:**
   * Executa `TimeEntryRepository.findByDate(date, targetProjectId, targetUserId)`. Se jÃ¡ houver apontamento registrado para o mesmo dia, projeto e usuÃ¡rio, lanÃ§a erro `400 Bad Request`.
5. **Processamento dos Intervalos e CÃ¡lculo de Horas:**
   * `buildIntervals`: converte os horÃ¡rios `HH:MM` para minutos absolutos (`hhmmToMinutes`), valida a consistÃªncia e ordena.
   * `totalMinutes`: soma a diferenÃ§a de minutos de todos os intervalos cadastrados.
   * `totalTime`: calcula as horas decimais (`totalMinutes / 60`) e salva no cabeÃ§alho do lanÃ§amento.
   * `minutesToTimeDate`: monta objetos `Date` completos combinando a data base com as horas e minutos calculados, alÃ©m de gerar o `totalHour` textual (`HH:MM:SS.sssZ`).
6. **PersistÃªncia Aninhada no Prisma:**
   * O registro pai (`TimeEntries`) Ã© criado conectando o projeto e o usuÃ¡rio, criando simultaneamente todos os `SubTimeEntries` na mesma transaÃ§Ã£o.
7. **Resposta:** Retorna status `201 Created` com o lanÃ§amento persistido.

---

## 3. Fluxo 2: Listagem de LanÃ§amentos com Sub-itens (`GET /time`)

Recupera todos os apontamentos de horas cadastrados, trazendo embutido o array completo de sub-intervalos (`timeSubEntries`).

```mermaid
sequenceDiagram
    autonumber
    actor Cliente as Cliente (Front-end / Postman)
    participant AuthMW as authenticate.ts
    participant Controller as TimeEntryController.ts
    participant Service as TimeEntryService.ts
    participant Repo as TimeEntryRepository.ts
    participant DB as PostgreSQL (Prisma)

    Cliente->>AuthMW: GET /time (Header: Bearer Token)
    AuthMW->>Controller: next() -> getAll(req, res, next)
    Controller->>Service: getAll()
    Service->>Repo: findAll()
    Repo->>DB: prisma.timeEntries.findMany({ include: { timeSubEntries: true } })
    DB-->>Repo: Lista de TimeEntryWithSubEntries[]
    Repo-->>Service: TimeEntryWithSubEntries[]
    Service-->>Controller: TimeEntryWithSubEntries[]
    Controller-->>Cliente: 200 OK [ { timeEntrieId, date, totalTime, timeSubEntries: [ ... ] }, ... ]
```

### Passo a Passo:
1. **AutenticaÃ§Ã£o:** RequisiÃ§Ã£o interceptada e autorizada pelo JWT no middleware `authenticate`.
2. **ExecuÃ§Ã£o da Consulta:** O controller aciona `TimeEntryService.getAll()`, que delega para `TimeEntryRepository.findAll()`.
3. **Consulta Enriquecida ao Banco:** Executa `prisma.timeEntries.findMany(timeEntryWithSubEntriesArgs)`, aplicando `include: { timeSubEntries: true }`.
4. **Resposta:** Retorna o array de objetos `TimeEntryWithSubEntries[]` com status `200 OK`.

---

## 4. Fluxo 3: Busca de LanÃ§amento por ID (`GET /time/:id`)

Recupera os detalhes de um lanÃ§amento especÃ­fico a partir do identificador numÃ©rico da URL.

```mermaid
sequenceDiagram
    autonumber
    actor Cliente as Cliente (Front-end / Postman)
    participant AuthMW as authenticate.ts
    participant Route as timeEntryRoutes.ts
    participant ValMW as validateRequest.ts
    participant Controller as TimeEntryController.ts
    participant Service as TimeEntryService.ts
    participant Repo as TimeEntryRepository.ts
    participant DB as PostgreSQL (Prisma)

    Cliente->>AuthMW: GET /time/:id (Header: Bearer Token)
    AuthMW->>Route: next()
    Route->>ValMW: validateRequest(getTimeEntrySchema)

    alt ParÃ¢metro id invÃ¡lido (nÃ£o numÃ©rico ou <= 0)
        ValMW-->>Cliente: 400 Bad Request
    else ParÃ¢metro vÃ¡lido
        ValMW->>Controller: next() -> getByID(req, res, next)
        Controller->>Controller: getByIdParamsSchema.parse(req.params)
        Controller->>Service: getByID(id)
        Service->>Service: getTimeOrThrow(id)
        Service->>Repo: findById(id)
        Repo->>DB: prisma.timeEntries.findUnique({ where: { timeEntrieId }, include: { timeSubEntries: true } })
        DB-->>Repo: TimeEntryWithSubEntries ou null
        Repo-->>Service: Retorno

        alt LanÃ§amento nÃ£o encontrado
            Service-->>Controller: throw AppError("Id de tempo nao encontrado.", 404)
            Controller-->>Cliente: 404 Not Found { status: "error", message: "Id de tempo nao encontrado." }
        else LanÃ§amento encontrado
            Service-->>Controller: TimeEntryWithSubEntries
            Controller-->>Cliente: 200 OK { timeEntrieId, date, totalTime, timeSubEntries: [ ... ], ... }
        end
    end
```

### Passo a Passo:
1. **ValidaÃ§Ã£o de ID:** Valida `:id` inteiro positivo via `getByIdParamsSchema`.
2. **Checagem de ExistÃªncia (`getTimeOrThrow`):** `TimeEntryService.getByID` invoca o mÃ©todo privado `getTimeOrThrow`.
3. **Consulta Prisma com Include:** `TimeEntryRepository.findById` executa `findUnique` aplicando `timeEntryWithSubEntriesArgs`.
4. **Retorno:** Devolve o objeto completo com seus `timeSubEntries` associados com status `200 OK` ou lanÃ§a `404 Not Found`.

---

## 5. Fluxo 4: AtualizaÃ§Ã£o de LanÃ§amento e Intervalos (`PUT /time/:id`)

Atualiza os dados de um lanÃ§amento (`date`, `description`, `project`, `user`) e substitui opcionalmente os intervalos (`subTimeEntries`), recalculando o `totalTime` e garantindo atomicidade.

```mermaid
sequenceDiagram
    autonumber
    actor Cliente as Cliente (Front-end / Postman)
    participant AuthMW as authenticate.ts
    participant Route as timeEntryRoutes.ts
    participant ValMW as validateRequest.ts
    participant Controller as TimeEntryController.ts
    participant Service as TimeEntryService.ts
    participant UserRepo as UserRepository.ts
    participant ProjectRepo as ProjectRepository.ts
    participant TimeRepo as TimeEntryRepository.ts
    participant DB as PostgreSQL (Prisma)

    Cliente->>AuthMW: PUT /time/:id { date, description?, project?, user?, subTimeEntries? }
    AuthMW->>Route: next()
    Route->>ValMW: validateRequest(updateTimeEntrySchema)

    alt ParÃ¢metros ou corpo invÃ¡lidos
        ValMW-->>Cliente: 400 Bad Request
    else Dados vÃ¡lidos
        ValMW->>Controller: next() -> update(req, res, next)
        Controller->>Controller: getByIdParamsSchema.parse(req.params)
        Controller->>Service: update(id, body)
        Service->>Service: getTimeOrThrow(id)

        alt LanÃ§amento inexistente
            Service-->>Controller: throw AppError("Id de tempo nao encontrado.", 404)
            Controller-->>Cliente: 404 Not Found
        else LanÃ§amento existe
            opt Se subTimeEntries fornecido
                Service->>Service: buildIntervals(subTimeEntries)
                Note over Service: Valida ini < fin e ausÃªncia de sobreposiÃ§Ã£o
            end

            opt Se novo userId informado
                Service->>UserRepo: findById(userId)
                alt UsuÃ¡rio nÃ£o encontrado
                    Service-->>Controller: throw AppError("Id de usuario nao encontrado.", 404)
                    Controller-->>Cliente: 404 Not Found
                end
            end

            opt Se novo projectId informado
                Service->>ProjectRepo: findById(projectId)
                alt Projeto nÃ£o encontrado
                    Service-->>Controller: throw AppError("Id de projeto nao encontrado.", 404)
                    Controller-->>Cliente: 404 Not Found
                end
            end

            Service->>TimeRepo: findByDate(date, projectId, userId)
            alt Conflito de lanÃ§amento com outro ID na mesma data
                Service-->>Controller: throw AppError("Ja existe lancamento de tempo nesta data para este projeto/usuario", 400)
                Controller-->>Cliente: 400 Bad Request
            else Sem conflito
                alt Com novos intervalos (intervals)
                    Service->>Service: totalMinutes = sum(fin - ini)
                    Service->>Service: totalTime = totalMinutes / 60
                    Service->>TimeRepo: update(id, { ..., totalTime, timeSubEntries: { deleteMany, create } })
                else Sem alteraÃ§Ã£o de intervalos
                    Service->>TimeRepo: update(id, dataUpdate)
                end
                TimeRepo->>DB: prisma.timeEntries.update(...)
                DB-->>TimeRepo: Registro atualizado
                TimeRepo-->>Service: TimeEntries
                Service-->>Controller: TimeEntries
                Controller-->>Cliente: 200 OK { timeEntrieId, date, totalTime, ... }
            end
        end
    end
```

### Passo a Passo:
1. **ValidaÃ§Ã£o:** Valida o parÃ¢metro `:id` e o corpo da requisiÃ§Ã£o via `updateTimeEntrySchema`.
2. **VerificaÃ§Ã£o de ExistÃªncia:** Executa `getTimeOrThrow(id)`. Se nÃ£o existir, lanÃ§a erro `404 Not Found`.
3. **ValidaÃ§Ã£o PrÃ©via dos Intervalos:** Se `subTimeEntries` estiver presente no corpo, aciona `buildIntervals(subTimeEntries)` antes de tocar no banco de dados.
4. **ValidaÃ§Ã£o Relacional Opcional:** Verifica existÃªncia de novo `user` ou `project`, caso fornecidos.
5. **Checagem de Duplicidade:** Garante que a data informada nÃ£o entre em conflito com outro lanÃ§amento do mesmo projeto/usuÃ¡rio (`timeEntrieId !== id`).
6. **SubstituiÃ§Ã£o AtÃ´mica dos Intervalos:**
   * Recalcula `totalTime` com a soma dos novos intervalos.
   * Usa a instruÃ§Ã£o Prisma:
     ```typescript
     timeSubEntries: {
       deleteMany: { timeEntrieId: timeEntrieId },
       create: intervals.map(...)
     }
     ```
     Isso descarta os intervalos anteriores e insere os novos em uma Ãºnica operaÃ§Ã£o segura.
7. **Resposta:** Retorna `200 OK` com os dados atualizados.

---

## 6. Fluxo 5: RemoÃ§Ã£o de LanÃ§amento de Horas (`DELETE /time/:id`)

Exclui o lanÃ§amento pai e remove automaticamente todos os seus sub-intervalos atravÃ©s da clÃ¡usula `onDelete: Cascade` do Prisma.

```mermaid
sequenceDiagram
    autonumber
    actor Cliente as Cliente (Front-end / Postman)
    participant AuthMW as authenticate.ts
    participant Route as timeEntryRoutes.ts
    participant ValMW as validateRequest.ts
    participant Controller as TimeEntryController.ts
    participant Service as TimeEntryService.ts
    participant Repo as TimeEntryRepository.ts
    participant DB as PostgreSQL (Prisma)

    Cliente->>AuthMW: DELETE /time/:id
    AuthMW->>Route: next()
    Route->>ValMW: validateRequest(getTimeEntrySchema)

    alt ID invÃ¡lido
        ValMW-->>Cliente: 400 Bad Request
    else ID vÃ¡lido
        ValMW->>Controller: next() -> delete(req, res, next)
        Controller->>Controller: getByIdParamsSchema.parse(req.params)
        Controller->>Service: delete(id)
        Service->>Service: getTimeOrThrow(id)
        
        alt LanÃ§amento nÃ£o encontrado
            Service-->>Controller: throw AppError("Id de tempo nao encontrado.", 404)
            Controller-->>Cliente: 404 Not Found
        else LanÃ§amento existe
            Service->>Repo: delete(id)
            Repo->>DB: prisma.timeEntries.delete({ where: { timeEntrieId } })
            Note over DB: Cascading Delete remove registros de subTimeEntries
            DB-->>Repo: Registro deletado
            Repo-->>Service: TimeEntries
            Service-->>Controller: TimeEntries
            Controller-->>Cliente: 200 OK { timeEntrieId, date, description, ... }
        end
    end
```

### Passo a Passo:
1. **ValidaÃ§Ã£o de ID:** Valida o parÃ¢metro `:id` da rota via `getByIdParamsSchema`.
2. **VerificaÃ§Ã£o PrÃ©via:** Executa `getTimeOrThrow(id)`. Se nÃ£o encontrado, lanÃ§a erro `404 Not Found`.
3. **ExclusÃ£o em Cascata:** Executa `TimeEntryRepository.delete(id)`. Pela configuraÃ§Ã£o `onDelete: Cascade` na relaÃ§Ã£o de `SubTimeEntries`, o PostgreSQL remove atomicamente todos os sub-intervalos vinculados.
4. **Resposta:** Devolve os dados do lanÃ§amento excluÃ­do com status `200 OK`.

---

## 7. Estruturas e Modelagem de Dados

### Modelo do Apontamento Principal (`prisma/models/timeEntries.prisma`)
```prisma
model TimeEntries {
  timeEntrieId   Int              @id @default(autoincrement())
  date           DateTime         @db.Date
  totalTime      Float?
  description    String?          @db.Text
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt

  projectId      Int
  project        Projects         @relation(fields: [projectId], references: [projectId])

  userId         Int
  user           User             @relation(fields: [userId], references: [userId])

  timeSubEntries SubTimeEntries[]

  @@map("timeentries")
}
```

### Modelo dos Sub-Intervalos (`prisma/models/subTimeEntries.prisma`)
```prisma
model SubTimeEntries {
  subTimeEntryId Int         @id @default(autoincrement())
  hourIni        DateTime
  hourFin        DateTime
  totalHour      String?
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  timeEntrieId   Int
  timeEntrie     TimeEntries @relation(fields: [timeEntrieId], references: [timeEntrieId], onDelete: Cascade)

  @@map("subTimeEntries")
}
```

### Contrato de Retorno com RelaÃ§Ãµes (`TimeEntryWithSubEntries`)
No [`TimeEntryRepository.ts`](file:///c:/Cursos/Projetos/controle-horas-backend-ts/src/repositories/TimeEntryRepository.ts):
```typescript
export const timeEntryWithSubEntriesArgs = {
  include: {
    timeSubEntries: true,
  },
} satisfies Prisma.TimeEntriesFindManyArgs;

export type TimeEntryWithSubEntries = Prisma.TimeEntriesGetPayload<typeof timeEntryWithSubEntriesArgs>;
```

### Schemas Zod de ValidaÃ§Ã£o de Intervalos (`src/schemas/timeEntry.schema.ts`)
```typescript
const timeEntryPeriodSchema = z.object({
  hourIni: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: "A hora inicial deve estar no formato HH:MM (entre 00:00 e 23:59)",
  }),
  hourFin: z.string().regex(/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/, {
    message: "A hora final deve estar no formato HH:MM (entre 00:01 e 24:00)",
  }),
}).refine((period) => toMinutes(period.hourIni) < toMinutes(period.hourFin), {
  message: "A hora final deve ser maior que a hora inicial",
});

export const createTimeEntrySchema = z.object({
  body: z.object({
    date: z.iso.date({ message: "A data deve estar no formato (AAAA-MM-DD)" })
      .transform((val) => new Date(`${val}T12:00:00.000Z`)),
    description: z.string().trim().nullish().transform((val) => (val === "" ? null : val)),
    project: z.object({
      projectId: z.coerce.number().int().positive()
    }),
    user: z.object({
      userId: z.coerce.number().int().positive()
    }),
    subTimeEntries: z.array(timeEntryPeriodSchema)
      .min(1, { message: "Informe ao menos um perÃ­odo de inicio e fim" })
      .superRefine((periods, ctx) => {
        const sorted = [...periods].sort((a, b) => toMinutes(a.hourIni) - toMinutes(b.hourIni));
        for (let i = 1; i < sorted.length; i++) {
          if (toMinutes(sorted[i].hourIni) < toMinutes(sorted[i - 1].hourFin)) {
            ctx.addIssue({
              code: "custom",
              message: "Os perÃ­odos nÃ£o podem se sobrepor",
              path: ["subTimeEntries"],
            });
          }
        }
      })
  })
});
```

---

## 8. Tratamento de Erros e CÃ³digos de Status HTTP

| CÃ³digo | SituaÃ§Ã£o | Exemplo de Mensagem |
| :--- | :--- | :--- |
| `200 OK` | Consulta, atualizaÃ§Ã£o ou remoÃ§Ã£o executada com sucesso. | Objeto `TimeEntries` ou lista `TimeEntryWithSubEntries[]`. |
| `201 Created` | Apontamento de tempo e sub-intervalos registrados com sucesso. | Objeto `TimeEntries` recÃ©m-criado. |
| `400 Bad Request` | Falha de validaÃ§Ã£o Zod (formato `HH:MM`, `hourFin <= hourIni`, sobreposiÃ§Ã£o de perÃ­odos, ausÃªncia de perÃ­odos obrigatÃ³rios) ou lanÃ§amento duplicado para a mesma data/usuÃ¡rio/projeto. | `"Os perÃ­odos nÃ£o podem se sobrepor"`, `"A hora final deve ser maior que a hora inicial"` ou `"Ja existe lancamento de tempo nesta data para este projeto/usuario"`. |
| `401 Unauthorized` | Token de autenticaÃ§Ã£o JWT ausente, expirado ou corrompido. | `"Token missing"` / `"Token expired"` / `"Invalid token"`. |
| `404 Not Found` | O `id` do lanÃ§amento, o `projectId` ou o `userId` nÃ£o foi localizado. | `"Id de tempo nao encontrado."`, `"Id de projeto nao encontrado."` ou `"Id de usuario nao encontrado."`. |
| `500 Internal Server Error` | Falhas inesperadas de banco de dados ou infraestrutura. | `"Internal Server Error"`. |

---

## 9. Boas PrÃ¡ticas Adotadas

* **ValidaÃ§Ã£o em Camadas (Zod + Domain Service):** A integridade dos horÃ¡rios e intervalos Ã© verificada tanto na entrada via schema Zod (`timeEntryPeriodSchema` e `.superRefine`) quanto dentro do `TimeEntryService` (`buildIntervals`), garantindo consistÃªncia em qualquer canal de entrada.
* **CÃ¡lculo Automatizado de Horas (`totalTime`):** O usuÃ¡rio informa os horÃ¡rios de inÃ­cio e tÃ©rmino (`HH:MM`) e a aplicaÃ§Ã£o calcula com precisÃ£o a duraÃ§Ã£o total em minutos e converte para horas decimais (`totalMinutes / 60`), evitando erros manuais de cÃ¡lculo.
* **PrevenÃ§Ã£o de SobreposiÃ§Ã£o Temporal:** Algoritmo de ordenaÃ§Ã£o e comparaÃ§Ã£o de adjacÃªncia que impede apontamentos de horÃ¡rios conflitantes no mesmo dia para o mesmo colaborador.
* **OperaÃ§Ãµes Transacionais com Prisma:** Na criaÃ§Ã£o e atualizaÃ§Ã£o, a persistÃªncia do lanÃ§amento pai e a substituiÃ§Ã£o/criaÃ§Ã£o dos `timeSubEntries` ocorrem de forma atÃ´mica (incluindo `deleteMany + create` no update).
* **Integridade Referencial com Cascade Delete:** ConfiguraÃ§Ã£o `@relation(..., onDelete: Cascade)` no modelo `SubTimeEntries`, garantindo que a exclusÃ£o de um lanÃ§amento limpe seus intervalos sem deixar registros Ã³rfÃ£os.
* **Tipagem Segura com `Prisma.TimeEntriesGetPayload`:** A camada de repositÃ³rio exporta `TimeEntryWithSubEntries`, fornecendo ao TypeScript conhecimento exato sobre os relacionamentos incluÃ­dos em `findAll` e `findById`.
* **Tratamento de Timezone e Fuso HorÃ¡rio:** Uso de `formatarDataComOffset` para garantir que as datas geradas para os horÃ¡rios `hourIni` e `hourFin` reflitam a data local correta sem desvios de GMT.

