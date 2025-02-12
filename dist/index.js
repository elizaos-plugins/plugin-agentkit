// src/provider.ts
import { CdpAgentkit } from "@coinbase/cdp-agentkit-core";
import * as fs from "node:fs";
var WALLET_DATA_FILE = "wallet_data.txt";
async function getClient() {
  const apiKeyName = process.env.CDP_API_KEY_NAME;
  const apiKeyPrivateKey = process.env.CDP_API_KEY_PRIVATE_KEY;
  if (!apiKeyName || !apiKeyPrivateKey) {
    throw new Error("Missing required CDP API credentials. Please set CDP_API_KEY_NAME and CDP_API_KEY_PRIVATE_KEY environment variables.");
  }
  let walletDataStr = null;
  if (fs.existsSync(WALLET_DATA_FILE)) {
    try {
      walletDataStr = fs.readFileSync(WALLET_DATA_FILE, "utf8");
    } catch (error) {
      console.error("Error reading wallet data:", error);
    }
  }
  const config = {
    cdpWalletData: walletDataStr || void 0,
    networkId: process.env.CDP_AGENT_KIT_NETWORK || "base-sepolia",
    apiKeyName,
    apiKeyPrivateKey
  };
  try {
    const agentkit = await CdpAgentkit.configureWithWallet(config);
    const exportedWallet = await agentkit.exportWallet();
    fs.writeFileSync(WALLET_DATA_FILE, exportedWallet);
    return agentkit;
  } catch (error) {
    console.error("Failed to initialize CDP AgentKit:", error);
    throw new Error(`Failed to initialize CDP AgentKit: ${error.message || "Unknown error"}`);
  }
}
var walletProvider = {
  async get(_runtime) {
    try {
      const client = await getClient();
      const address = client.wallet.addresses[0].id;
      return `AgentKit Wallet Address: ${address}`;
    } catch (error) {
      console.error("Error in AgentKit provider:", error);
      return `Error initializing AgentKit wallet: ${error.message}`;
    }
  }
};

// src/actions.ts
import {
  generateText,
  ModelClass,
  composeContext,
  generateObject
} from "@elizaos/core";
import { CdpToolkit } from "@coinbase/cdp-langchain";
async function getAgentKitActions({
  getClient: getClient2
}) {
  const agentkit = await getClient2();
  const cdpToolkit = new CdpToolkit(agentkit);
  const tools = cdpToolkit.getTools();
  const actions = tools.map((tool) => ({
    name: tool.name.toUpperCase(),
    description: tool.description,
    similes: [],
    validate: async () => true,
    handler: async (runtime, message, state, _options, callback) => {
      try {
        const client = await getClient2();
        let currentState = state ?? await runtime.composeState(message);
        currentState = await runtime.updateRecentMessageState(
          currentState
        );
        const parameterContext = composeParameterContext(
          tool,
          currentState
        );
        const parameters = await generateParameters(
          runtime,
          parameterContext,
          tool
        );
        const result = await executeToolAction(
          tool,
          parameters,
          client
        );
        const responseContext = composeResponseContext(
          tool,
          result,
          currentState
        );
        const response = await generateResponse(
          runtime,
          responseContext
        );
        callback == null ? void 0 : callback({ text: response, content: result });
        return true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        callback == null ? void 0 : callback({
          text: `Error executing action ${tool.name}: ${errorMessage}`,
          content: { error: errorMessage }
        });
        return false;
      }
    },
    examples: []
  }));
  return actions;
}
async function executeToolAction(tool, parameters, client) {
  const toolkit = new CdpToolkit(client);
  const tools = toolkit.getTools();
  const selectedTool = tools.find((t) => t.name === tool.name);
  if (!selectedTool) {
    throw new Error(`Tool ${tool.name} not found`);
  }
  return await selectedTool.call(parameters);
}
function composeParameterContext(tool, state) {
  const contextTemplate = `{{recentMessages}}

Given the recent messages, extract the following information for the action "${tool.name}":
${tool.description}
`;
  return composeContext({ state, template: contextTemplate });
}
async function generateParameters(runtime, context, tool) {
  const { object } = await generateObject({
    runtime,
    context,
    modelClass: ModelClass.LARGE,
    schema: tool.schema
  });
  return object;
}
function composeResponseContext(tool, result, state) {
  const responseTemplate = `
# Action Examples
{{actionExamples}}

# Knowledge
{{knowledge}}

# Task: Generate dialog and actions for the character {{agentName}}.
About {{agentName}}:
{{bio}}
{{lore}}

{{providers}}

{{attachments}}

# Capabilities
Note that {{agentName}} is capable of reading/seeing/hearing various forms of media, including images, videos, audio, plaintext and PDFs. Recent attachments have been included above under the "Attachments" section.

The action "${tool.name}" was executed successfully.
Here is the result:
${JSON.stringify(result)}

{{actions}}

Respond to the message knowing that the action was successful and these were the previous messages:
{{recentMessages}}
`;
  return composeContext({ state, template: responseTemplate });
}
async function generateResponse(runtime, context) {
  return generateText({
    runtime,
    context,
    modelClass: ModelClass.LARGE
  });
}

// src/index.ts
console.log("\n\u250C\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2510");
console.log("\u2502          AGENTKIT PLUGIN               \u2502");
console.log("\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524");
console.log("\u2502  Initializing AgentKit Plugin...       \u2502");
console.log("\u2502  Version: 0.0.1                        \u2502");
console.log("\u2514\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2518");
var initializeActions = async () => {
  try {
    const apiKeyName = process.env.CDP_API_KEY_NAME;
    const apiKeyPrivateKey = process.env.CDP_API_KEY_PRIVATE_KEY;
    if (!apiKeyName || !apiKeyPrivateKey) {
      console.warn("\u26A0\uFE0F Missing CDP API credentials - AgentKit actions will not be available");
      return [];
    }
    const actions = await getAgentKitActions({
      getClient
    });
    console.log("\u2714 AgentKit actions initialized successfully.");
    return actions;
  } catch (error) {
    console.error("\u274C Failed to initialize AgentKit actions:", error);
    return [];
  }
};
var agentKitPlugin = {
  name: "[AgentKit] Integration",
  description: "AgentKit integration plugin",
  providers: [walletProvider],
  evaluators: [],
  services: [],
  actions: await initializeActions()
};
var index_default = agentKitPlugin;
export {
  agentKitPlugin,
  index_default as default
};
//# sourceMappingURL=index.js.map