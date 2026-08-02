# Brief de Design — FitRank

Documento para redesenhar o app: **novo design system + todas as telas**. Contém o inventário
de conteúdo real de cada tela, os estados que precisam existir e as restrições técnicas.

---

## 1. O produto

**FitRank** — app de treino com dinâmica social. O usuário registra que treinou, entra em grupos
com amigos e disputa um ranking de **consistência** (quantos treinos no período), não de
performance. Progresso físico pessoal (peso + foto) fica ao lado disso.

**A tese do produto:** o que engaja não é o treino em si, é ver que o amigo treinou 5 vezes
essa semana e você 3. Registrar precisa ser rápido; o ranking precisa dar vontade de abrir.

**Uso real:** mobile, dentro da academia, uma mão, frequentemente com pressa entre séries.
Aberto todo dia por ~30 segundos. É um PWA instalável — na prática se comporta como app nativo,
sem barra de navegador, em tela cheia.

**Público:** pessoas que treinam com regularidade, 20–40 anos, em grupos pequenos (3–15 pessoas)
de amigos ou colegas de academia. Brasil, interface em português.

---

## 2. O que precisamos

1. **Um design system novo**, não o default do shadcn/ui. Hoje o app parece um template:
   verde genérico + cards cinza + Inter. Queremos identidade visual própria.
2. **Todas as telas redesenhadas** seguindo esse sistema.

**Direção que buscamos:** algo com energia e personalidade — o app é sobre competição amigável
e progresso. Não precisa ser "fitness clichê" (preto + neon + itálico agressivo). Fique à
vontade para propor uma direção que a gente não pediu, desde que resolva a hierarquia de
informação das telas abaixo.

**Prioridade máxima na hierarquia:** o ranking e o botão de registrar treino. É o que traz a
pessoa de volta.

---

## 3. Restrições técnicas (obrigatórias)

| Restrição | Detalhe |
|---|---|
| **Mobile-first** | Larguras de 360px a 430px são o caso real. Desktop é secundário — tratar como coluna centralizada (`max-w-lg`), não como layout de dashboard. |
| **Tema claro E escuro** | Ambos precisam ser projetados. O default hoje é **escuro**. O usuário troca em Configurações (claro / escuro / sistema). |
| **Tailwind + CSS custom properties** | Tokens são variáveis CSS em HSL (`--primary: 142 71% 45%`) mapeadas no `tailwind.config.ts`. Manter esse formato: `hsl(var(--token))`. |
| **shadcn/ui (Radix)** | Componentes existentes: button, card, dialog, sheet, tabs, select, input, textarea, label, avatar, badge, checkbox, switch, progress, scroll-area, table, tooltip, alert-dialog, calendar, collapsible, sonner (toast). Redesenhar via tokens e variantes; se precisar de outra primitiva, ela pode ser adicionada. |
| **Área segura** | Nav fixa embaixo precisa respeitar o notch/home indicator do iOS (`safe-area-bottom` já existe). |
| **Toque** | Alvos mínimos de 44×44px. |
| **Acessibilidade** | Contraste WCAG AA nos dois temas. O app é usado em academia — iluminação ruim, tela com suor, pessoa em movimento. |
| **Ícones** | `lucide-react` já instalado. Trocar por outro set é possível, mas custa. |
| **Fontes** | Hoje Inter / Lora / Space Mono via variáveis. Pode propor outras — precisam ser self-hosted ou Google Fonts. |
| **Gráfico** | `recharts` (usado no Progresso). Precisa de paleta de séries definida no sistema. |

---

## 4. Design system atual (a substituir)

Para referência do que existe hoje — **não é para preservar**, é para você saber o que vai
sobrescrever.

```
--primary:      142 71% 45%   /* verde */
--radius:       0.75rem
--background:   222 47% 8%    (escuro)  |  209 40% 96%  (claro)
--card:         217 32% 14%   (escuro)  |  210 40% 98%  (claro)
--destructive:  0 72% 50%
fonte:          Inter
```

Tokens que o sistema precisa entregar (nomes já cabeados no código, mantê-los):
`background, foreground, card, card-foreground, popover, popover-foreground, primary,
primary-foreground, secondary, secondary-foreground, muted, muted-foreground, accent,
accent-foreground, destructive, destructive-foreground, border, input, ring, radius`
mais `chart-1` a `chart-5` e a escala de sombras `shadow-2xs` → `shadow-2xl`.

Elementos com peso visual hoje, que a proposta precisa resolver de algum jeito:
- Botão **+** circular flutuante, elevado acima da barra de navegação (o "registrar treino").
- Medalhas 🥇🥈🥉 no pódio do ranking — emoji hoje, pode virar outra coisa.
- Avatares circulares com fallback de inicial.

