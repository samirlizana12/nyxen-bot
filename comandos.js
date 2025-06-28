// comandos.js
const { crearSala } = require('./crearSala');
const { actualizarElo, obtenerElo, actualizarNombre } = require('./elo');
const { manejarSeleccion, iniciarSeleccion } = require('./seleccion');

let colas = {
  '1v1': [],
  '2v2': [],
  '3v3': []
};
let partidas = [];
let partidaId = 1;
let capitanes = {};
let equipos = {};
let seleccionando = {};

const MOD_ROLE_ID = '1387221398463975534';

function getModoDesdeCanal(channelId, canalesPermitidos) {
  return Object.keys(canalesPermitidos).find(m => canalesPermitidos[m] === channelId);
}

async function manejarJoin(message, canalesPermitidos, client) {
  const modo = getModoDesdeCanal(message.channel.id, canalesPermitidos);
  if (!modo) return;
  const cola = colas[modo];
  if (!cola.includes(message.author.id)) cola.push(message.author.id);
  const requerido = modo === '1v1' ? 2 : modo === '2v2' ? 4 : 6;
  message.channel.send(`<@${message.author.id}> entró a la cola (${cola.length}/${requerido})`);
  if (cola.length === requerido) {
    const jugadores = [...cola];
    colas[modo] = [];
    const partida = partidaId.toString().padStart(4, '0');
    partidaId++;

    if (modo === '1v1') {
      const link = await crearSala(modo);
      if (link) {
        jugadores.forEach(u => client.users.send(u, `🎮 Sala ${modo} (Partida #${partida}): ${link}`));
      } else {
        message.channel.send('❌ Error al crear la sala.');
      }
      partidas.push({ id: partida, modo, jugadores, ganadores: [], perdedores: [] });
    } else {
      capitanes[modo] = [jugadores[0], jugadores[1]];
      equipos[partida] = { A: [jugadores[0]], B: [jugadores[1]] };
      seleccionando[partida] = jugadores[0];
      message.channel.send(`🎮 Partida #${partida} creada. Capitanes: <@${jugadores[0]}> vs <@${jugadores[1]}>. <@${jugadores[0]}>, selecciona usando =p @jugador`);
      partidas.push({ id: partida, modo, jugadores, ganadores: [], perdedores: [] });
    }
  }
}

async function manejarPick(message) {
  return manejarSeleccion(message, partidas, capitanes, equipos, seleccionando);
}

async function manejarCall(message, args) {
  if (!message.member.roles.cache.has(MOD_ROLE_ID)) return;
  const [id, ganadoresStr, perdedoresStr] = args;
  const ganadores = ganadoresStr.replace(/<@|>/g, '').split(',');
  const perdedores = perdedoresStr.replace(/<@|>/g, '').split(',');
  const partida = partidas.find(p => p.id === id);
  if (!partida) return;
  const modo = partida.modo;
  const puntos = modo === '1v1' ? 20 : modo === '2v2' ? 30 : 40;
  const perdidos = puntos / 2;

  ganadores.forEach(id => actualizarElo(id, puntos));
  perdedores.forEach(id => actualizarElo(id, -perdidos));
  [...ganadores, ...perdedores].forEach(id => actualizarNombre(message.guild, { id }));
  message.channel.send(`✅ Resultados de partida #${id} registrados.`);
}

module.exports = {
  manejarJoin,
  manejarPick,
  manejarCall
};
