// Screenshot staging. One job: given ?shot=N&seed=1, put the live game into
// a composed scene that shows several systems at once — no menus, no edits.
export function applyShot(G, n) {
  const { player, traffic, police, missions, combat, hud } = G;
  G.startGame(false); // skip menu, start playing immediately
  const placeOnRoad = (x, z, heading) => {
    player.pos.set(x, 0, z); player.heading = heading;
    player.mesh.rotation.y = heading;
  };
  if (n === 1) {
    // Driving through downtown: HUD + minimap + traffic + mission marker.
    const car = traffic.cars[2] || traffic.cars[0];
    player.enterCar(car);
    car.speed = 16;
    car.pos.set(-40, 0, 40); car.heading = Math.PI / 2; car.mesh.rotation.y = car.heading;
    missions.index = 0; missions.start();
    G.money = 1250;
  } else if (n === 2) {
    // On foot near the mission marker, pedestrians and traffic around.
    // Jump mission 1 to its "drive to the garage" step so the yellow
    // beacon is live, and stand on the road looking straight at it.
    missions.index = 0; missions.start();
    missions.step = 1; missions.refreshMarker();
    placeOnRoad(120, -110, 2.16);
    G.cameraYaw = 2.16; // look toward the marker at (150,-130)
    G.cameraSnap = true;
    G.money = 450;
  } else if (n === 3) {
    // Police chase: wanted 3, interceptors on the player's tail — and one
    // in front of the camera so the chase reads in a still frame.
    const car = traffic.cars[4] || traffic.cars[0];
    player.enterCar(car);
    car.speed = 22;
    car.pos.set(0, 0, 0); car.heading = 0; car.mesh.rotation.y = 0;
    missions.index = 2; missions.start(); // 'heat' sets wanted 2…
    police.setWanted(3);                   // …then raise it to 3
    const c1 = police.spawnCopNear(0, -30);
    const c2 = police.spawnCopNear(-20, 20);
    c1.pos.set(14, 0, 42); c1.heading = Math.PI; c1.mesh.rotation.y = Math.PI;
    c2.pos.set(-16, 0, 55); c2.heading = Math.PI; c2.mesh.rotation.y = Math.PI;
    G.money = 2100;
  } else if (n === 4) {
    // Sunset at the beach: mission beacon down the sand, ocean and palms.
    G.setSunset();
    placeOnRoad(-192, 110, 0.15);
    G.cameraYaw = 0.15; // look south along the beach: beacon ahead, ocean right
    G.cameraSnap = true;
    missions.index = 1; missions.start();
    G.money = 800;
  }
  hud.setMoney(G.money);
  G.cameraSnap = true;
}
