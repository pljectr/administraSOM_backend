import express from 'express';
import cors from 'cors'
import mongoose from 'mongoose';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import passport from 'passport';
import dotenv from 'dotenv';
import path from 'path';

import facilities from './models/facilities.js';
import './config/passport.js'; // sua config de passport separada

import userRoutes from './routes/users.js';
import activityRoutes from './routes/activities.js';
import uploadRoutes from './routes/uploads.js';
import facilityRoutes from './routes/facilities.js';
import contractRoutes from './routes/contracts.js';
import cardRoutes from './routes/cards.js'

dotenv.config(); // Carrega variáveis do .env

const app = express();
const __dirname = path.resolve();
// Conexão com o MongoDB local
mongoose.connect(process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/meuSistema', {
}).then(() => {
  console.log('Conectado ao MongoDB (local)');
}).catch((err) => {
  console.error('Erro ao conectar ao MongoDB:', err);
});

// Middleware para receber JSON do frontend
app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONT_URL, // <-- location of the react app were connecting to. pass to .env
    credentials: true,
  })
);


// Configuração da sessão para ambiente LOCAL
app.use(session({
  secret: process.env.SECRET || 'chave-secreta-desenvolvimento',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,           // false para rodar em HTTP local
    maxAge: 4 * 60 * 60 * 1000, // 4 horas
    sameSite: 'lax'          // compatível com dev local
  },
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/meuSistema',
  }),
}));

// Inicializa autenticação
app.use(passport.initialize());
app.use(passport.session());
app.use('/files', express.static(path.resolve(__dirname, 'tmp', 'uploads')));

// Rotas
app.use('/api/users', userRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/facilities', facilityRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/cards', cardRoutes);


app.get('/', (req, res) => {
  res.send('Hello World! administraSOM server is up & running');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});