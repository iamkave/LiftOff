const G0 = 9.80665;

function clamp(value, lo, hi) {
    return Math.max(lo, Math.min(value, hi));
}

function totalMass(dry, fuel) {
    return dry + fuel;
}

function weight(mass, g) {
    return mass * g;
}

function thrust(throttle, tMax, fuel) {
    if (fuel <= 0) {
        return 0;
    }

    return throttle * tMax;
}

function twr(thrustN, mass, g) {
    return thrustN / weight(mass, g);
}

function massFlow(thrustN, isp) {
    return thrustN / (isp * G0);
}

function step(state, controls, params, dt) {
    const mass = totalMass(params.dryMass, state.fuel)
    const thrst = thrust(controls.throttle, params.tMax, state.fuel)
    let rho = airDensity(state.y, params.rho0, params.H);
    let dForce = dragForce(state.vy, rho, params.cd, params.area);

    let acceleration = (thrst / mass) - params.g + (dForce / mass);

    if (state.y <= 0 && acceleration < 0) {
        acceleration = 0
    }
    

    let newVel = state.vy + acceleration * dt;
    let newPos = state.y + newVel * dt;
    let newFuel = clamp(state.fuel - massFlow(thrst, params.isp) * dt, 0, state.fuel);
    let impactSpeed = state.impactSpeed;
    let landed = state.landed;

    if (newPos < 0) {
        impactSpeed = Math.abs(newVel)
        landed = true;
        newPos = 0;
        newVel = 0;
    }

    return {...state, y: newPos, vy: newVel, fuel: newFuel, impactSpeed, landed}
}

function checkOutcome(state, params) {
    if (state.impactSpeed <= 5 && state.landed === true) {
        return "successful_landing";
    } else if (state.impactSpeed >= 15) {
        return "crashed";
    } else {
        return "flying";
    }
}


function airDensity(y, rho0, H) {
    return rho0 * Math.exp(-y / H);
}


function dragForce(v, rho, cd, area) {
    const magnitude = 0.5 * rho * cd * area * v * v;
    return -Math.sign(v) * magnitude;
}