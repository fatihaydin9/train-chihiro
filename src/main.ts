import { App } from './App';

const app = new App();
app.init().catch((err) => {
  console.error('Failed to initialize North Express:', err);
});
