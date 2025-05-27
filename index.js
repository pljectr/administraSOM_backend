import express from 'express';
import mongoose from 'mongoose';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import passport from 'passport';
import dotenv from 'dotenv';
import userRoutes from './routes/users.js';
import './config/passport.js'; // sua config de passport separada

dotenv.config(); // Carrega variáveis do .env

const app = express();

// Conexão com o MongoDB local
mongoose.connect(process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/meuSistema', {
}).then(() => {
  console.log('Conectado ao MongoDB (local)');
}).catch((err) => {
  console.error('Erro ao conectar ao MongoDB:', err);
});

// Middleware para receber JSON do frontend
app.use(express.json());

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

// Rotas
app.use('/api/users', userRoutes);


app.get('/', (req, res) => {
    console.log(req)
  res.send('Hello World! administraSOM server is up & running');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});