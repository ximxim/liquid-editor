import { LiquidRenderer } from "@liquid-ai/renderer";

export function App() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <h1 data-testid="harness-status">harness-ok</h1>
      <LiquidRenderer />
    </main>
  );
}
