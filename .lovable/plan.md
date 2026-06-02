# Plano: Identificação de Clientes + Assistência Profissional

## 1. Base de dados (migração)

**Tabela `customers`**
- `id` uuid PK
- `customer_number` int único sequencial (sequence `customer_number_seq`, começa em 1000)
- `created_at`, `updated_at`, `last_seen_at`
- `blocked` boolean default false
- `notes` text (admin)

**Tabela `customer_history`** (eventos)
- `id`, `customer_id` FK
- `event_type` text ('search' | 'recommendation' | 'assistance' | 'visit' | 'product_view')
- `payload` jsonb (query, product_id, etc.)
- `created_at`

**Alterar `assistance_requests`**:
- adicionar `customer_id` uuid nullable, `customer_number` int nullable
- adicionar `reason` text (motivo)
- expandir `status` para incluir: `pending`, `accepted`, `refused`, `expired`, `done`
- adicionar `accepted_at`, `expires_at`

RLS:
- `customers`: anon pode INSERT (criar novo) e SELECT por `customer_number` (apenas linha correspondente — via função security definer ou política que permite SELECT público das colunas básicas). Admin full.
- `customer_history`: anon INSERT com customer_id válido; admin SELECT/full.
- `assistance_requests`: anon INSERT + SELECT da própria linha (por id) para acompanhar estado em tempo real; admin full.

GRANTs a `anon` e `authenticated` para as tabelas + sequence USAGE para gerar números.

Função RPC `create_customer()` → retorna {id, customer_number}.
Função RPC `find_customer(p_number int)` → linha ou null.

## 2. Cliente (Quiosque)

**`/kiosk/identify`** (nova rota — entry point antes do assistente)
- Pergunta "É a sua primeira vez aqui?" + dois botões grandes.
- **Sim** → chama `create_customer` RPC, mostra "O seu número é #1024", botão "Continuar".
- **Não** → input grande para número; valida via `find_customer`. Erro com botões "Tentar novamente" / "Criar novo número".
- Guarda `customer` em `localStorage` (`mater.customer`) + `sessionStorage`.

**Atualizar `/kiosk/start`** (assistente):
- Lê customer do storage; se ausente, redireciona para `/kiosk/identify`.
- Regista eventos em `customer_history` (search/recommendation) via insert.
- Botão "Chamar funcionário" passa `customer_id` + `customer_number` ao criar `assistance_requests` com `status='pending'` e `expires_at = now() + 2min`.
- Após criar: modal de assistência com 4 estados em tempo real (subscribe ao row por id):
  - `pending` → "A procurar um funcionário disponível…" + spinner + barra de progresso (2min).
  - `accepted` → "Um funcionário está a caminho." ✓ animação.
  - `refused` → "O pedido foi recusado." + botões Tentar novamente / Continuar.
  - `expired` (timeout local + update) → "Nenhum funcionário aceitou…" + botões.

**`/kiosk/start`** roteia para identify se não houver cliente.

## 3. Admin

**`/admin/customers`** (nova página)
- Tabela: número, criado em, último visto, bloqueado, ações.
- Pesquisa por número.
- Modal de detalhes: editar número, notas internas, bloquear/desbloquear, apagar, ver histórico (lista de eventos) e pedidos de assistência do cliente.

**Atualizar `/admin/assistance`**:
- Mostrar `customer_number`, motivo.
- Botões "Aceitar" / "Recusar" (em vez de só "Atender"/"Resolver"). "Concluir" depois de aceite.
- Status badges coloridos por estado.

Sidebar: novo item "Clientes" (icon `Users`).

## 4. Realtime / expiração

- Cliente assina o row do seu pedido (`postgres_changes` filtrado por id).
- Pedido expira por timer local (2 min) — ao expirar, cliente faz UPDATE status='expired' se ainda `pending`.
- Som suave no admin já existe (`playChime`).

## 5. Detalhes técnicos

- RPCs SECURITY DEFINER para `create_customer` e `find_customer` (evita expor toda a tabela ao anon).
- Sequence `customer_number_seq` START 1000.
- `customer_history` insert direto pelo anon com check de customer_id existente.
- Animações com framer-motion (já usado) e Tailwind.
- Componente reutilizável `<CustomerBadge>` mostrando #número no topo do quiosque.

## Arquivos a criar/editar

Criar:
- `supabase/migrations/<ts>_customers_and_assistance.sql`
- `src/lib/customer.ts` (hooks: useCustomer, createCustomer, findCustomer, logHistory)
- `src/routes/kiosk.identify.tsx`
- `src/routes/admin.customers.tsx`
- `src/components/CustomerBadge.tsx`
- `src/components/AssistanceModal.tsx` (modal com estados em tempo real)

Editar:
- `src/routes/kiosk.tsx` (gate identify)
- `src/routes/kiosk.start.tsx` (usar AssistanceModal + log de history)
- `src/routes/admin.tsx` (sidebar + item Clientes)
- `src/routes/admin.assistance.tsx` (estados aceite/recusa/expirado + customer info)
- `src/lib/assistance.ts` (setRequestStatus aceitar todos os estados)

Pronto para implementar?