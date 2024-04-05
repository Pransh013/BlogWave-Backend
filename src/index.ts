import { Hono } from "hono";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { sign, decode, verify } from "hono/jwt";

const app = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  },
  Variables: {
    userId: string
  };
}>();


interface JwtPayload {
  id: string;
}
app.use("/api/v1/blog/*", async (c, next) => {
  const header = c.req.header("Authorization");
  if (!header || !header.startsWith("Bearer ")) {
    c.status(401);
    return c.json({ error: "Unauthorized: Missing Bearer token" });
  }

  const token = header.split(" ")[1];
  const decoded: JwtPayload | null = await verify(token, c.env.JWT_SECRET);
  if (!decoded) {
    c.status(401);
    return c.json({ error: "unauthorized" });
  }

  c.set('userId', decoded.id)
  await next();
});

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.post("/api/v1/signup", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());
  const body = await c.req.json();
  try {
    const user = await prisma.user.create({
      data: {
        fullName: body.fullName,
        email: body.email,
        password: body.password,
      },
    });

    const token = await sign({ id: user.id }, c.env.JWT_SECRET);
    return c.json({
      message: "Successfully created",
      token,
    });
  } catch (error) {
    c.status(403);
    return c.json({error: 'Cannot create user'});
  }
});

app.post("/api/v1/signin", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const body = await c.req.json();
  try {
    const user = await prisma.user.findUnique({
      where: {
        email: body.email,
        password: body.password,
      },
    });
    if (!user) return c.status(403);
    const token = await sign({ id: user.id }, c.env.JWT_SECRET);
    return c.json({
      message: "Successfully signed in",
      token,
    });
  } catch (error) {
    return c.status(403);
  }
});

app.post("/api/v1/blog", (c) => {
  console.log('Hii');
  
  return c.text("Blog Posted");
});

app.put("/api/v1/blog", (c) => {
  return c.text("Hello Hono!");
});

app.get("/api/v1/blog/:id", (c) => {
  return c.text("Hello Hono!");
});

app.get("/api/v1/blog/all", (c) => {
  return c.text("Hello Hono!");
});

export default app;
