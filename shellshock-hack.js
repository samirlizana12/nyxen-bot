(() => {
    const settings = {
        aimbotSmoothness: 2,
        blueTeam: "#4254f5",
        redTeam: "#eb3326",
        orangeTeam: "#fca503"
    };

    let myPlayer = null;

    const clamp = (x, min, max) => Math.max(min, Math.min(max, x));

    const hexToRgb = hex => {
        const res = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return res ? {
            r: parseInt(res[1], 16) / 255,
            g: parseInt(res[2], 16) / 255,
            b: parseInt(res[3], 16) / 255,
            a: 1
        } : null;
    };

    const getNearestPlayer = (us, others) => {
        let closest = null;
        let minDist = Infinity;
        for (const them of others) {
            if (!them || them.id === us.id || them.hp <= 0 || !them.playing) continue;
            const dist = Math.hypot(us.x - them.x, us.y - them.y, us.z - them.z);
            if (dist < minDist) {
                minDist = dist;
                closest = them;
            }
        }
        return closest;
    };

    const aimAt = (us, target) => {
        const dx = target.x - us.x;
        const dy = target.y - us.y;
        const dz = target.z - us.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const pitch = clamp(-Math.asin(dy / dist), -1.5, 1.5);
        const yaw = Math.atan2(-dx, dz);
        us.pitch += (pitch - us.pitch) / settings.aimbotSmoothness;
        us.yaw += (yaw - us.yaw) / settings.aimbotSmoothness;
    };

    const applyESP = (players) => {
        for (const player of players) {
            if (!player || !player.bodyMesh) continue;
            let color = settings.orangeTeam;
            if (player.team === 1) color = settings.blueTeam;
            else if (player.team === 2) color = settings.redTeam;
            const rgb = hexToRgb(color);
            if (rgb) {
                player.bodyMesh.overlayColor = rgb;
                player.bodyMesh.setRenderingGroupId(1);
                player.bodyMesh.renderOverlay = true;
            }
        }
    };

    const hookRenderLoop = () => {
        const originalLoop = window.engine.runRenderLoop;
        window.engine.runRenderLoop = function(callback) {
            originalLoop.call(this, () => {
                try {
                    const players = Object.values(window.players || {});
                    for (const p of players) {
                        if (p && p.ws) {
                            myPlayer = p;
                            break;
                        }
                    }
                    if (!myPlayer) return;

                    const enemies = players.filter(p => p && p.id !== myPlayer.id);
                    const target = getNearestPlayer(myPlayer, enemies);
                    if (target) aimAt(myPlayer, target);

                    applyESP(enemies);
                } catch {}
                callback();
            });
        };
    };

    const waitForGame = setInterval(() => {
        if (window.engine && window.players) {
            clearInterval(waitForGame);
            hookRenderLoop();
            console.log("[+] Aimbot y ESP siempre activos.");
        }
    }, 100);
})();
