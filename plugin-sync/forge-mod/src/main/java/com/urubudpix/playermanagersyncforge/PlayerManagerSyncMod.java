package com.urubudpix.playermanagersyncforge;

import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.event.lifecycle.FMLCommonSetupEvent;
import net.minecraftforge.fml.javafmlmod.FMLJavaModLoadingContext;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

@Mod(PlayerManagerSyncMod.MODID)
public class PlayerManagerSyncMod {
    public static final String MODID = "playermanagersyncforge";
    private static final Logger LOGGER = LogManager.getLogger();

    public PlayerManagerSyncMod() {
        FMLJavaModLoadingContext.get().getModEventBus().addListener(this::setup);
    }

    private void setup(final FMLCommonSetupEvent event) {
        LOGGER.info("PlayerManagerSync Forge mod inicializado.");
    }
}
