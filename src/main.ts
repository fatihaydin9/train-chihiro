import { App } from "./App";

let app: App | null = null;

async function start() {
  app = new App();
  await app.init();
}

start().catch((err) => {
  console.error("Failed to initialize North Express:", err);
});

// Vite HMR: dispose old renderer/scene before hot-reloading
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (app) {
      app.dispose();
      app = null;
    }
  });
  import.meta.hot.accept();
}
