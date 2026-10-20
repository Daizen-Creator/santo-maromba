# FitTrack Personal — Sistema Inteligente de Evolução Física

Aplicativo desktop offline-first para acompanhamento de musculação, planejamento nutricional baseado em evidências, análise de evolução física e calibragem de metas corporais por médias móveis.

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
