# Guia de Desenvolvimento de Novos Endpoints

Este documento serve como padrão arquitetural e passo a passo para o desenvolvimento de novos módulos e endpoints no projeto **Controle de Horas Backend**.

---

## 1. Visão Geral da Arquitetura

O projeto segue uma arquitetura em camadas (**Layered Architecture**) com clara separação de responsabilidades:

```mermaid
flowchart LR
    A[Cliente / Front-end] --> B[app.ts]
    B --> C[routes/]
    C --> D[middlewares/]
    D --> E[controllers/]
    E --> F[services/]
    F --> G[repositories/]
    G --> H[(PostgreSQL)]

    subgraph Validação e Tipagem
        D -.-> I[schemas/ - Zod]
    end

    subgraph Tratamento de Erros
        F -.-> J[AppError]
        J -.-> K[errorHandler]
    end
```

---

## 2. Passo a Passo Recomendado para Criar um Novo Endpoint

Para implementar um novo recurso, siga as etapas na ordem abaixo:

```mermaid
sequenceDiagram
    autonumber
    participant D as 1. prisma/models/
    participant S as 2. schemas/
    participant R as 3. repositories/
    participant B as 4. services/
    participant C as 5. controllers/
    participant T as 6. routes/
    participant A as 7. app.ts

    Note over D: Define tabela, campos e relacionamentos no banco
    Note over S: Cria validação de entrada (Zod)
    Note over R: Queries no banco via Prisma Client
    Note over B: Regras de negócio, cálculos e validações de domínio
    Note over C: Recebe req, chama service e define status HTTP
    Note over T: Registra rota HTTP e acopla middlewares
    Note over A: Registra o prefixo global da rota (ex: /time)
```

---

## 3. Detalhamento de Cada Camada

### Passo 1: `prisma/models/` — Modelagem do Banco de Dados

* **Objetivo:** Definir como os dados serão estruturados e persistidos no PostgreSQL.
* **O que fazer:** Criar um novo arquivo `.prisma` dentro de `prisma/models/` para o novo modelo.
* **Comando pós-edição:** Executar `npx prisma migrate dev --name nome_da_migracao` para gerar a migração, ou `npx prisma generate` apenas para atualizar o client.

> [!IMPORTANT]
> Cada model deve ter `@@map("nome_tabela_minusculo")` para manter o nome da tabela em snake_case no banco.

**Exemplo real do projeto (`timeEntries.prisma`):**

```prisma
model TimeEntries {
    timeEntrieId Int      @id @default(autoincrement())
    date         DateTime @db.Date
    totalTime    Decimal? @db.Decimal(12, 2)
    description  String?  @db.Text
    createdAt    DateTime @default(now())
    updatedAt    DateTime @updatedAt

    projectId Int
    project   Projects @relation(fields: [projectId], references: [projectId])

    userId Int
    user   User @relation(fields: [userId], references: [userId])

    timeSubEntries SubTimeEntries[]

    @@unique([userId, projectId, date])
    @@map("timeentries")
}
```

---

### Passo 2: `src/schemas/` — Contratos de Entrada (DTOs & Validação Zod)

* **Objetivo:** Validar os dados de entrada (`body`, `query`, `params`) antes que cheguem aos controllers.
* **Regra:** Utilize o formato compatível com o middleware `validateRequest` — aninhando os campos sob `body`, `query` ou `params`.
* **Dica:** Exporte os tipos inferidos pelo Zod (`z.infer<typeof schema>`) para reutilizá-los nos services.

**Exemplo real do projeto (`timeEntry.schema.ts` — trecho):**

```typescript
import { z } from 'zod';
import { getByIdParamsSchema } from '@schemas/id.schema';

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

const timeEntryPeriodSchema = z.object({
  hourIni: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'A hora inicial deve estar no formato HH:MM (entre 00:00 e 23:59)',
  }),
  // hourFin aceita até 24:00 para indicar fim do dia
  hourFin: z.string().regex(/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/, {
    message: 'A hora final deve estar no formato HH:MM (entre 00:01 e 24:00)',
  }),
}).refine((p) => toMinutes(p.hourIni) < toMinutes(p.hourFin), {
  message: 'A hora final deve ser maior que a hora inicial',
});

export const createTimeEntrySchema = z.object({
  body: z.object({
    date: z.iso.date({ message: 'A data deve estar no formato (AAAA-MM-DD)' })
      .transform((val) => new Date(`${val}T12:00:00.000Z`)),
    description: z.string().trim().nullish()
      .transform((val) => (val === '' ? null : val)),
    project: z.object({
      projectId: z.coerce.number().int().positive(),
    }),
    subTimeEntries: z.array(timeEntryPeriodSchema).min(1),
  }),
});

export type CreateTimeEntryBody = z.infer<typeof createTimeEntrySchema>['body'];
```

