# PlayerManagerSync

Este repositório contém duas implementações:

## Plugin Bukkit/Spigot
- Compatível com versões antigas do Bukkit/Spigot ao compilar contra `spigot-api:1.12.2-R0.1-SNAPSHOT`.
- Removido `api-version` de `plugin.yml` para suportar servidores anteriores ao 1.13.
- Build do plugin: `mvn clean package`.

## Forge Mod
- Adicionado um módulo inicial em `forge-mod/` para Forge 1.20.4.
- O mod é um esqueleto básico com `mods.toml` e o ponto de entrada `PlayerManagerSyncMod`.
- Build do mod: use Gradle a partir de `forge-mod/`.

## Observações
- O plugin agora visa compatibilidade com servidores mais antigos, mas a validação em cada versão específica deve ser testada no servidor alvo.
- O mod é um ponto de partida e pode ser expandido para suportar sincronização de inventário semelhante ao plugin.
