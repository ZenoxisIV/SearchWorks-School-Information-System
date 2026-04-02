import { app } from "@/lib/server";

async function handler(req: Request) {
    const { method, url } = req;

    // Inject the Next.js request into Fastify
    const res = await app.inject({
        method: method as any,
        url: new URL(url).pathname,
        payload: req.body ? await req.text() : undefined,
        headers: Object.fromEntries(req.headers.entries()),
    });

    return new Response(res.payload, {
        status: res.statusCode,
        headers: res.headers as any,
    });
}

export { handler as GET, handler as POST, handler as PATCH, handler as DELETE };
