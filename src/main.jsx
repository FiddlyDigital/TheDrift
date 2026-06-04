import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './ui/App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(<App />);

if ('serviceWorker' in navigator) {
  var hadController = !!navigator.serviceWorker.controller;
  var swReloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (!hadController || swReloaded) return;
    swReloaded = true;
    window.location.reload();
  });
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').catch(function () {});
  });
}
