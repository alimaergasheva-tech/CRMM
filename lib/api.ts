import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import type { User } from "@/types/crm.types";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function withAuth(
  handler: (user: User, request: Request) => Promise<Response>,
) {
  return async (request: Request) => {
    try {
      const user = await getCurrentUser();
      if (!user) return jsonError("Unauthorized", 401);
      return await handler(user, request);
    } catch (error) {
      if (error instanceof Response) return error;
      console.error(error);
      return jsonError("Internal Server Error", 500);
    }
  };
}

export async function parseJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
