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
REPO_URL="${REPO_URL:-https://github.com/SEU-USUARIO/player-manager}"
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
}

inject_frontend_routes() {
    print_step "Injetando rotas nativamente no Jexactyl..."

    local JS=/tmp/inject_players.js

    {
    cat << 'JSEOF'
const fs = require('fs');
const path = require('path');
const panelDir = process.argv[2];

// 1. Patch ServerRouter.tsx
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

// 2. Patch ServerElements.tsx (Navbar)
(function patchServerElements() {
  const sePath = path.join(panelDir, 'resources/scripts/routers/ServerElements.tsx');
  if (!fs.existsSync(sePath)) return;
  let c = fs.readFileSync(sePath, 'utf8');
  c = c.replace(/<NavLink[^>]*\/players[^>]*>[\s\S]*?<\/NavLink>\n?/g, '');
  
  if (!c.includes('/players')) {
    let pm = c.match(/<NavLink[^>]*\/users[^>]*>[\s\S]*?<\/NavLink>/);
    if (!pm) {
        pm = c.match(/<NavLink[^>]*\/files[^>]*>[\s\S]*?<\/NavLink>/);
    }
    
    if (pm) {
      const ls = c.lastIndexOf('\n', pm.index) + 1;
      const ind = (c.slice(ls, pm.index).match(/^(\s*)/) || ['',''])[1];
      const inj = '\n' + ind + '<NavLink to={`${match.url}/players`}>' +
                  '\n' + ind + '    <FontAwesomeIcon icon={faUsers} /> Players' +
                  '\n' + ind + '</NavLink>';
      
      c = c.slice(0, pm.index + pm[0].length) + inj + c.slice(pm.index + pm[0].length);
      
      if (!c.includes('faUsers')) {
          const fm = c.match(/import\s+\{[^}]*\}\s+from\s+['"]@fortawesome\/free-solid-svg-icons['"];?/);
          if (fm) {
              c = c.slice(0, fm.index) + fm[0].replace('{', '{ faUsers, ') + c.slice(fm.index + fm[0].length);
          } else {
              c = "import { faUsers } from '@fortawesome/free-solid-svg-icons';\n" + c;
          }
      }
      console.log('✓ NavLink de Players injetado no ServerElements.tsx');
    }
  }
  fs.writeFileSync(sePath, c);
})();
JSEOF
    } > "$JS"

    node "$JS" "$PANEL_DIR"
    rm -f "$JS"
}

build_panel() {
    print_step "Instalando dependências NBT e compilando painel..."
    cd "$PANEL_DIR"
    
    print_info "Instalando pako e prismarine-nbt no painel..."
    yarn add pako prismarine-nbt buffer || npm install pako prismarine-nbt buffer

    print_info "Construindo frontend (isso pode demorar vários minutos)..."
    yarn build:production || npm run build:production

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
