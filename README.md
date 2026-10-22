# FitTrack Personal — Sistema Inteligente de Evolução Física

Aplicativo desktop offline-first para acompanhamento de musculação, planejamento nutricional com origem dos dados identificada, análise de evolução física e calibragem de metas corporais por médias móveis.

---

## 🛠️ Stack Tecnológica

- **Desktop Framework:** Electron v33
- **Interface:** React 18 + TypeScript
- **Bundler & Build:** Vite 6
- **Estilização:** Tailwind CSS (Dark Mode Slate/Obsidian & Neon Athletic)
- **Ícones:** Lucide React
- **Gráficos:** Recharts
- **Persistência Local:** SQLite com driver transacional e persistência atômica em disco
- **Comunicação de Processos:** Electron IPC seguro via `contextBridge` com validação Zod
- **Testes Unitários:** Vitest

---

## 📂 Estrutura do Projeto

```text
D:/Santo Maromba/
├── dist/                          # Bundle de produção do Renderer (React/Vite)
├── dist-electron/                 # Bundle compilado do Main e Preload process
├── scripts/
│   └── copy-schema.js             # Utilitário de cópia de schema SQL para build
├── src/
│   ├── database/                  # Camada de Persistência SQLite
│   │   ├── driver.ts              # Driver de banco de dados com gravação atômica
│   │   ├── schema.sql             # Definição relacional DDL (16 tabelas e índices)
│   │   ├── migrations.ts          # Executor de versionamento e schema
│   │   ├── connection.ts          # Singleton de conexão gerenciada
│   │   └── repositories/          # Repositórios (Profile, Weight)
│   ├── domain/                    # Regras de Negócio e Cálculos Puros (Determinísticos)
│   │   ├── nutrition-calculator.ts# Mifflin-St Jeor, GET/TDEE, Macros, IMC, Água
│   │   └── weight-analytics.ts    # Média móvel de 7 dias, deltas semanais/mensais
│   ├── main/                      # Electron Main Process
│   │   ├── index.ts               # Janela, segurança (contextIsolation, sandbox)
│   │   └── ipc-handlers.ts        # Handlers IPC com validação de schemas Zod
│   ├── preload/                   # Preload seguro (contextBridge)
│   │   └── index.ts               # API tipada window.fitTrackAPI
│   ├── renderer/                  # Interface do Usuário (React)
│   │   ├── components/            # Sidebar, Header, StatCard, Modais
│   │   ├── views/                 # DashboardView, WeightHistoryView, ProfileView, CalculatorView
│   │   ├── services/api.ts        # Cliente unificado IPC com suporte a dev
│   │   ├── index.css              # Design tokens e variáveis CSS
│   │   ├── App.tsx                # Layout principal e orquestração de abas
│   │   └── main.tsx               # Ponto de montagem React DOM
│   ├── shared/                    # Tipos, contratos e validações compartilhadas
│   │   ├── types.ts               # Interfaces TypeScript completas
│   │   ├── schema.ts              # Schemas Zod para IPC e formulários
│   │   └── ipc-channels.ts        # Nomes estritos dos canais IPC
│   └── tests/                     # Testes Unitários Vitest
│       ├── nutrition-calculator.test.ts # Testes de TMB, GET, macros e IMC
│       ├── weight-analytics.test.ts     # Testes de média móvel e alertas
│       └── validation.test.ts           # Testes de schemas Zod
├── package.json
├── tsconfig.json
├── tsconfig.electron.json
└── vite.config.ts
```

---

## 🚀 Como Executar

### 1. Instalação de Dependências
```bash
npm install
```

### 2. Executar em Modo Desenvolvimento
Inicie o servidor de desenvolvimento Vite (interface e simulação de dados):
```bash
npm run dev
```

Para iniciar com a janela desktop do Electron em desenvolvimento:
```bash
npm run dev:electron
```

### 3. Executar a Suíte de Testes Unitários
```bash
npm test
```

### 4. Gerar Build de Produção
```bash
npm run build
```

### Versão instalável para celular (PWA)

O renderer pode ser servido como uma PWA instalável em Android e em navegadores iOS compatíveis. Gere os arquivos estáticos com `npm run build:renderer` e publique a pasta `dist/` em uma hospedagem HTTPS. No celular, abra o endereço publicado e use **Instalar aplicativo** ou **Adicionar à Tela de Início**. O service worker armazena a interface e os recursos já carregados para permitir reabertura offline.

O modo navegador ainda salva os dados de perfil e registros no armazenamento local daquele aparelho; as fotos do shape ficam no IndexedDB do navegador. O desktop continua usando seu SQLite em `userData`. **Esses armazenamentos ainda não sincronizam entre si.** Não migre os dados existentes esperando compartilhamento até que uma conta/backend esteja configurado e a sincronização seja validada.

### Checklist alimentar e preservação local

No plano diário, marque os ingredientes efetivamente consumidos ou informe a quantidade real. O checklist grava por data e horário, atualiza calorias e macronutrientes sem contar refeições apenas planejadas e permite desfazer, adiar ou pular. Na migração de proveniência nutricional, o desktop cria `fittrack.db.pre-v8.bak` ao lado de um banco existente antes de aplicar as novas colunas. Na PWA, esses registros ficam no armazenamento local do navegador até uma sincronização autenticada ser configurada.

### Proveniência dos alimentos

O catálogo inicial tem 39 alimentos e 200 receitas derivadas de 40 preparações-base. As receitas indicam quando usam valores estimados ou ainda não verificados. Os itens iniciais não têm referência por linha, data de coleta nem confiança documentada; por isso são classificados como `estimated` ou `unverified`, e fibras ausentes permanecem sem valor. Não trate esses dados como análise laboratorial ou rótulo confirmado. O catálogo de 500 alimentos com referências verificáveis ainda está pendente.

---

## 📊 Regras e Fórmulas Implementadas

### Taxa Metabólica Basal (TMB) — Mifflin-St Jeor
- **Homens:** `(10 × peso) + (6.25 × altura) - (5 × idade) + 5`
- **Mulheres:** `(10 × peso) + (6.25 × altura) - (5 × idade) - 161`
- **Sexo não informado:** Média neutra `(10 × peso) + (6.25 × altura) - (5 × idade) - 78` acompanhada de nota explícita de incerteza (±83 kcal).

### Gasto Energético Total (GET / TDEE)
- **Sedentário:** TMB × 1.2
- **Leve:** TMB × 1.375
- **Moderado:** TMB × 1.55
- **Muito Ativo:** TMB × 1.725
- **Extremamente Ativo:** TMB × 1.9

### Média Móvel de 7 Dias de Peso
Calculada para cada registro a partir da janela de pesagens dos 7 dias anteriores, amortecendo flutuações de retenção hídrica e glicogênio muscular.
