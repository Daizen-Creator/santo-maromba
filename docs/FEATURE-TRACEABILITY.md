# Matriz de rastreabilidade — Santo Maromba

Auditoria iniciada no commit `57f0317` (versão publicada 1.0.3), realizada em 22/10/2026 a partir das duas especificações anexadas. O cadastro e os favoritos de alimentos/receitas estão implementados localmente e passam por validação para a próxima versão. O texto dos anexos é tratado como requisito, não como prova de implementação.

## Como ler

- **V — implementada e validada:** comportamento existe e há teste automatizado relevante. A maioria dos testes é de domínio/persistência; isso não significa que cada fluxo tenha teste de interface ponta a ponta.
- **P — parcial:** há parte do comportamento ou persistência, mas falta uma parte observável, integração, cobertura ou precisão.
- **A — ausente:** não há fluxo implementado no projeto.
- **B — bloqueada por dependência externa:** requer configuração/serviço externo que não existe. O usuário confirmou que Firebase e ImageKit ainda não estão configurados; nenhum serviço pago foi ativado.

### Referências de código e testes

| Código | Arquivos principais | Testes/evidência |
|---|---|---|
| PERF | `src/renderer/views/ProfileView.tsx`; `src/database/repositories/profile-repository.ts`; `src/database/schema.sql`; `src/domain/nutrition-calculator.ts` | `src/tests/nutrition-calculator.test.ts`; `src/tests/weight-analytics.test.ts`; `src/tests/validation.test.ts` |
| DIAR | `src/renderer/views/NutritionView.tsx`; `src/renderer/services/api.ts`; `src/database/repositories/daily-log-repository.ts`; `src/database/schema.sql`; `src/main/ipc-handlers.ts`; `src/preload/index.ts` | `src/tests/daily-log-persistence.test.ts`; `src/tests/daily-meal-api.test.ts`; `src/tests/meal-schedule.test.ts` |
| NUTR | `src/renderer/views/NutritionView.tsx`; `src/renderer/components/CustomFoodLibrary.tsx`; `src/database/seeds/nutrition-seeds.ts`; `src/database/repositories/nutrition-repository.ts`; `src/database/migrations.ts`; `src/database/connection.ts`; `src/domain/nutrition-calculator.ts`; `src/domain/nutrition-catalog.ts`; `src/shared/types.ts`; `src/database/schema.sql` | `src/tests/catalog-persistence.test.ts`; `src/tests/nutrition-catalog.test.ts`; `src/tests/nutrition-calculator.test.ts`; `src/tests/substitution-engine.test.ts`; `src/tests/database-migration-backup.test.ts` |
| TREI | `src/renderer/views/WorkoutView.tsx`; `src/domain/workout-engine.ts`; `src/database/repositories/workout-repository.ts`; `src/database/repositories/exercise-media-repository.ts`; `src/database/schema.sql`; `src/database/migrations.ts` | `src/tests/workout-engine.test.ts`; `src/tests/workout-media-persistence.test.ts`; `src/tests/workout-migration.test.ts` |
| SHAP | `src/renderer/views/ShapeCalendarView.tsx`; `src/renderer/views/ProjectionView.tsx`; `src/database/repositories/photo-repository.ts`; `src/database/repositories/measurement-repository.ts`; `src/services/photo-storage.ts`; `src/database/schema.sql` | `src/tests/photo-persistence.test.ts`; `src/tests/physique-projection.test.ts`; `src/tests/physique-projection-persistence.test.ts` |
| DESP | `src/renderer/views/NutritionView.tsx`; `src/domain/substitution-engine.ts`; `src/database/repositories/nutrition-repository.ts`; `src/database/schema.sql` | `src/tests/substitution-engine.test.ts`; `src/tests/catalog-persistence.test.ts` |
| DASH | `src/renderer/views/DashboardView.tsx`; `src/renderer/App.tsx`; repositories de nutrição, treino, peso e evolução | cobertura indireta pelas suítes de domínio; não há teste de dashboard ponta a ponta |
| PWA | `src/renderer/main.tsx`; `src/renderer/components/MobileNavigation.tsx`; `src/renderer/services/api.ts`; `src/renderer/services/browser-photo-store.ts`; `public/manifest.webmanifest`; `public/sw.js` | `src/tests/browser-photo-store.test.ts`; `src/tests/daily-meal-api.test.ts`; sem teste em dispositivo móvel real |
| IPC | `src/main/ipc-handlers.ts`; `src/preload/index.ts`; `src/shared/ipc-channels.ts`; `src/services/fittrack-service.ts`; `src/database/` | testes de persistência por domínio; sem teste de sincronização entre dispositivos |
| VIS | `src/renderer/views/VisualCustomizationView.tsx`; `src/domain/visual-customization.ts`; `src/services/customization-media-storage.ts`; `src/database/repositories/customization-repository.ts` | `src/tests/visual-customization.test.ts`; `src/tests/visual-customization-persistence.test.ts` |
| NENHUM | Não há serviço/tela/handler correspondente no estado auditado. | Sem teste correspondente. |

