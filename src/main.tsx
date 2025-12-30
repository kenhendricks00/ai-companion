import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { SnapshotProvider } from './contexts/SnapshotContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <SnapshotProvider>
            <App />
        </SnapshotProvider>
    </React.StrictMode>
);
