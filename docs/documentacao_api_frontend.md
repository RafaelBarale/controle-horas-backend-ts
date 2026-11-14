# Guia de IntegraÃ§Ã£o e EspecificaÃ§Ã£o da API (Frontend & IAs)

Este documento foi projetado para que **desenvolvedores frontend** e **assistentes de IA** compreendam com exatidÃ£o como consumir, tipar e manipular todos os endpoints da API de Controle de Horas.

---

## 1. VisÃ£o Geral e PadrÃµes de ComunicaÃ§Ã£o

### ConfiguraÃ§Ãµes BÃ¡sicas
* **Base URL PadrÃ£o:** `http://localhost:3000` (ou variÃ¡vel de ambiente `VITE_API_URL` / `NEXT_PUBLIC_API_URL`)
* **Headers PadrÃ£o:**
  ```http
  Content-Type: application/json
  Authorization: Bearer <accessToken>
  ```

### PadrÃ£o de Respostas

#### Sucesso
Os status de sucesso variam entre `200 OK` (consultas, atualizaÃ§Ãµes, deleÃ§Ãµes) e `201 Created` (criaÃ§Ãµes). Os dados sÃ£o devolvidos diretamente no corpo da resposta (como objeto ou array).

#### Erro de ValidaÃ§Ã£o de Schema (`400 Bad Request`)
Quando o payload ou parÃ¢metros falharem nas regras do Zod:
```json
{
  "status": "error",
  "message": "Dados invÃ¡lidos",
  "errors": [
    {
      "path": "body.subTimeEntries",
      "message": "Os perÃ­odos nÃ£o podem se sobrepor"
    }
  ]
}
```

#### Erro de NegÃ³cio da AplicaÃ§Ã£o (`400`, `401`, `404`)
```json
{
  "status": "error",
  "message": "Mensagem descritiva do erro"
}
```

---

## 2. DicionÃ¡rio de Enums do Sistema

Utilize estes tipos exatos no frontend para selects, badges e tipagens TypeScript:

```typescript
export type Role = 'ADMIN' | 'COLABORADOR';

export type Status = 'ATIVO' | 'INATIVO'; // Utilizado em UsuÃ¡rios e Clientes

export type StatusProject = 'EM_EXECUCAO' | 'CONCLUIDO';

export type TypeProject = 'ABERTO' | 'FECHADO';
```

---

## 3. MÃ³dulo 0: Health Check

### `GET /`
Verifica se o backend estÃ¡ ativo e respondendo.
* **AutenticaÃ§Ã£o:** NÃ£o requer.
* **Resposta de Sucesso (`200 OK`):**
  ```json
  {
    "message": "OK"
  }
  ```

---

## 4. MÃ³dulo 1: AutenticaÃ§Ã£o (`/auth`)

### 4.1 Login de UsuÃ¡rio
`POST /auth/login`
Autentica o usuÃ¡rio com e-mail e senha, retornando o par de tokens JWT.
* **AutenticaÃ§Ã£o:** NÃ£o requer.
* **Request Body:**
  | Campo | Tipo | ObrigatÃ³rio? | Regra |
  | :--- | :--- | :--- | :--- |
  | `email` | `string` | Sim | Formato de e-mail vÃ¡lido |
  | `password` | `string` | Sim | MÃ­nimo 1 caractere |

  ```json
  {
    "email": "colaborador@empresa.com",
    "password": "senhaSegura123"
  }
  ```

* **Resposta de Sucesso (`200 OK`):**
  ```json
  {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi...",
    "tokenType": "Bearer"
  }
  ```
* **Erros Comuns:**
  * `401 Unauthorized`: `"Invalid credentials"` ou `"Inactive user"`.

---

### 4.2 RenovaÃ§Ã£o de Token (Refresh Token)
`POST /auth/refresh`
Gera um novo `accessToken` e renova o `refreshToken` quando o token de acesso expirar.
* **AutenticaÃ§Ã£o:** NÃ£o requer token no Header (enviado no corpo).
* **Request Body:**
  | Campo | Tipo | ObrigatÃ³rio? | Regra |
  | :--- | :--- | :--- | :--- |
  | `refresh_token` | `string` | Sim | Token JWT recebido no login |
  | `grant_type` | `string` | Sim | Deve ser o literal `"refresh_token"` |

  ```json
  {
    "refresh_token": "eyJhbGciOi...",
    "grant_type": "refresh_token"
  }
  ```

