// Archivo principal del bot con todos los comandos integrados

const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const crearSala = require('./crearSala');
const { cargarElo, guardarElo, obtenerElo, actualizarNombre, estadisticas, actualizarStats, elo } = require('./elo');
const { delay, formatearNombre, obtenerJugadoresOrdenados } = require('./util');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const PREFIX = '=';
const MOD_ROLE_ID = '1387221398463975534';
const canalesPermitidos = {
  '1v1': '1377000794179633172',
  '2v2': '1377000851658506301',
  '3v3': '1387209735803113714',
};

let colas = { '1v1': [], '2v2': [], '3v3': [] };
let partidas = [];
let partidaId = fs.existsSync('partidaId.json') ? parseInt(fs.readFileSync('partidaId.json', 'utf-8')) : 1;
let capitanes = {};
let equipos = {};
let seleccionando = {};
const resultadosPrevios = {}; // Evita duplicados en call

function enviarEmbed(channel, titulo, descripcion) {
  const embed = new EmbedBuilder().setTitle(titulo).setDescription(descripcion).setColor(0xffcc00);
  channel.send({ embeds: [embed] });
}

function actualizarNick(member, elo) {
  if (!member || !member.manageable) return;
  const nombreBase = member.displayName.replace(/\[\d+\]$/, '').replace(/^ɴʏxeɴ 〄 /, '').trim();
  member.setNickname(`ɴʏxeɴ 〄 ${nombreBase} [${elo}]`).catch(() => {});
}

