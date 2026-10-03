# LiftOff
#### Video Demo: https://www.youtube.com/watch?v=EgQgic8u5F8
#### Description:

LiftOff is a one dimensional rocket flight simulator built in HTML, CSS and JavaScript. Its main purpose is to test and demonstrate how a rocket with real specs can function in a relative simulation environment to the real-world physics.

LiftOff is one dimensional, given that a rocket mostly goes upward inside an atmosphere. Therefore, you have a throttle to power the engine of the rocket. In a one dimensional environment, it's impossible to implement all the real-world physics to the simulation. However, I applied most of the fundamentals to it, so it'd have a real experience.

This project consists of four total code files and three asset files; of which:
1. `index.html` is the only HTML file presenting all the program in the UI.
2. `styles.css` is served as the only file stylizing all the program.
3. `script.js` is the interactivity core of the program which also communicates with the file `physics.js`
4. `physics.js` provides `script.js` with the real-world rocketry and physics fundamentals.
5. To provide an immersive experience, this project also contains a few assets:
    - `rocket.svg`: The 2D rocket model you see in the simulation.
    - `flame.png`: The sprite sheet animating the flame coming out of the engine's exhaust.
    - `crash.ogg`: A crash sound effect by https://pixabay.com/users/dragon-studio-38165424/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=386181, played when the rocket crashes to the ground.

###### Physics Used in `physics.js`

1. Weight calculation happens using the given mass and the current gravity.
    `m × G`
2. Thrust in realtime is calculated by multiplying the current throttle value and max thrust.
    `throttle × tMax`
3. TWR (Thrust-to-Weight Ratio) reveals whether a rocket engine is able to lift a rocket with the given thrust and weight.
    `thrust (N) ÷ weight`
4. Mass flow shows how much fuel the engine burns every second in kg/s. Calculated using the given thrust, Isp and standard gravity (g₀ = 9.80665).
    `thrust (N) ÷ (Isp × g₀)`
5. Impact speed reveals how hard the rocket has crashed to the ground. This way we can decide whether it's a soft touchdown or a crash. The way it's calculated is by retrieving the vertical velocity of the rocket when the Y position is negative.
6. Air density is an essential part of realism inside the simulator which brings the drag force. It's calculated using air density at zero altitude (rho0), Euler's number and the rocket's altitude.
    `rho0 × e⁻ʸ/ᴴ`
7. Drag force is air resistance and it pushes against whatever direction the rocket is moving. It's calculated using rocket's vertical velocity, air density at the rocket's current altitude, drag coefficient and the rocket's frontal area.
    `F_drag = ½ × ρ × Cd × A × v²`

To create the feel of absolute realism, `physics.js` does 120 calculations per second.

###### The purpose of `script.js`

This script bridges the physics and the GUI, making the simulator actually work and interactable. It registers all the essential elements and other configurations inside variables. Without `script.js` the simulator would not even render the canvas.

Speaking of canvas, they are the displayer of the simulation. Rendering them is difficult and often bug-prone. Nevertheless, I was able to code this amazing experience you can have with it.

`script.js` calls functions from `physics.js` to perform the calculations it needs and retrieve their results. Later, it renders the canvas using those results. For each frame in canvas, we have to re-render it, which is an inevitable part of the animator.

This file also has its own side of basic physics calculations aside from `physics.js`, such as:
1. Calculating the sky gradient as the rocket is going upward.
2. Calculating the Max-Q which is the moment of maximum dynamic pressure, the peak aerodynamic stress on the rocket during ascent. `q = ½ × ρ × v²`
3. Calculating the frequencies to produce a realistic and continuous engine rumble sound.
4. Selecting the right air density at zero altitude (rho0) for each planet.
5. Doing simple math for calculating the throttle value.

###### The design of the GUI


**Why a two-panel design?**

A side-by-side panel design for the GUI was the right call, since you need to watch every change with a single glance at the screen.

**Why not a wider canvas?**

Because enlarging the canvas further than its current width would make it look ugly and unnecessary. A one dimensional simulator does not need a full-screen size.

**Why the simulation doesn't have orbital physics**

For orbital mechanisms, a simulator must be at least in two dimensions, something a one dimensional simulator cannot do.

---

I want to be transparent about what tools I used to build this project. I used Claude AI to help me learn the physics needed for this simulator. The canvas rendering, the sky gradient and some other minor configurations were also done with the help of AI. Other things such as variable declaration, event listeners (and their content), GUI design, graphs, flame animation and rocket model were by myself.

---

###### How to use the simulator?

To use the simulator, first define your rocket's specs in the dialog that appears, or keep the defaults, and click the **Simulate** button. Then click **Launch** and raise the throttle slider. Watch whether your TWR rises above the dashed line on the graph at max thrust. If it does not, your engine's thrust is insufficient for the rocket's total weight at launch.