## Funcionalidades 1–20 — perfil, corpo e objetivos

| ID | Comportamento verificável (critério de aceitação) | Arquivos | Dependência | Estado / teste |
|---:|---|---|---|---|
| 1 | Editar perfil e reabrir com os mesmos dados. | PERF | — | V · validação/perfil parcial |
| 2 | Alternar kg/lb e ver valores convertidos sem alterar o valor original. | PERF | — | A · sem teste |
| 3 | Registrar pesagens com data e consultar histórico. | PERF | — | V · `weight-analytics.test.ts` |
| 4 | Salvar objetivo físico e manter após reiniciar. | PERF | — | V · persistência do perfil |
| 5 | Definir peso-alvo e compará-lo ao peso atual. | PERF | — | V · cálculo/perfil |
| 6 | Revisar metas com registro datado da alteração. | PERF | — | P · meta existe, histórico de revisão ausente |
| 7 | Escolher atividade e recalcular GET. | PERF | — | V · `nutrition-calculator.test.ts` |
| 8 | Calcular idade válida pela data de nascimento. | PERF | — | V · `nutrition-calculator.test.ts` |
| 9 | Registrar e consultar mudanças de altura por data. | PERF | — | A · só altura atual no perfil |
| 10 | Registrar rotina diária e usá-la no planejamento. | PERF | — | P · perfil guarda campos, regra incompleta |
| 11 | Definir dias disponíveis e adaptar a divisão de treino. | PERF; TREI | — | P · gerador existe, sem editor persistente completo |
| 12 | Salvar alergias/restrições e excluir receitas incompatíveis. | PERF; NUTR | — | P · dados de perfil não filtram o catálogo |
| 13 | Salvar preferências e aplicá-las às sugestões. | PERF; NUTR | — | P · preferências não filtram receitas |
| 14 | Selecionar 3–6 refeições e gerar exatamente essa quantidade. | PERF; DIAR | — | V · `meal-schedule.test.ts` |
| 15 | Calcular meta calórica a partir de dados válidos do perfil. | PERF | — | V · `nutrition-calculator.test.ts` |
| 16 | Calcular meta diária de proteína. | PERF | — | V · `nutrition-calculator.test.ts` |
| 17 | Definir prazo e acompanhar progresso até a data. | PERF | — | A · sem prazo de objetivo |
| 18 | Definir porções padrão e aplicá-las às refeições. | PERF; NUTR | — | P · porções de receitas são fixas |
| 19 | Escrever, salvar e consultar diário pessoal por data. | PERF | — | A · sem diário pessoal |
| 20 | Consultar histórico de objetivos anteriores. | PERF | — | A · sem histórico de objetivos |

## Funcionalidades 21–40 — alimentação e checklist

| ID | Comportamento verificável (critério de aceitação) | Arquivos | Dependência | Estado / teste |
|---:|---|---|---|---|
| 21 | Entender alimento e quantidade escritos em português natural. | DIAR | serviço de linguagem/IA para interpretação robusta | P · existe texto manual, sem interpretação |
| 22 | Classificar registro por café, almoço, lanche, jantar ou ceia. | DIAR | — | P · slots existem; classificação manual limitada |
| 23 | Distinguir itens planejados dos realmente consumidos. | DIAR | — | V · `daily-meal-api.test.ts` |
| 24 | Registrar gramas parciais e recalcular totais consumidos. | DIAR; NUTR | — | V · `daily-log-persistence.test.ts` |
| 25 | Favoritar alimento e consultá-lo em lista própria. | NUTR | — | V · catálogo mantém favoritos no SQLite/PWA e filtra a lista; testes `catalog-persistence.test.ts` e `daily-meal-api.test.ts` |
| 26 | Copiar refeições de uma data para outra. | DIAR | — | A · sem fluxo de cópia |
| 27 | Editar ingredientes/quantidades e atualizar macros. | DIAR; NUTR | — | P · macros parciais recalculam; edição do plano incompleta |
| 28 | Excluir um lançamento e desfazer a exclusão. | DIAR | — | P · checklist pode voltar a pendente; exclusão/undo de histórico ausente |
| 29 | Guardar data e hora real do consumo. | DIAR | — | P · data/slot e horário de conclusão, sem hora de cada item |
| 30 | Anexar e reabrir foto de refeição. | DIAR; IPC | — | A · sem mídia de refeições |
| 31 | Identificar claramente dado confirmado versus estimado. | NUTR; DIAR | proveniência nutricional completa | P · rótulo de estimado/não verificado aparece no catálogo e checklist; fontes não têm referências comprováveis |
| 32 | Pesquisar lançamentos antigos por texto e período. | DIAR | — | A · sem busca do histórico alimentar |
| 33 | Percorrer linha do tempo alimentar por dia. | DIAR | — | A · só checklist do dia atual |
| 34 | Salvar e reaplicar modelos de refeições. | DIAR; NUTR | — | A · sem modelos de usuário |
| 35 | Cadastrar alimento caseiro com ingredientes e macros. | NUTR | — | A · sem cadastro de alimento pela interface |
| 36 | Ler código de barras e localizar produto. | NUTR | API/base de produtos (ex.: Open Food Facts) | B · serviço de barcode não configurado |
| 37 | Converter unidade doméstica para massa com hipótese explícita. | NUTR | densidade/tabela de medidas verificadas | A · sem conversor geral |
| 38 | Registrar sobras e ajustar o consumido real. | DIAR | — | A · sem registro de sobras |
| 39 | Consultar alimentos usados recentemente. | NUTR | — | A · sem lista de recentes |
| 40 | Contar estados pendente, consumido, parcial, adiado e pulado. | DIAR | — | P · filtros/contagem limitada; sem resumo completo de estados |

