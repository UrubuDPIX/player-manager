package com.urubudpix.playermanagersync;

import org.bukkit.Bukkit;
import org.bukkit.entity.Player;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.scheduler.BukkitRunnable;

public class PlayerManagerSync extends JavaPlugin {

    @Override
    public void onEnable() {
        getLogger().info("PlayerManagerSync iniciado! O painel Jexactyl agora terá inventários em tempo real.");

        // Salva os dados de todos os jogadores a cada 5 segundos (100 ticks)
        // Isso força a escrita do arquivo .dat sem precisar de /save-all (que salva os chunks e laga o servidor)
        new BukkitRunnable() {
            @Override
            public void run() {
                for (Player player : Bukkit.getOnlinePlayers()) {
                    try {
                        player.saveData();
                    } catch (Exception e) {
                        // Ignora erros caso o jogador desconecte no exato momento
                    }
                }
            }
        }.runTaskTimer(this, 100L, 100L); // Executa a cada 5 segundos
    }

    @Override
    public void onDisable() {
        getLogger().info("PlayerManagerSync desligado.");
        // Salva uma última vez ao desligar
        for (Player player : Bukkit.getOnlinePlayers()) {
            try {
                player.saveData();
            } catch (Exception e) {}
        }
    }
}
