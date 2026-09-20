import { app } from "./app.js";
import { env } from "./config/env.js";

app.listen(env.port, env.host, () =>
  console.info(
    JSON.stringify({
      level: "info",
      message: `N-LAMS API listening on ${env.host}:${env.port}`,
      port: env.port,
      host: env.host,
      demoMode: env.authMode === "demo",
    }),
  ),
);
