/**
 * Fluted Glass 「스윕」 모양의 fragment shader 원문.
 *
 * `.glsl` 파일이 아니라 모듈 상수인 이유는 번들러다 — Turbopack의 `?raw` 규칙은 이 버전에서
 * default export를 만들지 않아 shader가 통째로 `undefined`로 들어갔다. public/에 두면
 * 고정 URL로 내려받히므로 그쪽으로도 돌아가지 않는다.
 */
export default `// Shadertoy-style fragment shader; the Graphic Studio host supplies uniforms.
// Radial god rays that sweep around the source like a lighthouse, behind the same
// radial fluted glass. Differs from the radial sibling in two places: the whole ray
// field rotates over time (uSweepSpeed), and the pulse is an angular beam sector
// instead of an expanding ring.

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
uniform float uSweepSpeed;
uniform float uRadialFalloff;
uniform float uRadialFlowSpeed;
uniform float uPulseIntensity;
uniform float uPulseSpeed;
uniform float uPulseDensity;
uniform float uPulseWidth;
uniform float uGlassSize;
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
uniform vec2 uGlassSourceFade;
uniform int uDistortionShape;

// ------------------------------------------------------------
// Controls
// ------------------------------------------------------------

// Paper God Rays-compatible controls
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

#define SWEEP_SPEED uSweepSpeed
#define RADIAL_FALLOFF uRadialFalloff
#define RADIAL_FLOW_SPEED uRadialFlowSpeed
#define BEAM_INTENSITY uPulseIntensity
#define BEAM_SPEED uPulseSpeed
#define BEAM_DENSITY uPulseDensity
#define BEAM_WIDTH uPulseWidth

// 0 = many narrow ribs, 1 = fewer wide ribs
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

#define GLASS_SOURCE_FADE_START uGlassSourceFade.x
#define GLASS_SOURCE_FADE_END uGlassSourceFade.y

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

vec2 sourcePoint() {
    float aspect = iResolution.x / iResolution.y;
    return vec2(uSource.x * 0.5 * aspect, uSource.y * 0.5);
}

float angleDistance(float a, float b) {
    float d = a - b;
    return abs(atan(sin(d), cos(d)));
}

vec3 rayPalette(float value) {
    float x = clamp(value, 0.0, 1.0) * 4.0;

    if (x < 1.0) return mix(GODRAY_COLOR_1, GODRAY_COLOR_2, x);
    if (x < 2.0) return mix(GODRAY_COLOR_2, GODRAY_COLOR_3, x - 1.0);
    if (x < 3.0) return mix(GODRAY_COLOR_3, GODRAY_COLOR_4, x - 2.0);
    return mix(GODRAY_COLOR_4, GODRAY_COLOR_5, x - 3.0);
}

vec3 rayLayer(
    float angle,
    float radius,
    float rayCountValue,
    float seed,
    float speed,
    float width,
    float intensity,
    float time
) {
    float rayCount = max(1.0, floor(rayCountValue + 0.5));

    // Integer rayCount closes the pattern exactly around atan's seam.
    float rawLane = angle * rayCount / TAU + seed * 0.137;
    float lane = mod(rawLane, rayCount);
    float id = floor(lane);
    float local = fract(lane) - 0.5;
    float d = abs(local);

    float randomA = hash11(id + seed);
    float randomB = hash11(id * 1.73 + seed * 4.17);
    float randomC = hash11(id * 3.11 + seed * 8.73);

    float rayWidth = min(0.43, width * mix(0.56, 1.0, randomA));

    // Derivative of cos/sin is continuous across atan's branch cut.
    float aa = max(
        length(fwidth(vec2(cos(angle), sin(angle)))) * rayCount / TAU * 1.5,
        0.001
    );

    float face = 1.0 - smoothstep(rayWidth, rayWidth + aa, d);
    float glow = 1.0 - smoothstep(rayWidth, min(0.499, rayWidth + 0.15), d);
    float rim = exp(-pow((d - rayWidth) / max(0.018, aa * 1.8), 2.0));
    rim *= 1.0 - smoothstep(0.455, 0.495, d);

    float faceGradient = mix(
        0.26,
        1.0,
        clamp(local / max(rayWidth, 0.001) * 0.5 + 0.5, 0.0, 1.0)
    );

    float travel = radius * mix(2.0, 4.8, randomB) - time * speed;
    float flow = noise(vec2(travel, id * 0.19 + seed));
    float visibility = smoothstep(0.12, 0.34, randomC);

    // spotty=0 gives short broken shafts, spotty=1 gives long continuous shafts.
    float spotMask = mix(
        smoothstep(0.42, 0.82, flow),
        1.0,
        clamp(GODRAY_SPOTTY, 0.0, 1.0)
    );

    vec3 material = rayPalette(fract(randomA * 0.58 + randomB * 0.42));
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
    float radius = max(length(delta), 0.0001);
    vec2 direction = delta / radius;

    // The whole ray field turns around the source; per-frame the offset is constant,
    // so atan's seam still cancels wherever the lane math uses an integer count.
    float angle = atan(delta.y, delta.x)
        - radians(GODRAY_ROTATION)
        - time * SWEEP_SPEED;

    // One broad bend keeps the motion organic without creating water ripples.
    float broadBend = (
        fbm(vec2(
            radius * 0.34 - time * 0.015,
            dot(direction, vec2(0.38, 0.92)) * 0.80 + 2.4
        )) - 0.5
    ) * 0.080;

    float detailBend = (
        fbm(direction * 1.25 + vec2(
            radius * 0.45 - time * 0.025,
            -radius * 0.21
        )) - 0.5
    ) * 0.010;

    float warpedAngle = angle + broadBend + detailBend;

    float atmosphere = fbm(direction * 0.85 + vec2(
        radius * 0.33 - time * 0.025,
        -radius * 0.16
    ));

    float radialNoise = fbm(direction * 1.35 + vec2(
        radius * 0.55 - time * RADIAL_FLOW_SPEED,
        -radius * 0.31
    ));

    float radialHaze = exp(-radius * RADIAL_FALLOFF)
        * mix(0.38, 1.0, radialNoise);

    // Angular beam sectors sweeping around the source — the conic form of the
    // radial sibling's expanding rings. Integer beamCount keeps atan's seam closed.
    float beamCount = max(1.0, floor(BEAM_DENSITY * 4.0 + 0.5));
    float beamPhase = fract(angle * beamCount / TAU - time * BEAM_SPEED);
    float beam = exp(-pow(
        (beamPhase - 0.5) / max(BEAM_WIDTH, 0.001),
        2.0
    ));
    beam *= smoothstep(0.03, 0.18, radius)
        * exp(-radius * 0.35)
        * mix(0.60, 1.0, radialNoise);

    vec3 color = GODRAY_COLOR_BACK;

    color += uBloomColor
        * radialHaze
        * GODRAY_BLOOM
        * 0.72;
    color += uBloomColor
        * (0.18 + atmosphere * 0.55)
        * exp(-radius * 0.16)
        * GODRAY_BLOOM
        * 0.12;

    // Back, middle and foreground layers.
    float density = mix(0.45, 1.75, clamp(uGodrayDensity, 0.0, 1.0));
    vec3 rays = vec3(0.0);
    rays += rayLayer(warpedAngle, radius, 11.0 * density, 43.2, 0.32, 0.47, 0.28, time);
    rays += rayLayer(warpedAngle, radius, 25.0 * density, 3.1, 0.55, 0.43, 0.70, time);
    rays += rayLayer(warpedAngle, radius, 47.0 * density, 11.7, 0.82, 0.33, 0.58, time);
    rays += rayLayer(warpedAngle, radius, 88.0 * density, 23.4, 1.15, 0.18, 0.20, time);

    // The beam brightens the ray field it passes through instead of one dotted ray.
    rays *= 1.0 + beam * BEAM_INTENSITY * 0.36;
    rays += uBloomColor
        * beam
        * BEAM_INTENSITY
        * 0.30;

    // The key rays live in swept space, so they turn with the field.
    float keyRayA = exp(-pow(angleDistance(angle, 0.18) * 12.0, 2.0));
    float keyRayB = exp(-pow(angleDistance(angle, -0.25) * 16.0, 2.0));
    float keyFlow = 0.42 + noise(vec2(radius * 1.55 - time * 0.65, 7.3)) * 0.58;

    rays += GODRAY_COLOR_4 * keyRayA * keyFlow * 0.72;
    rays += GODRAY_COLOR_5 * keyRayB * keyFlow * 0.60;

    color += rays * clamp(uGodrayIntensity, 0.0, 1.0);

    float midRadius = mix(0.035, 0.62, clamp(GODRAY_MID_SIZE, 0.0, 1.0));
    float midGlow = exp(-pow(radius / max(midRadius, 0.001), 2.0));
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

vec3 flutedGlass(vec2 p, vec2 rayOrigin, float time) {
    vec2 glassMotion = vec2(
        sin(time * GLASS_DRIFT_SPEED_X),
        sin(time * GLASS_DRIFT_SPEED_Y + 1.7)
    ) * vec2(GLASS_DRIFT_X, GLASS_DRIFT_Y);

    vec2 glassOrigin = rayOrigin + vec2(
        GLASS_ORIGIN_OFFSET_X,
        GLASS_ORIGIN_OFFSET_Y
    ) + glassMotion;

    vec2 delta = p - glassOrigin;
    float radius = max(length(delta), 0.0001);
    vec2 direction = delta / radius;
    vec2 tangent = vec2(-direction.y, direction.x);
    float physicalAngle = atan(delta.y, delta.x);
    float gridAngle = physicalAngle - radians(GLASS_ANGLE);

    // Integer total count and integer harmonics make the glass seam-free.
    float ribCount = floor(mix(290.0, 75.0, clamp(uGlassSize, 0.0, 1.0)) + 0.5);
    float irregularity = sin(gridAngle * 3.0 + 0.8) * 0.30
        + sin(gridAngle * 9.0 - 1.2) * 0.09;

    float rawGrid = gridAngle * ribCount / TAU
        + irregularity
        + GLASS_OFFSET
        + time * GLASS_SPEED;

    float grid = mod(rawGrid, ribCount);
    float cellID = floor(grid);
    float cell = fract(grid);
    float local = cell * 2.0 - 1.0;
    float edgeDistance = min(cell, 1.0 - cell);

    float angularAA = max(
        length(fwidth(direction)) * ribCount / TAU,
        0.0001
    );

    float edgeWidth = mix(0.012, 0.075, clamp(GLASS_EDGE_SOFTNESS, 0.0, 1.0))
        + angularAA * 1.5;
    float edgeFade = smoothstep(0.0, edgeWidth, edgeDistance);
    float edgeMask = 1.0 - edgeFade;

    float sourceFade = smoothstep(
        GLASS_SOURCE_FADE_START,
        GLASS_SOURCE_FADE_END,
        length(p - rayOrigin)
    );

    float profile = distortionProfile(local, cellID) * edgeFade * sourceFade;
    float distortion = clamp(uGlassDistortion, 0.0, 1.0);

    // max() guards pow(arch, ...) below: fast-math cos can dip past -1, and a
    // negative pow base is undefined in GLSL — NaN paints a 1px black scanline.
    float arch = max(0.0, 0.5 + 0.5 * cos(local * PI)) * edgeFade;

    // Tangential displacement makes the glass bend the radial ray field.
    float refractionAmount = mix(0.002, 0.034, distortion) * sourceFade;
    vec2 refractionOffset = tangent * profile * refractionAmount;

    // A small radial bulge adds magnification inside each rib.
    vec2 bulgeOffset = direction
        * (arch - edgeFade * 0.5)
        * mix(0.0, 0.012, distortion)
        * sourceFade;

    vec2 refractedUV = p + refractionOffset + bulgeOffset;

    float dispersion = mix(0.0002, 0.0042, distortion)
        * (0.35 + abs(profile) * 0.65)
        * sourceFade;
    float blurSpread = mix(
        0.0001,
        0.0028,
        clamp(GLASS_BLUR, 0.0, 1.0)
    ) * sourceFade;
    float sampleSpread = dispersion + blurSpread;

    vec2 uvNegative = refractedUV - tangent * sampleSpread;
    vec2 uvCenter = refractedUV;
    vec2 uvPositive = refractedUV + tangent * sampleSpread;

    vec3 negativeSample = godRaysScene(uvNegative, rayOrigin, time);
    vec3 centerSample = godRaysScene(uvCenter, rayOrigin, time);
    vec3 positiveSample = godRaysScene(uvPositive, rayOrigin, time);

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

    color *= 1.0 - darkEdge
        * (0.10 + GLASS_SHADOWS * 0.30)
        * sourceFade;
    color *= 1.0 - edgeMask
        * (0.025 + GLASS_SHADOWS * 0.08)
        * sourceFade;
    color *= 1.0 + pow(arch, 2.2)
        * (0.05 + GLASS_HIGHLIGHTS * 0.18)
        * sourceFade;

    // A few ribs reach near-white, like a photographed glass highlight.
    color += vec3(0.76, 1.0, 0.89)
        * pow(arch, 6.0)
        * (0.06 + whiteRib * 0.46)
        * GLASS_HIGHLIGHTS
        * sourceFade;

    vec3 normal = normalize(vec3(
        tangent * profile * mix(0.20, 1.05, distortion),
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
        * 0.13
        * sourceFade;
    color += vec3(0.88, 1.0, 0.95)
        * pow(reflected, 52.0)
        * GLASS_HIGHLIGHTS
        * 0.58
        * sourceFade;

    return mix(centerSample, color, sourceFade);
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