## Funcionalidades 41–60 — cálculo nutricional

| ID | Comportamento verificável (critério de aceitação) | Arquivos | Dependência | Estado / teste |
|---:|---|---|---|---|
| 41 | Calcular kcal por ingrediente e quantidade em gramas. | NUTR | — | V · fórmula por 100 g e `nutrition-calculator.test.ts` |
| 42 | Calcular proteínas, carboidratos e gorduras por porção. | NUTR | — | V · testes de cálculo e receitas |
| 43 | Somar fibras sem transformar dado ausente em zero. | NUTR | migração para nutrientes anuláveis | V · SQLite guarda ausência como `NULL`, preserva fibra explicitamente igual a zero; persistência coberta por `catalog-persistence.test.ts` |
| 44 | Calcular sódio quando a fonte informar. | NUTR | base com sódio verificado | A · campo ausente |
| 45 | Mostrar vitaminas/minerais somente quando verificados. | NUTR | base nutricional verificada | A · campos ausentes |
| 46 | Mostrar referência exata e data da fonte nutricional. | NUTR | metadados de fontes | P · campos e rótulo de origem existem; seeds ainda não têm referência/data por item |
| 47 | Mostrar confiabilidade e dados faltantes por alimento. | NUTR | metadados de confiança | P · exibe desconhecida/estimada; sem nível de confiança documentado |
| 48 | Recalcular macros ao alterar a porção planejada. | NUTR; DIAR | — | P · cálculo existe, edição da porção no plano falta |
| 49 | Converter medidas com densidade explícita para líquidos. | NUTR | dados de densidade confiáveis | A · sem conversão por unidade |
| 50 | Diferenciar cru, cozido, drenado e preparo equivalente. | NUTR | dados de preparo verificados | P · só flag cru/cozido |
| 51 | Calcular nutrientes por rendimento/peso final da receita. | NUTR | peso final/rendimento da receita | A · receita não registra rendimento |
| 52 | Atualizar total diário ao salvar consumo. | NUTR; DIAR | — | V · `daily-meal-api.test.ts` |
| 53 | Exibir saldo restante das metas diárias. | NUTR; DASH | — | V · cálculo/dados do dashboard |
| 54 | Comparar planejado e consumido por refeição. | DIAR; NUTR | — | P · checklist separa estados; comparação detalhada incompleta |
| 55 | Calcular médias nutricionais diária e semanal. | NUTR; DASH | — | A · analytics de peso não cobrem nutrientes |
| 56 | Exibir distribuição real de nutrientes por refeição. | NUTR; DIAR | — | P · slots e totais existem, sem relatório de distribuição |
| 57 | Configurar faixas de metas e medir aderência. | NUTR; PERF | — | P · metas pontuais, sem faixa configurável |
| 58 | Alertar quando fonte ou nutriente necessário estiver ausente. | NUTR | proveniência completa | P · alerta para dados não verificados; sem alerta por nutriente ausente |
| 59 | Calcular custo por porção e por grama de proteína. | NUTR; DESP | preços atuais/usuário | P · custos fixos estimados, sem custo por proteína |
| 60 | Testar fórmulas, arredondamentos e conversões. | NUTR | — | P · testes de macros/calorias; conversões ausentes |

## Funcionalidades 61–80 — alimentos e receitas

