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
  const authorId = c.get("userId");
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const body = await c.req.json();

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
    console.log(error);

    return c.json({ error: "Invalid" });
  }
});

postRouter.put("/", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const body = await c.req.json();
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
  const id = c.req.param("id");
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

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
