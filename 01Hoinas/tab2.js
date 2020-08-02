var vert = `
		precision highp float;

    // attributes, in
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    attribute vec2 aTexCoord;

    // attributes, out
    varying vec3 var_vertPos;
    varying vec3 var_vertNormal;
    varying vec2 var_vertTexCoord;
		varying vec4 var_centerGlPosition;//原点
    
    // matrices
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    uniform mat3 uNormalMatrix;
		uniform float u_time;


    void main() {
      vec3 pos = aPosition;
			vec4 posOut = uProjectionMatrix * uModelViewMatrix * vec4(pos, 1.0);
      gl_Position = posOut;

      // set out value
      var_vertPos      = pos;
      var_vertNormal   =  aNormal;
      var_vertTexCoord = aTexCoord;
			var_centerGlPosition = uProjectionMatrix * uModelViewMatrix * vec4(0., 0., 0.,1.0);
    }
`;


var frag = `

precision highp float;

#define PI 3.14159265359

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform sampler2D u_tex;
varying vec2 var_vertTexCoord;


//util
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }


float random (in vec2 st) {
   	highp float a = 12.9898;
    highp float b = 78.233;
    highp float c = 43758.5453;
    highp float dt= dot(st.xy ,vec2(a,b));
    highp float sn= mod(dt,3.14);
    return fract(sin(sn) * c);
}

float noise(vec2 st) {
    vec2 i = vec2(0.);
		i = floor(st);
    vec2 f = vec2(0.);
		f = fract(st);
    vec2 u =  vec2(0.);
		u = f*f*(3.0-2.0*f);  
    return mix( mix( random( i + vec2(0.0,0.0) ),
                     random( i + vec2(1.0,0.0) ), u.x),
                mix( random( i + vec2(0.0,1.0) ),
                     random( i + vec2(1.0,1.0) ), u.x), u.y);
}

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187,
                        // (3.0-sqrt(5.0))/6.0
                        0.366025403784439,
                        // 0.5*(sqrt(3.0)-1.0)
                        -0.577350269189626,
                        // -1.0 + 2.0 * C.x
                        0.024390243902439);
                        // 1.0 / 41.0

    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);

    vec2 i1 = vec2(0.0);
    i1 = (x0.x > x0.y)? vec2(1.0, 0.0):vec2(0.0, 1.0);
    vec2 x1 = x0.xy + C.xx - i1;
    vec2 x2 = x0.xy + C.zz;

    i = mod289(i);
    vec3 p = permute(
            permute( i.y + vec3(0.0, i1.y, 1.0))
                + i.x + vec3(0.0, i1.x, 1.0 ));

    vec3 m = max(0.5 - vec3(
                        dot(x0,x0),
                        dot(x1,x1),
                        dot(x2,x2)
                        ), 0.0);

    m = m*m ;
    m = m*m ;

    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;

    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0+h*h);

    // Compute final noise value at P
    vec3 g = vec3(0.0);
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * vec2(x1.x,x2.x) + h.yz * vec2(x1.y,x2.y);
    return 130.0 * dot(m, g);
}


#define RIDGEOCTAVES 3
// Ridged multifractal
float ridge(float h, float offset) {
    h = abs(h);     // create creases
    h = offset - h; // invert so creases are at top
    h = h * h;      // sharpen creases
    return h;
}

float ridgedMF(vec2 p) {
    float lacunarity = 2.0;
    float gain = 0.5;
    float offset = 0.9;

    float sum = 0.0;
    float freq = 1.0, amp = 0.5;
    float prev = 1.0;
    for(int i=0; i < RIDGEOCTAVES; i++) {
        float n = ridge(snoise(p*freq), offset);
        sum += n*amp;
        sum += n*amp*prev;  // scale by previous octave
        prev = n;
        freq *= lacunarity;
        amp *= gain;
    }
    return sum;
}


#define OCTAVES 6
float fbm (in vec2 st) {
    // Initial values
    float value = 0.0;
    float amplitude = .8;
    float frequency = 0.;
    //
    // Loop of octaves
    for (int i = 0; i < OCTAVES; i++) {
        value += amplitude * noise(st);
        st *= 2.;
        amplitude *= .7;
    }
    return value;
}


float grid(vec2 uv){
    vec2 guv = fract(uv * 10.0);
    float line = guv.x > 0.4 && guv.x < 0.6  || guv.y > 0.45 && guv.y < 0.55 ? 1.0 : 0.0;
    return line;
}

float remap(float i, float cMin, float cMax, float nMin, float nMax, bool clamp){
    float ni = nMin + (cMax - i) * (nMax - nMin) / (cMax - cMin);
    ni = clamp == true ? max(min(nMax, ni), nMin) : ni;
    return ni;
}

vec2 bend(vec2 uv){
    float ny = remap(uv.y, 1.0, 0.0, -0.1 + 0.2*sin(u_time), 1.0, false);
    ny = clamp(ny, 0.0, 1.0);
    float bendRatio = pow(ny, 2.5) ;
    float nx = pow((gl_FragCoord.x*2.0 - u_resolution.x)/u_resolution.x, 2.0);
    bendRatio *=  (1.0-nx);
    float bendX = 0.2*sin(uv.y*PI*10.0 + u_time)* (bendRatio *(1.0+ random(uv + u_time)*0.07*bendRatio));
    float bendY = random(uv + u_time)*0.01*bendRatio;
    vec2 bendUv =vec2(uv.x + bendX, uv.y + bendY);
    return bendUv;
}


void main() {
   vec2 pos = gl_FragCoord.xy/u_resolution.xy;
		pos.y = 1.0 - pos.y;
    //noise
    float n = random(pos);
    n *= max(pos.y -0.3, 0.0);
		n = 1.0 - n;
		n = smoothstep(0.4, 1.0, n);

		//noiseField
		float noi = fbm(var_vertTexCoord*5.0);
		float angle = remap(noi, 0.0, 1.0, -1.0 * PI, PI, false);
		float moveAmount = 0.003;
		vec2 move = vec2(cos(angle) * moveAmount, sin(angle) * moveAmount);

    pos = bend(pos);
		vec3 col = texture2D(u_tex, var_vertTexCoord).rgb;
		vec3 col_offset =  texture2D(u_tex, fract(var_vertTexCoord + move)).rgb;
		vec3 col_out = mix(col,col_offset,0.3);

    gl_FragColor = vec4(vec3(col_out), 1.0);
}

`;