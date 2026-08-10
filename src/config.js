/** Em produção com nginx, deixe vazio para usar /api na mesma origem (proxy). */
export const API_URL = import.meta.env.VITE_API_URL ?? '';
