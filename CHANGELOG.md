# Player Manager Addon - Jexactyl / Pterodactyl

## 🎯 Arquitetura Planejada (Serverless Client-Side)

Para garantir máxima performance sem sobrecarregar o painel (backend PHP) com processamento pesado de arquivos binários, o **Player Manager** foi desenhado com uma abordagem "Client-Side First":

1. **Auto-Discovery de Jogadores**:
   - O React consumirá a API nativa do Pterodactyl (`/api/client/servers/<id>/files/contents?file=usercache.json`).
   - O `usercache.json` possui um mapa perfeito de UUIDs e nomes de jogadores (sem necessidade de rate-limit batendo na API da Mojang).
   
2. **Download e Parse de NBT no Navegador**:
   - Ao clicar em um jogador, o React fará uma requisição para a API de arquivos do painel gerando um link de download para o arquivo `world/playerdata/<UUID>.dat`.
   - Utilizando as bibliotecas `prismarine-nbt` e `pako` instaladas no pacote frontend, o binário GZIP é descompactado e lido diretamente no navegador do administrador.
   - Isso elimina a necessidade de construir um Controller backend gigantesco no Laravel para lidar com leitura NBT.

3. **Status em Tempo Real (RCON/Websocket)**:
   - Verificação de jogadores online baseada na timestamp de alteração do arquivo `.dat` (jogadores logados têm o arquivo atualizado constantemente no auto-save).
   - Botões de ações (Ban, Op, Whitelist) usarão a API de envio de comandos ao Console (`/api/client/servers/<id>/command`) enviando comandos silenciosos (`/ban`, `/op`).

## 📝 Roadmap & Próximos Passos (Para quando você acordar)

- [ ] **Fase 1: Integração File Manager API**: Criar serviço TypeScript (`api/files.ts`) para ler o `usercache.json` e parsear os UUIDs no container da tela principal.
- [ ] **Fase 2: Decodificador NBT**: Implementar o leitor binário no `PlayerDetails.tsx` usando `prismarine-nbt`, pegando atributos complexos como Inventário, Ender Chest, Posição (Pos) e HP (Health).
- [ ] **Fase 3: Renders Visuais**: Desenhar de forma precisa os itens no grid 3x9 do inventário, utilizando sprites/ícones baseados nos IDs obtidos pelo NBT.
- [ ] **Fase 4: Ações RCON**: Ligar os botões de gerenciamento na UI do painel.

---
### Changelog 

- **v1.0.0-draft** (08/06/2026)
  - Criado o repositório base temporário (`player-manager`).
  - Instaladas dependências de tratamento NBT (`prismarine-nbt`, `pako`, `buffer`).
  - Desenhada a estrutura UI (mockup) baseada no tema Zeus (`PlayersContainer.tsx` e `PlayerDetails.tsx`).
  - Gerado `blueprint.json`.
