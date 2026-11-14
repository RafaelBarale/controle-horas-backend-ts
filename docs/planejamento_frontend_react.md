# Planejamento Completo de Desenvolvimento do Frontend (React + IA)

Este documento contém o **PRD (Product Requirements Document)**, a **Definição da Stack Tecnológica**, a **Arquitetura da Aplicação** e o **Roteiro de Prompts Sequenciais** projetado para guiar uma IA (ou desenvolvedor) na construção completa do frontend do sistema de Controle de Horas.

---

## 1. PRD (Product Requirements Document)

### 1.1 Visão Geral do Produto
O **Controle de Horas** é uma plataforma web para gestão de tempos de trabalho, projetos, clientes e colaboradores. O sistema permite apontamentos diários fracionados em múltiplos intervalos de horários (**SubTimeEntries**), prevenindo sobreposições e calculando automaticamente o total de horas trabalhadas.

### 1.2 Personas & Papéis
1. **Administrador (`ADMIN`):**
   * Acesso total ao sistema.
   * Gestão de usuários (criar, ativar/inativar, alterar senhas).
   * Gestão de clientes e projetos.
   * Visualização de dashboards globais e relatórios consolidados de todos os colaboradores.
2. **Colaborador (`COLABORADOR`):**
   * Acesso ao apontamento diário de horas nos projetos ativos aos quais tem vínculo.
   * Visualização do seu próprio histórico de horas e status de aprovação/conclusão.

### 1.3 Módulos Funcionais e Regras de Negócio

| Módulo | Funcionalidades Principais | Regras Críticas |
| :--- | :--- | :--- |
| **Autenticação** | Login com e-mail/senha, renovação automática de token (`refresh_token`), logout e proteção de rotas. | O token de acesso expira e deve ser renovado de forma transparente pelo interceptor HTTP sem deslogar o usuário. |
| **Clientes** | Listagem com busca, cadastro, edição e exclusão. | O campo `ein` (CNPJ/identificador) deve ter de 2 a 14 caracteres e é único no sistema. |
| **Projetos** | Listagem, filtros por status e cliente, cadastro com preço e tipo (`ABERTO` / `FECHADO`). | O título do projeto não pode ser repetido para o mesmo cliente. |
| **Lançamento de Horas** | Calendário / Timesheet diário, construtor de múltiplos intervalos (`hourIni` e `hourFin`), histórico com expansão de detalhes. | 1. Horários no formato `HH:MM`.<br>2. `hourFin > hourIni` obrigatório.<br>3. Intervalos do mesmo dia não podem se sobrepor.<br>4. O total de horas diário é calculado automaticamente. |
| **Usuários** (Admin) | Gestão de colaboradores (Nome, E-mail, Senha, Role, Status). | Apenas usuários com `role: "ADMIN"` podem acessar essa seção. |
| **Dashboard** | Cards com métricas de horas na semana/mês, horas por projeto e gráficos visuais. | Resumos visuais para rápida tomada de decisão. |

---

## 2. Definição da Stack Tecnológica & Justificativas

| Tecnologia | Finalidade | Por que foi escolhida para desenvolvimento com IA? |
| :--- | :--- | :--- |
| **React 18/19 + Vite** | Framework & Build Tool | Extremamente rápido, tipagem TypeScript nativa, sem a complexidade de SSR (Next.js) para painéis autenticados internos. |
| **TypeScript** | Linguagem | Garante type-safety absoluto aproveitando os contratos já definidos em `documentacao_api_frontend.md`. |
| **Tailwind CSS** | Estilização Utilitária | Código declarativo direto no JSX, muito fácil para IAs manipularem sem conflitos de CSS global. |
| **shadcn/ui (Radix UI)** | Componentes de Interface | **Melhor biblioteca para IAs.** Os componentes ficam dentro da sua pasta `src/components/ui`, permitindo que a IA altere o código-fonte livremente sem ficar presa a bibliotecas fechadas. |
| **TanStack Query (v5)** | Estado de Servidor & Cache | Gerencia cache, refetch automático, loading states e sincronização de dados com a API REST. |
| **React Hook Form + Zod** | Formulários e Validação | Validações performáticas no cliente, reutilizando exatamente a mesma lógica de schemas do backend. |
| **Axios** | Cliente HTTP | Suporta interceptors assíncronos para renovação de token JWT no caso de erro `401`. |
| **Lucide React** | Pacote de Ícones | Ícones consistentes e leves. |
| **Sonner** | Notificações (Toast) | Toasts elegantes e modernos com suporte a promessas. |

---

## 3. Arquitetura de Pastas Recomendada

