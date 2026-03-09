import type { KieCreateTaskResponse, KieTaskStatusResponse } from "@/types";

const KIE_BASE_URL = "https://api.kie.ai/api/v1/jobs";

interface CreateTaskInput {
  prompt: string;
  aspect_ratio: string;
  image_input?: string[];
  resolution?: string;
  output_format?: string;
}

export async function createTask(
  input: CreateTaskInput
): Promise<KieCreateTaskResponse> {
  const response = await fetch(`${KIE_BASE_URL}/createTask`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.KIEAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "nano-banana-pro",
      input: {
        prompt: input.prompt,
        aspect_ratio: input.aspect_ratio,
        ...(input.image_input?.length && { image_input: input.image_input }),
        resolution: input.resolution || "1K",
        output_format: input.output_format || "png",
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Kie.ai createTask failed: ${response.status}`);
  }

  const data: KieCreateTaskResponse = await response.json();

  if (data.code !== 200) {
    throw new Error(`Kie.ai error: ${data.msg}`);
  }

  return data;
}

export async function getTaskStatus(
  taskId: string
): Promise<KieTaskStatusResponse> {
  const response = await fetch(
    `${KIE_BASE_URL}/recordInfo?taskId=${encodeURIComponent(taskId)}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.KIEAI_API_KEY}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Kie.ai recordInfo failed: ${response.status}`);
  }

  return response.json();
}
