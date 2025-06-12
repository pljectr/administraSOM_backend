import deburr from 'lodash/deburr.js'; // Precisaremos do deburr no backend também 
import User from '../models/users.js';
import dotenv from 'dotenv';
dotenv.config(); // Carrega variáveis do .env

function sanitizeFilenameBackend(filename) {
    const lastDotIndex = filename.lastIndexOf('.');
    let nameWithoutExtension = filename;
    let extension = '';

    if (lastDotIndex > 0) {
        nameWithoutExtension = filename.substring(0, lastDotIndex);
        extension = filename.substring(lastDotIndex);
    }

    // 1. Remove acentos e diacríticos (Lodash deburr)
    const deburredName = deburr(nameWithoutExtension);

    // 2. Converte para minúsculas e substitui espaços por hífens
    let sanitizedName = deburredName.toLowerCase().replace(/\s+/g, '-');

    // 3. Remove caracteres que não são letras, números ou hífens
    sanitizedName = sanitizedName.replace(/[^a-z0-9-]/g, '');

    // 4. Remove múltiplos hífens e hífens no início/fim
    sanitizedName = sanitizedName.replace(/--+/g, '-').replace(/^-+|-+$/g, '');

    if (!sanitizedName) {
        sanitizedName = 'arquivo-sem-nome';
    }

    return sanitizedName + extension;
}
// src/utils/createInitialAdmin.js



async function createInitialAdmin() {

    try {
        const existingUsers = await User.countDocuments();
        if (existingUsers > 0) {
            console.log('[Admin Seeder] Já existe usuário cadastrado, não será criado admin.');
            return;
        }

        const adminData = {
            username: 'admin@email.com',
            nameOfTheUser: 'Administrador',
            cpf: '00000000191', // Valor exemplo válido para CPF fictício
            creaNumber: '0000000', // Pode ajustar conforme política
            position: 'Administrador do Sistema',
            userProfile: 'Admin',
            userRole: 'Militar', // Ou outro perfil se quiser
            userPG: 'Coronel',
            userDepartament: 'Chefia'
            // facility e imageProfile podem ficar ausentes se não forem required no model
        };

        const adminUser = new User(adminData);

        await User.register(adminUser, process.env.PASSWORD);
        console.log('[Admin Seeder] Usuário admin@email.com criado com sucesso!');

    } catch (error) {
        if (error.message?.includes('duplicate key')) {
            console.log('[Admin Seeder] Admin já existe (chave duplicada).');
        } else {
            console.error('[Admin Seeder] Erro ao criar admin:', error);
        }
    }
}
export { sanitizeFilenameBackend, createInitialAdmin }