/**
 * @module AfterimageShader
 */

/**
 * Inspired by [Three.js FBO motion trails]{@link https://codepen.io/brunoimbrizi/pen/MoRJaN?page=1&}.
 *
 * @constant
 * @type {ShaderMaterial~Shader}
 */
const AfterimageShader = {

	name: 'AfterimageShader',

	uniforms: {

		'damp': { value: 0.85 },
		'tOld': { value: null },
		'tNew': { value: null }

	},

	vertexShader: /* glsl */`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,

	fragmentShader: /* glsl */`

		uniform float damp;

		uniform sampler2D tOld;
		uniform sampler2D tNew;

		varying vec2 vUv;

		vec4 when_gt( vec4 x, float y ) {

			return max( sign( x - y ), 0.0 );

		}

		void main() {

			vec4 texelOld = texture2D( tOld, vUv );
			vec4 texelNew = texture2D( tNew, vUv );

			// 计算当前像素的亮度
			float brightness = dot(texelNew.rgb, vec3(0.299, 0.587, 0.114));
			
			// 只对高亮像素（星星碎片）产生拖尾
			// 使用更高的阈值来确保只有星星碎片产生拖尾
			float starMask = step(0.5, brightness);
			
			// 应用拖尾效果，但只对星星碎片区域
			texelOld *= damp * when_gt( texelOld, 0.01 ) * starMask;

			// 使用最大值混合，确保拖尾不会过快消失
			vec4 combined = max(texelNew, texelOld * 1.2);
			
			// 只对星星碎片区域应用拖尾，其他区域保持原样
			gl_FragColor = mix(texelNew, combined, starMask);

		}`

};

export { AfterimageShader };