```
controle-horas-frontend/
├── public/
├── src/
│   ├── api/
│   │   ├── client.ts             # Instância do Axios com interceptors de Auth e Refresh
│   │   ├── auth.api.ts           # Endpoints de login, refresh e logout
│   │   ├── users.api.ts          # Endpoints do CRUD de usuários
│   │   ├── clients.api.ts        # Endpoints do CRUD de clientes
│   │   ├── projects.api.ts       # Endpoints do CRUD de projetos
│   │   └── timeEntries.api.ts    # Endpoints de lançamento de horas
│   ├── components/
│   │   ├── ui/                   # Componentes do shadcn/ui (button, dialog, input, etc.)
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx     # Shell com Sidebar, Header e Breadcrumb
│   │   │   ├── Sidebar.tsx       # Navegação lateral expansível
│   │   │   ├── Header.tsx        # Perfil do usuário, tema e botão de logout
│   │   │   └── ProtectedRoute.tsx# Guard de rotas autenticadas e validação de Role
│   │   └── shared/
│   │       ├── DataTable.tsx     # Tabela reutilizável com busca e paginação
│   │       └── ConfirmDialog.tsx # Modal de confirmação de exclusão
│   ├── contexts/
│   │   └── AuthContext.tsx       # Estado global de autenticação (user, token, login, logout)
│   ├── hooks/
│   │   └── useAuth.ts            # Hook utilitário para consumir o AuthContext
│   ├── pages/
│   │   ├── auth/
│   │   │   └── LoginPage.tsx     # Tela de login
│   │   ├── dashboard/
│   │   │   └── DashboardPage.tsx # Painel de métricas e gráficos
│   │   ├── clients/
│   │   │   ├── ClientsPage.tsx   # Listagem de clientes
│   │   │   └── ClientModal.tsx   # Modal de criação/edição de cliente
│   │   ├── projects/
│   │   │   ├── ProjectsPage.tsx  # Listagem de projetos com filtros
│   │   │   └── ProjectModal.tsx  # Modal de criação/edição de projeto
│   │   ├── time-entries/
│   │   │   ├── TimeEntriesPage.tsx  # Listagem e histórico de horas
│   │   │   ├── TimeEntryModal.tsx   # Modal com o construtor dinâmico de intervalos
│   │   │   └── IntervalBuilder.tsx  # Sub-componente de intervalos com validação visual
│   │   └── users/
│   │       ├── UsersPage.tsx     # Gestão de usuários (Exclusivo ADMIN)
│   │       └── UserModal.tsx     # Modal de criação/edição de usuário
│   ├── routes/
│   │   └── index.tsx             # Definição das rotas com react-router-dom
│   ├── types/
│   │   └── api.ts                # Tipos TypeScript espelhados da documentação da API
│   ├── utils/
│   │   ├── formatters.ts         # Formatação de datas (pt-BR), moeda (BRL) e horas decimais
│   │   └── timeCalculations.ts   # Conversores de HH:MM para minutos e validação de sobreposição
│   ├── App.tsx
│   └── main.tsx
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## 4. O Componente Crítico: Construtor de Intervalos de Horas

O componente mais importante do frontend é o **`IntervalBuilder`**, responsável por montar o array `subTimeEntries`:

### Comportamento Esperado:
1. Permite adicionar quantas linhas de intervalo o usuário desejar:
   * Linha 1: `[ 09:00 ]` até `[ 12:00 ]`
   * Linha 2: `[ 12:00 ]` até `[ 18:00 ]` *(Períodos contíguos/encostando são permitidos e válidos)*
   * Linha 3: `[ 20:00 ]` até `[ 24:00 ]` *(O `hourFin` pode chegar até `24:00`)*
2. **Validação Visual em Tempo Real:**
   * Se `hourFin <= hourIni` em qualquer linha ➡️ Borda vermelha e mensagem *"A hora final deve ser maior que a hora inicial"*.
   * Se houver sobreposição estrita entre linhas (ex: `09:00 - 12:00` e `11:59 - 13:00`) ➡️ Alerta em destaque *"Os períodos informados não podem se cruzar"*.
3. **Cálculo Dinâmico:**
   * Exibe um badge ou contador em tempo real: *"Total acumulado no dia: 8.0 horas (480 minutos)"*, atualizando a cada dígito alterado.
4. Desabilita o botão de salvar enquanto houver qualquer pendência de horário inválido ou sobreposto.
5. **Sem Envio de Usuário:** O formulário não precisa e não deve selecionar usuário para os lançamentos normais; o `userId` é atribuído automaticamente pelo token JWT no backend.

---

## 5. Roteiro de Prompts Sequenciais para a IA

Copie e envie cada prompt abaixo na sequência para a sua IA (Antigravity, Cursor, Claude, ChatGPT, etc.). **Não pule etapas.**

---

### 🔹 Sprint 1: Setup do Projeto, Tipagens e Cliente HTTP
> **Prompt para a IA:**
> "Crie a estrutura base do frontend de um sistema de Controle de Horas usando **React + TypeScript + Vite + Tailwind CSS**.
>
> Requisitos:
> 1. Instale e configure o **shadcn/ui** (utilize o estilo 'Default' ou 'New York' com slate).
> 2. Instale: `axios`, `react-router-dom`, `@tanstack/react-query`, `lucide-react`, `sonner`, `react-hook-form`, `@hookform/resolvers`, `zod`.
> 3. Crie o arquivo `src/types/api.ts` contendo todas as interfaces (Enums, User, Client, Project, TimeEntry, SubTimeEntry, ApiErrorResponse) rigorosamente alinhadas à documentação da API.
> 4. Crie `src/api/client.ts` com a instância do Axios apontando para `http://localhost:3000`, incluindo:
>    - Interceptor para injetar `Authorization: Bearer <accessToken>` salvo no localStorage.
>    - Interceptor de resposta com **Padrão de Fila (Request Queue)**: use variáveis `isRefreshing` e `failedQueue` para evitar condições de corrida com múltiplas chamadas concorrentes quando o token expirar, garantindo que apenas a primeira dispare `POST /auth/refresh` com `{ refresh_token, grant_type: "refresh_token" }` e as demais aguardem o novo token.
> 5. Configure o `QueryClientProvider` e o `Toaster` da Sonner no `App.tsx`."