| ID | Comportamento verificável (critério de aceitação) | Arquivos | Dependência | Estado / teste |
|---:|---|---|---|---|
| 61 | Buscar receitas/alimentos por texto. | NUTR | — | V · busca sem acentos/caixa no nome de receitas, ingredientes e catálogo de alimentos; `nutrition-catalog.test.ts` |
| 62 | Consultar itens com referências TBCA/TACO rastreáveis. | NUTR | dados e termos de uso das bases | P · rótulo de fonte sem referência comprovada |
| 63 | Diferenciar marcas e rótulos de produtos embalados. | NUTR | catálogo de marcas/rótulos | A · sem campos de marca |
| 64 | Localizar produto pelo barcode. | NUTR | API/base externa de barcode | B · integração não configurada |
| 65 | Criar/editar alimento pessoal no SQLite. | NUTR; IPC | — | V · formulário, IPC validado por schema e persistência/reabertura testadas em `catalog-persistence.test.ts` |
| 66 | Encontrar alimento pelos sinônimos cadastrados. | NUTR | dados de sinônimos | A · sem campo de sinônimos |
| 67 | Favoritar alimentos/receitas e filtrar favoritos. | NUTR; IPC | — | V · favoritos persistem no SQLite e no armazenamento local da PWA; catálogo de receitas e alimentos tem filtro; `catalog-persistence.test.ts` e `daily-meal-api.test.ts` |
| 68 | Consultar itens recentemente usados. | NUTR; DIAR | — | A · sem histórico de recentes |
| 69 | Sugerir possíveis duplicatas por nome/código. | NUTR | índice de barcode para produtos | P · IDs são únicos; detecção semântica ausente |
| 70 | Armazenar e distinguir nutrientes de rótulo. | NUTR | usuário informa o rótulo | P · uma fonte textual, sem estrutura de rótulo |
| 71 | Identificar foto real versus imagem ilustrativa. | NUTR | atribuição/licença das imagens | P · imagens ilustrativas repetidas sem rótulo claro |
| 72 | Exibir ingredientes e quantidades por receita. | NUTR | — | V · `catalog-persistence.test.ts` |
| 73 | Exibir preparo passo a passo. | NUTR | — | V · instruções persistidas e teste de catálogo |
| 74 | Exibir tempo estimado de preparo. | NUTR | — | V · campo persistido |
| 75 | Definir rendimento e número de porções. | NUTR | — | A · schema sem rendimento |
| 76 | Calcular nutrição por porção usando rendimento. | NUTR | — | P · soma da receita existe, porção/rendimento não |
| 77 | Sugerir substituições compatíveis nutricionalmente. | NUTR | grupos de equivalência do catálogo | V · `substitution-engine.test.ts` |
| 78 | Filtrar receitas por categoria e restrições do perfil. | NUTR; PERF | — | P · categoria existe; preferências não filtram |
| 79 | Mostrar custo atualizado e estimado por porção. | NUTR | preços definidos pelo usuário | P · preços base fixos e estimados |
| 80 | Avaliar receita, favoritar e salvar observações. | NUTR | — | A · sem fluxo de avaliação/notas |

## Funcionalidades 81–100 — treino e exercícios

| ID | Comportamento verificável (critério de aceitação) | Arquivos | Dependência | Estado / teste |
|---:|---|---|---|---|
| 81 | Ver treinos previstos num calendário semanal. | TREI; DASH | — | P · divisão e datas existem, sem calendário semanal completo |
| 82 | Criar e editar divisão de treino personalizada. | TREI | — | A · divisão é gerada automaticamente |
| 83 | Pesquisar biblioteca de exercícios. | TREI | — | V · seed e biblioteca de 112 exercícios |
| 84 | Filtrar por músculo e equipamento. | TREI | — | V · filtros presentes |
| 85 | Abrir mídia demonstrativa licenciada por exercício. | TREI | mídia própria/licença de conteúdo | P · upload local; parte dos links abre busca genérica |
| 86 | Registrar séries e repetições realizadas. | TREI | — | V · `workout-media-persistence.test.ts` |
| 87 | Registrar carga separada por série. | TREI | — | V · persistência de cargas |
| 88 | Iniciar cronômetro de descanso pelo intervalo do exercício. | TREI | — | V · timer visual usa o intervalo do plano e encerra com aviso; `rest-timer.test.ts` |
| 89 | Registrar RPE ou RIR por série. | TREI | — | P · RPE existe; RIR não |
| 90 | Salvar e reabrir observação do exercício/sessão. | TREI | — | P · campo parcial, fluxo de notas não cobre tudo |
| 91 | Marcar cada série como concluída. | TREI | — | V · checkbox salva o estado por série; migração v9 mantém séries antigas como concluídas; teste de reabertura |
| 92 | Salvar sessão parcial sem declará-la completa. | TREI | — | V · ação dedicada persiste a sessão com status parcial, mantém séries concluídas e não marca PR para série não feita; teste de reabertura |
| 93 | Comparar execução atual com sessão anterior. | TREI | — | A · histórico/PR existe, comparação dedicada não |
| 94 | Detectar recorde pessoal automaticamente. | TREI | — | V · PRs no histórico/repositório |
| 95 | Somar volume de treino por exercício/sessão. | TREI | — | V · volume calculado no motor/repositório |
| 96 | Oferecer alternativa compatível ao exercício. | TREI | — | V · engine conhece grupos/músculos |
| 97 | Gerar treino em casa sem halteres. | TREI | — | P · biblioteca contém exercícios corporais, sem filtro/plano dedicado |
| 98 | Salvar e reaplicar modelos de treino. | TREI | — | A · sem modelos de usuário |
| 99 | Medir duração efetiva da sessão. | TREI | — | V · duração persistida |
| 100 | Agendar deload e distinguir descanso de sessão perdida. | TREI | — | P · recuperação ativa existe, deload não |

## Funcionalidades 101–120 — shape e evolução

