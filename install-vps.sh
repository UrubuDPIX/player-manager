#!/bin/bash
# ============================================================================
# Player Manager - VPS Auto Install Script (Oracle/AWS/DigitalOcean/etc)
# ============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

PANEL_DIR=""
REPO_URL="${REPO_URL:-https://github.com/UrubuDPIX/player-manager}"
TEMP_DIR="/tmp/player-manager-$(date +%s)"

print_banner() {
    echo -e "${CYAN}"
    cat << 'EOF'
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🎮  Player Manager for Jexactyl                            ║
║       Auto Install Script v1.0.0                             ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
}

print_step() { echo -e "${BLUE}[PASSO]${NC} $1"; }
print_success() { echo -e "${GREEN}[OK]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[AVISO]${NC} $1"; }
print_error() { echo -e "${RED}[ERRO]${NC} $1"; }
print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }

detect_panel() {
    print_step "Detectando instalação do Jexactyl/Pterodactyl..."
    
    local paths=("/var/www/jexactyl" "/var/www/pterodactyl" "/var/www/panel" "/home/jexactyl" "/opt/jexactyl" "/opt/pterodactyl")
    
    for path in "${paths[@]}"; do
        if [ -f "$path/artisan" ] && [ -d "$path/vendor" ]; then
            PANEL_DIR="$path"
            print_success "Painel encontrado em: $PANEL_DIR"
            return 0
        fi
    done
    
    print_error "Jexactyl/Pterodactyl não encontrado!"
    exit 1
}

download_addon() {
    print_step "Baixando arquivos do Player Manager..."
    
    mkdir -p "$TEMP_DIR"
    cd "$TEMP_DIR"
    
    if [ -n "$REPO_URL" ] && [[ "$REPO_URL" != *"SEU-USUARIO"* ]]; then
        print_info "Clonando de: $REPO_URL"
        git clone --depth 1 "$REPO_URL" . 2>/dev/null || {
            print_error "Não foi possível obter os arquivos. Verifique o link do repositório."
            exit 1
        }
    else
        print_warning "REPO_URL padrão não foi alterado. Certifique-se de que o repositório é acessível."
        git clone --depth 1 "https://github.com/SEU-USUARIO/player-manager" . 2>/dev/null || true
    fi
}

install_frontend() {
    print_step "Instalando componentes do frontend..."
    
    local target_dir="$PANEL_DIR/resources/scripts/components/server/player-manager"
    rm -rf "$target_dir"
    mkdir -p "$target_dir"
    
    if [ -d "$TEMP_DIR/client/components" ]; then
        cp -r "$TEMP_DIR/client/components/." "$target_dir/"
        print_success "Componentes React copiados."
    else
        print_error "Diretório client/components não encontrado no repositório."
    fi

    if [ -d "$TEMP_DIR/client/api" ]; then
        mkdir -p "$target_dir/api"
        cp -r "$TEMP_DIR/client/api/." "$target_dir/api/"
        print_success "Arquivos de API copiados."
    fi

    # Fix relative paths in imports if necessary
    sed -i "s|../api/files|./api/files|g" "$target_dir/PlayersContainer.tsx" 2>/dev/null || true
    sed -i "s|../api/files|./api/files|g" "$target_dir/PlayerDetails.tsx" 2>/dev/null || true
    sed -i "s|../api/files|./api/files|g" "$target_dir/WorldManager.tsx" 2>/dev/null || true

    print_info "Baixando nbt.js puro (ES5) localmente para evitar erros de Webpack..."
    curl -sSL https://unpkg.com/nbt@0.8.1/nbt.js -o "$target_dir/nbt.js"
}