---

### Passo 3: `src/repositories/` — Acesso a Dados (DAL)

* **Objetivo:** Isolar todas as operações diretas com o Prisma Client.
* **Regra de Ouro:** **Não** coloque regras de negócio ou validações aqui. Apenas queries simples ou compostas.
* **Dica:** Use `satisfies Prisma.ModelFindManyArgs` para definir args reutilizáveis e extrair tipos com `Prisma.ModelGetPayload`.

**Exemplo real do projeto (`TimeEntryRepository.ts` — trecho):**

```typescript
import { prisma, type TimeEntries, type Prisma } from '@database/prisma';

export const timeEntryWithSubEntriesArgs = {
  include: { timeSubEntries: true },
} satisfies Prisma.TimeEntriesFindManyArgs;

export type TimeEntryWithSubEntries =
  Prisma.TimeEntriesGetPayload<typeof timeEntryWithSubEntriesArgs>;

export class TimeEntryRepository {
  async create(data: Prisma.TimeEntriesCreateInput): Promise<TimeEntries> {
    return prisma.timeEntries.create({ data });
  }

  async findAll(): Promise<TimeEntryWithSubEntries[]> {
    return prisma.timeEntries.findMany(timeEntryWithSubEntriesArgs);
  }

  async findById(id: number): Promise<TimeEntryWithSubEntries | null> {
    return prisma.timeEntries.findUnique({
      where: { timeEntrieId: id },
      ...timeEntryWithSubEntriesArgs,
    });
  }

  async findByDate(
    date: Date,
    projectId: number | null,
    userId: number | null
  ): Promise<TimeEntries | null> {
    return prisma.timeEntries.findFirst({
      where: {
        date,
        projectId: projectId ?? undefined,
        userId: userId ?? undefined,
      },
    });
  }
}
```

---

### Passo 4: `src/services/` — Regras de Negócio (BLL)

* **Objetivo:** O coração da aplicação. Onde as decisões e validações lógicas acontecem.
* **Regra de Ouro:** Não acesse objetos de HTTP (`Request` ou `Response`). Receba parâmetros limpos e retorne tipos/dados.
* **Erros operacionais:** Lance sempre instâncias de `AppError` com o código HTTP adequado (400, 401, 403, 404, etc.).
* **Dica:** Crie métodos privados auxiliares (`getXOrThrow`) para evitar repetição na checagem de existência.

**Exemplo real do projeto (`TimeEntryService.ts` — trecho):**

```typescript
import { AppError } from '@utils/AppError';
import { TimeEntryRepository } from '@repositories/TimeEntryRepository';
import { ProjectRepository } from '@repositories/ProjectRepository';

export class TimeEntryService {
  private TimeEntryRepository = new TimeEntryRepository();
  private ProjectRepository = new ProjectRepository();

  // Helper DRY: lança 404 se não encontrar
  private async getTimeOrThrow(id: number) {
    const entry = await this.TimeEntryRepository.findById(id);
    if (!entry) throw new AppError('Id de tempo nao encontrado.', 404);
    return entry;
  }

  async create(data: CreateTimeEntryBody, userId: number) {
    const { project, subTimeEntries, date, ...resdata } = data;
    const targetProjectId = project?.projectId;

    if (!targetProjectId) {
      throw new AppError('O ID do projeto é obrigatório.', 400);
    }

    if (!await this.ProjectRepository.findById(targetProjectId)) {
      throw new AppError('Id de projeto nao encontrado.', 404);
    }

    // userId vem sempre do token JWT — nunca do body
    const intervals = this.buildIntervals(subTimeEntries);
    const totalMinutes = intervals.reduce((sum, i) => sum + (i.fin - i.ini), 0);

    return this.TimeEntryRepository.create({
      ...resdata,
      date,
      totalTime: totalMinutes / 60,
      project: { connect: { projectId: targetProjectId } },
      user: { connect: { userId } },
      timeSubEntries: {
        create: intervals.map(i => ({
          hourIni: this.minutesToTimeDate(i.ini, date),
          hourFin: this.minutesToTimeDate(i.fin, date),
          totalHour: this.minutesToHhmmss(i.fin - i.ini),
        })),
      },
    });
  }
}
```

