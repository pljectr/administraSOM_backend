import deburr from 'lodash/deburr.js'; // Precisaremos do deburr no backend também 
 
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

export {sanitizeFilenameBackend}