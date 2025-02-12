import type { Provider, IAgentRuntime } from "@elizaos/core";
import { CdpAgentkit } from "@coinbase/cdp-agentkit-core";
import * as fs from "node:fs";

const WALLET_DATA_FILE = "wallet_data.txt";

export async function getClient(_runtime: IAgentRuntime): Promise<CdpAgentkit> {
  // Validate required environment variables first
  const apiKeyName = _runtime.getSetting("CDP_API_KEY_NAME");
  const apiKeyPrivateKey = _runtime.getSetting("CDP_API_KEY_PRIVATE_KEY");

  if (!apiKeyName || !apiKeyPrivateKey) {
    throw new Error("Missing required CDP API credentials. Please set CDP_API_KEY_NAME and CDP_API_KEY_PRIVATE_KEY environment variables.");
  }

  let walletDataStr: string | null = null;

  // Read existing wallet data if available
  if (fs.existsSync(WALLET_DATA_FILE)) {
    try {
      walletDataStr = fs.readFileSync(WALLET_DATA_FILE, "utf8");
    } catch (error) {
      console.error("Error reading wallet data:", error);
      // Continue without wallet data
    }
  }

  // Configure CDP AgentKit
  const config = {
    cdpWalletData: walletDataStr || undefined,
    networkId: _runtime.getSetting("CDP_AGENT_KIT_NETWORK") || "base-sepolia",
    apiKeyName: apiKeyName,
    apiKeyPrivateKey: apiKeyPrivateKey,
  };

  try {
    const agentkit = await CdpAgentkit.configureWithWallet(config);
    // Save wallet data
    const exportedWallet = await agentkit.exportWallet();
    fs.writeFileSync(WALLET_DATA_FILE, exportedWallet);
    return agentkit;
  } catch (error) {
    console.error("Failed to initialize CDP AgentKit:", error);
    throw new Error(`Failed to initialize CDP AgentKit: ${error.message || "Unknown error"}`);
  }
}

export const walletProvider: Provider = {
    async get(_runtime: IAgentRuntime): Promise<string | null> {
        try {
            const client = await getClient(_runtime);
            // Access wallet addresses using type assertion based on the known structure
            const address = (client as unknown as { wallet: { addresses: Array<{ id: string }> } }).wallet.addresses[0].id;
            return `AgentKit Wallet Address: ${address}`;
        } catch (error) {
            console.error("Error in AgentKit provider:", error);
            return `Error initializing AgentKit wallet: ${error.message}`;
        }
    },
};
