# Fluxo de Autenticação e Autorização (JWT & Refresh Token)

Este documento descreve detalhadamente a arquitetura, os fluxos de requisição e as regras de segurança implementadas no módulo de **Autenticação e Sessão** (`/auth`), cobrindo login, renovação de tokens com rotação (Refresh Token Rotation), logout, janela de tolerância para requisições concorrentes (*Grace Period*) e validação de tokens em rotas protegidas.

---

## 1. Visão Geral dos Componentes

| Camada / Arquivo | Responsabilidade |
| :--- | :--- |
| `src/routes/authRoutes.ts` | Declara as rotas públicas de autenticação (`POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`). |
| `src/middlewares/validateLogin.ts` | Valida o payload de login (`email` e `password`) com `loginSchema`. |
| `src/middlewares/validateRefresh.ts` | Valida o payload de renovação (`refresh_token` e `grant_type: "refresh_token"`). |
| `src/middlewares/validateLogout.ts` | Valida o cabeçalho `Authorization: Bearer <token>` para logout. |
| `src/controllers/AuthController.ts` | Extrai credenciais e tokens da requisição, aciona o `AuthService` e retorna os status HTTP apropriados. |
| `src/services/AuthService.ts` | Implementa regras de negócio: validação de hash com bcrypt, checagem de usuário ativo, emissão de JWT, rotação de refresh token e invalidação no logout. |
| `src/repositories/UserRepository.ts` | Comunicação com o PostgreSQL via Prisma para consultar o usuário por e-mail e persistir dados. |
| `src/middlewares/authenticate.ts` | Intercepta requisições protegidas, valida a assinatura e expiração do JWT e injeta `req.user = { id, email, role, name }`. |
| `src/types/express.d.ts` | Extensão de tipos do Express para prover tipagem estrita à propriedade `req.user`. |
| `src/schemas/auth.schema.ts` | Validação e tipagem das variáveis de ambiente (`JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`). |

---

## 2. Fluxo 1: Login (`POST /auth/login`)

Autentica o usuário no sistema com e-mail e senha. Gera um par de tokens (`accessToken` de curta duração e `refreshToken` de longa duração) e persiste o novo `refreshToken` no banco de dados.

```mermaid
sequenceDiagram
    autonumber
    actor Cliente as Cliente (Front-end / Postman)
    participant Route as authRoutes.ts
    participant ValMW as validateLogin.ts
    participant Controller as AuthController.ts
    participant Service as AuthService.ts
    participant Repo as UserRepository.ts
    participant DB as PostgreSQL (Prisma)

    Cliente->>Route: POST /auth/login { email, password }
    Route->>ValMW: validateLogin(loginSchema)
    alt Payload inválido
        ValMW-->>Cliente: 400 Bad Request
    else Payload válido
        ValMW->>Controller: next() -> login(req, res, next)
        Controller->>Service: authService.login(email, password)
        Service->>Repo: findByEmail(email)
        Repo->>DB: prisma.user.findUnique({ where: { email } })
        DB-->>Repo: User ou null
        Repo-->>Service: User

        alt Usuário inexistente ou senha incorreta
            Service-->>Controller: throw AppError("Invalid credentials", 401)
            Controller-->>Cliente: 401 Unauthorized
        else Usuário inativo (status != 'ATIVO')
            Service-->>Controller: throw AppError("Inactive user", 401)
            Controller-->>Cliente: 401 Unauthorized
        else Credenciais válidas e usuário ativo
            Service->>Service: Gera accessToken (curta duração)
            Service->>Service: Gera refreshToken (longa duração)
            Service->>DB: prisma.user.update({ where: { userId }, data: { refreshToken } })
            DB-->>Service: Atualizado
            Service-->>Controller: { accessToken, refreshToken, tokenType: "Bearer" }
            Controller-->>Cliente: 200 OK { accessToken, refreshToken, tokenType: "Bearer" }
        end
    end
```

### Passo a Passo:
1. **Validação:** O middleware `validateLogin` valida e-mail válido e senha mínima via Zod.
2. **Busca e Checagem de Senha:** O `AuthService` localiza o usuário pelo e-mail e compara a senha informada com o hash salvo via `bcrypt.compare`.
3. **Checagem de Status:** Valida se `user.status === 'ATIVO'`. Usuários inativos recebem erro `401`.
4. **Geração de Tokens:**
   * `accessToken`: assinado com `JWT_SECRET` (validade curta, ex: 15m a 30m).
   * `refreshToken`: assinado com `JWT_REFRESH_SECRET` (validade longa, ex: 7d).
5. **Persistência de Sessão:** O hash do `refreshToken` é gravado na tabela `users` no banco de dados.
6. **Resposta:** Retorna status `200 OK` com ambos os tokens.

---

## 3. Fluxo 2: Requisição a Rota Protegida (Middleware `authenticate`)

Protege qualquer endpoint da API (ex: `/users`, `/clients`, `/projects`, `/time`).

```mermaid
sequenceDiagram
    autonumber
    actor Cliente as Cliente (Front-end / Postman)
    participant App as app.ts
    participant AuthMW as authenticate.ts
    participant Route as Rotas Protegidas

    Cliente->>App: GET /time (Header: "Authorization: Bearer <accessToken>")
    App->>AuthMW: authenticate(req, res, next)

    alt Header ausente ou sem 'Bearer '
        AuthMW-->>Cliente: 401 Unauthorized ("Token missing")
    else Token presente
        AuthMW->>AuthMW: jwt.verify(token, authEnv.JWT_SECRET)
        alt Token expirou (TokenExpiredError)
            AuthMW-->>Cliente: 401 Unauthorized ("Token expired")
        else Assinatura inválida
            AuthMW-->>Cliente: 401 Unauthorized ("Invalid token")
        else Token válido
            AuthMW->>AuthMW: Injeta req.user = { id: payload.userId, email, role, name }
            AuthMW->>Route: next() -> Executa a rota protegida
        end
    end
```