* **Resposta de Sucesso (`200 OK`):**
  ```json
  {
    "accessToken": "eyJhbGciOiNovaChave...",
    "refreshToken": "eyJhbGciOiNovoRefresh..."
  }
  ```
* **Erros Comuns:**
  * `401 Unauthorized`: `"Invalid or expired refresh token"`.

---

### 4.3 Logout
`POST /auth/logout`
Invalida o refresh token armazenado no banco para a sessÃ£o atual.
* **AutenticaÃ§Ã£o:** Requer cabeÃ§alho `Authorization: Bearer <accessToken>`.
* **Request Body:** Nenhum.
* **Resposta de Sucesso (`200 OK`):**
  ```json
  {
    "message": "User logged out successfully"
  }
  ```

---

## 5. MÃ³dulo 2: UsuÃ¡rios (`/users`)
> **Nota de SeguranÃ§a:** Todos os endpoints deste mÃ³dulo exigem `Authorization: Bearer <accessToken>`. As senhas dos usuÃ¡rios **nunca** sÃ£o retornadas pelo backend.

### 5.1 Criar UsuÃ¡rio
`POST /users`
* **Request Body:**
  | Campo | Tipo | ObrigatÃ³rio? | Regras |
  | :--- | :--- | :--- | :--- |
  | `name` | `string` | Sim | MÃ­nimo 3 caracteres |
  | `email` | `string` | Sim | E-mail vÃ¡lido e Ãºnico |
  | `password` | `string` | Sim | MÃ­nimo 6 caracteres |
  | `role` | `'ADMIN' \| 'COLABORADOR'` | Sim | Enum `Role` |
  | `status` | `'ATIVO' \| 'INATIVO'` | Sim | Enum `Status` |

  ```json
  {
    "name": "JoÃ£o Silva",
    "email": "joao@empresa.com",
    "password": "senhaForte123",
    "role": "COLABORADOR",
    "status": "ATIVO"
  }
  ```
* **Resposta de Sucesso (`201 Created`):**
  ```json
  {
    "userId": 1,
    "name": "JoÃ£o Silva",
    "email": "joao@empresa.com",
    "role": "COLABORADOR",
    "status": "ATIVO",
    "createdAt": "2026-11-11T12:00:00.000Z",
    "updatedAt": "2026-11-11T12:00:00.000Z"
  }
  ```

---

### 5.2 Listar UsuÃ¡rios
`GET /users`
* **Resposta de Sucesso (`200 OK`):**
  ```json
  [
    {
      "userId": 1,
      "name": "JoÃ£o Silva",
      "email": "joao@empresa.com",
      "role": "COLABORADOR",
      "status": "ATIVO",
      "createdAt": "2026-11-11T12:00:00.000Z",
      "updatedAt": "2026-11-11T12:00:00.000Z"
    }
  ]
  ```

---

### 5.3 Obter UsuÃ¡rio por ID
`GET /users/:id`
* **ParÃ¢metros de URL:** `:id` (inteiro positivo).
* **Resposta de Sucesso (`200 OK`):** Retorna o objeto do usuÃ¡rio.
* **Erros Comuns:** `404 Not Found` (`"UsuÃ¡rio nÃ£o encontrado."`).

---

### 5.4 Atualizar UsuÃ¡rio
`PUT /users/:id`
* **ParÃ¢metros de URL:** `:id` (inteiro positivo).
* **Request Body:** Todos os campos sÃ£o opcionais.
  ```json
  {
    "name": "JoÃ£o Silva Atualizado",
    "email": "novo_email@empresa.com",
    "password": "novaSenha123",
    "role": "ADMIN",
    "status": "ATIVO"
  }
  ```
* **Resposta de Sucesso (`200 OK`):** Retorna o objeto atualizado.

---

