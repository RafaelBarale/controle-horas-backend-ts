# Fluxo do Módulo de Lançamento de Horas (Time Entries & SubTimeEntries)

Este documento descreve detalhadamente a arquitetura, os fluxos de requisição e as regras de negócio do módulo de **Lançamento de Horas** (`/time`), cobrindo validação de schemas Zod, controle de acesso JWT, integridade referencial com projetos e usuários, decomposição em intervalos de tempo (**SubTimeEntries**), cálculo automático de total de horas, prevenção de sobreposição de horários e persistência transacional com o Prisma.

---

## 1. Visão Geral dos Componentes

| Camada / Arquivo | Responsabilidade |
| :--- | :--- |
| `src/app.ts` | Registra o prefixo `/time`, aplicando o middleware global de autenticação `authenticate` antes de repassar para o roteador. |
| `src/routes/timeEntryRoutes.ts` | Declara as rotas de lançamentos de horas (`POST /`, `GET /`, `GET /:id`, `PUT /:id`, `DELETE /:id`) e vincula os validadores e métodos do controller. |
| `src/middlewares/authenticate.ts` | Valida o JWT (`accessToken`) no cabeçalho `Authorization: Bearer <token>` e injeta `req.user`. |
| `src/middlewares/validateRequest.ts` | Intercepta requisições e valida `body`, `params` e `query` com schemas Zod antes de chegar ao controller. |
| `src/schemas/timeEntry.schema.ts` | Define os schemas Zod de criação (`createTimeEntrySchema`), atualização (`updateTimeEntrySchema`) e consulta (`getTimeEntrySchema`), incluindo validação de formato `HH:MM`, verificação de `hourFin > hourIni` e detecção de sobreposição de intervalos no array `subTimeEntries`. |
| `src/schemas/id.schema.ts` | Valida e faz coerção de parâmetros de identificador (`id` inteiro e positivo). |
| `src/controllers/TimeEntryController.ts` | Extrai os dados da requisição, aciona o `TimeEntryService` e retorna os status HTTP apropriados (`200`, `201`). |
| `src/services/TimeEntryService.ts` | Implementa regras de negócio: validação de IDs de projeto e usuário, integridade relacional, unicidade de lançamento por dia/projeto/usuário, ordenação e validação de sobreposição de intervalos (`buildIntervals`), cálculo do `totalTime` em horas decimais, conversão de horários (`minutesToTimeDate`), substituição atômica de sub-itens no update e helper `getTimeOrThrow`. |
| `src/repositories/TimeEntryRepository.ts` | Interage com as tabelas `timeentries` e `subTimeEntries` através do Prisma Client, definindo argumentos de `include` (`timeEntryWithSubEntriesArgs`) para trazer os sub-lançamentos associados. |
| `src/repositories/ProjectRepository.ts` | Consulta a existência do projeto associado ao lançamento (`findById`). |
| `src/repositories/UserRepository.ts` | Consulta a existência do usuário associado ao lançamento (`findById`). |
| `src/middlewares/errorHandler.ts` | Captura exceções da aplicação (`AppError`) e retorna respostas JSON padronizadas com status code customizado. |

---

## 2. Fluxo 1: Criação de Lançamento com Intervalos (`POST /time`)