| ID | Comportamento verificável (critério de aceitação) | Arquivos | Dependência | Estado / teste |
|---:|---|---|---|---|
| 101 | Salvar e consultar fotos frontais por data. | SHAP | armazenamento local | V · `photo-persistence.test.ts` |
| 102 | Salvar e consultar fotos de costas. | SHAP | armazenamento local | V · persistência de fotos |
| 103 | Salvar fotos laterais com pose identificada. | SHAP | armazenamento local | V · poses no schema |
| 104 | Vincular data informada e timestamp do arquivo. | SHAP | — | P · data existe; horário original da captura não é garantido |
| 105 | Navegar calendário mensal e ver dias com fotos. | SHAP | — | V · calendário mensal implementado; sem teste de UI dedicado |
| 106 | Comparar duas fotos lado a lado ou sobrepostas. | SHAP | — | V · comparador implementado; persistência de fotos testada |
| 107 | Mostrar instruções de iluminação/enquadramento. | SHAP | — | V · instruções na tela |
| 108 | Mostrar peso corporal associado à data da foto. | SHAP | — | P · associação por data, sem snapshot imutável do peso |
| 109 | Registrar medida da cintura com data. | SHAP | — | V · persistência de medidas |
| 110 | Criar medidas corporais personalizadas. | SHAP | — | A · conjunto de campos fixos |
| 111 | Comparar evolução de medidas em gráfico. | SHAP | — | P · histórico/tabular presente, gráfico de medidas incompleto |
| 112 | Adicionar e editar notas nas fotos. | SHAP | — | V · update de notas e persistência local |
| 113 | Selecionar duas datas e comparar as fotos correspondentes. | SHAP | — | V · seletor A/B por foto com data/pose |
| 114 | Exportar relatório visual de evolução. | SHAP | — | P · comparação visual existe; exportação não comprovada |
| 115 | Restringir acesso às fotos por usuário autenticado. | SHAP; IPC | autenticação/ACL (Firebase) | B · sem conta/configuração de autenticação |
| 116 | Baixar original e excluir foto com confirmação. | SHAP; IPC | — | P · exclusão confirmada existe; download original não exposto |
| 117 | Programar lembrete de fotos. | SHAP | notificações do sistema | A · sem lembrete |
| 118 | Definir e acompanhar marcos de evolução. | SHAP | — | A · sem marcos |
| 119 | Organizar fotos por pose e período. | SHAP | — | V · pose/data e calendário |
| 120 | Não inferir BF% por foto; sinalizar estimativa manual. | SHAP; NUTR | — | V · gordura é entrada manual, não análise automática |

## Funcionalidades 121–140 — planejamento, despensa e compras

| ID | Comportamento verificável (critério de aceitação) | Arquivos | Dependência | Estado / teste |
|---:|---|---|---|---|
| 121 | Gerar e salvar plano de refeições semanal. | NUTR; DESP | — | A · sem planejador semanal |
| 122 | Reordenar refeições do plano e persistir ordem. | NUTR; DIAR | — | A · sem editor do plano |
| 123 | Sugerir receitas usando itens existentes na despensa. | DESP | — | P · ranking por estoque, inclui receitas sem correspondência |
| 124 | Excluir receitas com ingredientes indisponíveis. | DESP | — | A · filtro de disponibilidade estrito ausente |
| 125 | Montar lista de compras a partir do plano. | DESP | — | A · sem lista de compras |
| 126 | Somar ingredientes repetidos numa lista de compras. | DESP | — | A · depende da lista não implementada |
| 127 | Cadastrar e consultar estoque por alimento/quantidade. | DESP | — | P · despensa local existe, fluxo/validação limitado |
| 128 | Descontar estoque após consumo confirmado. | DESP; DIAR | — | A · sem decremento automático |
| 129 | Salvar validade e alertar antes do vencimento. | DESP | — | A · sem validade |
| 130 | Calcular custo estimado por refeição. | NUTR; DESP | preços locais confiáveis | P · cálculo existe com preços estimados fixos |
| 131 | Definir orçamento por período. | DESP | — | A · sem orçamento |
| 132 | Atualizar preços e guardar data/fonte. | DESP; NUTR | entrada do usuário ou fonte de preços | P · preço estimado estático |
| 133 | Calcular custo por grama de proteína. | DESP; NUTR | preço e nutrientes confiáveis | A · sem cálculo específico |
| 134 | Adaptar plano ao orçamento definido. | DESP; NUTR | orçamento/preços | A · sem otimizador por orçamento |
| 135 | Oferecer substituição nutricional compatível. | DESP; NUTR | dados de equivalência | V · `substitution-engine.test.ts` |
| 136 | Priorizar receitas para aproveitar sobras. | DESP | — | A · sem controle de sobras |
| 137 | Marcar produtos comprados na lista. | DESP | — | A · sem lista de compras |
| 138 | Classificar itens de compra/despensa por categoria. | DESP | — | P · categorias de alimento existem, fluxo de compras não |
| 139 | Consultar gastos por período. | DESP | preços e compras persistidos | A · sem histórico de gastos |
| 140 | Programar preparo de refeições no calendário. | DESP | — | A · sem calendário de preparo |

