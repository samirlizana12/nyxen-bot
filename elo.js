const fs = require('fs');

const ELO_FILE = 'elo.json';
let elo = {};

function cargarElo() {
  if (fs.existsSync(ELO_FILE)) {
    elo = JSON.parse(fs.readFileSync(ELO_FILE, 'utf-8'));
  } else {
    elo = {};
  }
}

function guardarElo() {
  fs.writeFileSync(ELO_FILE, JSON.stringify(elo, null, 2));
}

function obtenerElo(id) {
  return elo[id] || 1000;
}

function actualizarNombre(guild, jugador) {
  const miembro = guild.members.cache.get(jugador.id);
  if (!miembro) return;
  const nuevoNick = `${miembro.user.username} [${obtenerElo(jugador.id)}]`;
  miembro.setNickname(nuevoNick).catch(() => {});
}

module.exports = {
  cargarElo,
  guardarElo,
  obtenerElo,
  actualizarNombre,
  elo, // <- exportamos para poder usar el objeto directamente
};