---

## 5. Navegação

Barra fixa no rodapé, 6 slots. O 4º item central é uma **ação**, não uma rota — abre um sheet
por baixo.

```
[ Início ]  [ Rankings ]  ( + )  [ Treinos ]  [ Progresso ]  [ Config ]
   home        troféu     ação    prancheta     gráfico      engrenagem
```

Fora dessa barra: **Login**, **Cadastro**, **Admin** (tela isolada, sem nav) e **404**.

---

## 6. Inventário de telas

### 6.1 Início (`/`) — a tela mais densa, priorizar

Topo:
- Título "FitRank" + avatar/menu do usuário.
- **Seletor de grupo ativo.** Se o usuário está em mais de um grupo, ele alterna aqui. Isso
  troca o conteúdo de toda a tela.
- Código de convite do grupo, com ação de copiar (toast "Código copiado!").

Corpo:
- **Card "Ranking da semana"** — subtítulo "Quem mais treinou esta semana". Lista com posição,
  medalha nos 3 primeiros, avatar, nome, contagem de treinos. Prévia curta; o ranking completo
  fica na aba Rankings.
- **Calendário de treinos** — visão mensal ou anual (toggle). Dias com treino recebem destaque.
  Tocar num dia mostra os treinos daquele dia; tocar num **dia vazio abre o registro retroativo**.
  Precisa de dois estados visuais bem distintos por dia: *tem treino* / *hoje*.
- **Abas: Atividade | Histórico | Membros**
  - *Atividade*: feed do grupo — avatar, nome, tipo(s) de treino, data, observação. Paginado.
  - *Histórico*: só os treinos do próprio usuário, com ação de excluir.
  - *Membros*: lista de participantes do grupo com avatar e nome.

Estados obrigatórios:
- **Sem nenhum grupo** (usuário novo): esta tela vira uma tela de onboarding — criar grupo ou
  entrar com código. É o primeiro contato depois do cadastro, merece atenção.
- Grupo sem treinos na semana: "Nenhum treino esta semana."
- Feed vazio: "Nenhum treino ainda."
- Carregando.

---

### 6.2 Registrar treino — sheet que sobe (a interação mais importante)

Aberto pelo **+** central. Precisa ser rápido: a meta é registrar em menos de 10 segundos.

Campos:
- **Tipo(s) de treino** — seleção múltipla. Duas fontes, em abas: *Geral* (12 grupos musculares
  + Cardio, Funcional, Cross Training, HIIT, Mobilidade/Alongamento, Full Body, Treino Livre) e
  *Meus Treinos* (programas que o usuário montou). **~19 opções na aba Geral** — o padrão de
  seleção múltipla precisa aguentar essa quantidade sem virar uma lista infinita de checkbox.
- **Grupos** — para quais grupos o registro conta (múltipla escolha; some se só houver um).
- **Data e hora** — pré-preenchida com agora; editável para registro retroativo.
- **Observações** — texto livre opcional. Placeholder: "Ex: 3 séries, treino leve..."
- Botão "Registrar treino" / estado "Registrando…".

Validação: sem nenhum tipo selecionado, erro "Selecione pelo menos um tipo de treino".
Sucesso: toast "Treino registrado!" + o sheet fecha.

---

### 6.3 Rankings (`/rankings`)

- Seletor de grupo no topo.
- **Abas de período: Semana | Mês | Ano.**
- Filtro por tipo de treino (select, com opção "Todos os tipos").
- Lista ranqueada: posição, medalha no pódio, avatar, nome, número de treinos e uma **barra de
  progresso** relativa ao líder.
- **Empates existem e dividem a posição** (1º, 1º, 3º) — o design precisa comportar dois "1º"
  seguidos sem parecer bug.
- Vazio: "Nenhum treino no período."
- Sem grupo: "Selecione um grupo na página Início."

Esta é a tela que deve ser mais gostosa de olhar. É o retorno emocional do produto.

---

### 6.4 Treinos (`/treinos`)

"Meus Treinos" — "Monte seus treinos ou use um template pronto".

- Criar treino: campo de nome ("Nome do treino (ex: Treino A)").
- **Lista de treinos salvos.** Cada um expande para mostrar exercícios, com campos
  **Séries / Reps / Carga (kg)** por linha. Adicionar e remover exercício. Excluir o treino
  inteiro (com confirmação).