---

### 🔹 Sprint 2: Autenticação, Rotas Protegidas e Layout Base
> **Prompt para a IA:**
> "Agora vamos implementar a camada de Autenticação e o Layout Principal da aplicação:
>
> Requisitos:
> 1. Crie o `AuthContext` em `src/contexts/AuthContext.tsx`:
>    - Deve manter o estado de `user` (decodificado do JWT ou buscado da API), `isAuthenticated`, `isLoading`.
>    - Métodos: `login(email, password)` e `logout()`.
>    - Persistir tokens (`accessToken` e `refreshToken`) no `localStorage`.
> 2. Crie a tela `src/pages/auth/LoginPage.tsx`:
>    - Layout moderno e responsivo com card centralizado.
>    - Formulário com `react-hook-form` e `zod` para `email` e `password`.
>    - Tratamento de loading no botão e exibição de erro via Sonner caso as credenciais estejam erradas.
> 3. Crie `src/components/layout/ProtectedRoute.tsx`:
>    - Redireciona para `/login` se o usuário não estiver autenticado.
>    - Aceita prop opcional `roles?: Role[]` para barrar acessos não autorizados.
> 4. Crie o Shell da Aplicação `src/components/layout/AppLayout.tsx`:
>    - **Sidebar:** Links de navegação com ícones (Dashboard, Apontamentos, Clientes, Projetos e Usuários apenas se ADMIN).
>    - **Header:** Exibição do nome e perfil do usuário logado, botão de alternar tema e botão de Sair (Logout)."

---

### 🔹 Sprint 3: Módulo de Clientes e Módulo de Projetos
> **Prompt para a IA:**
> "Vamos construir os módulos de cadastro de Clientes e Projetos:
>
> Requisitos:
> 1. **Clientes (`/clients`):**
>    - Crie `src/api/clients.api.ts` com os métodos do CRUD (`getAll`, `getById`, `create`, `update`, `delete`).
>    - Crie `ClientsPage.tsx`: Tabela listando nome, e-mail, EIN (CNPJ), badge de status (`ATIVO`/`INATIVO`) e ações (Editar, Deletar).
>    - Campo de busca em tempo real por nome ou EIN.
>    - Crie `ClientModal.tsx`: Modal com formulário validado por Zod para criar/editar clientes.
>    - Confirmação antes de deletar com feedback via Sonner.
> 2. **Projetos (`/projects`):**
>    - Crie `src/api/projects.api.ts` com os métodos do CRUD.
>    - Crie `ProjectsPage.tsx`: Tabela com título, cliente vinculado, preço (formatado em R$), badge de tipo (`ABERTO`/`FECHADO`) e status (`EM_EXECUCAO`/`CONCLUIDO`).
>    - Filtros por Status e por Cliente.
>    - Crie `ProjectModal.tsx`: Select dinâmico carregando os clientes da API via TanStack Query, permitindo selecionar o `clientId` obrigatório.
>    - Use `useMutation` do TanStack Query com invalidação automática de cache após salvar."

