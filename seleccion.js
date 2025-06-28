const { crearSala } = require('./crearSala');

let capitanes = {};       // modo -> [cap1, cap2]
let equipos = {};         // partidaId -> { A: [], B: [] }
let seleccionando = {};   // partidaId -> id del que elige

// Obtener el equipo de un capitán
function obtenerEquipoDeCapitan(partidaId, userId) {
  if (equipos[partidaId]?.A.includes(userId)) return 'A';
  if (equipos[partidaId]?.B.includes(userId)) return 'B';
  return null;
}

// Verifica si un usuario ya está en un equipo
function yaSeleccionado(partidaId, userId) {
  return equipos[partidaId]?.A.includes(userId) || equipos[partidaId]?.B.includes(userId);
}

// Alternar selección entre capitanes
function alternarSeleccion(pid, cap1, cap2) {
  seleccionando[pid] = (seleccionando[pid] === cap1) ? cap2 : cap1;
}

async function manejarSeleccion(message, partidas, modoActual, partidaId, client) {
  const autor = message.author.id;
  const mencionado = message.mentions.users.first();
  if (!mencionado) return;

  const pid = partidaId;
  const cap1 = capitanes[modoActual][0];
  const cap2 = capitanes[modoActual][1];
  const todosJugadores = partidas.find(p => p.id === pid)?.jugadores || [];

  if (!todosJugadores.includes(mencionado.id)) return;
  if (yaSeleccionado(pid, mencionado.id)) return;

  const equipo = obtenerEquipoDeCapitan(pid, autor);
  if (!equipo) return;

  equipos[pid][equipo].push(mencionado.id);
  alternarSeleccion(pid, cap1, cap2);

  const equipoA = equipos[pid].A.length;
  const equipoB = equipos[pid].B.length;
  const total = modoActual === '2v2' ? 2 : 3;

  const canal = message.channel;

  // Si ya se completaron los equipos
  if (equipoA >= total && equipoB >= total) {
    canal.send(`✅ Equipos formados:\n🔴 A: ${equipos[pid].A.map(id => `<@${id}>`).join(', ')}\n🔵 B: ${equipos[pid].B.map(id => `<@${id}>`).join(', ')}`);
    const link = await crearSala(modoActual);
    if (link) {
      const todos = [...equipos[pid].A, ...equipos[pid].B];
      todos.forEach(uid => client.users.send(uid, `🎮 Sala ${modoActual} (Partida #${pid}): ${link}`));
    } else {
      canal.send('❌ Error al crear sala.');
    }
  } else {
    canal.send(`✅ Selección realizada. Ahora le toca a <@${seleccionando[pid]}>.`);
  }
}

// Preparar partida con capitanes y equipos vacíos
function inicializarSeleccion(modo, jugadores, partidaId) {
  capitanes[modo] = [jugadores[0], jugadores[1]];
  equipos[partidaId] = { A: [jugadores[0]], B: [jugadores[1]] };
  seleccionando[partidaId] = jugadores[0]; // El primer capitán empieza
}

module.exports = {
  capitanes,
  equipos,
  seleccionando,
  manejarSeleccion,
  inicializarSeleccion
};
