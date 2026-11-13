# Premissas Visuais — Painel Admin (resumo executivo)

Documento complementar à [Referência Visual completa](./REFERENCIA-VISUAL.md). Use este arquivo como **checklist rápido** em reviews de UI e planejamento de telas.

Nome do produto e regras de copy: [Premissas do workspace](../../PREMISSAS.md) (Movly; CONNECT é codinome morto).

---

## Identidade

- Console **enterprise** de gestão operacional da plataforma.
- Marca: **laranja `#e8881c`** como acento; base **neutra fria** (cinzas + branco).
- Sidebar **escura** = navegação entre módulos; área de conteúdo **clara** = trabalho.

---

## Regras inegociáveis

1. **Um módulo por contexto na sidebar** — ao ativar um módulo, os **itens** aparecem logo abaixo na mesma coluna (acordeão / árvore), sem segunda barra em cima do conteúdo.
2. **Uma ação primária dominante** por bloco (header ou formulário).
3. **Toda listagem** tem empty state + tratamento de erro + loading.
4. **Toda escrita** respeita permissão `.manage` no frontend e guard no backend.
5. **Rotas novas** seguem `/m/:modulo/:item`.
6. **Reutilizar classes** de [`index.css`](../src/index.css) — não criar CSS ad hoc por página.
7. **Textos em português** operacional (não técnico demais, não marketing).

---

## Hierarquia visual

```
Marca / ambiente logado
  → Módulo ativo (sidebar)
    → Item ativo (sidebar, sob o módulo)
      → Título da página
        → Conteúdo (tabela | formulário | dashboard)
```

---

## Densidade de informação

| Contexto | Densidade |
|----------|-----------|
| Dashboard | Média — KPIs grandes, pouco texto |
| Listagens | Alta — tabelas compactas, meta em `.table-sub` |
| Formulários | Baixa — campos espaçados, labels claros |
| Configuração (módulos, grupos) | Média-alta — tabelas + forms inline |

---

## Cores semânticas

| Significado | Cor |
|-------------|-----|
| Ação / seleção | Laranja |
| Sucesso / ativo | Verde `#16a34a` |
| Erro / perigo | Vermelho `#dc2626` |
| Alerta / pendente | Amarelo `#b45309` |
| Neutro / inativo | Cinza muted |

Nunca usar vermelho ou verde como cor de marca — apenas semântica.

---

## Componentes obrigatórios por tipo de tela

| Tipo | Obrigatório |
|------|-------------|
| **Lista CRUD** | `CrudListShell`, busca, ordenação, paginação, `CrudRowActions`, `AppLoading`, empty state |
| **Criar** | `PageHeader` + breadcrumbs, `.form-grid`, `CrudFormActions` (**Salvar** + Cancelar) |
| **Editar** | Igual ao criar + **Excluir** (quando aplicável) via `CrudFormActions` |
| **Visualizar** | Campos desabilitados + `CrudViewActions` (Editar + Voltar) |
| Dashboard | `PageHeader`, `.stat-grid` ou `.metric-card` |
| Config avançada | `PermissionGate`, feedback `.alert-*` — ver exceções abaixo |

---

## Padrão CRUD universal

Todas as telas de cadastro devem usar o **kit CRUD** em `src/crud/` e `src/components/crud/`.

### Modos de navegação (query string)

| Modo | URL | Comportamento |
|------|-----|---------------|
| Lista | `/m/modulo/item` | Tabela com toolbar |
| Criar | `?new=1` | Formulário com botão **Salvar** |
| Editar | `?id=uuid` | Formulário editável |
| Visualizar | `?id=uuid&mode=view` | Formulário somente leitura |

Hook: `useCrudRouter()` — `goToList`, `goToCreate`, `goToEdit`, `goToView`.

### Listagem (`CrudListShell`)

Toda listagem deve incluir:

1. **Buscar** — texto livre em múltiplas colunas (`searchKeys`, OR entre campos)
2. **Filtrar** — critérios específicos combinados (`filterDefinitions`, AND entre filtros)
3. **Ordenação** — select com opções por coluna
4. **Paginação** — *Por página* na toolbar superior (junto a busca e ordenação); rodapé só com *Exibindo X–Y de Z* + navegação
5. **Ações por linha** — ícones compactos (`CrudRowActions`: visualizar, editar, excluir) sem texto, em uma única linha
6. **Tabela compacta** — **100% da largura do painel** (`table-layout: fixed`), uma linha por registro, ellipsis em textos longos, scroll horizontal só no mobile
7. **Loading** — `AppLoading` enquanto carrega dados
8. **Empty state** — mensagem orientada quando vazio
9. **Botão Adicionar** — no `PageHeader`, respeitando permissão `.manage`

Hook de listagem: `useCrudList(items, { searchKeys, filterDefinitions, defaultSort })`.

### Formulários (`CrudFormActions`)

**Grid responsivo (desktop):**
- `.form-grid` — **2 colunas** (≥ 721px) e **3 colunas** (≥ 1200px)
- Campo padrão ocupa **1 coluna**; não usar `field-span-2` em todo campo
- `.field-span-2` — campos largos (descrição, rota, observações): 2 colunas no grid
- `.field-span-full` — blocos de linha inteira (ações, matrizes, upload, seções)
- Mobile (≤ 720px): colapsa para **1 coluna**