---

### 🔹 Sprint 4: Módulo de Lançamento de Horas e Construtor de Intervalos
> **Prompt para a IA:**
> "Agora vamos desenvolver o coração do sistema: o Módulo de Apontamento de Horas (`/time`):
>
> Requisitos:
> 1. Crie `src/api/timeEntries.api.ts` cobrindo `getAll`, `getById`, `create`, `update`, `delete`.
> 2. Crie o componente `src/pages/time-entries/IntervalBuilder.tsx`:
>    - Permite adicionar múltiplos intervalos com campos `hourIni` e `hourFin` (tipo time ou texto com máscara `HH:MM`).
>    - Validação instantânea: impede que a hora final seja menor ou igual à inicial e detecta sobreposição entre períodos antes do envio.
>    - Exibe em tempo real o cálculo total de horas acumuladas naqueles intervalos.
> 3. Crie `TimeEntryModal.tsx`:
>    - Campo para selecionar a Data (`AAAA-MM-DD`).
>    - Select de Projeto (`projectId`).
>    - Campo opcional de Descrição detalhada das atividades.
>    - Integra o `IntervalBuilder` e envia o payload completo para `POST /time` ou `PUT /time/:id`.
> 4. Crie `TimeEntriesPage.tsx`:
>    - Tabela listando os apontamentos por data, projeto, total de horas registradas e descrição.
>    - Linhas expansíveis (Accordion) mostrando a lista detalhada de sub-intervalos daquele dia (`09:00 - 12:00 (3h)`, `13:00 - 18:00 (5h)`).
>    - Ações para editar e excluir o lançamento diário."

---

### 🔹 Sprint 5: Gestão de Usuários (Apenas Admin)
> **Prompt para a IA:**
> "Vamos implementar o módulo de Usuários em `src/pages/users/`:
>
> Requisitos:
> 1. Crie `src/api/users.api.ts` para o CRUD de usuários.
> 2. Configure a rota `/users` protegida com `ProtectedRoute roles={['ADMIN']}`.
> 3. Crie `UsersPage.tsx`: Tabela exibindo Nome, E-mail, Papel (`ADMIN`/`COLABORADOR`), Status (`ATIVO`/`INATIVO`) e ações.
> 4. Crie `UserModal.tsx`:
>    - Na criação: campos Nome, E-mail, Senha (mínimo 6 caracteres), Role e Status.
>    - Na edição: a senha deve ser opcional (só preenche se desejar redefinir).
> 5. Invalidação automática do cache do TanStack Query após alterações."

---

### 🔹 Sprint 6: Dashboard, Métricas e Polimento Visual
> **Prompt para a IA:**
> "Vamos finalizar com a tela de Dashboard e refinamento visual:
>
> Requisitos:
> 1. Crie `src/pages/dashboard/DashboardPage.tsx`:
>    - **Cards de KPI:** Total de Horas Lançadas no Mês, Total de Horas na Semana, Projetos em Execução e Total de Clientes Ativos.
>    - **Tabela Recente:** Últimos 5 lançamentos de horas com links rápidos para edição.
>    - **Gráfico de Horas:** Gráfico simples de barras ou pizza (usando Recharts ou CSS puro) mostrando a distribuição de horas por projeto.
> 2. Estados de Loading: Skeleton screens em todas as tabelas e cards enquanto os dados carregam.
> 3. Estados de Vazio (Empty States): Ilustrações ou mensagens amigáveis quando não houver clientes, projetos ou horas lançadas."

---

## 6. Checklist de Validação Final

Antes de considerar o frontend concluído, execute os testes com os seguintes cenários:
* [ ] Fazer login com credenciais inválidas e verificar o toast de erro.
* [ ] Aguardar expiração do access token e verificar se a próxima requisição renova o token automaticamente sem forçar novo login.
* [ ] Cadastrar um projeto vinculado a um cliente recém-criado.
* [ ] Tentar cadastrar um projeto com o mesmo nome para o mesmo cliente (deve retornar erro 400 amigável).
* [ ] Lançar horas com períodos sobrepostos (ex: `08:00 - 12:00` e `11:00 - 14:00`) e confirmar que o formulário bloqueia visualmente.
* [ ] Criar um lançamento com dois períodos (`09:00 - 12:00` e `13:00 - 18:00`) e verificar se o total exibido na tabela é exatamente `8.0` horas.
* [ ] Deletar um lançamento e verificar se a exclusão em cascata funciona sem erros.
* [ ] Tentar acessar a rota `/users` logado como `COLABORADOR` e confirmar que o acesso é negado.

