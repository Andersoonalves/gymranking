# Documento de Requisitos - App de Treinos (FitRank)

## 1) Objetivo do Documento
Centralizar e evoluir os requisitos do produto em um unico lugar, com foco nas funcionalidades principais de um app de treinos com dinamica social, ranking e acompanhamento de progresso.

Este documento e vivo: deve ser atualizado conforme novas decisoes de produto, ajustes de regra de negocio e validacoes tecnicas.

## 2) Visao do Produto
O app permite que usuarios registrem treinos, acompanhem desempenho individual e comparem consistencia com amigos em grupos, usando rankings por periodo e feed de atividade.

## 3) Perfis de Usuario
- Usuario comum
  - Cria conta, entra em grupos e registra treinos.
  - Monta seus treinos salvos e acompanha o proprio progresso.
- Administrador
  - Faz gestao de usuarios no painel administrativo.
  - Possui acesso a funcoes de suporte operacional.

## 4) Funcionalidades Principais

### 4.1 Autenticacao e Conta
- Cadastro com nome, email e senha.
- Login e logout.
- Alteracao de senha.
- Protecao de rotas para usuarios autenticados.

### 4.2 Gestao de Grupos
- Criar grupo.
- Entrar em grupo via codigo de convite.
- Selecionar grupo ativo.
- Copiar codigo de convite para compartilhamento.
- Sair de grupo.

### 4.3 Registro de Treinos
- Registrar um ou mais tipos de treino por lancamento.
- Definir data e hora do treino.
- Adicionar observacoes opcionais.
- Abrir registro retroativo ao tocar em dia vazio no calendario.
- Aplicar o registro para os grupos do usuario.

### 4.4 Treinos Salvos (Programas)
- Criar treino/programa (ex.: Treino A, Treino B).
- Adicionar atividades/exercicios ao treino com:
  - nome da atividade
  - series
  - repeticoes
  - carga (kg)
- Remover atividades.
- Excluir treino salvo.
- Reutilizar treino salvo no momento de registrar treino.

### 4.5 Calendario de Treinos
- Visualizacao mensal e anual.
- Destaque visual para dias com treino.
- Selecionar dia para ver os treinos registrados.
- Excluir treino diretamente da lista do dia.

### 4.6 Feed de Atividade e Historico
- Exibir atividade recente do grupo.
- Exibir historico pessoal no grupo.
- Paginacao de feed quando houver muitos registros.
- Exclusao de treino proprio.

### 4.7 Rankings
- Ranking por periodo:
  - semana
  - mes
  - ano
- Filtro por tipo de treino.
- Exibicao de posicao, contagem de treinos e progresso visual.

### 4.8 Progresso Fisico
- Registrar peso por data.
- Adicionar observacoes.
- Upload de foto de progresso.
- Exibir historico de registros.
- Exibir grafico de evolucao de peso.
- Remover registro de progresso.

### 4.9 Perfil e Preferencias
- Atualizar nome de exibicao.
- Atualizar foto/avatar.
- Definir tema (claro, escuro, sistema).
- Ativar/desativar notificacoes push.

### 4.10 Dieta
- Cadastrar refeicoes do plano com nome, horario e lista de itens (o que comer e quanto).
- Definir refeicao para todo dia ou para um dia da semana especifico.
- Informar kcal e macros por refeicao (opcional; a aderencia nao depende deles).
- Marcar refeicao cumprida no dia, inclusive em dia retroativo.
- Ver aderencia do dia, aderencia da semana e sequencia de dias na meta.
- Editar refeicao preservando o historico: a versao antiga continua valendo para os dias passados.
- Excluir refeicao do plano a partir de hoje, sem apagar o historico ja marcado.
- Optar por mostrar a dieta e a aderencia para quem divide grupo (opt-in, desligado por padrao).
- Ver, no perfil de um membro do grupo, a aderencia do dia, a sequencia e as refeicoes de hoje quando ele compartilha.

### 4.11 Administracao
- Listar usuarios.
- Criar usuario.
- Resetar senha de usuario.
- Excluir usuario (com protecoes basicas para evitar autoexclusao acidental).
- Exibir papeis (roles) por usuario.

### 4.12 PWA
- Prompt de instalacao do app.
- Prompt de atualizacao quando houver nova versao.

## 5) Regras de Negocio (Levantamento Inicial)
- Usuario precisa estar autenticado para acessar o app principal.
- Quase todos os fluxos dependem de um grupo selecionado.
- Ranking e feed sao calculados no contexto do grupo.
- Registro de treino sem tipo selecionado nao deve ser permitido.
- Senha deve respeitar tamanho minimo.
- Apenas o dono do treino pode excluir seu proprio registro no fluxo comum.
- Notificacoes push dependem de permissao do navegador/dispositivo.
- Dia de dieta conta como cumprido a partir de 80% das refeicoes previstas.
- Dia sem refeicao prevista nao entra na conta de aderencia nem quebra a sequencia.
- Dieta e privada por padrao: leitura pelo grupo depende do opt-in do dono.
- Dias que ainda nao aconteceram nao entram na aderencia da semana.
- O atalho de dieta no Inicio so aparece para quem tem plano cadastrado.

## 6) Requisitos Nao Funcionais (Iniciais)
- UX mobile-first e responsiva.
- Bom desempenho em listas, calendario e ranking.
- Consistencia visual em tema claro/escuro.
- Seguranca de acesso baseada em autenticacao e papeis.
- Compatibilidade com comportamento PWA (instalacao/atualizacao).

## 7) Fluxos Principais do Usuario
- Onboarding basico:
  - cadastrar/login
  - criar grupo ou entrar por codigo
  - registrar primeiro treino
- Rotina de uso:
  - registrar treino diario
  - acompanhar ranking semanal
  - consultar historico/calendario
- Evolucao pessoal:
  - registrar peso e fotos
  - acompanhar grafico de progresso

## 8) Backlog Inicial Priorizado (MoSCoW)

### Must Have
- Autenticacao completa (cadastro/login/logout).
- Criacao/entrada em grupos por codigo.
- Registro e exclusao de treino.
- Calendario com dias treinados.
- Ranking por semana.
- Tela de configuracoes basicas (perfil/senha/tema).

### Should Have
- Ranking por mes e ano.
- Filtro de ranking por tipo de treino.
- Treinos salvos com exercicios.
- Feed de atividade paginado.
- Notificacoes push.

### Could Have
- Metas personalizadas (ex.: 4 treinos/semana).
- Conquistas/gamificacao.
- Comentarios/reacoes em treinos.
- Exportacao de historico.

## 9) Criterios de Aceite do Documento
- Documento criado em Markdown no repositorio.
- Funcionalidades principais mapeadas com descricao clara.
- Regras iniciais e prioridades registradas.
- Estrutura pronta para refinamentos futuros (criterios de aceite por funcionalidade, historias de usuario e roadmap).

## 10) Fontes do Levantamento
- `src/App.tsx`
- `src/pages/Index.tsx`
- `src/components/RegisterWorkoutSheet.tsx`
- `src/components/WorkoutCalendar.tsx`
- `src/pages/Treinos.tsx`
- `src/pages/Rankings.tsx`
- `src/pages/Progresso.tsx`
- `src/pages/Settings.tsx`
- `src/pages/Admin.tsx`