Cria um lançamento de horas atrelado a um projeto e usuário contendo um ou mais intervalos (`subTimeEntries`). O sistema valida que `hourFin > hourIni` em cada período, impede sobreposição entre os intervalos, calcula a soma das durações (`totalTime`) e persiste tudo de forma atômica no banco de dados.

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
    Note over AuthMW: Valida assinatura e expiração do JWT
    AuthMW->>Route: next() -> Encaminha para timeEntryRoutes
    Route->>ValMW: validateRequest(createTimeEntrySchema)

    alt Payload inválido (formato de hora, sobreposição no Zod, min 1 período)
        ValMW-->>Cliente: 400 Bad Request { status: "error", message: "Dados inválidos", errors: [...] }
    else Payload válido
        ValMW->>Controller: next() -> Chama create(req, res, next)
        Controller->>Service: create({ date, description, project, user, subTimeEntries })

        alt projectId ou userId ausentes
            Service-->>Controller: throw AppError("O ID do projeto e do usuario sao obrigatorios.", 400)
            Controller-->>Cliente: 400 Bad Request
        else IDs fornecidos
            Service->>ProjectRepo: findById(targetProjectId)
            ProjectRepo->>DB: prisma.projects.findUnique(...)
            DB-->>ProjectRepo: Projects ou null

            alt Projeto não encontrado
                Service-->>Controller: throw AppError("Id de projeto nao encontrado.", 404)
                Controller-->>Cliente: 404 Not Found
            else Projeto existe
                Service->>UserRepo: findById(targetUserId)
                UserRepo->>DB: prisma.user.findUnique(...)
                DB-->>UserRepo: UserSummary ou null

                alt Usuário não encontrado
                    Service-->>Controller: throw AppError("Id de usuario nao encontrado.", 404)
                    Controller-->>Cliente: 404 Not Found
                else Usuário existe
                    Service->>TimeRepo: findByDate(date, targetProjectId, targetUserId)
                    TimeRepo->>DB: prisma.timeEntries.findFirst(...)
                    DB-->>TimeRepo: TimeEntries ou null

                    alt Já existe lançamento nesta data para este projeto e usuário
                        Service-->>Controller: throw AppError("Ja existe lancamento de tempo nesta data para este projeto/usuario", 400)
                        Controller-->>Cliente: 400 Bad Request
                    else Data disponível
                        Service->>Service: buildIntervals(subTimeEntries)
                        Note over Service: Converte HH:MM -> minutos, valida fin > ini, ordena e checa sobreposição
                        Service->>Service: totalMinutes = sum(fin - ini)
                        Service->>Service: totalTime = totalMinutes / 60
                        Service->>TimeRepo: create(dataCreate com nested timeSubEntries.create)
                        TimeRepo->>DB: prisma.timeEntries.create({ data, include/create: { timeSubEntries } })
                        DB-->>TimeRepo: Lançamento criado com sub-itens
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
1. **Autenticação:** O middleware `authenticate` verifica a validade do JWT Bearer no cabeçalho `Authorization`.
2. **Validação de Schema (Zod):**
   * Transforma a string `date` (`AAAA-MM-DD`) em objeto `Date`.
   * Sanitiza `description` (aplica `trim` e transforma string vazia em `null`).
   * Valida cada item de `subTimeEntries`:
     * `hourIni` e `hourFin` no formato `HH:MM`.
     * `refine`: garante que `hourFin > hourIni`.
   * `.superRefine`: ordena os intervalos e valida que não haja sobreposição horária (`current.hourIni < previus.hourFin`).
3. **Validação de Integridade Relacional:**
   * Verifica se `projectId` e `userId` foram enviados.
   * Consulta `ProjectRepository.findById`. Se não existir, lança erro `404 Not Found`.
   * Consulta `UserRepository.findById`. Se não existir, lança erro `404 Not Found`.
4. **Prevenção de Duplicidade:**
   * Executa `TimeEntryRepository.findByDate(date, targetProjectId, targetUserId)`. Se já houver apontamento registrado para o mesmo dia, projeto e usuário, lança erro `400 Bad Request`.
5. **Processamento dos Intervalos e Cálculo de Horas:**
   * `buildIntervals`: converte os horários `HH:MM` para minutos absolutos (`hhmmToMinutes`), valida a consistência e ordena.
   * `totalMinutes`: soma a diferença de minutos de todos os intervalos cadastrados.
   * `totalTime`: calcula as horas decimais (`totalMinutes / 60`) e salva no cabeçalho do lançamento.
   * `minutesToTimeDate`: monta objetos `Date` completos combinando a data base com as horas e minutos calculados, além de gerar o `totalHour` textual (`HH:MM:SS.sssZ`).
6. **Persistência Aninhada no Prisma:**
   * O registro pai (`TimeEntries`) é criado conectando o projeto e o usuário, criando simultaneamente todos os `SubTimeEntries` na mesma transação.