## Funcionalidades 141–160 — assistente

| ID | Comportamento verificável (critério de aceitação) | Arquivos | Dependência | Estado / teste |
|---:|---|---|---|---|
| 141 | Interpretar mensagem livre como intenção alimentar/treino. | NENHUM | provedor de IA ou parser local especificado | B · nenhum provedor/parsing configurado |
| 142 | Perguntar a quantidade quando a mensagem for ambígua. | NENHUM | provedor de IA/parser | B · assistente ausente |
| 143 | Distinguir alimento mencionado, planejado e consumido. | DIAR | — | P · estados do checklist distinguem plano/consumo; sem interpretação textual |
| 144 | Corrigir registro por uma mensagem curta e atualizar histórico. | NENHUM | provedor de IA/parser | B · assistente ausente |
| 145 | Resumir consumo registrado do dia. | DIAR; DASH | — | V · totais/revisão diária persistidos |
| 146 | Informar saldo calórico e de macros do dia. | NUTR; DASH | — | P · meta e totais existem; explicação no assistente não |
| 147 | Sugerir refeições com base na despensa real. | DESP | — | P · motor determinístico existe, não usa preferências/restrições completas |
| 148 | Analisar foto de refeição, pedir confirmação e só então registrar. | NENHUM | visão computacional/provedor de IA | B · integração não configurada |
| 149 | Identificar produto por barcode durante a conversa. | NENHUM | API de barcode | B · serviço não configurado |
| 150 | Responder perguntas com base no histórico real do usuário. | NENHUM | provedor de IA + camada de contexto local segura | B · assistente ausente |
| 151 | Gerar resumo semanal conversacional a partir dos registros. | NENHUM | provedor de IA (ou relatório local) | B · assistente ausente |
| 152 | Explicar sugestão com registros e cálculo que a sustentam. | NENHUM | provedor de IA/contexto | B · sem assistente explicativo |
| 153 | Planejar amanhã a partir de metas e estoque. | NENHUM; DESP | provedor de IA para conversa | P · motor de despensa parcial, sem planejamento amanhã |
| 154 | Substituir ingrediente e recalcular a receita antes de salvar. | NUTR; DESP | — | P · motor substitui; confirmação e edição de receita limitadas |
| 155 | Pedir confirmação antes de apagar dados. | SHAP; DIAR | — | P · fotos confirmam; demais exclusões não implementadas |
| 156 | Informar origem do dado usado na resposta. | NUTR; NENHUM | proveniência + assistente | P · fonte textual existe, não aparece na resposta/UI |
| 157 | Identificar valores estimados e separados dos confirmados. | NUTR; NENHUM | proveniência estruturada | P · catálogo/checklist rotula estimados e não verificados; assistente ausente |
| 158 | Oferecer ditado/resposta por voz com controle do usuário. | NENHUM | serviço de voz/dispositivo | B · integração não configurada |
| 159 | Salvar, consultar e excluir conversas respeitando privacidade. | NENHUM | assistente e política de retenção | B · sem conversas/assistente |
| 160 | Limitar e mostrar consumo/custo do provedor de IA. | NENHUM | provedor de IA e cotas configuradas | B · provedor não escolhido/configurado |

## Funcionalidades 161–180 — hábitos, sono e recuperação

| ID | Comportamento verificável (critério de aceitação) | Arquivos | Dependência | Estado / teste |
|---:|---|---|---|---|
| 161 | Registrar água diária e recuperar após reiniciar. | PERF; DIAR | — | V · `daily-log-persistence.test.ts` |
| 162 | Calcular meta de água por peso e exibir progresso. | PERF; DASH | — | P · cálculo existe; validação clínica/configuração limitada |
| 163 | Registrar sono por data. | NENHUM | — | A · horário de perfil não é diário de sono |
| 164 | Registrar duração e consultar histórico de sono. | NENHUM | — | A · sem registro de sono |
| 165 | Registrar nível de energia diário. | NENHUM | — | A · sem campo/fluxo |
| 166 | Registrar desconforto e recuperação por treino. | TREI | — | P · notas genéricas, sem escala/histórico estruturado |
| 167 | Registrar sintoma sem fornecer diagnóstico. | NENHUM | — | A · sem fluxo |
| 168 | Registrar passos manualmente ou integrar dispositivo. | NENHUM | integração opcional com dispositivo | B · fonte de passos não configurada |
| 169 | Definir horários de lembrete por hábito. | NENHUM | notificações locais | A · sem agenda |
| 170 | Pedir consentimento e controlar notificações. | NENHUM | permissão do sistema | A · sem implementação de notificações |
| 171 | Mostrar sequência sem punir dias perdidos. | NENHUM | — | A · sem sequência de hábitos |
| 172 | Distinguir descanso planejado de treino não realizado. | TREI | — | P · dias de recuperação existem, falta registrar treino perdido |
| 173 | Registrar suplementos consumidos. | DIAR; NUTR | — | A · suplemento só aparece como categoria de alimento |
| 174 | Registrar dose/quantidade e consultar histórico de suplementos. | DIAR; NUTR | — | A · sem histórico específico |
| 175 | Marcar aquecimento concluído por treino. | TREI | — | A · sem checklist de aquecimento |
| 176 | Marcar volta à calma concluída. | TREI | — | A · sem checklist |
| 177 | Gerar revisão semanal de treino, alimentação e hábitos. | DASH | — | A · sem relatório semanal combinado |
| 178 | Mostrar associações exploratórias sem alegar causalidade. | DASH | dados longitudinais suficientes | A · sem análise de associação |
| 179 | Pausar metas/treinos por doença e retomar depois. | PERF; TREI | — | A · sem estado de pausa |
| 180 | Criar hábitos personalizados e registrar conclusão. | NENHUM | — | A · sem módulo de hábitos |

