// Helper to make async delay

export async function delay(timeoutMs = 1000) {
  await new Promise(resolve => setTimeout(resolve, timeoutMs))
}
