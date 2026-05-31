export function App() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <h1 data-testid="harness-status">harness-ok</h1>
      <p>
        Placeholder playground. This surface exists only so the coding harness
        (logging, console capture, e2e) is runnable and verifiable. The real
        editor is built in the phases described in <code>plan.md</code>.
      </p>
    </main>
  );
}
