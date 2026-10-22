# Publicação e atualizações

O repositório público `Daizen-Creator/santo-maromba` publica releases pelo GitHub Actions. O workflow gera o instalador NSIS e a versão portátil para Windows, além do manifesto `latest.yml` usado pelo `electron-updater`.

## v1.0.4

- Refeições e catálogo exibem quando os dados nutricionais são estimados ou ainda não verificados.
- SQLite armazena qualidade, referência, data e confiança da fonte; valores de fibra ausentes permanecem nulos.
- A migração v8 cria uma cópia do banco antigo antes de atualizar e tem testes para reabertura e preservação do snapshot.
- O catálogo atual ainda não atende ao requisito de 500 itens com referências verificáveis; veja `docs/FEATURE-TRACEABILITY.md`.

## v1.0.5

- Adiciona cadastro e edição local de alimentos pessoais, com macros por 100 g e rótulo explícito de dados informados pelo usuário.
- Permite buscar alimentos por nome/origem e buscar receitas por nome/ingrediente sem diferenciar acentos ou caixa.
- Salva favoritos de alimentos e receitas no SQLite; no modo PWA, salva no armazenamento local do dispositivo.
- Mantém os valores nutricionais pessoais fora da classificação de dados verificados.

## v1.0.6

- Permite marcar cada série como concluída e salvar uma sessão de treino como parcial.
- Registros antigos recebem o estado de série concluída na migração v9, sem descartar histórico.
- Séries não concluídas não contam como PR; séries realmente concluídas de uma sessão parcial continuam no histórico de cargas.

## Publicar uma versão

1. Atualize `version` em `package.json` e `package-lock.json`; a Action recusa tags divergentes.
2. Envie as alterações para `main` e crie uma tag igual à versão, com prefixo `v` (por exemplo, `v1.0.6`).
3. Envie a tag ao GitHub. A Action executa os testes, compila e publica os artefatos em GitHub Releases.
4. Distribua o instalador `Santo Maromba Setup <versão>.exe`. Instalações NSIS verificam atualizações no início do app e recebem a splash de progresso; a versão portátil não usa o auto-update.

## Uso online e offline

Os dados, treinos, receitas, fotos e mídias salvos localmente continuam disponíveis sem internet. A verificação e o download de atualizações precisam de internet, assim como a reprodução de vídeos externos do YouTube. As fotos e mídias do usuário permanecem no dispositivo.
