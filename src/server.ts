import env from "@/env";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { cors } from "hono/cors";
import z from "zod";

// -----------------------------------------------------------------------------

const app = new Hono()

app.use(cors())

// -----------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-unused-vars */
const routes = app
    .basePath("/api")
    .on("GET", "/ping", async (c) => {
        return c.text("pong")
    })
    .on("POST", "/echo", zValidator("json", z.object({ message: z.string() })), async (c) => {
        const { message } = c.req.valid("json");
        return c.text(message)
    })

// -----------------------------------------------------------------------------

app.get("*", serveStatic({ root: "./static" }))

// -----------------------------------------------------------------------------

export type AppType = typeof routes;

export default {
    port: env.PORT,
    fetch: app.fetch,
};