client.on('messageCreate', async message => {
  try {
    console.log(`📥 Comando recibido: ${message.content}`);
    
    if (!message.content.startsWith(PREFIX) || message.author.bot) return;
    const [comando, ...args] = message.content.slice(PREFIX.length).trim().split(/\s+/);

  if (['1v1', '2v2', '3v3'].includes(message.channel.name)) {
  if (comando === 'j') {
  const modo = message.channel.name;
  if (colas[modo].includes(message.author.id)) {
    return enviarEmbed(message.channel, '⚠️ Ya estás en cola', `<@${message.author.id}> ya está en la cola de ${modo}.`);
  }

  // Asegurar que tenga ELO guardado
  if (!elo[message.author.id]) {
    elo[message.author.id] = 1000;
    guardarElo();
  }

  colas[modo].push(message.author.id);
  enviarEmbed(message.channel, '✅ Nuevo jugador', `<@${message.author.id}> se ha unido a la cola de ${modo}.`);

  // (y luego continúa como ya lo tienes)


    const requeridos = modo === '1v1' ? 2 : modo === '2v2' ? 4 : 6;
    if (colas[modo].length >= requeridos) {
      const jugadores = colas[modo].splice(0, requeridos);
      partidas.push({ id: partidaId, modo, jugadores });
      fs.writeFileSync('partidaId.json', `${++partidaId}`);
      const link = await crearSala(modo);
      partidas[partidas.length - 1].link = link;

      jugadores.forEach(uid => {
        client.users.send(uid, `🎮 Sala ${modo} (Partida #${partidaId - 1}): ${link}`);
      });

      enviarEmbed(message.channel, '🔥 Partida iniciada', `Modo: ${modo}\nJugadores: ${jugadores.map(id => `<@${id}>`).join(', ')}\n🔗 Link: ${link}`);
    }
  }
}


  // =l -> tu ELO
  if (comando === 'l') {
    const puntos = obtenerElo(message.author.id) || 1000;
    return enviarEmbed(message.channel, '📊 Tu ELO', `<@${message.author.id}> tiene ${puntos} puntos.`);
  }

  // =q -> ver quiénes están en cola
  if (comando === 'q') {
    const respuestas = Object.entries(colas).map(([modo, cola]) => {
      const jugadores = cola.map(id => `<@${id}>`).join(', ') || 'Vacío';
      return `**${modo.toUpperCase()}**: ${jugadores}`;
    });
    return enviarEmbed(message.channel, '🎯 Jugadores en cola', respuestas.join('\n'));
  }

  // =call -> resultado partida
  if (comando === 'call') {
    if (!message.member.roles.cache.has(MOD_ROLE_ID)) return;
    const [id, equipoGanador] = args;
    const partida = partidas.find(p => p.id === id);
    if (!partida) return enviarEmbed(message.channel, '❌ Error', 'Partida no encontrada.');

    let ganadores = [], perdedores = [];
    const clave = `${id}`;

    // anular call anterior si existe
    if (resultadosPrevios[clave]) {
      resultadosPrevios[clave].ganadores.forEach(id => estadisticas[id].wins--);
      resultadosPrevios[clave].perdedores.forEach(id => estadisticas[id].losses--);
    }

    if (partida.modo === '1v1') {
      const [j1, j2] = partida.jugadores;
      if (equipoGanador === 't1') [ganadores, perdedores] = [[j1], [j2]];
      else if (equipoGanador === 't2') [ganadores, perdedores] = [[j2], [j1]];
      else return;
    } else {
      const eq = equipos[id];
      if (!eq) return;
      if (equipoGanador === 't1') [ganadores, perdedores] = [eq.A, eq.B];
      else if (equipoGanador === 't2') [ganadores, perdedores] = [eq.B, eq.A];
      else return;
    }

    const puntos = partida.modo === '1v1' ? 20 : partida.modo === '2v2' ? 30 : 40;
    const perdidos = Math.floor(puntos / 2);

    ganadores.forEach(id => actualizarStats(id, puntos, true));
    perdedores.forEach(id => actualizarStats(id, -perdidos, false));

    resultadosPrevios[clave] = { ganadores, perdedores };

    guardarElo();
    for (const id of [...ganadores, ...perdedores]) {
      const miembro = await message.guild.members.fetch(id).catch(() => {});
      if (miembro) actualizarNick(miembro, obtenerElo(id));
    }

    enviarEmbed(message.channel, `✅ Resultados #${id}`, `🏆 Ganadores: ${ganadores.map(id => `<@${id}>`).join(', ')}\n💀 Perdedores: ${perdedores.map(id => `<@${id}>`).join(', ')}`);
  }

  // =lb -> leaderboard con botones
  if (comando === 'lb') {
    const jugadores = obtenerJugadoresOrdenados();
    let pagina = 0;

    const mostrarPagina = async pagina => {
      const inicio = pagina * 10;
      const fin = inicio + 10;
      const top = jugadores.slice(inicio, fin).map(([id, puntos], i) => `#${inicio + i + 1} <@${id}>: ${puntos} pts`).join('\n') || 'Sin datos';
      const embed = new EmbedBuilder().setTitle('🏆 Leaderboard').setDescription(top).setColor(0x00ff99);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('prev').setLabel('⏪').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('next').setLabel('⏩').setStyle(ButtonStyle.Primary)
      );
      const msg = await message.channel.send({ embeds: [embed], components: [row] });

      const collector = msg.createMessageComponentCollector({ time: 60000 });
      collector.on('collect', async i => {
        if (i.user.id !== message.author.id) return i.reply({ content: 'No es tu leaderboard.', ephemeral: true });
        if (i.customId === 'prev') pagina = Math.max(pagina - 1, 0);
        else if (i.customId === 'next') pagina++;
        i.deferUpdate();
        mostrarPagina(pagina);
        collector.stop();
        msg.delete().catch(() => {});
      });
    };

    mostrarPagina(pagina);
  }

  // =i o =i @alguien
  if (comando === 'i') {
    const mencionado = message.mentions.users.first() || message.author;
    const stats = estadisticas[mencionado.id] || { wins: 0, losses: 0 };
    const elo = obtenerElo(mencionado.id) || 1000;
    const total = stats.wins + stats.losses;
    const winRate = total ? ((stats.wins / total) * 100).toFixed(1) : '0';
    const embed = new EmbedBuilder()
      .setTitle(`📈 Estadísticas de ${mencionado.username}`)
      .setDescription(`🏅 ELO: ${elo}\n✅ Victorias: ${stats.wins}\n❌ Derrotas: ${stats.losses}\n📊 Total partidas: ${total}\n💯 Win Rate: ${winRate}%`)
      .setColor(0x3366ff);
    message.channel.send({ embeds: [embed] });
  }

  // =compare @alguien o =compare @a @b
  if (comando === 'compare') {
    const m = message.mentions.users;
    let a = m.at(0), b = m.at(1);
    if (!a) return;
    if (!b) b = message.author;
    const statsA = estadisticas[a.id] || { wins: 0, losses: 0 };
    const statsB = estadisticas[b.id] || { wins: 0, losses: 0 };
    const eloA = obtenerElo(a.id) || 1000;
    const eloB = obtenerElo(b.id) || 1000;

    const campos = [
      { nombre: 'ELO', a: eloA, b: eloB },
      { nombre: 'Wins', a: statsA.wins, b: statsB.wins },
      { nombre: 'Losses', a: statsA.losses, b: statsB.losses },
    ];

    const resultado = campos.map(c => {
      const estrellaA = c.a > c.b ? '⭐' : '';
      const estrellaB = c.b > c.a ? '⭐' : '';
      return `${c.nombre}:\n- ${a.username}: ${c.a} ${estrellaA}\n- ${b.username}: ${c.b} ${estrellaB}`;
    });

    const embed = new EmbedBuilder().setTitle(`⚔️ Comparación entre ${a.username} y ${b.username}`)
      .setDescription(resultado.join('\n\n')).setColor(0xdd66ff);
    message.channel.send({ embeds: [embed] });
  }

  // =lg y =lg2 -> partidas recientes
  if (comando === 'lg') {
    const p = partidas[partidas.length - 1];
    if (!p) return enviarEmbed(message.channel, 'ℹ️ Última partida', 'No hay partidas registradas.');
    const jugadores = p.jugadores.map(id => `<@${id}>`).join(', ');
    enviarEmbed(message.channel, `📁 Partida #${p.id}`, `Modo: ${p.modo}\nJugadores: ${jugadores}`);
  }

  if (comando === 'lg2') {
    const p = partidas[partidas.length - 2];
    if (!p) return enviarEmbed(message.channel, 'ℹ️ Anterior partida', 'No hay suficiente historial.');
    const jugadores = p.jugadores.map(id => `<@${id}>`).join(', ');
    enviarEmbed(message.channel, `📁 Partida #${p.id}`, `Modo: ${p.modo}\nJugadores: ${jugadores}`);
  }

  if (comando === 'cancel') {
  if (!message.member.roles.cache.has(MOD_ROLE_ID)) return;
  const id = args[0];
  const index = partidas.findIndex(p => p.id == id);
  if (index === -1) return enviarEmbed(message.channel, '❌ Error', 'Partida no encontrada.');

  partidas.splice(index, 1);
  enviarEmbed(message.channel, '🚫 Partida cancelada', `Se canceló la partida #${id}`);
}

if (comando === 'forzar') {
  if (!message.member.roles.cache.has(MOD_ROLE_ID)) return;
  const modo = args[0];
  const mencionados = message.mentions.users.map(u => u.id);

  const requeridos = modo === '1v1' ? 2 : modo === '2v2' ? 4 : 6;
  if (!['1v1', '2v2', '3v3'].includes(modo)) return enviarEmbed(message.channel, '❌ Error', 'Modo inválido.');
  if (mencionados.length !== requeridos) return enviarEmbed(message.channel, '❌ Error', `Debes mencionar exactamente ${requeridos} jugadores.`);

  partidas.push({ id: partidaId, modo, jugadores: mencionados });
  const link = await crearSala(modo);
  partidas[partidas.length - 1].link = link;
  fs.writeFileSync('partidaId.json', `${++partidaId}`);

  mencionados.forEach(uid => client.users.send(uid, `🎮 Sala ${modo} (Partida #${partidaId - 1}): ${link}`));
  enviarEmbed(message.channel, '🔥 Partida forzada', `Modo: ${modo}\nJugadores: ${mencionados.map(id => `<@${id}>`).join(', ')}\n🔗 Link: ${link}`);
}

if (comando === 'r') {
  const ultima = partidas[partidas.length - 1];
  if (!ultima) return enviarEmbed(message.channel, '⚠️ Sin historial', 'No hay partidas recientes.');
  enviarEmbed(message.channel, `🔄 Última sala`, `Modo: ${ultima.modo}\nJugadores: ${ultima.jugadores.map(id => `<@${id}>`).join(', ')}\n🔗 Link: ${ultima.link}`);
}


  // =shuffle id -> mezclar capitanes
  if (comando === 'shuffle') {
    const id = args[0];
    const partida = partidas.find(p => p.id === id);
    if (!partida) return enviarEmbed(message.channel, '❌ Error', 'Partida no encontrada.');
    const jugadores = [...partida.jugadores];
    const nuevo = jugadores.sort(() => Math.random() - 0.5);
    capitanes[partida.modo] = [nuevo[0], nuevo[1]];
    seleccionando[partida.id] = nuevo[0];
    equipos[partida.id] = { A: [nuevo[0]], B: [nuevo[1]] };
    enviarEmbed(message.channel, `🔀 Shuffle realizado en partida #${id}`, `Capitanes: <@${nuevo[0]}> vs <@${nuevo[1]}>\n<@${nuevo[0]}>, selecciona usando =p @jugador`);
  }
  if (comando === 'p') {
  const partida = partidas.find(p => p.jugadores.includes(message.author.id));
  if (!partida || seleccionando[partida.id] !== message.author.id) return;

  const mencionado = message.mentions.users.first();
  if (!mencionado || !partida.jugadores.includes(mencionado.id)) return;

  const usados = [...equipos[partida.id].A, ...equipos[partida.id].B];
  if (usados.includes(mencionado.id)) return;

  const equipoActual = equipos[partida.id].A.includes(message.author.id) ? 'A' : 'B';
  equipos[partida.id][equipoActual].push(mencionado.id);

  const capitan1 = capitanes[partida.modo][0];
  const capitan2 = capitanes[partida.modo][1];

  const jugadoresDisponibles = partida.jugadores.filter(id => ![...equipos[partida.id].A, ...equipos[partida.id].B].includes(id) && !capitanes[partida.modo].includes(id));

  // Lógica del pick inteligente
  if (partida.modo === '2v2') {
    if (jugadoresDisponibles.length === 1) {
      const restante = jugadoresDisponibles[0];
      const equipoRestante = equipoActual === 'A' ? 'B' : 'A';
      equipos[partida.id][equipoRestante].push(restante);

      const todos = [...equipos[partida.id].A, ...equipos[partida.id].B];
      todos.forEach(uid => client.users.send(uid, `🎮 Sala ${partida.modo} (Partida #${partida.id}): ${partida.link}`));

      return enviarEmbed(message.channel, '✅ Equipos formados', `🟥 Team 1: ${equipos[partida.id].A.map(id => `<@${id}>`).join(', ')}\n🟦 Team 2: ${equipos[partida.id].B.map(id => `<@${id}>`).join(', ')}`);
    }
  }

  if (partida.modo === '3v3') {
    const totalA = equipos[partida.id].A.length;
    const totalB = equipos[partida.id].B.length;

    if (totalA === 3 && totalB === 3) {
      const todos = [...equipos[partida.id].A, ...equipos[partida.id].B];
      todos.forEach(uid => client.users.send(uid, `🎮 Sala ${partida.modo} (Partida #${partida.id}): ${partida.link}`));

      return enviarEmbed(message.channel, '✅ Equipos formados', `🟥 Team 1: ${equipos[partida.id].A.map(id => `<@${id}>`).join(', ')}\n🟦 Team 2: ${equipos[partida.id].B.map(id => `<@${id}>`).join(', ')}`);
    }

    // Reglas de turnos
    const pickOrden = [
      capitan1,
      capitan2,
      capitan2
    ];

    const totalPicks = [...equipos[partida.id].A, ...equipos[partida.id].B].length - 2;
    const siguiente = pickOrden[totalPicks];
    if (siguiente) seleccionando[partida.id] = siguiente;
  } else {
    // Si quedan más jugadores y no es pick inteligente final, pasar turno
    seleccionando[partida.id] = capitanes[partida.modo].find(id => id !== message.author.id);
  }

  // Mostrar embed actualizado
  const disponibles = partida.jugadores.filter(id => ![...equipos[partida.id].A, ...equipos[partida.id].B].includes(id) && !capitanes[partida.modo].includes(id));
  const lista = disponibles.map(id => `<@${id}>`).join('\n') || '*Ninguno*';
  enviarEmbed(message.channel, '📋 Selección en curso', `🎖 Capitanes: <@${capitan1}> vs <@${capitan2}>\n👥 Jugadores disponibles:\n${lista}\n\n🎯 Turno de <@${seleccionando[partida.id]}>`);
}

  } catch (err) {
    console.error("❌ Error ejecutando comando:", err);
    message.channel.send('Hubo un error al ejecutar el comando. Revisa los logs.');
  }
});

client.once('ready', () => {
  console.log(`🤖 Bot conectado como ${client.user.tag}`);
  cargarElo();
});

client.login(process.env.TOKEN);

