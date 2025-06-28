const fs = require('fs');

const ELO_FILE = 'elo.json';
const STATS_FILE = 'estadisticas.json';

let elo = {};
let estadisticas = {};

// Cargar ELO
function cargarElo() {
  if (fs.existsSync(ELO_FILE)) {
    elo = JSON.parse(fs.readFileSync(ELO_FILE, 'utf-8'));
  } else {
    elo = {};
  }

  if (fs.existsSync(STATS_FILE)) {
    estadisticas = JSON.parse(fs.readFileSync(STATS_FILE, 'utf-8'));
  } else {
    estadisticas = {};
  }
}

// Guardar ELO y estadísticas
function guardarElo() {
  fs.writeFileSync(ELO_FILE, JSON.stringify(elo, null, 2));
  fs.writeFileSync(STATS_FILE, JSON.stringify(estadisticas, null, 2));
}

// Obtener ELO
function obtenerElo(id) {
  return elo[id] || 1000;
}

// Actualizar nickname en Discord
function actualizarNombre(guild, jugador) {
  const miembro = guild.members.cache.get(jugador.id);
  if (!miembro) return;
  const nuevoNick = `${miembro.user.username} [${obtenerElo(jugador.id)}]`;
  miembro.setNickname(nuevoNick).catch(() => {});
}

// Actualizar stats de victoria o derrota
function actualizarStats(id, cambioElo, victoria) {
  if (!estadisticas[id]) {
    estadisticas[id] = { wins: 0, losses: 0 };
  }

  if (victoria) {
    estadisticas[id].wins += 1;
  } else {
    estadisticas[id].losses += 1;
  }

  elo[id] = obtenerElo(id) + cambioElo;
}

module.exports = {
  cargarElo,
  guardarElo,
  obtenerElo,
  actualizarNombre,
  actualizarStats,
  estadisticas,
  elo,
};
