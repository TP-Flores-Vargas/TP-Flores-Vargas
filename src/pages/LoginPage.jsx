import { useState } from 'react';

import { ShieldIcon } from '../assets/icons/index.jsx';
import Button from '../components/common/Button.jsx';
import Input from '../components/common/Input.jsx';
import Label from '../components/common/Label.jsx';
import { useAuth } from '../hooks/useAuth.js';

const LoginPage = ({ onLogin }) => {
  const auth = useAuth();
  const [email, setEmail] = useState('admin@colegio.edu.pe');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    if (email === 'admin@colegio.edu.pe' && password === 'admin123') {
      (auth?.login || onLogin)?.();
    } else {
      setError('Usuario o contraseña incorrectos.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-gray-800 rounded-lg shadow-lg modal-fade-in">
        <div className="text-center">
          <ShieldIcon className="w-16 h-16 mx-auto text-blue-500" />
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white">
            Sistema de Detección de Intrusiones
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Consola de monitoreo para colegios · Proyecto de IDS con Machine Learning
          </p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="email">Correo institucional</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@colegio.edu.pe"
            />
          </div>
          <div>
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="********"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div>
            <Button type="submit" className="w-full">
              Ingresar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
