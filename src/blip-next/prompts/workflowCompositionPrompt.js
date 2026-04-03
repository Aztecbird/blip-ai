export const workflowCompositionPrompt = `
Compose a minimal execution workflow for Blip.
Sequence only the steps required by the user's request.
Use tool capability compatibility:
- tools consume object types
- tools produce object types
- outputs can feed later steps

Rules:
- preserve user intent exactly
- do not add unnecessary transforms
- insert confirmation before sensitive outbound actions
- leave blocked review/send steps blocked until confirmation

Return strict JSON with:
{
  "summary": string,
  "steps": WorkflowStep[],
  "shared_objects": SharedObject[],
  "next_step_id": string | null
}
`.trim();