### 5.5 Deletar UsuÃ¡rio
`DELETE /users/:id`
* **ParÃ¢metros de URL:** `:id` (inteiro positivo).
* **Resposta de Sucesso (`200 OK`):** Retorna os dados do usuÃ¡rio deletado.

---

## 6. MÃ³dulo 3: Clientes (`/clients`)
> **Nota:** Todos os endpoints exigem `Authorization: Bearer <accessToken>`.

### 6.1 Criar Cliente
`POST /clients`
* **Request Body:**
  | Campo | Tipo | ObrigatÃ³rio? | Regras |
  | :--- | :--- | :--- | :--- |
  | `name` | `string` | Sim | MÃ­nimo 3 caracteres |
  | `email` | `string` | Sim | E-mail vÃ¡lido |
  | `ein` | `string` | Sim | CNPJ / Identificador fiscal (2 a 14 caracteres, Ãºnico) |
  | `status` | `'ATIVO' \| 'INATIVO'` | NÃ£o | PadrÃ£o: `"ATIVO"` |

  ```json
  {
    "name": "Tech Corp Ltda",
    "email": "contato@techcorp.com",
    "ein": "12345678000199",
    "status": "ATIVO"
  }
  ```
* **Resposta de Sucesso (`201 Created`):**
  ```json
  {
    "clientId": 1,
    "name": "Tech Corp Ltda",
    "email": "contato@techcorp.com",
    "ein": "12345678000199",
    "status": "ATIVO",
    "createdAt": "2026-11-11T12:00:00.000Z",
    "updatedAt": "2026-11-11T12:00:00.000Z"
  }
  ```

---

### 6.2 Listar Clientes
`GET /clients`
* **Resposta de Sucesso (`200 OK`):**
  ```json
  [
    {
      "clientId": 1,
      "name": "Tech Corp Ltda",
      "email": "contato@techcorp.com",
      "ein": "12345678000199",
      "status": "ATIVO"
    }
  ]
  ```

---

### 6.3 Obter Cliente por ID
`GET /clients/:id`
* **ParÃ¢metros de URL:** `:id` (inteiro positivo).
* **Resposta de Sucesso (`200 OK`):** Retorna o objeto do cliente.
* **Erros Comuns:** `404 Not Found` (`"Cliente nÃ£o encontrado."`).

---

### 6.4 Atualizar Cliente
`PUT /clients/:id`
* **ParÃ¢metros de URL:** `:id` (inteiro positivo).
* **Request Body:** Todos os campos sÃ£o opcionais.
  ```json
  {
    "name": "Tech Corp Internacional",
    "email": "financeiro@techcorp.com",
    "status": "ATIVO"
  }
  ```
* **Resposta de Sucesso (`200 OK`):** Retorna o cliente atualizado.

---

### 6.5 Deletar Cliente
`DELETE /clients/:id`
* **ParÃ¢metros de URL:** `:id` (inteiro positivo).
* **Resposta de Sucesso (`200 OK`):** Retorna os dados do cliente excluÃ­do.

---

## 7. MÃ³dulo 4: Projetos (`/projects`)
> **Nota:** Todos os endpoints exigem `Authorization: Bearer <accessToken>`.

### 7.1 Criar Projeto
`POST /projects`
* **Regra de Unicidade:** O tÃ­tulo do projeto nÃ£o pode ser duplicado **para o mesmo cliente**.
* **Request Body:**
  | Campo | Tipo | ObrigatÃ³rio? | Regras |
  | :--- | :--- | :--- | :--- |
  | `title` | `string` | Sim | MÃ­nimo 3 caracteres |
  | `description` | `string \| null` | NÃ£o | Texto descritivo |
  | `price` | `number \| null` | NÃ£o | Deve ser maior que 0 |
  | `type` | `'ABERTO' \| 'FECHADO'` | NÃ£o | PadrÃ£o no banco: `"ABERTO"` |
  | `status` | `'EM_EXECUCAO' \| 'CONCLUIDO'` | NÃ£o | PadrÃ£o no banco: `"EM_EXECUCAO"` |
  | `client.clientId`| `number` | Sim | ID de um cliente existente |

  ```json
  {
    "title": "Desenvolvimento Web App",
    "description": "CriaÃ§Ã£o do frontend em Next.js",
    "price": 15000.00,
    "type": "FECHADO",
    "status": "EM_EXECUCAO",
    "client": {
      "clientId": 1
    }
  }
  ```
