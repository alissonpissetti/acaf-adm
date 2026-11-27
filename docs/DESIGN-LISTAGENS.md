# Premissas de design — listagens (desktop e mobile)

Referência canônica: **Operação → Parceiros** (`NetworksList` + `NetworksPage`). A **listagem densa em card** (≤1200px) — avatar + título + badge + linha secundária + menu **⋮** só — é a premissa visual padrão do admin; Empresas e novas listas operacionais devem replicá-la.

Kit compartilhado: `dense-list-table`, `DenseListRowIdentity`, `TableNetworkLogo`, `CrudRowMenu` — ver `src/styles/crud-list-responsive.css` e regra Cursor `design-listagens.mdc`.

Complementa [PREMISSAS-VISUAIS.md](./PREMISSAS-VISUAL.md) e [REFERENCIA-VISUAL.md](./REFERENCIA-VISUAL.md). Copy e marca: [PREMISSAS.md](../../PREMISSAS.md) (produto **Movly**).

---

## Objetivo

Uma listagem deve funcionar bem em **desktop** (gestão diária, muitas colunas) e em **mobile/tablet** (consulta e ações rápidas), com o **mesmo kit CRUD** (`CrudListShell`, `useCrudList`, `CrudRowActions`).

---

## Modelo desktop (≥ 1201px)

| Elemento | Padrão |
|--------|--------|
| **Page stack** | `page-stack` + opcional `crud-list-page` para ajustes de página |
| **Cabeçalho** | `PageHeader` com título, subtítulo operacional e **uma** ação primária (ex.: Adicionar) |
| **Painel** | `section.panel.crud-list-panel` — meta `N registro(s)` no `panel-header--meta-only` |
| **Toolbar** | `toolbarLayout="compact"` + `toolbarWrapClassName="crud-list-toolbar"` |
| **Tabela** | `data-table data-table-enterprise data-table-compact` + sufixo `crud-list-cards-table` (e variante `--simple` quando não há logo/seleção/menu) |
| **Colunas** | `headerHint` / `headerAbbr` para cabeçalhos truncados; `className` com largura (`data-table-col-*`) |
| **Identidade** | Coluna principal com `crud-list-identity`: título em `<strong>` + metadados secundários |
| **Colunas secundárias** | Classes `crud-col-desktop-only` — ocultas no modo card |
| **Linha clicável** | `onRowClick` ou `onEdit` — classe `data-table-row-clickable` |
| **Ações** | `CrudRowActions` na última coluna; ícones com `title` acessível |

### Toolbar compacta

- Busca, ordenação e “por página” na **mesma faixa** (`crud-list-toolbar--compact`).
- Filtros estruturados via `filterDefinitions` + chips (`fieldFilters`) quando necessário.
- Placeholder da busca descreve **todos** os campos pesquisáveis.

---

## Modelo mobile e tablet (≤ 1200px)

Breakpoint de **cards**: `1200px` (alinhado a Parceiros).

### Listagem **densa** (premissa padrão — Parceiros, Empresas, …)

| Elemento no card | Implementação |
|------------------|-----------------|
| **Avatar** | `data-table-col-logo` + `TableNetworkLogo` (quadrado com borda, inicial ou imagem) |
| **Identidade** | `data-table-col-network-name` + `DenseListRowIdentity` (título, badge de status, **uma** linha: e-mail ou CNPJ) |
| **Seleção** (opcional) | Checkbox na 1ª coluna; sem seleção: `dense-list-table--no-select` (avatar \| identidade \| ⋮) |
| **Ações** | **Somente** `CrudRowMenu` — gatilho ⋮ 2,5rem com borda; `col-actions` **oculta** no card |
| **Card** | `dense-list-table` em `table-wrap-responsive`; `tr` com radius ~14px, sombra leve, padding 0,75rem |

Desktop (≥1201px): tabela completa + `CrudRowActions` na última coluna; colunas extras com `dense-list-desktop-only`.

### Listagem **simples** (planos, modalidades, catálogos)

Abaixo de 1200px usa `crud-list-cards-table--simple`: identidade + `crud-list-identity__meta--mobile` + menu ⋮ (sem avatar obrigatório).

