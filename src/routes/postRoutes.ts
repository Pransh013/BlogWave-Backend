import {
  CreatePostBody,
  UpdatePostBody,
  createPostSchema,
  getPostSchema,
  updatePostSchema,
} from "@pransshhh/blogwave_validation";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { Hono } from "hono";
import { verify } from "hono/jwt";

const postRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  };
  Variables: {
    userId: string;
  };
}>();

interface JwtPayload {
  id: string;
}

postRouter.use("/*", async (c, next) => {
  const header = c.req.header("Authorization");
  if (!header || !header.startsWith("Bearer ")) {
    c.status(401);
    return c.json({ error: "Unauthorized: Missing Bearer token" });
  }
  const token = header.split(" ")[1];
  const decoded: JwtPayload = await verify(token, c.env.JWT_SECRET);
  if (!decoded) {
    c.status(401);
    return c.json({ error: "unauthorized" });
  }
  c.set("userId", decoded.id);
  await next();
});

postRouter.post("/", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const body: CreatePostBody = await c.req.json();
  const { success } = createPostSchema.safeParse(body);
  if (!success) {
    c.status(411);
    return c.json({ error: "Invalid request body" });
  }
  const authorId = c.get("userId");

  try {
    const post = await prisma.post.create({
      data: {
        title: body.title,
        content: body.content,
        authorId,
      },
    });

    return c.json({ id: post.id });
  } catch (error) {
    c.status(400);
    return c.json({ error: "Invalid" });
  }
});

postRouter.put("/", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const body: UpdatePostBody = await c.req.json();
  const { success } = updatePostSchema.safeParse(body);
  if (!success) {
    c.status(411);
    return c.json({ error: "Invalid request body" });
  }
  const authorId = c.get("userId");
  try {
    const post = await prisma.post.update({
      where: {
        id: body.id,
        authorId,
      },
      data: {
        title: body.title,
        content: body.content,
      },
    });

    return c.json({ id: post.id });
  } catch (error) {
    c.status(400);
    return c.json({ error: "Invalid" });
  }
});

postRouter.get("/get/:id", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const id = c.req.param("id");
  const { success } = getPostSchema.safeParse(id);
  if (!success) {
    c.status(411);
    return c.json({ error: "Invalid request id" });
  }
  try {
    const post = await prisma.post.findFirst({
      where: { id },
    });

    return c.json({ post });
  } catch (error) {
    c.status(400);
    return c.json({ error: "Invalid" });
  }
});

postRouter.get("/all", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const posts = await prisma.post.findMany();

    return c.json({ posts });
  } catch (error) {
    c.status(400);
    return c.json({ error: "Invalid" });
  }
});

export default postRouter;
