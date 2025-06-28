const { elo } = require('./elo');

function obtenerJugadoresOrdenados() {
  return Object.entries(elo).sort(([, a], [, b]) => b - a);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  delay,
  obtenerJugadoresOrdenados,
};
