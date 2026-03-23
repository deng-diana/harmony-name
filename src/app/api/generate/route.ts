import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { searchPoems } from "@/lib/retriever";
import { generateRequestSchema } from "@/lib/schemas";
import {
  createSystemPrompt,
  buildUserMessage,
  buildSurnameInstruction,
} from "@/lib/prompt";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Server configuration error", code: "ENV_MISSING" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const parseResult = generateRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", code: "VALIDATION_ERROR", details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const {
      gender,
      dayMaster,
      strength,
      favourableElements,
      avoidElements,
      surnamePreference,
      specifiedSurname,
      recommendedNameLength,
    } = parseResult.data;

    // RAG retrieval
    let poemsContextText = "";
    try {
      const query = `Chinese classical poetry and idioms related to ${favourableElements.join(" ")} elements`;
      const retrievedPoems = await searchPoems(query, 5);
      poemsContextText = retrievedPoems
        .map(
          (p, i) =>
            `[${i + 1}] Title:《${p.title}》 Author:${p.author} Content:${p.content}`
        )
        .join("\n");
    } catch {
      console.warn("RAG Search failed, proceeding with internal knowledge.");
    }

    const surnameInstruction = buildSurnameInstruction(
      surnamePreference,
      specifiedSurname,
      dayMaster
    );

    const userMessage = buildUserMessage({
      gender,
      dayMaster,
      strength,
      favourableElements,
      avoidElements,
      surnameInstruction,
      recommendedNameLength,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: createSystemPrompt(poemsContextText) },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "AI returned empty content", code: "EMPTY_RESPONSE" },
        { status: 500 }
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "AI returned invalid JSON", code: "PARSE_ERROR" },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (error: unknown) {
    console.error("API Error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to generate names", code: "API_ERROR", details: message },
      { status: 500 }
    );
  }
}