---

## 4. Fluxo 3: Renovação de Token com Rotação (`POST /auth/refresh`)

Quando o `accessToken` expira, o cliente utiliza o `refreshToken` para emitir um novo par de tokens. Para máxima segurança contra roubo de tokens, o sistema adota **Refresh Token Rotation** (o token antigo é substituído por um novo no banco).

```mermaid
sequenceDiagram
    autonumber
    actor Cliente as Cliente (Front-end / Axios)
    participant Route as authRoutes.ts
    participant ValMW as validateRefresh.ts
    participant Controller as AuthController.ts
    participant Service as AuthService.ts
    participant DB as PostgreSQL (Prisma)

    Cliente->>Route: POST /auth/refresh { refresh_token, grant_type: "refresh_token" }
    Route->>ValMW: validateRefresh
    ValMW->>Controller: next() -> refresh(req, res, next)
    Controller->>Service: authService.refreshToken(refreshToken)
    Service->>Service: jwt.verify(token, authEnv.JWT_REFRESH_SECRET)

    alt Token expirado ou assinatura inválida
        Service-->>Controller: throw AppError("Invalid or expired refresh token", 401)
        Controller-->>Cliente: 401 Unauthorized
    else Token válido
        Service->>DB: prisma.user.findUnique({ email })
        DB-->>Service: User

        alt Usuário inativo ou inexistente
            Service-->>Cliente: 401 Unauthorized ("User not found or inactive")
        else Usuário ativo
            Service->>Service: Gera novo accessToken
            Service->>Service: Gera novo refreshToken (Rotação)
            Service->>DB: prisma.user.update({ where: { userId }, data: { refreshToken: novoRefreshToken } })
            Service-->>Controller: { accessToken, refreshToken }
            Controller-->>Cliente: 200 OK { accessToken, refreshToken }
        end
    end
```

### Tratamento de Requisições Concorrentes (*Race Condition* & *Grace Period*):
* **O Problema:** Quando uma tela dispara 3 chamadas simultâneas e o access token está expirado, todas as 3 recebem 401 quase no mesmo instante. Se cada uma disparar um `/auth/refresh` separado, a primeira chamada rotacionará o token no banco, fazendo a segunda e a terceira falharem por token já rotacionado.
* **Proteção no Frontend:** O cliente HTTP deve implementar o **padrão de fila** (ex: variável `isRefreshing` e array `failedQueue`), permitindo que apenas uma chamada execute o refresh enquanto as demais aguardam o novo token.
* **Proteção no Backend (Janela de Tolerância / *Grace Period*):** Para evitar deslogar o usuário caso duas requisições batam no servidor em milissegundos de diferença, o backend implementa uma tolerância temporária (10 a 20 segundos) mantendo a resposta do refresh recente em cache ou aceitando o token anterior recente.

---

## 5. Fluxo 4: Logout (`POST /auth/logout`)

Invalida a sessão do usuário no banco de dados.

```mermaid
sequenceDiagram
    autonumber
    actor Cliente as Cliente (Front-end / Postman)
    participant Route as authRoutes.ts
    participant ValMW as validateLogout.ts
    participant Controller as AuthController.ts
    participant Service as AuthService.ts
    participant DB as PostgreSQL (Prisma)

    Cliente->>Route: POST /auth/logout (Header: "Authorization: Bearer <accessToken>")
    Route->>ValMW: validateLogout
    ValMW->>Controller: next() -> logout(req, res, next)
    Controller->>Service: authService.logout(authorization)
    Service->>Service: jwt.verify(token, authEnv.JWT_SECRET)
    Service->>DB: prisma.user.update({ where: { userId }, data: { refreshToken: null } })
    DB-->>Service: Sessão invalidada
    Service-->>Controller: { message: "User logged out successfully" }
    Controller-->>Cliente: 200 OK { message: "User logged out successfully" }
```

---

## 6. Comparativo dos Tokens

| Propriedade | Access Token | Refresh Token |
| :--- | :--- | :--- |
| **Finalidade** | Autenticar chamadas de API (`/time`, `/projects`, etc.) | Emitir novos pares de tokens |
| **Segredo Utilizado** | `JWT_SECRET` | `JWT_REFRESH_SECRET` |
| **Tempo de Vida** | Curto (ex: 15 a 30 minutos) | Longo (ex: 7 dias) |
| **Onde é Enviado** | Cabeçalho `Authorization: Bearer <token>` | Corpo JSON `{ refresh_token, grant_type }` |
| **Persistência no Banco** | Não (Stateless) | Sim (na coluna `refreshToken` de `User`) |
| **Política de Rotação** | Reemitido a cada refresh | Rotacionado a cada refresh |

---

## 7. Boas Práticas Adotadas

* **Segredos Criptográficos Isolados:** Chaves distintas para `accessToken` e `refreshToken` eliminam o risco de ataques de confusão de tipo de token.
* **Rotação de Refresh Token:** Garante que mesmo que um refresh token seja interceptado, ele se torne inválido assim que for utilizado legitimamente pelo usuário.
* **Injeção de Identidade Segura (`req.user`):** O middleware `authenticate` decodifica e anexa `id`, `email` e `role` na requisição, permitindo que módulos como `/time` utilizem o `userId` autenticado sem depender de parâmetros inseguros vindos do cliente.