## Funcionalidades 181–200 — plataformas, segurança e relatórios

| ID | Comportamento verificável (critério de aceitação) | Arquivos | Dependência | Estado / teste |
|---:|---|---|---|---|
| 181 | Entrar com Google e recuperar conta. | IPC; PWA | Firebase Authentication/Google habilitado | B · projeto Firebase não configurado |
| 182 | Usar a mesma conta no desktop e celular. | IPC; PWA | autenticação + backend compartilhado | B · serviço compartilhado ausente |
| 183 | Instalar PWA em navegador compatível. | PWA | hospedagem HTTPS | P · manifest/service worker existem; sem hospedagem e teste em aparelho |
| 184 | Propagar alteração real entre dispositivos. | IPC; PWA | Firestore ou backend compartilhado | B · nenhum backend configurado |
| 185 | Enfileirar alteração offline e sincronizar ao reconectar. | PWA; IPC | backend e identidade de conta | B · armazenamento offline existe, fila de sync não |
| 186 | Resolver conflito sem sobrescrever silenciosamente. | IPC; PWA | protocolo de sincronização | B · sync ausente |
| 187 | Isolar toda leitura/escrita pela conta autenticada. | IPC | Firebase rules/backend com ACL | B · autenticação/backend ausentes |
| 188 | Enviar foto ao ImageKit com assinatura protegida. | IPC | ImageKit + Worker de assinatura | B · endpoint/Worker não configurados |
| 189 | Abrir imagem remota privada com URL temporária autorizada. | IPC; SHAP | ImageKit privado + autenticação | B · serviço não configurado |
| 190 | Exportar backup e restaurar com validação e confirmação. | IPC | armazenamento local acessível | P · cópia automática pré-migração; sem exportar/restaurar pelo usuário |
| 191 | Exportar histórico em CSV legível. | NENHUM | — | A · sem exportação CSV |
| 192 | Gerar relatório PDF com fotos e métricas. | NENHUM | biblioteca/renderização local | A · sem exportação PDF |
| 193 | Exportar dados do usuário em JSON e reimportá-los. | VIS; NENHUM | — | P · JSON exporta só personalização; importação ausente |
| 194 | Reorganizar cards/gráficos do dashboard e persistir. | DASH; VIS | — | A · personalização visual não edita dashboard |
| 195 | Buscar globalmente em alimentos, treinos e histórico. | NUTR; TREI | — | A · busca restrita a partes do catálogo |
| 196 | Consultar histórico de notificações enviadas. | NENHUM | notificações locais | A · notificações ausentes |
| 197 | Alternar tema claro/escuro e preservar escolha. | VIS | — | V · testes de personalização |
| 198 | Usar fluxos críticos por teclado e toque com rótulos acessíveis. | PWA; VIS; PERF | dispositivos móveis/navegadores para validação total | P · responsividade e alguns rótulos; sem auditoria completa de acessibilidade |
| 199 | Executar testes de fluxos críticos e regressão no CI. | `.github/workflows/release.yml`; `src/tests/` | — | P · 58 testes passam no CI; sem E2E para os 200 requisitos |
| 200 | Mostrar estado de conexão, sync, login e integrações. | PWA; IPC | backend/contas para estado real | A · sem painel diagnóstico |

## Requisitos adicionais do catálogo nutricional