---

### Passo 5: `src/controllers/` — Controle de Requisições HTTP

* **Objetivo:** Receber a requisição, extrair os dados (`req.body`, `req.params`, `req.query`, `req.user`), chamar o service e responder com o status HTTP apropriado.
* **Regra de Ouro:** Sempre encapsule em `try/catch` e repasse erros não tratados via `next(err)`.
* **Importante:** O `userId` do usuário autenticado vem de `req.user?.id` (injetado pelo middleware `authenticate`). **Nunca** leia `userId` do corpo da requisição.

**Exemplo real do projeto (`TimeEntryController.ts` — trecho):**

```typescript
import type { NextFunction, Request, Response } from 'express';
import { TimeEntryService } from '@services/TimeEntryService';
import { AppError } from '@utils/AppError';

export class TimeEntryController {
  private timeService = new TimeEntryService();

  async create(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const dataBody = request.body;
      const userId = Number(request.user?.id);

      if (!userId) {
        throw new AppError('Usuário não autenticado.', 401);
      }

      // userId é passado como argumento separado — nunca vem do body
      const entry = await this.timeService.create(dataBody, userId);
      response.status(201).json(entry);
    } catch (error) {
      next(error);
    }
  }

  async delete(request: Request, response: Response, next: NextFunction): Promise<void> {
    try {
      const parsedParams = getByIdParamsSchema.parse(request.params);
      const userId = Number(request.user?.id);

      if (!userId) {
        throw new AppError('Usuário não autenticado.', 401);
      }

      const result = await this.timeService.delete(parsedParams.id, userId, request.user?.role);
      response.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
```

---

### Passo 6: `src/routes/` — Definição dos Endpoints

* **Objetivo:** Declarar as rotas HTTP, acoplar middlewares específicos e ligá-las ao controller correspondente.
* **Autorização:** Use `authorize('ADMIN')` antes de `validateRequest` para rotas restritas a administradores.

**Exemplo real do projeto (`timeEntryRoutes.ts`):**

```typescript
import { Router } from 'express';
import { TimeEntryController } from '@controllers/TimeEntryController';
import { validateRequest } from '@middlewares/validateRequest';
import {
  createTimeEntrySchema,
  updateTimeEntrySchema,
  getTimeEntrySchema,
} from '@schemas/timeEntry.schema';

const timeEntryRoutes = Router();
const timeController = new TimeEntryController();

// Qualquer usuário autenticado pode lançar horas
timeEntryRoutes.post('/', validateRequest(createTimeEntrySchema), timeController.create.bind(timeController));
timeEntryRoutes.get('/', timeController.getAll.bind(timeController));
timeEntryRoutes.put('/:id', validateRequest(updateTimeEntrySchema), timeController.update.bind(timeController));
timeEntryRoutes.get('/:id', validateRequest(getTimeEntrySchema), timeController.getByID.bind(timeController));
timeEntryRoutes.delete('/:id', validateRequest(getTimeEntrySchema), timeController.delete.bind(timeController));

export default timeEntryRoutes;
```

**Exemplo com `authorize` (rotas restritas a ADMIN — `clientRoutes.ts`):**

```typescript
import { authorize } from '@middlewares/authorize';

// Apenas ADMIN pode criar, editar e deletar clientes
clientRoutes.post('/', authorize('ADMIN'), validateRequest(createClientSchema), clientController.create.bind(clientController));
clientRoutes.get('/', clientController.getAll.bind(clientController)); // qualquer autenticado
clientRoutes.put('/:id', authorize('ADMIN'), validateRequest(updateClientSchema), clientController.update.bind(clientController));
clientRoutes.delete('/:id', authorize('ADMIN'), validateRequest(getClientSchema), clientController.delete.bind(clientController));
```