* **Resposta de Sucesso (`201 Created`):**
  ```json
  {
    "projectId": 1,
    "title": "Desenvolvimento Web App",
    "description": "CriaÃ§Ã£o do frontend em Next.js",
    "price": 15000,
    "type": "FECHADO",
    "status": "EM_EXECUCAO",
    "clientId": 1,
    "createdAt": "2026-11-11T12:00:00.000Z",
    "updatedAt": "2026-11-11T12:00:00.000Z"
  }
  ```

---

### 7.2 Listar Projetos
`GET /projects`
* **Resposta de Sucesso (`200 OK`):** Lista de todos os projetos cadastrados.

---

### 7.3 Obter Projeto por ID
`GET /projects/:id`
* **ParÃ¢metros de URL:** `:id` (inteiro positivo).
* **Resposta de Sucesso (`200 OK`):** Retorna o objeto do projeto.
* **Erros Comuns:** `404 Not Found` (`"Projeto nao encontrado."`).

---

### 7.4 Atualizar Projeto
`PUT /projects/:id`
* **ParÃ¢metros de URL:** `:id` (inteiro positivo).
* **Request Body:** Todos os campos sÃ£o opcionais. Caso o cliente seja alterado, a regra de tÃ­tulo duplicado valida o novo cliente.
  ```json
  {
    "title": "Web App v2",
    "status": "CONCLUIDO",
    "price": 18000.00
  }
  ```
* **Resposta de Sucesso (`200 OK`):** Retorna o projeto atualizado.

---

### 7.5 Deletar Projeto
`DELETE /projects/:id`
* **ParÃ¢metros de URL:** `:id` (inteiro positivo).
* **Resposta de Sucesso (`200 OK`):** Retorna o projeto removido.

---

## 8. MÃ³dulo 5: LanÃ§amento de Horas & Intervalos (`/time`)
> **Nota:** Todos os endpoints exigem `Authorization: Bearer <accessToken>`.

Este mÃ³dulo gerencia o cabeÃ§alho do apontamento diÃ¡rio e seus respectivos perÃ­odos de trabalho (`subTimeEntries`).

### Regras de NegÃ³cio CrÃ­ticas para o Frontend:
1. **Origem do UsuÃ¡rio (`userId`):** O `userId` Ã© extraÃ­do automaticamente do token JWT (`Authorization: Bearer <token>`). O frontend **NÃƒO** deve enviar o campo `user` no corpo da requisiÃ§Ã£o.
2. **Formato da Data:** Deve ser `AAAA-MM-DD` (ex: `"2026-11-11"`).
3. **Formato das Horas:** Deve ser `HH:MM`:
   * `hourIni`: aceita de `"00:00"` atÃ© `"23:59"`.
   * `hourFin`: aceita de `"00:01"` atÃ© `"24:00"` (permite encerrar a jornada exatamente Ã  meia-noite `24:00`).
4. **ValidaÃ§Ã£o do PerÃ­odo:** Em cada intervalo, obrigatoriamente `hourFin > hourIni`.
5. **Regra de SobreposiÃ§Ã£o vs. PerÃ­odos ContÃ­guos:**
   * **PerÃ­odos contÃ­guos (encostando) sÃ£o PERMITIDOS:** Ex: `09:00 - 12:00` seguido de `12:00 - 13:00` **NÃƒO** Ã© sobreposiÃ§Ã£o e Ã© 100% vÃ¡lido.
   * **SobreposiÃ§Ã£o Ã© REJEITADA:** Ocorre quando o inÃ­cio de um perÃ­odo Ã© anterior ao tÃ©rmino do perÃ­odo anterior (ex: `09:00 - 12:00` e `11:59 - 14:00` retorna erro `400`).