| Regra | Detalhe |
|-------|---------|
| **Sem thead** | Cabeçalhos somem no modo card |
| **Colunas desktop-only** | Não renderizam no card |
| **Touch** | Itens do dropdown com altura confortável; **nunca** barra expandida de ícones por linha no card |
| **Painel** | `crud-list-panel .panel-body` com padding horizontal ~0,75rem |

### Variantes de card

| Classe na tabela | Uso |
|------------------|-----|
| `crud-list-cards-table` | Base compartilhada (cards ≤1200px) |
| `crud-list-cards-table--simple` | Listas curtas (planos, catálogos) — identidade + menu ⋮ no card |
| `crud-list-cards-table--users` | Usuários — seleção, avatar, identidade, menu ⋮ |
| `dense-list-table` | **Base** do card denso (Parceiros + Empresas + futuras) |
| `dense-list-table--no-select` | Sem checkbox (ex.: Empresas) |
| `networks-partners-table` | Sufixo desktop/colunas de Parceiros |
| `companies-list-table` | Sufixo desktop/colunas de Empresas |
| `crud-list-cards-table--simple` | Catálogos curtos (não listas densas operacionais) |

---

## Checklist para nova listagem

1. [ ] `useCrudList` + `LIST_PREFERENCE_KEYS.*` para persistir busca/ordem/página
2. [ ] `CrudListShell` com `toolbarLayout="compact"` e `crud-list-toolbar`
3. [ ] `tableClassName` inclui `crud-list-cards-table` (e `--simple` se aplicável)
4. [ ] Coluna principal com `crud-list-identity`; metas mobile quando colunas somem
5. [ ] `crud-col-desktop-only` nas colunas que só fazem sentido no desktop
6. [ ] Mobile: `CrudRowMenu` + `data-table-col-row-menu`; ocultar `col-actions` no card (nunca barra expandida)
7. [ ] `emptyMessage` orientado; loading via `AppLoading`
8. [ ] Sem `window.confirm` / `alert` — usar `appConfirm` / `confirmCrudDelete`
9. [ ] CSS novo só em `index.css`, `styles/mobile.css` ou `styles/crud-list-responsive.css` — **não** CSS por página

---

## Kit catálogo compartilhado

Para listagens curtas (modalidades, planos, **Sistema**):

- `src/crud/catalogListPattern.js` — `CATALOG_LIST_SHELL_PROPS`
- `CatalogListIdentity` + `catalogListRowMenuColumn` — coluna principal e menu ⋮ mobile
- `page-stack crud-list-page` na view de lista

**Sistema (✓):** Módulos, Departamentos, Cargos, Centros de custo, Grupos, Associações. **Financeiro (parcial):** Fornecedores ✓; Planos de conta e demais telas legadas ainda em migração.

## Breakpoints (dois modos)

| Modo | Breakpoint cards | Uso |
|------|------------------|-----|
| `crud-list-cards-table` / `--simple` | **1200px** | Catálogos (planos, modalidades, sistema) |
| `dense-list-table` | **960px** | Listas operacionais densas (Parceiros, Empresas) |

## Migração gradual

Telas legadas podem manter tabela só com `data-label` (card genérico &lt; 720px) até migrarem para o breakpoint 1200px. Prioridade: **Operação** (Parceiros ✓, Planos ✓, Modalidades ✓, Usuários ✓), **Corporativo** (Empresas ✓), **Sistema** (catálogos ✓), depois financeiro e suporte.

---

## Referências de código

| Peça | Arquivo |
|------|---------|
| Listagem parceiros | `src/pages/NetworksList.jsx` |
| Shell da página | `src/pages/NetworksPage.jsx` |
| Planos (variante simples) | `src/pages/ConnectPlansPage.jsx` |
| Modalidades (variante simples) | `src/pages/ModalitiesPage.jsx` |
| Usuários (seleção + avatar) | `src/pages/UsersList.jsx` |
| Menu ⋮ de linha | `src/components/crud/CrudRowMenu.jsx` |
| Estilos compartilhados | `src/styles/crud-list-responsive.css`, `src/styles/mobile.css` |
| Shell CRUD | `src/components/crud/CrudListShell.jsx` |
| Props catálogo | `src/crud/catalogListPattern.js` |
| Identidade catálogo | `src/components/crud/CatalogListIdentity.jsx` |
| Módulos (ícone + identidade) | `src/pages/ModulesPage.jsx` |