import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './ui/App.jsx';
import './styles.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return React.createElement('div', {
        style: {
          padding: '2rem', fontFamily: 'monospace', fontSize: '14px',
          background: '#fff', color: '#c00', whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }
      }, 'Error: ' + this.state.error.message + '\n\n' + this.state.error.stack);
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  React.createElement(ErrorBoundary, null, React.createElement(App))
);

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