7. **Resposta:** Retorna status `201 Created` com o lançamento persistido.

---

## 3. Fluxo 2: Listagem de Lançamentos com Sub-itens (`GET /time`)

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
1. **Autenticação:** Requisição interceptada e autorizada pelo JWT no middleware `authenticate`.
2. **Execução da Consulta:** O controller aciona `TimeEntryService.getAll()`, que delega para `TimeEntryRepository.findAll()`.
3. **Consulta Enriquecida ao Banco:** Executa `prisma.timeEntries.findMany(timeEntryWithSubEntriesArgs)`, aplicando `include: { timeSubEntries: true }`.
4. **Resposta:** Retorna o array de objetos `TimeEntryWithSubEntries[]` com status `200 OK`.

---

## 4. Fluxo 3: Busca de Lançamento por ID (`GET /time/:id`)

Recupera os detalhes de um lançamento específico a partir do identificador numérico da URL.

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

    alt Parâmetro id inválido (não numérico ou <= 0)
        ValMW-->>Cliente: 400 Bad Request
    else Parâmetro válido
        ValMW->>Controller: next() -> getByID(req, res, next)
        Controller->>Controller: getByIdParamsSchema.parse(req.params)
        Controller->>Service: getByID(id)
        Service->>Service: getTimeOrThrow(id)
        Service->>Repo: findById(id)
        Repo->>DB: prisma.timeEntries.findUnique({ where: { timeEntrieId }, include: { timeSubEntries: true } })
        DB-->>Repo: TimeEntryWithSubEntries ou null
        Repo-->>Service: Retorno

        alt Lançamento não encontrado
            Service-->>Controller: throw AppError("Id de tempo nao encontrado.", 404)
            Controller-->>Cliente: 404 Not Found { status: "error", message: "Id de tempo nao encontrado." }
        else Lançamento encontrado
            Service-->>Controller: TimeEntryWithSubEntries
            Controller-->>Cliente: 200 OK { timeEntrieId, date, totalTime, timeSubEntries: [ ... ], ... }
        end
    end