| ID | Critério de aceitação | Arquivos | Dependência | Estado / teste |
|---|---|---|---|---|
| CAT-01 | Seed contém ao menos 500 alimentos/preparações distintos, não variantes artificiais. | NUTR | dados licenciados/verificáveis | A · hoje são 39 alimentos + 200 variantes geradas de 40 receitas-base |
| CAT-02 | Cada nutriente traz referência, data, confiança e origem; ausências são nulas. | NUTR | TBCA/TACO, rótulos ou fonte identificável | P · schema agora guarda qualidade/referência/data/confiança e fibra ausente como NULL; seeds seguem sem fonte verificável e micros ainda não existem |
| CAT-03 | Identidade suporta sinônimo, marca, barcode e estado de preparo. | NUTR | catálogo externo opcional | A · campos ausentes |
| CAT-04 | Cálculo por porção usa `valor/100g × gramas/100` e mantém nutrientes ausentes. | NUTR | — | P · macros em gramas existem e fibra sem dado fica NULL; conversões/micros não existem |
| CAT-05 | Conversões de ml/unidade usam densidade/medida cadastrada, nunca densidade presumida. | NUTR | dados de conversão verificados | A · sem conversor |
| CAT-06 | Receita guarda ingredientes, quantidades, instruções e rendimento. | NUTR | — | P · ingredientes/instruções existem; rendimento não |
| CAT-07 | Nutrição por porção deriva do total e rendimento da receita. | NUTR | dados de rendimento | A · sem rendimento |
| CAT-08 | Atualizar catálogo preserva snapshots nutricionais dos registros históricos. | DIAR; NUTR | migração/snapshot do diário | P · totais do checklist são persistidos; demais históricos não têm snapshot completo |
| CAT-09 | Detectar alimento incompleto ou duplicata semântica antes de salvar. | NUTR | — | A · sem detector |
| CAT-10 | Recalcular prato e total diário após edição de quantidades. | NUTR; DIAR | — | P · parcial no checklist; editar receita/plano não |
| CAT-11 | Testar cálculo por 100 g e conversão/porções. | NUTR | — | P · macro/caloria testados; conversão sem teste porque não existe |
| CAT-12 | Testar nutrientes nulos, importação, não encontrado, duplicatas e persistência SQLite. | NUTR | — | P · testes cobrem qualidade, fibra NULL, migração e SQLite; importação/deduplicação ainda ausentes |
| CAT-13 | Exibir alimento, quantidade, fonte e resultado antes de confirmar lançamento. | DIAR; NUTR | proveniência completa | P · fluxo de checklist salva; prévia/fonte confirmada incompletas |

## Resultado da validação desta versão

- `npm test`: 72/72 testes aprovados localmente; inclui migração v9, alimentos pessoais, favoritos, busca nutricional, sessões parciais e cronômetro.
- `npm run build`: build de renderer e Electron aprovado após o timer de descanso.
- Instalador NSIS e portable 1.0.4: publicados; smoke test do portable criou `fittrack.db` num perfil temporário isolado.
- Portable 1.0.5: empacotado e smoke test de 12 segundos criou `fittrack.db` num perfil isolado.
- Portable 1.0.6: abriu por 12 segundos e criou `fittrack.db` num perfil isolado.
- Portable 1.0.7: abriu por 12 segundos e criou `fittrack.db` num perfil isolado.
- GitHub Actions e release 1.0.4: testes, build, instalador NSIS, portable e manifesto do auto-update publicados com sucesso (workflow 39721903982).
- Release 1.0.4: https://github.com/Daizen-Creator/santo-maromba/releases/tag/v1.0.4.
- GitHub Actions e release 1.0.5: testes, build, instalador NSIS, portable e manifesto do auto-update publicados com sucesso (workflow 39723144455).
- Release 1.0.5: https://github.com/Daizen-Creator/santo-maromba/releases/tag/v1.0.5.
- GitHub Actions e release 1.0.6: testes, build, instalador NSIS, portable e manifesto do auto-update publicados com sucesso (workflow 39723951888).
- Release 1.0.6: https://github.com/Daizen-Creator/santo-maromba/releases/tag/v1.0.6.
- Incremento 1.0.7: 72 testes e build locais passaram; empacotamento e publicação ainda pendentes.
- Firebase/ImageKit: não configurados; não há sincronização real, login compartilhado ou upload remoto para testar.

## Incremento implementado após a auditoria

- IDs **31, 46, 47, 58 e 157** receberam tratamento de transparência/proveniência, ainda **parcial**: qualidade, origem declarada, referência, data e confiança têm campos persistentes; a interface marca valores estimados/não verificados.
- IDs **CAT-02, CAT-04, CAT-12 e CAT-13** avançaram parcialmente. Os seeds ainda não têm referências rastreáveis por item, densidade, micronutrientes ou 500 cadastros verificados, então esses critérios permanecem incompletos.
- IDs **61, 65 e 67** estão concluídos e validados: busca de receitas/alimentos; cadastro e edição de alimento pessoal com rótulo de origem e persistência; favoritos e filtros de favoritos para receitas e alimentos no SQLite/PWA.
- IDs **88, 91 e 92** estão concluídos e validados: cronômetro de descanso; marcação persistente por série; salvamento de sessão parcial sem tratá-la como treino concluído.
- A migração **v8** salva cópia pré-migração somente quando um banco antigo ainda precisa da alteração. Testes cobrem a cópia do banco v7 e evitam snapshots falsamente chamados de pré-migração em banco novo.

## Próximas etapas sugeridas

1. Núcleo nutricional: proveniência verificável, nutrientes anuláveis, conversões/rendimento e correção dos 19 registros estimados para que não apareçam como valores confirmados; depois expandir o catálogo com fontes verificadas.
2. Planejamento, estoque, relatórios e assistente, com fluxos persistentes e testes pertinentes.
3. Firebase/ImageKit e sincronização entre dispositivos somente depois de configurar as dependências externas; então testar alteração real desktop ↔ celular, offline/reconexão e permissões.
