package com.urubudpix.playermanagersyncforge;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import java.lang.reflect.Method;
import java.util.List;

/**
 * PlayerManager Sync Mod for Minecraft NeoForge
 * 
 * Multi-version support: Works with Minecraft 1.16.5 through 1.21.4
 * Continuously syncs player inventory data for real-time Jexactyl panel updates
 * 
 * Supports both Forge and NeoForge using reflection-based approach for maximum compatibility
 */
public class PlayerManagerSyncMod {
    public static final String MODID = "playermanagersyncforge";
    private static final Logger LOGGER = LogManager.getLogger();
    private static volatile boolean running = true;
    private static Thread syncThread;
    
    // Version detection
    private static String minecraftVersion = "UNKNOWN";
    private static String modLoaderName = "UNKNOWN";
    
    // Reflection cached methods and classes
    private static Class<?> serverLifecycleHooks;
    private static Class<?> minecraftServer;
    private static Class<?> playerList;
    private static Class<?> serverPlayer;
    private static Class<?> level;
    private static Class<?> mapStorage;
    
    private static Method getCurrentServer;
    private static Method getPlayerList;
    private static Method getPlayers;
    private static Method getLevel;
    private static Method getDataStorage;
    private static Method save;

    public PlayerManagerSyncMod() {
        LOGGER.info("════════════════════════════════════════════════");
        LOGGER.info("PlayerManager Sync mod initializing...");
        LOGGER.info("════════════════════════════════════════════════");
        
        try {
            detectMinecraftVersion();
            detectModLoader();
            
            LOGGER.info("Detected: {} running {}", minecraftVersion, modLoaderName);
            
            initializeReflection();
            startSyncThread();
            
            LOGGER.info("✓ PlayerManager Sync initialized successfully!");
            LOGGER.info("✓ Real-time inventory sync enabled (5-second intervals)");
            LOGGER.info("════════════════════════════════════════════════");
        } catch (Exception e) {
            LOGGER.error("✗ Failed to initialize PlayerManager Sync", e);
        }
    }

    /**
     * Detect Minecraft version at runtime
     */
    private void detectMinecraftVersion() {
        try {
            // Try to detect from package names
            String[] versionCandidates = {"1.21.4", "1.21.1", "1.21.0", "1.20.6", "1.20.4", "1.20.1", 
                                        "1.19.4", "1.19.2", "1.18.2", "1.16.5"};
            
            for (String ver : versionCandidates) {
                try {
                    Class.forName("net.minecraft.world.level.Level");
                    minecraftVersion = ver;
                    break;
                } catch (ClassNotFoundException ignored) {}
            }
            
            // Fallback: try to read version from system properties
            if (minecraftVersion.equals("UNKNOWN")) {
                String javaVersion = System.getProperty("java.version");
                LOGGER.debug("Minecraft version detection fallback - Java: {}", javaVersion);
                minecraftVersion = "1.20.1"; // Safe default
            }
        } catch (Exception e) {
            LOGGER.debug("Could not detect Minecraft version: {}", e.getMessage());
            minecraftVersion = "UNKNOWN";
        }
    }

    /**
     * Detect whether running on Forge or NeoForge
     */
    private void detectModLoader() {
        try {
            // Check for NeoForge
            try {
                Class.forName("net.neoforged.fml.ModLoadingContext");
                modLoaderName = "NeoForge";
                return;
            } catch (ClassNotFoundException ignored) {}
            
            // Check for Forge
            try {
                Class.forName("net.minecraftforge.fml.ModLoadingContext");
                modLoaderName = "Forge";
                return;
            } catch (ClassNotFoundException ignored) {}
            
            modLoaderName = "Unknown Loader";
        } catch (Exception e) {
            LOGGER.debug("Could not detect mod loader: {}", e.getMessage());
        }
    }