```

### Passo a Passo:
1. **Validação de ID:** Valida `:id` inteiro positivo via `getByIdParamsSchema`.
2. **Checagem de Existência (`getTimeOrThrow`):** `TimeEntryService.getByID` invoca o método privado `getTimeOrThrow`.
3. **Consulta Prisma com Include:** `TimeEntryRepository.findById` executa `findUnique` aplicando `timeEntryWithSubEntriesArgs`.
4. **Retorno:** Devolve o objeto completo com seus `timeSubEntries` associados com status `200 OK` ou lança `404 Not Found`.

---

## 5. Fluxo 4: Atualização de Lançamento e Intervalos (`PUT /time/:id`)

Atualiza os dados de um lançamento (`date`, `description`, `project`, `user`) e substitui opcionalmente os intervalos (`subTimeEntries`), recalculando o `totalTime` e garantindo atomicidade.

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

    alt Parâmetros ou corpo inválidos
        ValMW-->>Cliente: 400 Bad Request
    else Dados válidos
        ValMW->>Controller: next() -> update(req, res, next)
        Controller->>Controller: getByIdParamsSchema.parse(req.params)
        Controller->>Service: update(id, body)
        Service->>Service: getTimeOrThrow(id)

        alt Lançamento inexistente
            Service-->>Controller: throw AppError("Id de tempo nao encontrado.", 404)
            Controller-->>Cliente: 404 Not Found
        else Lançamento existe
            opt Se subTimeEntries fornecido
                Service->>Service: buildIntervals(subTimeEntries)
                Note over Service: Valida ini < fin e ausência de sobreposição
            end

            opt Se novo userId informado
                Service->>UserRepo: findById(userId)
                alt Usuário não encontrado
                    Service-->>Controller: throw AppError("Id de usuario nao encontrado.", 404)
                    Controller-->>Cliente: 404 Not Found
                end
            end

            opt Se novo projectId informado
                Service->>ProjectRepo: findById(projectId)
                alt Projeto não encontrado
                    Service-->>Controller: throw AppError("Id de projeto nao encontrado.", 404)
                    Controller-->>Cliente: 404 Not Found
                end
            end

            Service->>TimeRepo: findByDate(date, projectId, userId)
            alt Conflito de lançamento com outro ID na mesma data
                Service-->>Controller: throw AppError("Ja existe lancamento de tempo nesta data para este projeto/usuario", 400)
                Controller-->>Cliente: 400 Bad Request
            else Sem conflito
                alt Com novos intervalos (intervals)
                    Service->>Service: totalMinutes = sum(fin - ini)
                    Service->>Service: totalTime = totalMinutes / 60
                    Service->>TimeRepo: update(id, { ..., totalTime, timeSubEntries: { deleteMany, create } })
                else Sem alteração de intervalos
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
1. **Validação:** Valida o parâmetro `:id` e o corpo da requisição via `updateTimeEntrySchema`.
2. **Verificação de Existência:** Executa `getTimeOrThrow(id)`. Se não existir, lança erro `404 Not Found`.
3. **Validação Prévia dos Intervalos:** Se `subTimeEntries` estiver presente no corpo, aciona `buildIntervals(subTimeEntries)` antes de tocar no banco de dados.
4. **Validação Relacional Opcional:** Verifica existência de novo `user` ou `project`, caso fornecidos.
5. **Checagem de Duplicidade:** Garante que a data informada não entre em conflito com outro lançamento do mesmo projeto/usuário (`timeEntrieId !== id`).
6. **Substituição Atômica dos Intervalos:**
   * Recalcula `totalTime` com a soma dos novos intervalos.
   * Usa a instrução Prisma:
     ```typescript
     timeSubEntries: {
       deleteMany: { timeEntrieId: timeEntrieId },
       create: intervals.map(...)
     }
     ```
     Isso descarta os intervalos anteriores e insere os novos em uma única operação segura.
7. **Resposta:** Retorna `200 OK` com os dados atualizados.

---

## 6. Fluxo 5: Remoção de Lançamento de Horas (`DELETE /time/:id`)

Exclui o lançamento pai e remove automaticamente todos os seus sub-intervalos através da cláusula `onDelete: Cascade` do Prisma.

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

    alt ID inválido
        ValMW-->>Cliente: 400 Bad Request
    else ID válido
        ValMW->>Controller: next() -> delete(req, res, next)
        Controller->>Controller: getByIdParamsSchema.parse(req.params)
        Controller->>Service: delete(id)
        Service->>Service: getTimeOrThrow(id)
        
        alt Lançamento não encontrado
            Service-->>Controller: throw AppError("Id de tempo nao encontrado.", 404)
            Controller-->>Cliente: 404 Not Found
        else Lançamento existe
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
1. **Validação de ID:** Valida o parâmetro `:id` da rota via `getByIdParamsSchema`.
2. **Verificação Prévia:** Executa `getTimeOrThrow(id)`. Se não encontrado, lança erro `404 Not Found`.
3. **Exclusão em Cascata:** Executa `TimeEntryRepository.delete(id)`. Pela configuração `onDelete: Cascade` na relação de `SubTimeEntries`, o PostgreSQL remove atomicamente todos os sub-intervalos vinculados.
4. **Resposta:** Devolve os dados do lançamento excluído com status `200 OK`.

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

### Contrato de Retorno com Relações (`TimeEntryWithSubEntries`)
No [`TimeEntryRepository.ts`](file:///c:/Cursos/Projetos/controle-horas-backend-ts/src/repositories/TimeEntryRepository.ts):
```typescript
export const timeEntryWithSubEntriesArgs = {
  include: {
    timeSubEntries: true,
  },
} satisfies Prisma.TimeEntriesFindManyArgs;

