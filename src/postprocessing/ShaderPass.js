// Three.js 通过全局变量 THREE 访问
import { Pass, FullScreenQuad } from './Pass.js';

/**
 * A pass that renders a shader material to the screen.
 */
class ShaderPass extends Pass {

	/**
	 * Constructs a new shader pass.
	 *
	 * @param {Object} shader - The shader material.
	 * @param {string} [textureID] - The texture ID.
	 */
	constructor( shader, textureID = 'tDiffuse' ) {

		super();

		this.textureID = textureID;

		if ( shader instanceof THREE.ShaderMaterial ) {

			this.uniforms = shader.uniforms;
			this.material = shader;

		} else {

			this.uniforms = shader.uniforms;
			this.material = new THREE.ShaderMaterial( shader );

		}

		this._fsQuad = new FullScreenQuad( this.material );

	}

	/**
	 * Renders the shader pass.
	 *
	 * @param {WebGLRenderer} renderer - The renderer.
	 * @param {WebGLRenderTarget} writeBuffer - The write buffer.
	 * @param {WebGLRenderTarget} readBuffer - The read buffer.
	 * @param {number} deltaTime - The delta time in seconds.
	 * @param {boolean} maskActive - Whether masking is active or not.
	 */
	render( renderer, writeBuffer, readBuffer/*, deltaTime, maskActive */ ) {

		if ( this.uniforms[ this.textureID ] ) {

			this.uniforms[ this.textureID ].value = readBuffer.texture;

		}

		this._fsQuad.material = this.material;

		if ( this.renderToScreen ) {

			renderer.setRenderTarget( null );
			this._fsQuad.render( renderer );

		} else {

			renderer.setRenderTarget( writeBuffer );
			if ( this.clear ) renderer.clear();
			this._fsQuad.render( renderer );

		}

	}

	/**
	 * Frees the GPU-related resources allocated by this instance. Call this
	 * method whenever the pass is no longer used in your app.
	 */
	dispose() {

		this.material.dispose();
		this._fsQuad.dispose();

	}

}

export { ShaderPass };
