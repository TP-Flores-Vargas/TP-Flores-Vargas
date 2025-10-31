import React from 'react';
import ReactDOM from 'react-dom/client';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/es';

import App from './App.jsx';
import './styles/index.css';

dayjs.extend(relativeTime);
dayjs.locale('es');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
