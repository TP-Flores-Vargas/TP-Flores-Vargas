import { hashPassword } from '../utils/security.js';

export const users = [
  {
    id: 'u-admin',
    email: 'admin@colegio.edu.pe',
    name: 'Administrador de Seguridad',
    role: 'Administrador',
    passwordHash: hashPassword('admin123'),
    notificationEmail: 'soporte@colegio.edu.pe',
    mustChangePassword: false,
    createdAt: new Date('2024-01-15T08:30:00Z').toISOString(),
    lastPasswordChange: new Date('2024-12-01T14:20:00Z').toISOString(),
  },
];

export function findUserByEmail(email) {
  return users.find((user) => user.email.toLowerCase() === email.toLowerCase());
}

export function findUserById(id) {
  return users.find((user) => user.id === id);
}