6. **Turnos que Atravessam a Meia-Noite:** Como a regra exige `hourFin > hourIni` e cada lanÃ§amento pertence a uma data civil Ãºnica, plantÃµes ou turnos noturnos que viram a noite (ex: `22:00` Ã s `04:00`) devem ser divididos em dois lanÃ§amentos:
   * LanÃ§amento na Data 1: `22:00 - 24:00`
   * LanÃ§amento na Data 2: `00:00 - 04:00`
7. **CÃ¡lculo de `totalTime` AutomÃ¡tico:** O backend calcula a soma de todos os minutos e preenche o campo `totalTime` (em horas decimais) automaticamente.

---

### 8.1 Criar Apontamento de Horas com Intervalos
`POST /time`
* **Request Body:**
  | Campo | Tipo | ObrigatÃ³rio? | DescriÃ§Ã£o / Regra |
  | :--- | :--- | :--- | :--- |
  | `date` | `string` | Sim | Data no formato `"AAAA-MM-DD"` |
  | `description` | `string \| null` | NÃ£o | Detalhes das tarefas realizadas |
  | `project.projectId` | `number` | Sim | ID do projeto existente |
  | `user.userId` | `number` | Sim | ID do usuÃ¡rio existente |
  | `subTimeEntries` | `Array<Interval>`| Sim | Pelo menos 1 intervalo (`min: 1`) |
  | `subTimeEntries[].hourIni` | `string` | Sim | Hora inicial (`"HH:MM"`) |
  | `subTimeEntries[].hourFin` | `string` | Sim | Hora final (`"HH:MM"`), maior que `hourIni` |

  ```json
  {
    "date": "2026-11-11",
    "description": "ImplementaÃ§Ã£o das telas de dashboard e autenticaÃ§Ã£o",
    "project": {
      "projectId": 1
    },
    "user": {
      "userId": 1
    },
    "subTimeEntries": [
      {
        "hourIni": "09:00",
        "hourFin": "12:00"
      },
      {
        "hourIni": "13:00",
        "hourFin": "18:00"
      }
    ]
  }
  ```

* **Resposta de Sucesso (`201 Created`):**
  ```json
  {
    "timeEntrieId": 1,
    "date": "2026-11-11T12:00:00.000Z",
    "totalTime": 8,
    "description": "ImplementaÃ§Ã£o das telas de dashboard e autenticaÃ§Ã£o",
    "projectId": 1,
    "userId": 1,
    "createdAt": "2026-11-11T14:00:00.000Z",
    "updatedAt": "2026-11-11T14:00:00.000Z"
  }
  ```
* **Erros de ValidaÃ§Ã£o:**
  * `400`: `"Os perÃ­odos nÃ£o podem se sobrepor"`
  * `400`: `"A hora final deve ser maior que a hora inicial"`
  * `400`: `"Ja existe lancamento de tempo nesta data para este projeto/usuario"`
  * `404`: `"Id de projeto nao encontrado."` ou `"Id de usuario nao encontrado."`

---

### 8.2 Listar Apontamentos com Sub-Intervalos
`GET /time`
Retorna todos os lanÃ§amentos trazendo embutido o array `timeSubEntries` de cada dia.

* **Resposta de Sucesso (`200 OK`):**
  ```json
  [
    {
      "timeEntrieId": 1,
      "date": "2026-11-11T00:00:00.000Z",
      "totalTime": 8,
      "description": "ImplementaÃ§Ã£o das telas de dashboard e autenticaÃ§Ã£o",
      "projectId": 1,
      "userId": 1,
      "createdAt": "2026-11-11T14:00:00.000Z",
      "updatedAt": "2026-11-11T14:00:00.000Z",
      "timeSubEntries": [
        {
          "subTimeEntryId": 1,
          "hourIni": "2026-11-11T09:00:00.000Z",
          "hourFin": "2026-11-11T12:00:00.000Z",
          "totalHour": "03:00:00.000Z",
          "timeEntrieId": 1,
          "createdAt": "2026-11-11T14:00:00.000Z",
          "updatedAt": "2026-11-11T14:00:00.000Z"
        },
        {
          "subTimeEntryId": 2,
          "hourIni": "2026-11-11T13:00:00.000Z",
          "hourFin": "2026-11-11T18:00:00.000Z",
          "totalHour": "05:00:00.000Z",
          "timeEntrieId": 1,
          "createdAt": "2026-11-11T14:00:00.000Z",
          "updatedAt": "2026-11-11T14:00:00.000Z"
        }
      ]
    }
  ]
  ```

