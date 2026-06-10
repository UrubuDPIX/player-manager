# Guia de Injeção de Navbar no Jexactyl / Pterodactyl

Este guia documenta o comportamento da Navbar (Barra de Navegação) no Jexactyl/Pterodactyl, e como injetar novas abas (ex: "Players", "Modpacks") de forma automatizada via script `bash`/`node`, garantindo compatibilidade com temas customizados (como Hexplay, Hyper Red, etc).

## O Problema das Versões e Temas

No Pterodactyl padrão mais moderno, as abas são geradas dinamicamente mapeando o arquivo `routes.ts`. No entanto, **muitos temas customizados do Jexactyl** (e versões mais antigas do Pterodactyl) renderizam a Navbar Desktop de forma estática, ignorando as alterações no `routes.ts` para a parte visual superior.

Isso significa que, para uma aba aparecer com sucesso, você precisa injetá-la em **dois lugares diferentes**:

1. **`routes.ts`** (Para registrar a rota real na engine do React)
2. **O Arquivo da Navbar** (Para mostrar o botão visualmente na tela)

---

## 1. Onde injetar a Rota (`routes.ts` e `ServerRouter.tsx`)

### A. `routes.ts`
Localizado em: `resources/scripts/routers/routes.ts`

Você deve adicionar a rota do seu plugin no array `server: [ ... ]`.

**Exemplo de código para buscar e injetar:**
```javascript
const route = `
        {
            path: '/meu-plugin',
            name: 'Meu Plugin',
            permission: null,
            component: MeuPluginContainer,
        },`;
// Substitua o final do array ou injete logo após a rota de 'Files' ou 'Console'.
```

### B. `ServerRouter.tsx`
Localizado em: `resources/scripts/routers/ServerRouter.tsx`

Você precisa importar o componente da página e registrá-lo dentro do `<Switch>` de rotas.

**O que injetar:**
```tsx
import MeuPluginContainer from '@/components/server/meu-plugin/MeuPluginContainer';

// E dentro do router:
<Route path={\`\${match.path}/meu-plugin\`} exact>
    <MeuPluginContainer />
</Route>
```

---

## 2. Onde injetar a Aba Visual (Navbar)

Aqui está o grande segredo. O arquivo correto **muda dependendo do tema**. 

- **Pterodactyl Padrão Antigo / Tema Mobile:** `resources/scripts/routers/ServerElements.tsx`
- **Jexactyl com Temas Customizados:** Pode estar dentro do próprio `ServerRouter.tsx`, `ServerNavigation.tsx`, ou `NavigationBar.tsx`.

### A Solução: Força Bruta (Brute-Force Search)

Em vez de tentar adivinhar o nome do arquivo, seu script de instalação deve **vasculhar todos os arquivos `.tsx`** dentro de `resources/scripts/` procurando pela aba `/files` ou `/users`. Quando achar, é ali que a Navbar verdadeira está desenhada.

```javascript
// Exemplo de rastreamento no Node.js
function searchFiles(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      searchFiles(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Procura a aba padrão de arquivos ("Files")
      const match = content.match(/<NavLink[^>]*to=\{`\$\{match\.url\}\/files`\}[^>]*>[\s\S]*?<\/NavLink>/i);
      
      if (match) {
        console.log('Navbar encontrada no arquivo:', fullPath);
        // INJETE AQUI
        return fullPath;
      }
    }
  }
}
```

---

## 3. Como Mudar Ícones e Textos

Os ícones utilizados na Navbar do Jexactyl vêm da biblioteca **FontAwesome** (`@fortawesome/free-solid-svg-icons`).

Para usar um ícone novo (ex: Ícone de loja `faStore`), você deve injetar **duas coisas** no arquivo da Navbar encontrado no passo anterior:

### Passo 1: Importar o Ícone no topo do arquivo
**MUITO IMPORTANTE:** Não tente dar `.replace()` nos imports existentes, pois isso causa bugs caso o script rode duas vezes. **Sempre injete o import sozinho no começo do arquivo.** O Webpack compila múltiplos imports sem problemas.

```javascript
const novoImport = "import { faStore } from '@fortawesome/free-solid-svg-icons';\n";
const iconeBase = "import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';\n";

if (!fileContent.match(/import\s+.*faStore.*from\s+['"]@fortawesome\/free-solid-svg-icons['"]/)) {
    fileContent = novoImport + fileContent;
}
if (!fileContent.includes('FontAwesomeIcon')) {
    fileContent = iconeBase + fileContent;
}
```

### Passo 2: Injetar o botão (JSX) logo após o botão de `/files`
Use a biblioteca `FontAwesomeIcon` que acabou de ser importada.

```javascript
const botao = `
    <NavLink to={\`\${match.url}/meu-plugin\`}>
        <FontAwesomeIcon icon={faStore} /> Meu Plugin
    </NavLink>`;

// Insira esse código logo após o match do botão de '/files' que você encontrou na força bruta.
```

## Resumo para Novos Scripts

1. Copie seus arquivos React para dentro de `resources/scripts/components/server/seu-plugin/`.
2. Injete a Rota em `routes.ts`.
3. Injete a `<Route>` e o `import` em `ServerRouter.tsx`.
4. Use o "Brute-Force Search" para varrer `.tsx` e encontrar qual arquivo possui `<NavLink to={\`${match.url}/files\`}>`.
5. Insira `import { faSeuIcone }` no topo deste arquivo.
6. Injete seu `<NavLink>` logo abaixo do `<NavLink>` do Files.
7. Rode `yarn build:production` para compilar.
