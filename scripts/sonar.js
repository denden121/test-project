/**
 * Локальный запуск SonarCloud-анализа.
 * Требуется: SONAR_TOKEN в окружении (токен из sonarcloud.io).
 * Запуск из корня репозитория: npm run sonar
 *
 * Параметры берутся из sonar-project.properties и дополняются токеном.
 */
const path = require('path');
const fs = require('fs');
const scanner = require('sonarqube-scanner');

const propsPath = path.join(__dirname, '..', 'sonar-project.properties');
const props = {};
if (fs.existsSync(propsPath)) {
  fs.readFileSync(propsPath, 'utf8')
    .split('\n')
    .forEach((line) => {
      const m = line.match(/^\s*([^#=]+)=(.*)$/);
      if (m) props[m[1].trim()] = m[2].trim();
    });
}

scanner(
  {
    serverUrl: props['sonar.host.url'] || 'https://sonarcloud.io',
    token: process.env.SONAR_TOKEN,
    options: props,
  },
  (error) => {
    if (error) {
      console.error(error);
      process.exit(1);
    }
    process.exit(0);
  }
);