export type TimeEntryWithSubEntries = Prisma.TimeEntriesGetPayload<typeof timeEntryWithSubEntriesArgs>;
```

### Schemas Zod de Validação de Intervalos (`src/schemas/timeEntry.schema.ts`)
```typescript
const timeEntryPeriodSchema = z.object({
  hourIni: z.iso.time({ message: "A hora inicial deve estar no formato (HH:MM)" }),
  hourFin: z.iso.time({ message: "A hora final deve estar no formato (HH:MM)" }),
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
      .min(1, { message: "Informe ao menos um período de inicio e fim" })
      .superRefine((periods, ctx) => {
        const sorted = [...periods].sort((a, b) => toMinutes(a.hourIni) - toMinutes(b.hourFin));
        for (let i = 1; i < sorted.length; i++) {
          if (toMinutes(sorted[i].hourIni) < toMinutes(sorted[i - 1].hourFin)) {
            ctx.addIssue({
              code: "custom",
              message: "Os períodos não podem se sobrepor",
              path: ["subTimeEntries"],
            });
          }
        }
      })
  })
});
```

---

## 8. Tratamento de Erros e Códigos de Status HTTP

| Código | Situação | Exemplo de Mensagem |
| :--- | :--- | :--- |
| `200 OK` | Consulta, atualização ou remoção executada com sucesso. | Objeto `TimeEntries` ou lista `TimeEntryWithSubEntries[]`. |
| `201 Created` | Apontamento de tempo e sub-intervalos registrados com sucesso. | Objeto `TimeEntries` recém-criado. |
| `400 Bad Request` | Falha de validação Zod (formato `HH:MM`, `hourFin <= hourIni`, sobreposição de períodos, ausência de períodos obrigatórios) ou lançamento duplicado para a mesma data/usuário/projeto. | `"Os períodos não podem se sobrepor"`, `"A hora final deve ser maior que a hora inicial"` ou `"Ja existe lancamento de tempo nesta data para este projeto/usuario"`. |
| `401 Unauthorized` | Token de autenticação JWT ausente, expirado ou corrompido. | `"Token missing"` / `"Token expired"` / `"Invalid token"`. |
| `404 Not Found` | O `id` do lançamento, o `projectId` ou o `userId` não foi localizado. | `"Id de tempo nao encontrado."`, `"Id de projeto nao encontrado."` ou `"Id de usuario nao encontrado."`. |
| `500 Internal Server Error` | Falhas inesperadas de banco de dados ou infraestrutura. | `"Internal Server Error"`. |

---

## 9. Boas Práticas Adotadas

* **Validação em Camadas (Zod + Domain Service):** A integridade dos horários e intervalos é verificada tanto na entrada via schema Zod (`timeEntryPeriodSchema` e `.superRefine`) quanto dentro do `TimeEntryService` (`buildIntervals`), garantindo consistência em qualquer canal de entrada.
* **Cálculo Automatizado de Horas (`totalTime`):** O usuário informa os horários de início e término (`HH:MM`) e a aplicação calcula com precisão a duração total em minutos e converte para horas decimais (`totalMinutes / 60`), evitando erros manuais de cálculo.
* **Prevenção de Sobreposição Temporal:** Algoritmo de ordenação e comparação de adjacência que impede apontamentos de horários conflitantes no mesmo dia para o mesmo colaborador.
* **Operações Transacionais com Prisma:** Na criação e atualização, a persistência do lançamento pai e a substituição/criação dos `timeSubEntries` ocorrem de forma atômica (incluindo `deleteMany + create` no update).
* **Integridade Referencial com Cascade Delete:** Configuração `@relation(..., onDelete: Cascade)` no modelo `SubTimeEntries`, garantindo que a exclusão de um lançamento limpe seus intervalos sem deixar registros órfãos.
* **Tipagem Segura com `Prisma.TimeEntriesGetPayload`:** A camada de repositório exporta `TimeEntryWithSubEntries`, fornecendo ao TypeScript conhecimento exato sobre os relacionamentos incluídos em `findAll` e `findById`.
* **Tratamento de Timezone e Fuso Horário:** Uso de `formatarDataComOffset` para garantir que as datas geradas para os horários `hourIni` e `hourFin` reflitam a data local correta sem desvios de GMT.
