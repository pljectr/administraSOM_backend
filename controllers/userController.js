 import User from '../models/users.js';
import passport from 'passport';

export const registerUser = (req, res) => {
  const {
    username,
    password,
    nameOfTheUser,
    userProfile,
    userRole,
    userPG,
    facility,
    imageProfile
  } = req.body;

  const newUser = new User({
    username,
    nameOfTheUser,
    userProfile,
    userRole,
    userPG,
    facility,
    imageProfile
  });

  User.register(newUser, password, (err, user) => {
    if (err) {
      console.error(err);
      return res.status(400).send({ erro: true, mensagem: "Erro ao registrar usuário." });
    }
    res.send({ erro: false, mensagem: "Usuário registrado com sucesso!", user });
  });
};

export const loginUser = (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return res.status(500).send({ erro: true, mensagem: "Erro interno." });

    if (!user) return res.status(401).send({ erro: true, mensagem: "Usuário ou senha inválidos." });

    req.logIn(user, (err) => {
      if (err) return res.status(500).send({ erro: true, mensagem: "Erro ao autenticar o usuário." });

      return res.send({ erro: false, mensagem: "Usuário logado com sucesso!", user });
    });
  })(req, res, next);
};

export const checkAuth = (req, res) => {
  if (req.isAuthenticated()) {
    return res.status(200).send({ status: true, user: req.user });
  } else {
    return res.status(401).send({ status: false, user: null });
  }
};

export const logoutUser = (req, res) => {
  if (req.isAuthenticated()) {
    req.logout((err) => {
      if (err) return res.status(500).send({ erro: true, mensagem: "Erro ao deslogar." });
      return res.send({ erro: false, mensagem: "Usuário deslogado com sucesso!" });
    });
  } else {
    res.status(403).send({ erro: true, mensagem: "Usuário não autenticado." });
  }
};

// Atualizar senha de um usuário autenticado

export const updatePassword = async (req, res) => {
  const { username, currentPassword, newPassword } = req.body;

  if (!username || !currentPassword || !newPassword) {
    return res.status(400).json({
      erro: true,
      mensagem: "Preencha todos os campos: username, senha atual e nova senha.",
    });
  }

  try {
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({
        erro: true,
        mensagem: "Usuário não encontrado.",
      });
    }

    // Autentica senha atual
    const { user: authenticatedUser, error } = await user.authenticate(currentPassword);

    if (error || !authenticatedUser) {
      return res.status(401).json({
        erro: true,
        mensagem: "Senha atual incorreta.",
      });
    }

    // Define nova senha
    await user.setPassword(newPassword);
    await user.save();

    return res.json({
      erro: false,
      mensagem: "Senha atualizada com sucesso!",
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      erro: true,
      mensagem: "Erro ao atualizar senha.",
    });
  }
};
 