| Contexto | Botões |
|----------|--------|
| Criar | **Salvar** (primary), Cancelar |
| Editar | **Salvar**, Cancelar, Excluir (ghost danger) |
| Visualizar | Editar (primary), Voltar para lista |

Label padrão do submit: **Salvar** (ou variante contextual: "Salvar usuário", "Salvar alterações").

**Seções de formulário:**
- Campos relacionados ficam em `.form-section.field-span-full` com título `.form-section-title`.
- Campos da seção usam `.form-grid-inner` — nunca aninhar `.form-grid` dentro de `.form-grid` sem seção.
- Upload de arquivo: preview + `btn-ghost btn-sm` + `<input type="file" hidden>` (padrão `UnitPhotosField` / `NetworkLogoField`).

**Inputs:**
- Sempre `className="input"` (ou herdar estilos globais de `input[type=text]` etc.).
- Nunca exibir o botão nativo "Escolher arquivo" do navegador.

### Checkboxes

- Usar `.checkbox-inline` em formulários (ex.: "Grupo ativo", "Departamento ativo").
- Checkbox e label **sempre juntos à esquerda** — nunca esticar o input na largura do grid.
- Tamanho fixo **1rem**, accent **laranja** (`accent-color: var(--orange)`).
- Matriz de permissões: `.permission-checkbox` (label + chave técnica abaixo).

### Loading global

- `AppLoading` — spinner inline em tabelas e painéis
- `AppLoadingPanel` — tela inteira ou registro individual carregando

Nunca usar texto solto "Carregando…" sem o componente padrão.

### Exclusão e confirmações

- **Nunca** usar `window.confirm()` ou `window.alert()` — diálogos nativos do navegador não fazem parte da UI da plataforma.
- Confirmar ações destrutivas com `confirmCrudDelete(label)` (`src/crud/crudUtils.js`) ou `appConfirm({ title, message, confirmLabel, cancelLabel, tone })` (`src/components/confirm/appConfirm.js`).
- Mensagens informativas bloqueantes com `appAlert({ title, message, okLabel, tone })`.
- Provider global: `ConfirmDialogProvider` em `App.jsx` (modal no layout da aplicação, responsivo, botões touch-friendly).
- Quando não houver DELETE na API, usar inativação (`active: false`) ou cancelamento (`status: 'cancelled'`).

### Telas já padronizadas

Departamentos, Cargos, Centros de Custo, Usuários, Modalidades, Contas a Pagar/Receber, Redes (lista), Empresas (lista parcial), **Parceiros (editar rede)**.

### Consultas somente leitura

Telas como **Fluxo de Caixa** usam o mesmo kit de listagem (`CrudListShell`, filtros, paginação, loading), porém **sem** ações de escrita na tabela (`canManage={false}`).

Novas telas com dados tabulares **devem** seguir o kit — inclusive configurações complexas (grupos, módulos, planos).

---

## Responsivo

- Desktop first (gestão é usada majoritariamente em desktop).
- Mobile: tabelas com scroll horizontal; sidebar simplificada.
- Não esconder ações críticas em mobile — empilhar, não remover.

---

## Escalabilidade do produto

Este console crescerá para dezenas de módulos (operacional, financeiro, RH, corporativo, etc.). Para suportar escala:

- **Módulos cadastráveis** — UI não hardcoded na sidebar.
- **Permissões por item** — menu reflete RBAC, não duplicar lógica na UI.
- **Padrões repetíveis** — preferir composição (`CashEntryPage`, `PageHeader`) a copy-paste.
- **Tokens centralizados** — evitar drift de cor/spacing entre squads.

---

## Referências internas de qualidade

Telas que exemplificam o padrão alvo atual:

| Tela | Por quê |
|------|---------|
| [`CrudListShell`](../src/components/crud/CrudListShell.jsx) | Listagem padrão (busca, sort, paginação, ações) |
| [`DepartmentsPage`](../src/pages/DepartmentsPage.jsx) | CRUD completo list/create/edit/view |
| [`CashEntryPage`](../src/components/CashEntryPage.jsx) | CRUD espelhado reutilizável (pagar/receber) |
| [`UsersPage`](../src/pages/UsersPage.jsx) | Roteamento CRUD + permissões |
| [`AdminLayout`](../src/layout/AdminLayout.jsx) | Shell modular correto |

---

## Anti-patterns (não fazer)

- Sidebar com itens flat misturando módulos e sub-itens
- Múltiplos `h1` na mesma página
- Formulário sem botão de cancelar/voltar
- Tabela larga sem `.table-wrap`
- Cores hardcoded `#e8881c` no JSX/SCSS — usar `var(--orange)`
- Ícones emoji no console admin
- Modal sobre modal (usar confirmação nativa ou drawer futuro)
- `form-grid` aninhado sem `.form-section` (quebra colunas e alinhamento)
- `<input type="file">` visível (usar botão ghost + input hidden)
- Botões soltos no rodapé do form em vez de `CrudFormActions`

---

Para tokens, medidas, classes CSS e diagramas detalhados, consulte [REFERENCIA-VISUAL.md](./REFERENCIA-VISUAL.md).
