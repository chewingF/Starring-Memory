export const OutputShader = {

	name: 'OutputShader',

	uniforms: {
		'tDiffuse': { value: null },
		'toneMappingExposure': { value: 1.0 }
	},

	vertexShader: /* glsl */`
		precision highp float;

		uniform mat4 modelViewMatrix;
		uniform mat4 projectionMatrix;

		attribute vec3 position;
		attribute vec2 uv;

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,

	fragmentShader: /* glsl */`
		precision highp float;

		uniform sampler2D tDiffuse;
		uniform float toneMappingExposure;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );

			// tone mapping
			vec3 color = toneMappingExposure * texel.rgb;

			// color space conversion
			#ifdef SRGB_TRANSFER
				color = sRGBTransfer( color );
			#endif

			gl_FragColor = vec4( color, texel.a );

		}`

};
