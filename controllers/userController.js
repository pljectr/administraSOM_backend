import User from '../models/users.js';
import Activity from '../models/activities.js';
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

  User.register(newUser, password, async (err, user) => {
    if (err) {
      console.error(err);
      await Activity.create({
        action: "REGISTER_ERROR",
        collectionType: "Users",
        description: `Erro ao registrar usuário: ${username}`,
        ip: req.ip,
        metadata: { error: err.message },
      });
      return res.status(400).send({ erro: true, mensagem: "Erro ao registrar usuário." });
    }

    await Activity.create({
      action: "REGISTER",
      collectionType: "Users",
      documentId: user._id,
      user: req.user?._id,
      description: `Usuário registrado: ${user.username}`,
      ip: req.ip,
    });

    res.send({ erro: false, mensagem: "Usuário registrado com sucesso!", user });
  });
};

export const loginUser = (req, res, next) => {
  console.log("trying to login")
  passport.authenticate('local', async (err, user, info) => {
    if (err) {
      await Activity.create({
        action:  'LOGIN_FAIL',
        collectionType: "Users",
        description: `Erro interno ao tentar login: ${req.body.username}`,
        ip: req.ip,
        metadata: { error: err.message },
      });
      return res.status(500).send({ erro: true, mensagem: "Erro interno." });
    }

    if (!user) {
      await Activity.create({
        action: "LOGIN_FAIL",
        collectionType: "Users",
        description: `Login falhou: ${req.body.username}`,
        ip: req.ip,
      });
      return res.status(401).send({ erro: true, mensagem: "Usuário ou senha inválidos." });
    }

    req.logIn(user, async (err) => {
      if (err) {
        return res.status(500).send({ erro: true, mensagem: "Erro ao autenticar o usuário." });
      }

      await Activity.create({
        action: "LOGIN",
        collectionType: "Users",
        documentId: user._id,
        user: user._id,
        description: `Usuário logado: ${user.username}`,
        ip: req.ip,
      });

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

export const logoutUser = async (req, res) => {
  if (req.isAuthenticated()) {
    const loggedUser = req.user;
    req.logout(async (err) => {
      if (err) {
        return res.status(500).send({ erro: true, mensagem: "Erro ao deslogar." });
      }

      await Activity.create({
        action: "LOGOUT",
        collectionType: "Users",
        user: loggedUser?._id,
        description: `Logout efetuado: ${loggedUser?.username || "Desconhecido"}`,
        ip: req.ip,
      });

      return res.send({ erro: false, mensagem: "Usuário deslogado com sucesso!" });
    });
  } else {
    res.status(403).send({ erro: true, mensagem: "Usuário não autenticado." });
  }
};

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

    const { user: authenticatedUser, error } = await user.authenticate(currentPassword);

    if (error || !authenticatedUser) {
      return res.status(401).json({
        erro: true,
        mensagem: "Senha atual incorreta.",
      });
    }

    await user.setPassword(newPassword);
    await user.save();

    await Activity.create({
      action: "PASSWORD_CHANGE",
      collectionType: "Users",
      documentId: user._id,
      user: user._id,
      description: `Senha alterada para o usuário: ${username}`,
      ip: req.ip,
    });

    return res.json({
      erro: false,
      mensagem: "Senha atualizada com sucesso!",
    });

  } catch (err) {
    console.error(err);
    await Activity.create({
      action: "PASSWORD_CHANGE_ERROR",
      collectionType: "Users",
      description: `Erro ao alterar senha para ${username}`,
      ip: req.ip,
      metadata: { error: err.message },
    });
    return res.status(500).json({
      erro: true,
      mensagem: "Erro ao atualizar senha.",
    });
  }
};

export const isAuth = (req, res) => {
  if (req.isAuthenticated()) {
    return res.json({
      erro: false,
      mensagem: "Usuário logado",
      user: req.user
    });
  } else {
    return res.status(401).json({
      erro: true,
      mensagem: "Usuário não logado",
      user: null
    });
  }
};