---

### Passo 7: `src/app.ts` — Registro Global da Rota

* **Objetivo:** Adicionar o grupo de rotas com seu prefixo e definir a proteção via middleware `authenticate`.

> [!IMPORTANT]
> O middleware `authenticate` deve sempre vir **antes** do roteador. Ele valida o JWT e injeta `req.user` para todos os handlers daquele grupo.

**Exemplo real do projeto (`app.ts`):**

```typescript
import { authenticate } from '@middlewares/authenticate';
import timeEntryRoutes from '@routes/timeEntryRoutes';
import clientRoutes from '@routes/clientRoutes';
import projectRoutes from '@routes/projectRoutes';
import userRoutes from '@routes/userRoutes';

// Autenticação pública (sem authenticate)
app.use('/auth', authRoutes);

// Rotas protegidas: authenticate valida o JWT antes de qualquer handler
app.use('/users',   authenticate, userRoutes);
app.use('/clients', authenticate, clientRoutes);
app.use('/projects', authenticate, projectRoutes);
app.use('/time',    authenticate, timeEntryRoutes);
```

---

## 4. Tabela de Status Codes Padrão

Ao criar endpoints, siga esta convenção para as respostas HTTP:

| Método | Finalidade | Sucesso | Erro Comum |
| :--- | :--- | :--- | :--- |
| **GET** | Buscar registros | `200 OK` | `404 Not Found` |
| **POST** | Criar registro | `201 Created` | `400 Bad Request` |
| **PUT / PATCH** | Atualizar registro | `200 OK` | `400 Bad Request` / `404 Not Found` |
| **DELETE** | Excluir registro | `200 OK` + objeto deletado *(padrão atual do projeto)* | `404 Not Found` |
| **Qualquer** | Falha de autenticação | — | `401 Unauthorized` |
| **Qualquer** | Sem permissão (`role`) | — | `403 Forbidden` |

> [!NOTE]
> O padrão REST recomenda `204 No Content` para DELETE, mas este projeto optou por retornar `200 OK` com o objeto deletado para facilitar feedback ao frontend.

---

## 5. Variáveis de Ambiente Necessárias

Copie o arquivo `.env.example` para `.env` e preencha os valores. As variáveis utilizadas pelo projeto são:

| Variável | Obrigatória | Descrição | Exemplo |
| :--- | :--- | :--- | :--- |
| `APP_HOST` | Não | Host do servidor (padrão: `localhost`) | `localhost` |
| `APP_PORT` | Não | Porta do servidor (padrão: `3000`) | `3000` |
| `DATABASE_URL` | **Sim** | String de conexão PostgreSQL (Prisma) | `postgresql://user:pass@localhost:5432/db` |
| `JWT_SECRET` | **Sim** | Chave secreta do access token (mín. 32 chars) | *(gere com `openssl rand -hex 32`)* |
| `JWT_EXPIRES_IN` | Não | Validade do access token (padrão: `30m`) | `30m`, `1h`, `15m` |
| `JWT_REFRESH_SECRET` | **Sim** | Chave secreta do refresh token (mín. 32 chars, diferente do JWT_SECRET) | *(gere com `openssl rand -hex 32`)* |
| `JWT_REFRESH_EXPIRES_IN` | Não | Validade do refresh token (padrão: `7d`) | `7d`, `30d` |

---

## 6. Checklist Rápido para Novos Endpoints

- [ ] Modelo criado/atualizado em `prisma/models/` e migração executada (`npx prisma migrate dev`)?
- [ ] Schema Zod criado em `src/schemas/` com validação de `body`, `params` e `query`?
- [ ] Tipos exportados via `z.infer<typeof schema>` para uso nos services?
- [ ] Queries no banco criadas em `src/repositories/` (sem regras de negócio)?
- [ ] Regras de negócio, cálculos e `AppError` implementados em `src/services/`?
- [ ] `userId` extraído de `req.user?.id` no controller (nunca do body)?
- [ ] Controller criado com `try/catch` e repasse para `next(err)`?
- [ ] Rota associada com `validateRequest` e (se necessário) `authorize('ADMIN')` em `src/routes/`?
- [ ] Prefixo da rota registrado em `src/app.ts` com `authenticate`?
