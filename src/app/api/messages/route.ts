import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const otherUserId = searchParams.get("otherUserId");
    const workspaceId = searchParams.get("workspaceId");

    let messages;
    if (workspaceId) {
      messages = await prisma.message.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "asc" }
      });
    } else if (otherUserId) {
      messages = await prisma.message.findMany({
        where: {
          OR: [
            { senderId: session.userId, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: session.userId }
          ]
        },
        orderBy: { createdAt: "asc" }
      });
    } else {
      return NextResponse.json({ error: "Missing query params" }, { status: 400 });
    }

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Fetch Messages Error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { receiverId, content, workspaceId } = await req.json();

    if (!content || (!receiverId && !workspaceId)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const newMessage = await prisma.message.create({
      data: {
        senderId: session.userId,
        receiverId: receiverId || null,
        workspaceId: workspaceId || null,
        content
      }
    });

    return NextResponse.json({ success: true, message: newMessage }, { status: 201 });
  } catch (error) {
    console.error("Send Message Error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
