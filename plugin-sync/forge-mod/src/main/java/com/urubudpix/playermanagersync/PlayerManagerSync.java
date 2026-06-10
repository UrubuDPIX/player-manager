package com.urubudpix.playermanagersync;

import net.neoforged.fml.common.Mod;
import net.neoforged.neoforge.common.NeoForge;
import net.neoforged.neoforge.event.tick.ServerTickEvent;
import net.neoforged.bus.api.SubscribeEvent;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerPlayer;
import net.neoforged.neoforge.server.ServerLifecycleHooks;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

@Mod("playermanagersync")
public class PlayerManagerSync {
    private static final Logger LOGGER = LogManager.getLogger();
    private int tickCount = 0;

    public PlayerManagerSync() {
        NeoForge.EVENT_BUS.register(this);
        LOGGER.info("PlayerManagerSync (NeoForge 1.21.1) Initialized!");
    }

    @SubscribeEvent
    public void onServerTick(ServerTickEvent.Post event) {
        tickCount++;
        // 5 seconds = 100 ticks
        if (tickCount >= 100) {
            tickCount = 0;
            MinecraftServer server = ServerLifecycleHooks.getCurrentServer();
            if (server != null) {
                if (!server.getPlayerList().getPlayers().isEmpty()) {
                    server.getPlayerList().saveAll();
                    LOGGER.debug("Saved inventory data for all online players.");
                }
            }
        }
    }
}
