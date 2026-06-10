package com.urubudpix.playermanagersync;

import net.neoforged.fml.common.Mod;
import net.neoforged.neoforge.common.NeoForge;
import net.neoforged.neoforge.event.tick.ServerTickEvent;
import net.neoforged.neoforge.event.RegisterCommandsEvent;
import net.neoforged.bus.api.SubscribeEvent;
import net.minecraft.commands.Commands;
import net.minecraft.network.chat.Component;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerPlayer;
import net.neoforged.neoforge.server.ServerLifecycleHooks;
import net.neoforged.bus.api.IEventBus;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

@Mod("playermanagersync")
public class PlayerManagerSync {
    private static final Logger LOGGER = LogManager.getLogger();
    private int tickCount = 0;

    public PlayerManagerSync(IEventBus modEventBus) {
        NeoForge.EVENT_BUS.register(this);
        LOGGER.info("PlayerManagerSync (NeoForge 1.21.1) Initialized!");
    }

    @SubscribeEvent
    public void onRegisterCommands(RegisterCommandsEvent event) {
        event.getDispatcher().register(Commands.literal("pmsync")
            .requires(source -> source.hasPermission(2))
            .executes(context -> {
                MinecraftServer server = context.getSource().getServer();
                if (server != null) {
                    server.getPlayerList().saveAll();
                    context.getSource().sendSuccess(() -> Component.literal("§a[PlayerManager] Sincronização forçada concluída com sucesso! Os inventários foram salvos no disco."), true);
                    LOGGER.info("Manual sync triggered via /pmsync command.");
                }
                return 1;
            })
        );
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
