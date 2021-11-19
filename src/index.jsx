import React from 'react';
import ReactDom from 'react-dom';
import './index.scss';
import './mod';

import settings from './client/state/settings';

import App from './app/pages/App';

settings.setTheme(settings.getThemeIndex());

ReactDom.render(
  <App />,
  document.getElementById('root'),
);
