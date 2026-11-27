# Premissas de design — listagens (desktop e mobile)

Referência canônica: **Operação → Parceiros** (`NetworksList` + `NetworksPage`). Novas listagens densas do admin devem seguir este documento antes de inventar layout próprio.

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

Breakpoint de **cards**: `1200px` (alinhado a Parceiros). Abaixo disso a tabela vira **lista de cards** (`table-wrap-responsive` + `crud-list-cards-table`).

| Regra | Detalhe |
|-------|---------|
| **Sem thead** | Cabeçalhos de coluna somem; rótulos vêm da coluna de identidade ou de `data-label` (listas simples). |
| **Card por linha** | `tr` com borda, radius ~14px, sombra leve, padding interno |
| **Identidade no card** | Título + metas com `crud-list-identity__meta--mobile` (ex.: ID técnico, preço, e-mail) |
| **Colunas desktop-only** | Não renderizam no card — evita duplicar informação |
| **Ações** | **Sempre** menu ⋮ compacto (`CrudRowMenu` na coluna `data-table-col-row-menu`, classe `crud-col-mobile-only`). **Ocultar** a coluna `col-actions` no card — **não** usar a barra gigante de `crud-row-actions` do card genérico (`mobile.css`) |
| **Ações (desktop)** | `CrudRowActions` (ícones compactos) na última coluna — sem menu ⋮ |
| **Touch** | No menu ⋮, itens de lista com altura confortável; gatilho 2,5rem — sem barra de três botões gigantes por linha |
| **Painel** | `crud-list-panel .panel-body` com padding horizontal reduzido (~0.75rem) |

### Variantes de card

| Classe na tabela | Uso |
|------------------|-----|
| `crud-list-cards-table` | Base compartilhada (cards ≤1200px) |
| `crud-list-cards-table--simple` | Listas curtas (planos, catálogos) — identidade + menu ⋮ no card |
| `crud-list-cards-table--users` | Usuários — seleção, avatar, identidade, menu ⋮ |
| `networks-partners-table` | Parceiros — grid com logo, checkbox, menu ⋮ (não generalizar sem necessidade) |

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

## Migração gradual

Telas legadas podem manter tabela só com `data-label` (card genérico &lt; 720px) até migrarem para o breakpoint 1200px. Prioridade: **Operação** (Parceiros ✓, Planos ✓, Modalidades ✓, Usuários ✓), depois Empresas e financeiro.

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