inject_frontend_routes() {
    print_step "Injetando rotas nativamente no Jexactyl..."

    local JS=/tmp/inject_players.js

    {
    cat << 'JSEOF'
const fs = require('fs');
const path = require('path');
const panelDir = process.argv[2];

// 1. Patch routes.ts (For newer Pterodactyl versions like 1.11+)
(function patchRoutesTs() {
  const rtPath = path.join(panelDir, 'resources/scripts/routers/routes.ts');
  if (!fs.existsSync(rtPath)) return;
  let c = fs.readFileSync(rtPath, 'utf8');
  
  c = c.replace(/\{[^}]*path:\s*'\/players'[^}]*\},?\n?/gs, '');
  c = c.replace(/import PlayersContainer from '[^']+';?\n?/g, '');
  c = c.replace(/import PlayersContainer from "[^"]+";?\n?/g, '');
  
  if (!c.includes('/players') && !c.includes('PlayersContainer')) {
    const imports = [...c.matchAll(/^import .+from .+;$/gm)];
    if (imports.length) {
      const lm = imports[imports.length - 1];
      c = c.slice(0, lm.index + lm[0].length) +
          "\nimport PlayersContainer from '@/components/server/player-manager/PlayersContainer';" +
          c.slice(lm.index + lm[0].length);
    }
    
    // Inserir depois do Files (que é nativo e sempre existe)
    const fm = c.match(/path:\s*['"]\/files['"][^}]*\},/i);
    if (fm) {
      const route = "\n        {\n            path: '/players',\n            name: 'Players',\n            permission: null,\n            component: PlayersContainer,\n        },";
      c = c.slice(0, fm.index + fm[0].length) + route + c.slice(fm.index + fm[0].length);
      console.log('✓ Rota /players adicionada no routes.ts (após Files)');
    } else {
      // Fallback para qualquer lugar no server array
      const srvMatch = c.match(/server:\s*\[/i);
      if (srvMatch) {
        const route = "\n        {\n            path: '/players',\n            name: 'Players',\n            permission: null,\n            component: PlayersContainer,\n        },";
        c = c.slice(0, srvMatch.index + srvMatch[0].length) + route + c.slice(srvMatch.index + srvMatch[0].length);
        console.log('✓ Rota /players adicionada no routes.ts (inicio do server)');
      } else {
        console.log('⚠ Falha ao injetar a rota no routes.ts! Formato não reconhecido.');
      }
    }
  }
  fs.writeFileSync(rtPath, c);
})();

// 2. Patch ServerRouter.tsx (For older Pterodactyl versions)
(function patchServerRouter() {
  const srPath = path.join(panelDir, 'resources/scripts/routers/ServerRouter.tsx');
  if (!fs.existsSync(srPath)) return;
  let c = fs.readFileSync(srPath, 'utf8');
  
  // Limpa injecoes antigas se existirem
  c = c.replace(/import PlayersContainer from '[^']+';?\n?/g, '');
  c = c.replace(/import PlayersContainer from "[^"]+";?\n?/g, '');
  c = c.replace(/<Route path=\{`\$\{match\.path\}\/players`\}[^>]*>[\s\S]*?<\/Route>\n?/g, '');

  if (!c.includes('PlayersContainer')) {
    const imports = [...c.matchAll(/^import .*;$/gm)];
    if (imports.length) {
      const lm = imports[imports.length - 1];
      c = c.slice(0, lm.index + lm[0].length) +
          "\nimport PlayersContainer from '@/components/server/player-manager/PlayersContainer';" +
          c.slice(lm.index + lm[0].length);
    }

    const fm = c.match(/<Route path=\{`\$\{match\.path\}\/files`\} exact>[\s\S]*?<\/Route>/);
    if (fm) {
      const ls = c.lastIndexOf('\n', fm.index) + 1;
      const ind = (c.slice(ls, fm.index).match(/^(\s*)/) || ['',''])[1];
      const inj = '\n' + ind + '<Route path={`${match.path}/players`} exact>\n' +
                  ind + '    <PlayersContainer />\n' +
                  ind + '</Route>';
      c = c.slice(0, fm.index + fm[0].length) + inj + c.slice(fm.index + fm[0].length);
      console.log('✓ Rota de Players injetada no ServerRouter.tsx');
    }
  }
  fs.writeFileSync(srPath, c);
})();

// 3. Patch the REAL Navbar Component (Brute-force find for custom themes)
(function patchNavbar() {
  const dirToSearch = path.join(panelDir, 'resources/scripts');
  let targetFile = null;
  let pmMatch = null;
  let fileContent = '';

  function searchFiles(dir) {
    if (targetFile) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (targetFile) break;
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        searchFiles(fullPath);
      } else if (fullPath.endsWith('.tsx')) {
        const c = fs.readFileSync(fullPath, 'utf8');
        // We look for a file that hardcodes <NavLink to={.../modpacks} or files/users
        let m = c.match(/<NavLink[^>]*to=\{`\$\{match\.url\}\/modpacks`\}[^>]*>[\s\S]*?<\/NavLink>/i) ||
                c.match(/<NavLink[^>]*to=\{`\$\{match\.url\}\/files`\}[^>]*>[\s\S]*?<\/NavLink>/i) ||
                c.match(/<NavLink[^>]*to=\{`\$\{match\.url\}\/users`\}[^>]*>[\s\S]*?<\/NavLink>/i);
                
        // Also check for <Link> or other custom components just in case
        if (!m) {
            m = c.match(/<Link[^>]*to=\{`\$\{match\.url\}\/modpacks`\}[^>]*>[\s\S]*?<\/Link>/i) ||
                c.match(/<Link[^>]*to=\{`\$\{match\.url\}\/files`\}[^>]*>[\s\S]*?<\/Link>/i);
        }

        // Make sure it's not ServerElements if ServerElements only has a map (like we saw in debug)
        if (m && !c.includes('<NavLink to={to(route.path, true)}')) {
            targetFile = fullPath;
            pmMatch = m;
            fileContent = c;
            console.log('DEBUG: Encontrou a Navbar em: ' + fullPath);
            break;
        }
      }
    }
  }

  searchFiles(dirToSearch);

  if (!targetFile) {
      console.log('⚠ Não foi possível localizar o arquivo da Navbar principal! Temas customizados podem usar estruturas diferentes.');
      return;
  }

  // Clean up old injection
  fileContent = fileContent.replace(/<NavLink[^>]*to=\{`\$\{match\.url\}\/players`\}[^>]*>[\s\S]*?<\/NavLink>\n?/gi, '');
  fileContent = fileContent.replace(/<Link[^>]*to=\{`\$\{match\.url\}\/players`\}[^>]*>[\s\S]*?<\/Link>\n?/gi, '');

  const ls = fileContent.lastIndexOf('\n', pmMatch.index) + 1;
  const ind = (fileContent.slice(ls, pmMatch.index).match(/^(\s*)/) || ['',''])[1];
  
  const isLink = pmMatch[0].startsWith('<Link');
  const tag = isLink ? 'Link' : 'NavLink';
  
  const inj = '\n' + ind + '<' + tag + ' to={`${match.url}/players`}>' +
              '\n' + ind + '    <FontAwesomeIcon icon={faUsers} /> Players / Worlds' +
              '\n' + ind + '</' + tag + '>';
  
  // Inject import FIRST before we inject the JSX
  if (!fileContent.match(/import\s+.*faUsers.*from\s+['"]@fortawesome\/free-solid-svg-icons['"]/)) {
      fileContent = "import { faUsers } from '@fortawesome/free-solid-svg-icons';\n" + fileContent;
  }
  
  if (!fileContent.includes('FontAwesomeIcon')) {
      fileContent = "import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';\n" + fileContent;
  }

  // Now we can inject the JSX block
  const newPmMatch = fileContent.match(new RegExp(pmMatch[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
  if (newPmMatch) {
      fileContent = fileContent.slice(0, newPmMatch.index + newPmMatch[0].length) + inj + fileContent.slice(newPmMatch.index + newPmMatch[0].length);
  } else {
      fileContent = fileContent.replace(pmMatch[0], pmMatch[0] + inj);
  }
  
  console.log('✓ Botão Players injetado com sucesso no arquivo: ' + path.basename(targetFile));
  fs.writeFileSync(targetFile, fileContent);
})();

// 4. Patch ServerRow for Automatic Egg Backgrounds
(function patchServerRowBg() {
  const srPath = path.join(panelDir, 'resources/scripts/components/dashboard/ServerRow.tsx');
  if (!fs.existsSync(srPath)) return;
  let c = fs.readFileSync(srPath, 'utf8');

  if (c.includes('const getEggBackground')) {
      // Remove old injection entirely so we can inject the new one with updated URLs
      c = c.replace(/\s*const getEggBackground = \(server(: any)?\) => \{[\s\S]*?const eggBg = getEggBackground\(server\);/, '');
      // Clean up ALL previously injected styles to prevent JSX duplicate attribute error
      c = c.replace(/style=\{eggBg[\s\S]*?className=/g, 'className=');
  }

  const match = c.match(/(export default\s*(?:function)?\s*\w*\s*\([^)]*\)\s*=>\s*\{)/);
  if (match) {
    const inj = [
      "    const getEggBackground = (server: any) => {",
      "        if (server.bgImage) return `url(${server.bgImage})`;",
      "        const eggStr = [",
      "            server.name, server.description,",
      "            server.eggName, server.egg_name, ",
      "            server.egg?.name, server.egg,",
      "            server.nestName, server.nest_name, ",
      "            server.nest?.name, server.nest,",
      "            server.dockerImage, server.invocation",
      "        ].filter(Boolean).join(' ').toLowerCase();",
      "        if (eggStr.includes('minecraft') || eggStr.includes('java') || eggStr.includes('modpack') || eggStr.includes('forge') || eggStr.includes('paper') || eggStr.includes('spigot') || eggStr.includes('moon')) {",
      "            return 'url(https://raw.githubusercontent.com/UrubuDPIX/player-manager/master/assets/user-minecraft.png)';",
      "        }",
      "        if (eggStr.includes('fivem') || eggStr.includes('gta') || eggStr.includes('redm')) {",
      "            return 'url(https://raw.githubusercontent.com/UrubuDPIX/player-manager/master/assets/user-fivem.jpg)';",
      "        }",
      "        if (eggStr.includes('node') || eggStr.includes('js')) {",
      "            return 'url(https://raw.githubusercontent.com/UrubuDPIX/player-manager/master/assets/user-nodejs.jpg)';",
      "        }",
      "        if (eggStr.includes('python') || eggStr.includes('bot') || eggStr.includes('discord')) {",
      "            return 'url(https://raw.githubusercontent.com/UrubuDPIX/player-manager/master/assets/user-python.jpg)';",
      "        }",
      "        if (eggStr.includes('lavalink') || eggStr.includes('music')) {",
      "            return 'url(https://raw.githubusercontent.com/UrubuDPIX/player-manager/master/assets/bg-music.png)';",
      "        }",
      "        return '';",
      "    };",
      "    const eggBg = getEggBackground(server);"
    ].join('\n');
    
    c = c.slice(0, match.index + match[0].length) + '\n' + inj + '\n' + c.slice(match.index + match[0].length);
    
    const afterInj = c.slice(match.index + match[0].length);
    c = c.slice(0, match.index + match[0].length) + afterInj.replace(/className=/, 'style={eggBg ? { backgroundImage: eggBg, backgroundSize: "cover", backgroundPosition: "center", backgroundBlendMode: "overlay", backgroundColor: "rgba(15, 20, 25, 0.82)", padding: "1rem", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)" } : { padding: "1rem", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(15, 20, 25, 0.6)", backdropFilter: "blur(12px)" }} className=');

    fs.writeFileSync(srPath, c);
    console.log('✓ Sistema de Background Automático por Egg injetado no ServerRow.tsx!');
  }
})();

// 5. Patch Tailwind CSS for Euphoria Theme
(function patchGlobalTheme() {
    const cssPath = path.join(panelDir, 'resources/scripts/assets/tailwind.css');
    if (!fs.existsSync(cssPath)) return;
    
    let css = fs.readFileSync(cssPath, 'utf8');
    
    // Remove o tema antigo se já existir para podermos injetar a nova versão corrigida
    css = css.replace(/\/\* === EUPHORIA THEME OVERRIDES === \*\/[\s\S]*?\/\* === END EUPHORIA === \*\//, '');

    const themeCss = `
/* === EUPHORIA THEME OVERRIDES === */

/* Escala global verdadeira para encolher o painel sem quebrar o Tailwind */
body {
    zoom: 0.85;
    background: transparent !important;
}

#app, #app > div, #app > div > div {
    background: transparent !important;
}

/* Background Global do Painel */
body::before {
    content: "";
    position: fixed;
    top: 0; left: 0; width: 100vw; height: 100vh;
    background-image: url('https://raw.githubusercontent.com/UrubuDPIX/player-manager/master/assets/user-minecraft.png');
    background-size: cover;
    background-position: center;
    background-attachment: fixed;
    filter: blur(5px) brightness(0.5);
    z-index: -1;
}

/* Aplica o efeito de Glassmorphism nas Sidebars, Navbars e modais */
.bg-neutral-900, .bg-neutral-800, .bg-gray-900, .bg-gray-800, .bg-gray-700 {
    background-color: rgba(15, 15, 20, 0.45) !important;
    backdrop-filter: blur(12px) !important;
    -webkit-backdrop-filter: blur(12px) !important;
    border-color: rgba(255, 255, 255, 0.05) !important;
}

/* CORREÇÃO DA SIDEBAR (Barra Lateral) */
/* O Jexactyl geralmente aninha a sidebar no primeiro filho. Forçamos o scroll: */
#app > div > div:first-child {
    overflow-y: auto !important;
    overflow-x: hidden !important;
}
#app > div > div:first-child .flex-col {
    gap: 0.5rem !important;
}
#app > div > div:first-child > div.flex-col.justify-between {
    padding-bottom: 2rem !important;
}

/* CORREÇÃO DO TAMANHO DOS CARDS (Super Compactos) */
/* Em vez de usar classes que o React ofusca, pegamos todos os links de servidores! */
a[href^="/server/"] {
    padding: 0.5rem 1.25rem !important; /* Reduz muito as bordas internas */
    min-height: 85px !important;
    height: auto !important;
    display: flex !important;
    flex-direction: column !important;
    justify-content: center !important;
    border-radius: 12px !important;
}

/* Reduz os espaçamentos gigantes padrões do Pterodactyl dentro dos cards */
a[href^="/server/"] > div {
    margin-top: 0.15rem !important;
    margin-bottom: 0 !important;
}

a[href^="/server/"] p {
    line-height: 1.2 !important;
    margin: 0 !important;
}

button {
    backdrop-filter: blur(4px) !important;
}

.shadow-md {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2) !important;
}
/* === END EUPHORIA === */
`;
    fs.writeFileSync(cssPath, css + '\\n' + themeCss);
    console.log('✓ Tema Euphoria (Proporções Corrigidas) injetado com sucesso no CSS Global!');
})();
JSEOF
    } > "$JS"

    node "$JS" "$PANEL_DIR"
    rm -f "$JS"
}

build_panel() {
    print_step "Instalando dependências NBT e compilando painel..."
    cd "$PANEL_DIR"
    
    print_info "Instalando dependências no painel..."
    yarn remove prismarine-nbt pako buffer @types/pako nbt 2>/dev/null || true
    npm uninstall prismarine-nbt pako buffer @types/pako nbt 2>/dev/null || true
    yarn add pako buffer || npm install pako buffer

    print_info "Limpando cache de build antigo..."
    rm -rf public/assets/* 2>/dev/null || true

    print_info "Construindo frontend (isso pode demorar vários minutos)..."
    NODE_OPTIONS=--openssl-legacy-provider yarn build:production || NODE_OPTIONS=--openssl-legacy-provider npm run build:production

    print_success "Painel construído com sucesso!"
}

main() {
    print_banner
    
    if [ "$EUID" -ne 0 ]; then
        print_error "Este script precisa ser executado como root (sudo)"
        exit 1
    fi
    
    detect_panel
    download_addon
    install_frontend
    inject_frontend_routes
    build_panel
    
    print_banner
    print_success "Instalação do Player Manager concluída com sucesso!"
    echo -e "${YELLOW}Acesse seu painel e verifique a nova aba 'Players' no servidor.${NC}"
}

main
