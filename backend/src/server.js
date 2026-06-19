import express from 'express';
import cors from 'cors';
import { router } from './routes.js';

const log = (...args) => console.log(new Date().toISOString(), '[server]', ...args);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use((req, _res, next) => {
    if (req.url.startsWith('/api')) {
        log(req.method, req.url);
    }
    next();
});

app.use('/api', router);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

export default app;

if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        log(`Listening on http://localhost:${PORT}`);
    });
}
