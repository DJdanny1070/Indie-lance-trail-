import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import ChatInterface from "./ChatInterface";

export default async function MessagesPage({ searchParams }: { searchParams: { userId?: string } }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const resolvedSearchParams = await Promise.resolve(searchParams);
  const selectedUserId = resolvedSearchParams?.userId;

  // Let's find all users this user has messaged with
  const sentMessages = await prisma.message.findMany({
    where: { senderId: session.userId },
    select: { receiverId: true },
    distinct: ['receiverId']
  });
  
  const receivedMessages = await prisma.message.findMany({
    where: { receiverId: session.userId },
    select: { senderId: true },
    distinct: ['senderId']
  });

  const participantSet = new Set([
    ...sentMessages.map(m =>m.receiverId).filter(Boolean),
    ...receivedMessages.map(m =>m.senderId).filter(Boolean)
  ]);
  
  if (selectedUserId) {
    participantSet.add(selectedUserId);
  }

  const participantIds = Array.from(participantSet) as string[];

  const participants = await prisma.user.findMany({
    where: { id: { in: participantIds } },
    select: { id: true, name: true, role: true }
  });

  return (
    <div className="container py-8 h-[calc(100vh-80px)]">
      <div className="card glass h-full flex flex-col p-0 overflow-hidden">
        <ChatInterface 
          currentUserId={session.userId} 
          participants={participants} 
          initialSelectedUserId={selectedUserId || null} 
        />
      </div>
    </div>
  );
}