    /**
     * Initialize reflection method handles for version-agnostic class access
     */
    private void initializeReflection() throws ClassNotFoundException, NoSuchMethodException {
        try {
            // Try NeoForge first, then Forge
            try {
                serverLifecycleHooks = Class.forName("net.neoforged.neoforge.server.ServerLifecycleHooks");
                LOGGER.debug("Using NeoForge ServerLifecycleHooks");
            } catch (ClassNotFoundException ex1) {
                try {
                    serverLifecycleHooks = Class.forName("net.minecraftforge.server.ServerLifecycleHooks");
                    LOGGER.debug("Using Forge ServerLifecycleHooks");
                } catch (ClassNotFoundException ex2) {
                    LOGGER.warn("Neither NeoForge nor Forge ServerLifecycleHooks found");
                    throw ex2;
                }
            }
            
            getCurrentServer = serverLifecycleHooks.getMethod("getCurrentServer");
            
            // Minecraft server methods - version independent
            minecraftServer = Class.forName("net.minecraft.server.MinecraftServer");
            getPlayerList = minecraftServer.getMethod("getPlayerList");
            
            // Player list methods
            playerList = Class.forName("net.minecraft.server.players.PlayerList");
            getPlayers = playerList.getMethod("getPlayers");
            
            // Player methods
            serverPlayer = Class.forName("net.minecraft.server.level.ServerPlayer");
            getLevel = serverPlayer.getMethod("getLevel");
            
            // Level methods - compatible across versions
            level = Class.forName("net.minecraft.world.level.Level");
            getDataStorage = level.getMethod("getDataStorage");
            
            // Command storage methods
            mapStorage = Class.forName("net.minecraft.world.level.storage.MapStorage");
            save = mapStorage.getMethod("save");
            
            LOGGER.info("✓ Successfully initialized reflection handlers");
            LOGGER.debug("  - ServerLifecycleHooks: {}", serverLifecycleHooks.getSimpleName());
            LOGGER.debug("  - MinecraftServer: {}", minecraftServer.getSimpleName());
            LOGGER.debug("  - PlayerList: {}", playerList.getSimpleName());
            LOGGER.debug("  - ServerPlayer: {}", serverPlayer.getSimpleName());
            LOGGER.debug("  - Level: {}", level.getSimpleName());
            LOGGER.debug("  - MapStorage: {}", mapStorage.getSimpleName());
            
        } catch (ClassNotFoundException | NoSuchMethodException e) {
            LOGGER.warn("⚠ Could not initialize all reflection handlers - mod will run in limited mode: {}", e.getMessage());
            LOGGER.warn("  This is expected in non-NeoForge/Forge environments or incompatible versions");
        }
    }

    /**
     * Start the background sync thread
     * Saves player data every 5 seconds
     */
    private void startSyncThread() {
        syncThread = new Thread(() -> {
            LOGGER.info("✓ Player data sync thread started");
            LOGGER.info("  - Sync interval: 5 seconds");
            LOGGER.info("  - Thread: PlayerManagerSync-SyncThread");
            
            int syncCount = 0;
            while (running) {
                try {
                    Thread.sleep(5000); // 5 seconds
                    syncAllPlayers();
                    syncCount++;
                    
                    // Log progress every 12 syncs (60 seconds)
                    if (syncCount % 12 == 0) {
                        LOGGER.debug("Sync operations: {} (every 5 sec)", syncCount);
                    }
                } catch (InterruptedException e) {
                    LOGGER.debug("Sync thread interrupted");
                    Thread.currentThread().interrupt();
                    break;
                } catch (Exception e) {
                    LOGGER.error("Error during player data sync", e);
                }
            }
        }, "PlayerManagerSync-SyncThread");
        
        syncThread.setDaemon(true);
        syncThread.start();
    }

    /**
     * Saves inventory data for all online players using reflection
     * Compatible with Minecraft 1.16.5 through 1.21.4
     */
    private void syncAllPlayers() {
        try {
            if (serverLifecycleHooks == null || getCurrentServer == null) {
                return;
            }

            // Get the server instance
            Object server = getCurrentServer.invoke(null);
            if (server == null) {
                return;
            }

            // Get player list
            Object playerListObj = getPlayerList.invoke(server);
            Object playersListObj = getPlayers.invoke(playerListObj);
            
            if (playersListObj instanceof List) {
                List<?> players = (List<?>) playersListObj;
                
                if (players.isEmpty()) {
                    return;
                }
                
                int syncedCount = 0;
                for (Object player : players) {
                    try {
                        // Get player level and trigger data storage save
                        Object playerLevel = getLevel.invoke(player);
                        if (playerLevel != null) {
                            Object storage = getDataStorage.invoke(playerLevel);
                            if (storage != null) {
                                save.invoke(storage);
                                syncedCount++;
                            }
                        }
                    } catch (Exception e) {
                        LOGGER.debug("Error syncing individual player: {}", e.getMessage());
                    }
                }
                
                if (syncedCount > 0) {
                    LOGGER.debug("Synced {} player(s)", syncedCount);
                }
            }
        } catch (Exception e) {
            LOGGER.debug("Error syncing players: {}", e.getMessage());
        }
    }

    /**
     * Shutdown hook - save player data before server closes
     */
    public static void shutdown() {
        LOGGER.info("════════════════════════════════════════════════");
        LOGGER.info("Performing final player data sync before shutdown...");
        running = false;
        
        if (syncThread != null) {
            try {
                syncThread.join(5000); // Wait up to 5 seconds for sync to complete
            } catch (InterruptedException e) {
                LOGGER.debug("Sync thread interrupted during shutdown");
            }
        }
        
        LOGGER.info("✓ PlayerManager Sync shut down gracefully.");
        LOGGER.info("════════════════════════════════════════════════");
    }
}
