import { createWeeksmith } from "./agent.js";
import { connectNotesMcp } from "./notes.js";
import { fileWeekStore } from "./stores.js";
import { langfuse } from "./tracing.js";
import { runBuildThisWeek } from "./workflow.js";

const log = process.argv.slice(2).join(" ");

const notes = await connectNotesMcp();
const weeks = fileWeekStore();
const agent = createWeeksmith({ stores: { notes, weeks } });

try {
  const result = await runBuildThisWeek(agent, { notes, weeks }, { log });
  if (result.ok) {
    console.log("Week saved:", JSON.stringify(result.week, null, 2));
  } else {
    console.error("Build failed:", result.error);
  }
} finally {
  await notes.close();
  await langfuse.close();
}
