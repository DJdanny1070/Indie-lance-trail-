import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { loginSession } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const { name, email, password, role } = await req.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (role !== "FREELANCER" && role !== "EMPLOYER") {
      return NextResponse.json(
        { error: "Invalid role selected" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Account with this email already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create User and their default Profile in a transaction
    const newUser = await prisma.$transaction(async (tx) =>{
      const user = await tx.user.create({
        data: {
          name,
          email,
          passwordHash: hashedPassword,
          role,
        },
      });

      if (role === "FREELANCER") {
        await tx.freelancerProfile.create({
          data: {
            userId: user.id,
            skills: "",
          },
        });
      } else if (role === "EMPLOYER") {
        await tx.employerProfile.create({
          data: {
            userId: user.id,
          },
        });
      }

      return user;
    });

    // Create session
    await loginSession(newUser.id, newUser.role);

    return NextResponse.json({ success: true, redirect: "/dashboard" }, { status: 201 });
  } catch (error) {
    console.error("Registration Error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