- **Seleção de exercício em drill-down:** 12 grupos musculares → 202 exercícios. O usuário
  escolhe o grupo, depois o exercício. Esse fluxo de dois níveis precisa de um padrão claro,
  provavelmente com busca.
- **Templates prontos** — PPL, Upper/Lower, Full Body etc. Importar um template gera treinos
  completos de uma vez.
- Vazio: "Nenhum treino cadastrado ainda."
- Sem grupo: "Selecione ou crie um grupo primeiro."

---

### 6.5 Progresso (`/progresso`)

"Acompanhe sua evolução de peso e fotos".

- **Gráfico de linha** — "Variação de peso ao longo do tempo". Precisa funcionar com 2 pontos e
  com 200. Definir cor de série, grid, eixos e tooltip no sistema.
- **Formulário de registro**: Peso (kg) (`Ex: 82.5`), Data, Observações opcionais
  ("Como foi o treino? Como você está se sentindo?"), **upload de foto de progresso** opcional.
- **Histórico** — lista de registros com peso, data, foto (miniatura, abre ampliada) e nota.
  Remover registro com confirmação.
- Vazio: "Nenhum registro ainda." — estado importante, todo usuário começa aqui.

Nota de tom: essa tela lida com peso corporal e foto do próprio corpo. Deve ser sóbria e
respeitosa — sem julgamento visual, sem vermelho/verde para "ganhou/perdeu" peso, sem
gamificação. Contraste deliberado com a energia competitiva dos Rankings.

---

### 6.6 Configurações (`/settings`)

Seções empilhadas:
- **Perfil** — nome exibido ("Altere seu nome exibido no app") + upload de avatar.
- **Senha** — nova senha, mínimo 6 caracteres.
- **Notificações** — switch "Ativar notificações", descrição "Avisos quando alguém registrar um
  treino". Precisa de estado *indisponível neste dispositivo*.
- **Tema** — Claro / Escuro / Sistema.
- **Grupos** — lista dos grupos, código de convite copiável, ação de sair do grupo (destrutiva,
  com confirmação). Vazio: "Você não está em nenhum grupo."
- Sair da conta.

---

### 6.7 Login e Cadastro

- Login: "FitRank" + "Entre para acompanhar seus treinos". Email, senha (com botão
  mostrar/ocultar), "Entrar", link para cadastro.
- Cadastro: nome, email, senha. Aceita um **código de convite** vindo de link — nesse caso a
  pessoa já entra direto no grupo. Vale desenhar essa variação: o cadastro convidado deveria
  mostrar em qual grupo a pessoa está entrando.

Primeira tela que qualquer pessoa vê. Deve comunicar o produto em 3 segundos.

---

### 6.8 Admin (`/admin`)

Tela interna, poucos usuários, prioridade baixa. Tabela de usuários (email, nome, criado em,
último acesso, papéis, badge de email confirmado) + ações: criar usuário, resetar senha,
excluir. Pode ser mais funcional e menos trabalhada que o resto — mas deve usar o mesmo sistema.

---

### 6.9 Sistêmicos

- **404**.
- **Loading de tela cheia** — hoje é um spinner circular. Aparece na troca de rota e ao carregar
  sessão/grupos. Vale considerar skeletons no lugar, pelo menos no Início.
- **Prompt de instalação do PWA** — banner dispensável. Tem variação para iOS (que não suporta
  instalação automática e precisa de instrução: "toque em Compartilhar → Adicionar à Tela").
- **Prompt de atualização** — avisa que saiu versão nova, com ação de recarregar.
- **Toasts** (biblioteca sonner) — sucesso, erro e info. Ex: "Treino registrado!",
  "Código copiado!", "Erro ao excluir treino".
- **Diálogos de confirmação destrutiva** — excluir treino, remover registro, sair do grupo.

---

## 7. Entregáveis esperados

1. **Tokens** — paleta clara e escura em HSL, tipografia (família, escala, pesos), raio,
   sombras, espaçamento. No formato de variáveis CSS descrito na seção 4.
2. **Componentes** — variantes de button, card, input, badge, tabs, avatar, sheet, dialog,
   toast, barra de progresso, item de lista, e o padrão de estado vazio.
3. **Telas** — as da seção 6, nos dois temas, em largura mobile.
4. **Os padrões que se repetem**, resolvidos uma vez: linha de ranking, card de treino no feed,
   dia do calendário, estado vazio, confirmação destrutiva.

## 8. Fora de escopo

Não mudar fluxos, arquitetura de navegação nem regras de negócio. O escopo é visual: mesmas
telas, mesmas ações, linguagem visual nova. Se algum fluxo parecer errado, aponte como
recomendação separada em vez de redesenhar por conta.