---

### 8.3 Obter Apontamento por ID com Sub-Intervalos
`GET /time/:id`
* **ParÃ¢metros de URL:** `:id` (inteiro positivo).
* **Resposta de Sucesso (`200 OK`):** Retorna o objeto do lanÃ§amento com seu array `timeSubEntries` completo.
* **Erros Comuns:** `404 Not Found` (`"Id de tempo nao encontrado."`).

---

### 8.4 Atualizar Apontamento e Substituir Intervalos
`PUT /time/:id`
* **Comportamento dos Intervalos:** Caso `subTimeEntries` seja enviado, o backend substitui atomicamente todos os intervalos anteriores pelos novos e recalcula o `totalTime`.
* **Request Body:**
  ```json
  {
    "date": "2026-11-11",
    "description": "DescriÃ§Ã£o corrigida",
    "subTimeEntries": [
      {
        "hourIni": "09:00",
        "hourFin": "12:30"
      },
      {
        "hourIni": "13:30",
        "hourFin": "18:00"
      }
    ]
  }
  ```
* **Resposta de Sucesso (`200 OK`):** Retorna o lanÃ§amento atualizado com o novo `totalTime: 8` recalculado.

---

### 8.5 Deletar Apontamento
`DELETE /time/:id`
* **Efeito Cascata:** Exclui o lanÃ§amento pai e todos os seus `SubTimeEntries` vinculados no banco de dados.
* **Resposta de Sucesso (`200 OK`):** Retorna o registro removido.

---

## 9. Contratos TypeScript Prontos para o Frontend (`types/api.ts`)

Copie e cole este bloco no seu projeto frontend:

```typescript
// ==========================================
// ENUMS
// ==========================================
export type Role = 'ADMIN' | 'COLABORADOR';
export type Status = 'ATIVO' | 'INATIVO';
export type StatusProject = 'EM_EXECUCAO' | 'CONCLUIDO';
export type TypeProject = 'ABERTO' | 'FECHADO';

// ==========================================
// RESPOSTAS PADRÃƒO DE ERRO
// ==========================================
export interface ApiErrorResponse {
  status: 'error';
  message: string;
  errors?: Array<{
    path: string;
    message: string;
  }>;
}

// ==========================================
// AUTENTICAÃ‡ÃƒO
// ==========================================
export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType?: string;
}

export interface RefreshTokenPayload {
  refresh_token: string;
  grant_type: 'refresh_token';
}

// ==========================================
// USUÃRIOS
// ==========================================
export interface User {
  userId: number;
  name: string;
  email: string;
  role: Role;
  status: Status;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: Role;
  status: Status;
}

export interface UpdateUserPayload extends Partial<CreateUserPayload> {}

// ==========================================
// CLIENTES
// ==========================================
export interface Client {
  clientId: number;
  name: string;
  email: string;
  ein: string;
  status: Status;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateClientPayload {
  name: string;
  email: string;
  ein: string;
  status?: Status;
}

export interface UpdateClientPayload extends Partial<CreateClientPayload> {}

// ==========================================
// PROJETOS
// ==========================================
export interface Project {
  projectId: number;
  title: string;
  description: string | null;
  price: number | null;
  type: TypeProject;
  status: StatusProject;
  clientId: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectPayload {
  title: string;
  description?: string | null;
  price?: number | null;
  type?: TypeProject;
  status?: StatusProject;
  client: {
    clientId: number;
  };
}

export interface UpdateProjectPayload {
  title?: string;
  description?: string | null;
  price?: number | null;
  type?: TypeProject;
  status?: StatusProject;
  client?: {
    clientId: number;
  };
}

// ==========================================
// LANÃ‡AMENTOS DE HORAS (TIME ENTRIES)
// ==========================================
export interface SubTimeEntryItem {
  hourIni: string; // Formato "HH:MM"
  hourFin: string; // Formato "HH:MM"
}

export interface SubTimeEntry {
  subTimeEntryId: number;
  hourIni: string; // ISO 8601 Timestamp
  hourFin: string; // ISO 8601 Timestamp
  totalHour: string | null; // ex: "03:00:00.000Z"
  timeEntrieId: number;
  createdAt: string;
  updatedAt: string;
}

export interface TimeEntry {
  timeEntrieId: number;
  date: string; // ISO 8601
  totalTime: number | null; // Horas decimais (ex: 7.5 = 7h 30m)
  description: string | null;
  projectId: number;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

export interface TimeEntryWithSubEntries extends TimeEntry {
  timeSubEntries: SubTimeEntry[];
}

export interface CreateTimeEntryPayload {
  date: string; // Formato "AAAA-MM-DD"
  description?: string | null;
  project: {
    projectId: number;
  };
  subTimeEntries: SubTimeEntryItem[];
}

export interface UpdateTimeEntryPayload {
  date?: string; // Formato "AAAA-MM-DD"
  description?: string | null;
  project?: {
    projectId: number;
  };
  subTimeEntries?: SubTimeEntryItem[];
}
```

