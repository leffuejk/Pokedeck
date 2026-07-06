import { DefaultAzureCredential } from '@azure/identity';
import { env } from '../env.js';

/**
 * Azure AI Foundry (Agent Service) client wrapper for the "Professor" deck coach.
 *
 * The SDK surface for Foundry Agents is still stabilizing, so we import lazily and
 * degrade gracefully: if Foundry isn't configured (no project endpoint) or the SDK
 * call fails, callers fall back to the deterministic heuristic analyzer. This keeps
 * the whole app usable in local dev without any Azure resources.
 */

let clientPromise: Promise<FoundryClient | null> | null = null;

export interface FoundryClient {
  /** Ask the model for a JSON completion given a system + user prompt. */
  complete(system: string, user: string): Promise<string>;
}

export function isFoundryConfigured(): boolean {
  return Boolean(env.foundryProjectEndpoint);
}

export function getFoundry(): Promise<FoundryClient | null> {
  clientPromise ??= build();
  return clientPromise;
}

async function build(): Promise<FoundryClient | null> {
  if (!isFoundryConfigured()) return null;
  try {
    // Lazy import so the app boots even if the package isn't installed in dev.
    const { AIProjectClient } = await import('@azure/ai-projects');
    const credential = new DefaultAzureCredential();
    const project = new AIProjectClient(env.foundryProjectEndpoint!, credential);
    const deployment = env.foundryModelDeployment;

    return {
      async complete(system: string, user: string): Promise<string> {
        // Use the project's Azure OpenAI-compatible chat completions surface.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const openai = await (project as any).inference.azureOpenAI({ apiVersion: '2024-10-21' });
        const res = await openai.chat.completions.create({
          model: deployment,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        });
        return res.choices[0]?.message?.content ?? '{}';
      },
    };
  } catch (err) {
    console.warn('⚠️  Foundry unavailable, falling back to heuristics:', err);
    return null;
  }
}
