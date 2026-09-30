/**
 * Fluted Glass 「가로·세로」 모양의 fragment shader 원문.
 *
 * `.glsl` 파일이 아니라 모듈 상수인 이유는 번들러다 — Turbopack의 `?raw` 규칙은 이 버전에서
 * default export를 만들지 않아 shader가 통째로 `undefined`로 들어갔다. public/에 두면
 * 고정 URL로 내려받히므로 그쪽으로도 돌아가지 않는다.
 */
export default `// Shadertoy-style fragment shader; the Graphic Studio host supplies uniforms.
// Linear god rays + horizontal LinesIrregular fluted glass.
// The radial sibling indexes rays and ribs by angle; this one indexes them by the
// across-axis coordinate, so there is no atan seam and no origin singularity.

#define PI 3.14159265359
#define TAU 6.28318530718

uniform vec2 uSource;
uniform float uZoom;
uniform float uTilt;
uniform float uVignette;
uniform vec3 uBloomColor;
uniform vec3 uRayColor1;
uniform vec3 uRayColor2;
uniform vec3 uRayColor3;
uniform vec3 uRayColor4;
uniform vec3 uRayColor5;
uniform vec3 uRayBackgroundColor;
uniform float uRayBloom;
uniform float uGodrayIntensity;
uniform float uGodrayDensity;
uniform float uRaySpotty;
uniform float uRayMidSize;
uniform float uRayMidIntensity;
uniform float uGodraySpeed;
uniform float uFrameOffsetMs;
uniform float uRayScale;
uniform float uRayRotation;
uniform float uAxisFalloff;
uniform float uFlowSpeed;
uniform float uPaletteShift;
uniform float uPaletteDrift;
uniform float uPulseIntensity;
uniform float uPulseSpeed;
uniform float uPulseDensity;
uniform float uPulseWidth;
uniform float uGlassSize;
uniform float uRibCurve;
uniform float uGlassAngle;
uniform vec2 uGlassOriginOffset;
uniform float uGlassOffset;
uniform float uGlassSpeed;
uniform vec2 uGlassDrift;
uniform vec2 uGlassDriftSpeed;
uniform float uGlassDistortion;
uniform float uGlassEdgeSoftness;
uniform float uGlassBlur;
uniform float uGlassScattering;
uniform float uGlassHighlights;
uniform float uGlassShadows;
uniform int uDistortionShape;

// ------------------------------------------------------------
// Controls
// ------------------------------------------------------------

#define GODRAY_COLOR_1 uRayColor1
#define GODRAY_COLOR_2 uRayColor2
#define GODRAY_COLOR_3 uRayColor3
#define GODRAY_COLOR_4 uRayColor4
#define GODRAY_COLOR_5 uRayColor5
#define GODRAY_COLOR_BACK uRayBackgroundColor

#define GODRAY_BLOOM uRayBloom
#define GODRAY_SPOTTY uRaySpotty
#define GODRAY_MID_SIZE uRayMidSize
#define GODRAY_MID_INTENSITY uRayMidIntensity

#define GODRAY_FRAME uFrameOffsetMs
#define GODRAY_SCALE uRayScale
#define GODRAY_ROTATION uRayRotation

#define AXIS_FALLOFF uAxisFalloff
#define FLOW_SPEED uFlowSpeed
#define PALETTE_SHIFT uPaletteShift
#define PALETTE_DRIFT uPaletteDrift
#define PULSE_INTENSITY uPulseIntensity
#define PULSE_SPEED uPulseSpeed
#define PULSE_DENSITY uPulseDensity
#define PULSE_WIDTH uPulseWidth

// uGlassSize: 0 = many narrow ribs, 1 = fewer wide ribs
// RIB_CURVE: <1 narrow to wide, 1 uniform, >1 wide to narrow
#define RIB_CURVE uRibCurve
#define GLASS_ANGLE uGlassAngle
#define GLASS_ORIGIN_OFFSET_X uGlassOriginOffset.x
#define GLASS_ORIGIN_OFFSET_Y uGlassOriginOffset.y
#define GLASS_OFFSET uGlassOffset
#define GLASS_SPEED uGlassSpeed
#define GLASS_DRIFT_X uGlassDrift.x
#define GLASS_DRIFT_Y uGlassDrift.y
#define GLASS_DRIFT_SPEED_X uGlassDriftSpeed.x
#define GLASS_DRIFT_SPEED_Y uGlassDriftSpeed.y

#define GLASS_EDGE_SOFTNESS uGlassEdgeSoftness
#define GLASS_BLUR uGlassBlur
#define GLASS_SCATTERING uGlassScattering
#define GLASS_HIGHLIGHTS uGlassHighlights
#define GLASS_SHADOWS uGlassShadows

#define GLASS_CASCADE 0
#define GLASS_FLAT 1
#define GLASS_CONTOUR 2
#define GLASS_LENS 3

// GLASS_CASCADE | GLASS_FLAT | GLASS_CONTOUR | GLASS_LENS

float hash11(float p) {
    p = fract(p * 0.1031);
    p *= p + 33.33;
    return fract(p * (p + p));
}

float hash21(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    return mix(
        mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
        mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0)), f.x),
        f.y
    );
}

float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;

    for (int i = 0; i < 4; i++) {
        value += noise(p) * amplitude;
        p = mat2(1.6, 1.2, -1.2, 1.6) * p;
        amplitude *= 0.5;
    }

    return value;
}

vec2 rotate(vec2 v, float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return vec2(v.x * c - v.y * s, v.x * s + v.y * c);
}

vec2 sourcePoint() {
    float aspect = iResolution.x / iResolution.y;
    return vec2(uSource.x * 0.5 * aspect, uSource.y * 0.5);
}

vec3 rayPalette(float value) {
    float x = clamp(value, 0.0, 1.0) * 4.0;

    if (x < 1.0) return mix(GODRAY_COLOR_1, GODRAY_COLOR_2, x);
    if (x < 2.0) return mix(GODRAY_COLOR_2, GODRAY_COLOR_3, x - 1.0);
    if (x < 3.0) return mix(GODRAY_COLOR_3, GODRAY_COLOR_4, x - 2.0);
    return mix(GODRAY_COLOR_4, GODRAY_COLOR_5, x - 3.0);
}

// \`across\` separates the shafts, \`travel\` runs along them.
vec3 rayLayer(
    float across,
    float travel,
    float laneDensity,
    float seed,
    float speed,
    float width,
    float intensity,
    float time
) {
    float lane = across * laneDensity + seed * 0.137;
    float id = floor(lane);
    float local = fract(lane) - 0.5;
    float d = abs(local);

    float randomA = hash11(id + seed);
    float randomB = hash11(id * 1.73 + seed * 4.17);
    float randomC = hash11(id * 3.11 + seed * 8.73);

    float rayWidth = min(0.43, width * mix(0.56, 1.0, randomA));
    float aa = max(fwidth(across) * laneDensity * 1.5, 0.001);

    float face = 1.0 - smoothstep(rayWidth, rayWidth + aa, d);
    float glow = 1.0 - smoothstep(rayWidth, min(0.499, rayWidth + 0.15), d);
    float rim = exp(-pow((d - rayWidth) / max(0.018, aa * 1.8), 2.0));
    rim *= 1.0 - smoothstep(0.455, 0.495, d);

    float faceGradient = mix(
        0.26,
        1.0,
        clamp(local / max(rayWidth, 0.001) * 0.5 + 0.5, 0.0, 1.0)
    );

    float flowTravel = travel * mix(2.0, 4.8, randomB) - time * speed;
    float flow = noise(vec2(flowTravel, id * 0.19 + seed));
    float visibility = smoothstep(0.12, 0.34, randomC);

    // spotty=0 gives short broken shafts, spotty=1 gives long continuous shafts.
    float spotMask = mix(
        smoothstep(0.42, 0.82, flow),
        1.0,
        clamp(GODRAY_SPOTTY, 0.0, 1.0)
    );

    // Palette walks along the across-axis so every layer agrees on one top-to-bottom
    // direction; a random index per lane reads as noise, not as a direction.
    // Ping-pong instead of fract() keeps the ramp seam-free where the phase wraps.
    float laneCenter = (id + 0.5 - seed * 0.137) / max(laneDensity, 0.001);
    float palettePhase = laneCenter * PALETTE_SHIFT
        - time * PALETTE_DRIFT
        + randomA * 0.12;
    vec3 material = rayPalette(abs(fract(palettePhase * 0.5) * 2.0 - 1.0));
    vec3 highlight = mix(
        material,
        GODRAY_COLOR_5,
        smoothstep(0.80, 0.97, randomC)
    );

    vec3 color = material * face * faceGradient
        * (0.34 + flow * 0.66) * spotMask;
    color += material * glow * 0.11 * mix(spotMask, 1.0, 0.20);
    color += highlight * rim * 0.06;

    return color * intensity * visibility;
}

vec3 godRaysScene(vec2 p, vec2 origin, float time) {
    vec2 delta = (p - origin) / max(GODRAY_SCALE, 0.01);
    vec2 q = rotate(delta, -radians(GODRAY_ROTATION));
    float travel = q.x;
    float across = q.y;

    // One broad bend keeps the shafts organic without creating water ripples.
    float broadBend = (
        fbm(vec2(travel * 0.34 - time * 0.015, across * 0.80 + 2.4)) - 0.5
    ) * 0.040;

    float detailBend = (
        fbm(vec2(travel * 0.45 - time * 0.025, across * 1.25 - travel * 0.21)) - 0.5
    ) * 0.006;

    float warpedAcross = across + broadBend + detailBend;

    float atmosphere = fbm(vec2(
        travel * 0.33 - time * 0.025,
        across * 0.85 - travel * 0.16
    ));

    float flowNoise = fbm(vec2(
        travel * 0.55 - time * FLOW_SPEED,
        across * 1.35 - travel * 0.31
    ));

    // Brightness decays away from the ray axis instead of away from a point.
    float haze = exp(-abs(across) * AXIS_FALLOFF * 3.0)
        * mix(0.38, 1.0, flowNoise);

    // Wide bands sweeping along the shafts, the linear form of expanding rings.
    float pulsePhase = fract(travel * PULSE_DENSITY - time * PULSE_SPEED);
    float pulse = exp(-pow(
        (pulsePhase - 0.5) / max(PULSE_WIDTH, 0.001),
        2.0
    ));
    pulse *= exp(-abs(across) * 0.9) * mix(0.60, 1.0, flowNoise);

    vec3 color = GODRAY_COLOR_BACK;

    color += uBloomColor * haze * GODRAY_BLOOM * 0.72;
    color += uBloomColor
        * (0.18 + atmosphere * 0.55)
        * exp(-abs(across) * 0.5)
        * GODRAY_BLOOM
        * 0.12;

    // Back, middle and foreground layers.
    float density = mix(0.45, 1.75, clamp(uGodrayDensity, 0.0, 1.0));
    vec3 rays = vec3(0.0);
    rays += rayLayer(warpedAcross, travel, 3.0 * density, 43.2, 0.32, 0.47, 0.28, time);
    rays += rayLayer(warpedAcross, travel, 7.0 * density, 3.1, 0.55, 0.43, 0.70, time);
    rays += rayLayer(warpedAcross, travel, 15.0 * density, 11.7, 0.82, 0.33, 0.58, time);
    rays += rayLayer(warpedAcross, travel, 29.0 * density, 23.4, 1.15, 0.18, 0.20, time);

    rays *= 1.0 + pulse * PULSE_INTENSITY * 0.36;
    rays += uBloomColor * pulse * PULSE_INTENSITY * 0.30;

    // Two bright shafts anchor the frame like the radial key rays.
    float keyRayA = exp(-pow((across - 0.11) * 26.0, 2.0));
    float keyRayB = exp(-pow((across + 0.17) * 34.0, 2.0));
    float keyFlow = 0.42 + noise(vec2(travel * 1.55 - time * 0.65, 7.3)) * 0.58;

    rays += GODRAY_COLOR_4 * keyRayA * keyFlow * 0.72;
    rays += GODRAY_COLOR_5 * keyRayB * keyFlow * 0.60;

    color += rays * clamp(uGodrayIntensity, 0.0, 1.0);

    float midWidth = mix(0.012, 0.34, clamp(GODRAY_MID_SIZE, 0.0, 1.0));
    float midGlow = exp(-pow(across / max(midWidth, 0.001), 2.0));
    color += uBloomColor
        * midGlow
        * clamp(GODRAY_MID_INTENSITY, 0.0, 1.0)
        * 1.35;

    return color;
}

float distortionProfile(float local, float cellID) {
    float wave = sin(local * PI); // zero at both rib boundaries

    if (uDistortionShape == GLASS_CASCADE) {
        return wave * (0.72 + 0.28 * local);
    }
    if (uDistortionShape == GLASS_FLAT) {
        return (hash11(cellID * 2.31 + 7.4) - 0.5) * 0.85;
    }
    if (uDistortionShape == GLASS_CONTOUR) {
        return wave * abs(wave);
    }
    return wave;
}

// Uneven rib widths are what separate real fluted glass from a plain stripe pattern.
float ribIrregularity(float across) {
    return sin(across * 7.0 + 0.8) * 0.30
        + sin(across * 21.0 - 1.2) * 0.09;
}

vec3 flutedGlass(vec2 p, vec2 rayOrigin, float time) {
    vec2 glassMotion = vec2(
        sin(time * GLASS_DRIFT_SPEED_X),
        sin(time * GLASS_DRIFT_SPEED_Y + 1.7)
    ) * vec2(GLASS_DRIFT_X, GLASS_DRIFT_Y);

    vec2 glassOrigin = rayOrigin + vec2(
        GLASS_ORIGIN_OFFSET_X,
        GLASS_ORIGIN_OFFSET_Y
    ) + glassMotion;

    float angle = radians(GLASS_ANGLE);
    vec2 q = rotate(p - glassOrigin, -angle);
    vec2 ribDirection = rotate(vec2(1.0, 0.0), angle);
    vec2 ribNormal = rotate(vec2(0.0, 1.0), angle);

    float ribCount = mix(64.0, 7.0, clamp(uGlassSize, 0.0, 1.0));

    // The rib index walks an easing curve instead of the across-axis directly, so rib
    // width — the inverse of the curve's slope — trends along the axis.
    // RIB_CURVE < 1 runs narrow to wide, 1 is uniform, > 1 runs wide to narrow.
    // 0.5 makes width grow linearly: boundaries land on 1, 4, 9, 16 ... so the ribs
    // read as 1, 3, 5, 7 units wide.
    float aspect = iResolution.x / iResolution.y;
    float ribSpan = abs(cos(angle)) + aspect * abs(sin(angle));
    float ribProgress = clamp(q.y / max(ribSpan, 0.001) + 0.5, 0.0, 1.0);
    float curved = pow(ribProgress, max(RIB_CURVE, 0.05));

    // Irregularity lives in rib space, not view space, so its slope stays a fixed
    // fraction of the curve's slope and the ribs can never fold back on themselves.
    float grid = curved * ribCount
        + ribIrregularity(curved * ribCount * 0.125)
        + GLASS_OFFSET
        + time * GLASS_SPEED;

    float cellID = floor(grid);
    float cell = fract(grid);
    float local = cell * 2.0 - 1.0;
    float edgeDistance = min(cell, 1.0 - cell);

    // Derivative of the warped index, not of q.y — otherwise the narrow end aliases.
    float ribAA = max(fwidth(grid), 0.0001);

    float edgeWidth = mix(0.012, 0.075, clamp(GLASS_EDGE_SOFTNESS, 0.0, 1.0))
        + ribAA * 1.5;
    float edgeFade = smoothstep(0.0, edgeWidth, edgeDistance);
    float edgeMask = 1.0 - edgeFade;

    float profile = distortionProfile(local, cellID) * edgeFade;
    float distortion = clamp(uGlassDistortion, 0.0, 1.0);

    // max() guards pow(arch, ...) below: fast-math cos can dip past -1, and a
    // negative pow base is undefined in GLSL — NaN paints a 1px black scanline.
    float arch = max(0.0, 0.5 + 0.5 * cos(local * PI)) * edgeFade;

    // Displacement across the ribs is what bends the shafts into the fluted look.
    float refractionAmount = mix(0.002, 0.034, distortion);
    vec2 refractionOffset = ribNormal * profile * refractionAmount;

    // A small lengthwise bulge adds magnification inside each rib.
    vec2 bulgeOffset = ribDirection
        * (arch - edgeFade * 0.5)
        * mix(0.0, 0.012, distortion);

    vec2 refractedUV = p + refractionOffset + bulgeOffset;

    float dispersion = mix(0.0002, 0.0042, distortion)
        * (0.35 + abs(profile) * 0.65);
    float blurSpread = mix(0.0001, 0.0028, clamp(GLASS_BLUR, 0.0, 1.0));
    float sampleSpread = dispersion + blurSpread;

    vec3 negativeSample = godRaysScene(refractedUV - ribNormal * sampleSpread, rayOrigin, time);
    vec3 centerSample = godRaysScene(refractedUV, rayOrigin, time);
    vec3 positiveSample = godRaysScene(refractedUV + ribNormal * sampleSpread, rayOrigin, time);

    vec3 refracted = vec3(
        positiveSample.r,
        centerSample.g,
        negativeSample.b
    );

    vec3 blurred = (negativeSample + centerSample * 2.0 + positiveSample) * 0.25;
    float blurMix = clamp(
        GLASS_SCATTERING * 0.52 + GLASS_BLUR * 0.22,
        0.0,
        0.68
    );

    vec3 color = mix(refracted, blurred, blurMix);

    float darkEdge = smoothstep(0.50, 0.98, abs(local)) * edgeFade;
    float ribVariation = hash11(cellID * 1.37 + 4.2);
    float whiteRib = smoothstep(0.72, 0.97, ribVariation);

    color *= 1.0 - darkEdge * (0.10 + GLASS_SHADOWS * 0.30);
    color *= 1.0 - edgeMask * (0.025 + GLASS_SHADOWS * 0.08);
    color *= 1.0 + pow(arch, 2.2) * (0.05 + GLASS_HIGHLIGHTS * 0.18);

    // A few ribs reach near-white, like a photographed glass highlight.
    color += vec3(0.76, 1.0, 0.89)
        * pow(arch, 6.0)
        * (0.06 + whiteRib * 0.46)
        * GLASS_HIGHLIGHTS;

    vec3 normal = normalize(vec3(
        ribNormal * profile * mix(0.20, 1.05, distortion),
        1.0
    ));
    vec3 lightDirection = normalize(vec3(
        -0.28 + sin(time * 0.07) * 0.10,
        0.58,
        0.82
    ));

    float reflected = max(dot(
        reflect(-lightDirection, normal),
        vec3(0.0, 0.0, 1.0)
    ), 0.0);

    color += vec3(0.22, 0.78, 0.45)
        * pow(reflected, 14.0)
        * GLASS_HIGHLIGHTS
        * 0.13;
    color += vec3(0.88, 1.0, 0.95)
        * pow(reflected, 52.0)
        * GLASS_HIGHLIGHTS
        * 0.58;

    return color;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 resolution = iResolution.xy;
    vec2 screenUV = fragCoord / resolution;
    vec2 p = (fragCoord - resolution * 0.5) / resolution.y / uZoom;
    // 판 중앙을 축으로 좌표를 돌린다 — 광원도 함께 돌아 구도 전체가 기울어진다.
    float tilt = radians(uTilt);
    p = mat2(cos(tilt), -sin(tilt), sin(tilt), cos(tilt)) * p;
    float time = iTime * uGodraySpeed + GODRAY_FRAME * 0.001;

    vec3 color = flutedGlass(p, sourcePoint(), time);

    float vignette = pow(max(
        16.0 * screenUV.x * screenUV.y
        * (1.0 - screenUV.x) * (1.0 - screenUV.y),
        0.0
    ), 0.17);

    color *= mix(1.0, 0.56 + vignette * 0.54, uVignette);
    // 프레임마다 바뀌는 그레인은 H.264가 압축할 수 없어 비트를 형태 대신 노이즈에 쓴다.
    // 미리보기와 결과를 어긋나게 두지 않으려 export 전용 분기 대신 진폭 자체를 낮춘다.
    color += (hash21(fragCoord + fract(iTime) * 173.0) - 0.5) * 0.003;

    color = 1.0 - exp(-max(color, 0.0) * 1.32);
    color = pow(color, vec3(0.86));

    fragColor = vec4(color, 1.0);
}
`
