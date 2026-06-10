# Player Manager - Pterodactyl / Jexactyl Addon

O **Player Manager** é um Addon Serverless (Client-Side First) para painéis Pterodactyl e Jexactyl que permite gerenciar jogadores do seu servidor de Minecraft (ver inventário, posição, vida, ender chest e executar comandos RCON silenciosos) diretamente pelo painel.

## 🚀 Instalação Rápida (VPS Linux)

Se você hospeda seu painel Jexactyl ou Pterodactyl em uma VPS (Oracle, AWS, DigitalOcean, etc), você pode usar o script de instalação automática.

1. Acesse sua máquina via SSH.
2. Execute o comando abaixo como root:
```bash
curl -sSL https://raw.githubusercontent.com/SEU-USUARIO/player-manager/main/install-vps.sh | sudo bash
```
*(Não se esqueça de atualizar a URL acima após subir o código para o seu GitHub)*

## ✨ Funcionalidades

- **Auto-Discovery**: Lista jogadores offline e online em tempo real lendo o arquivo `usercache.json`.
- **Decodificador NBT no Navegador**: Lê o arquivo `.dat` do jogador descompactando via GZIP no próprio navegador do usuário (usando `prismarine-nbt`), reduzindo a carga do servidor PHP.
- **Visualização Precisa**: Renderização de texturas para Hotbar, Inventário Principal, Armadura, Offhand e Ender Chest.
- **Gestão RCON**: Permite expulsar, banir, desbanir, dar permissões de operador (OP), modificar modo de jogo (Survival/Creative) e matar jogadores via execução RCON em plano de fundo (`/api/client/servers/<id>/command`).

## 🛠 Arquitetura

O sistema não possui back-end extra. Toda a manipulação de dados pesados é enviada ao front-end em React, que puxa os arquivos através da rota nativa `/api/client/servers/<id>/files/download` e `/api/client/servers/<id>/files/contents`.

Feito com 💙 para a comunidade Jexactyl/Pterodactyl.
