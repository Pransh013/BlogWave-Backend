import { Hono } from "hono";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { sign } from "hono/jwt";
import {signupSchema, signinSchema, SignupBody, SigninBody} from "@pransshhh/blogwave_validation";

const userRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  };
}>();
userRouter.post("/signup", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());
  const body: SignupBody = await c.req.json();
  const { success } = signupSchema.safeParse(body);
  if(!success) {
    c.status(411);
    return c.json({error: 'Invalid request body'});
  }
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
    return c.json({ error: "Cannot create user" });
  }
});

userRouter.post("/signin", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const body: SigninBody = await c.req.json();
  const { success } = signinSchema.safeParse(body);
  if (!success) {
    c.status(411);
    return c.json({ error: "Invalid request body" });
  }
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

export default userRouter;