---

## 10. Exemplo de Cliente HTTP com Axios e Fila Anti-Concorrência

Como o backend implementa **Refresh Token Rotation**, quando uma tela dispara várias requisições simultâneas e o token está expirado, todas recebem 401 ao mesmo tempo. 

O cliente HTTP abaixo implementa o **Padrão de Fila (Request Queue)**: apenas a **primeira** chamada dispara o `/auth/refresh`, enquanto as chamadas concorrentes aguardam na fila e são reexecutadas automaticamente com o novo token sem serem rejeitadas:

```typescript
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Controle de concorrência e fila de espera
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

// Função que processa e destrava a fila
const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });

  failedQueue = [];
};

// Interceptor de Request: injeta o Bearer token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('@App:accessToken');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor de Response: gerencia 401 com fila anti-concorrência
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Se não for erro 401 ou a requisição já tiver sido retentada, propaga o erro
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Se JÁ HOUVER um refresh em andamento, enfileira a requisição atual
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    // Se for a primeira requisição a falhar, assume a responsabilidade de renovar
    originalRequest._retry = true;
    isRefreshing = true;

    const refreshToken = localStorage.getItem('@App:refreshToken');

    if (!refreshToken) {
      localStorage.clear();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    try {
      // Dispara o refresh usando axios isolado para não entrar no interceptor
      const { data } = await axios.post(`${api.defaults.baseURL}/auth/refresh`, {
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      });

      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = data;

      // Salva os novos tokens rotacionados
      localStorage.setItem('@App:accessToken', newAccessToken);
      localStorage.setItem('@App:refreshToken', newRefreshToken);

      api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      // Libera todas as requisições que estavam aguardando na fila
      processQueue(null, newAccessToken);

      return api(originalRequest);
    } catch (refreshError) {
      // Se o refresh falhar (expirou de verdade), limpa a fila e desloga
      processQueue(refreshError, null);
      localStorage.clear();
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);
```



### Atualizações adicionais

- **TimeEntry (`/time`)**: o `userId` **não** deve ser enviado no corpo da requisição. Ele é extraído do token JWT pelo middleware `authenticate` e passado ao serviço (`request.user?.id`).
- **Regras de intervalo**: períodos contíguos são permitidos (ex.: `09:00‑12:00` + `12:00‑13:00`). O campo `hourFin` aceita o valor `24:00`. Horários que atravessam a meia‑noite devem ser divididos em duas entradas.
- **Autorização**: rotas de criação, atualização e exclusão de **clientes** e **projetos** (`POST`, `PUT`, `DELETE`) exigem role `ADMIN`. As rotas de listagem (`GET`) são acessíveis a qualquer usuário autenticado.
- **Interceptor Axios**: já inclui o padrão de fila (`request‑queue`) que garante que apenas uma chamada ao endpoint `/auth/refresh` seja disparada quando o `accessToken` expira, evitando condições de corrida.
