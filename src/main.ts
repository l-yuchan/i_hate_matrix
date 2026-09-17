import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { TransformControls } from 'three/addons/controls/TransformControls.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'

const icon = (name: 'move' | 'rotate' | 'scale' | 'reset' | 'copy') => {
  const paths = {
    move: '<path d="M12 2v20M2 12h20M12 2l-3 3m3-3 3 3M12 22l-3-3m3 3 3-3M2 12l3-3m-3 3 3 3m17-3-3-3m3 3-3 3"/>',
    rotate: '<path d="M20 7V3m0 0h-4m4 0-3.1 3.1A8 8 0 1 0 20 15"/>',
    scale: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
    reset: '<path d="M4 4v6h6M5.1 15a8 8 0 1 0 1.8-8.1L4 10"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  }
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`
}

const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = `
  <main class="editor-shell">
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark"><i></i><i></i><i></i></span>
        <span>Matrix Studio</span>
        <span class="file-pill">Untitled transform</span>
      </div>
      <div class="top-actions">
        <span class="saved"><span></span> Live</span>
        <button class="icon-button" id="reset-button" title="Reset transform">${icon('reset')}</button>
      </div>
    </header>

    <section class="workspace">
      <div class="viewport" id="viewport">
        <div class="toolbar" role="toolbar" aria-label="Transform tools">
          <button class="tool active" data-mode="translate" title="Move (G)">${icon('move')}<span>Move</span><kbd>G</kbd></button>
          <button class="tool" data-mode="rotate" title="Rotate (R)">${icon('rotate')}<span>Rotate</span><kbd>R</kbd></button>
          <button class="tool" data-mode="scale" title="Scale (S)">${icon('scale')}<span>Scale</span><kbd>S</kbd></button>
          <span class="toolbar-divider"></span>
          <button class="space-toggle" id="space-toggle" title="Toggle transform orientation"><span class="space-dot"></span><span id="space-label">World</span><svg viewBox="0 0 12 12"><path d="m3 4 3 3 3-3"/></svg></button>
        </div>

        <div class="scene-label">
          <span class="object-icon"></span>
          <div><strong>Transform Object</strong><small>Mesh · Selected</small></div>
        </div>

        <div class="view-cube" aria-label="Camera views">
          <button class="cube-face top" data-view="top">TOP</button>
          <button class="cube-face front" data-view="front">FRONT</button>
          <button class="cube-face side" data-view="right">RIGHT</button>
          <button class="home-view" data-view="iso" title="Perspective view">⌂</button>
        </div>

        <div class="axis-legend" aria-hidden="true">
          <span class="axis-line axis-y">Y</span><span class="axis-line axis-x">X</span><span class="axis-z">Z</span>
        </div>

        <div class="viewport-hint"><span>Orbit</span> drag <b>·</b> <span>Pan</span> right-drag <b>·</b> <span>Zoom</span> scroll</div>
      </div>

      <aside class="inspector">
        <div class="panel-heading">
          <div><p>OUTPUT</p><h1>Transform Matrix</h1></div>
          <div class="status-badge"><span></span> Mat4</div>
        </div>
        <p class="panel-description">A live 4×4 model matrix composed from the object's position, rotation, and scale.</p>

        <div class="matrix-card">
          <div class="matrix-bracket left"></div>
          <div class="matrix-grid" id="matrix-grid"></div>
          <div class="matrix-bracket right"></div>
        </div>
        <div class="matrix-meta"><span>Column-major · Float32</span><button id="copy-button">${icon('copy')}<span>Copy matrix</span></button></div>

        <div class="separator"></div>

        <section class="transform-section">
          <div class="section-title"><div><span class="section-dot position-dot"></span><h2>Position</h2></div><small>units</small></div>
          <div class="input-grid" data-group="position">
            <label><span class="x">X</span><input type="number" data-axis="x" step="0.1"></label>
            <label><span class="y">Y</span><input type="number" data-axis="y" step="0.1"></label>
            <label><span class="z">Z</span><input type="number" data-axis="z" step="0.1"></label>
          </div>
        </section>

        <section class="transform-section">
          <div class="section-title"><div><span class="section-dot rotation-dot"></span><h2>Rotation</h2></div><small>degrees</small></div>
          <div class="input-grid" data-group="rotation">
            <label><span class="x">X</span><input type="number" data-axis="x" step="1"></label>
            <label><span class="y">Y</span><input type="number" data-axis="y" step="1"></label>
            <label><span class="z">Z</span><input type="number" data-axis="z" step="1"></label>
          </div>
        </section>

        <section class="transform-section">
          <div class="section-title"><div><span class="section-dot scale-dot"></span><h2>Scale</h2></div><button class="link-scale active" id="link-scale" title="Link scale values"><svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.1 1.1M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.1-1.1"/></svg></button></div>
          <div class="input-grid" data-group="scale">
            <label><span class="x">X</span><input type="number" data-axis="x" step="0.1" min="0.01"></label>
            <label><span class="y">Y</span><input type="number" data-axis="y" step="0.1" min="0.01"></label>
            <label><span class="z">Z</span><input type="number" data-axis="z" step="0.1" min="0.01"></label>
          </div>
        </section>

        <button class="reset-wide" id="reset-wide">${icon('reset')} Reset transform</button>

        <div class="shortcut-strip"><span><kbd>G</kbd> Move</span><span><kbd>R</kbd> Rotate</span><span><kbd>S</kbd> Scale</span></div>
      </aside>
    </section>
  </main>
`

const viewport = document.querySelector<HTMLDivElement>('#viewport')!
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x151821)
scene.fog = new THREE.FogExp2(0x151821, 0.027)

const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
camera.position.set(7.5, 5.8, 8.5)

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.domElement.setAttribute('aria-label', 'Interactive 3D transform viewport')
viewport.prepend(renderer.domElement)

const orbit = new OrbitControls(camera, renderer.domElement)
orbit.target.set(0, 0.8, 0)
orbit.enableDamping = true
orbit.dampingFactor = 0.075
orbit.minDistance = 3
orbit.maxDistance = 24
orbit.maxPolarAngle = Math.PI * 0.49
orbit.mouseButtons.LEFT = THREE.MOUSE.ROTATE
orbit.mouseButtons.MIDDLE = THREE.MOUSE.ROTATE
orbit.mouseButtons.RIGHT = THREE.MOUSE.PAN
orbit.update()

const hemi = new THREE.HemisphereLight(0xc4d9ff, 0x20222b, 1.8)
scene.add(hemi)
const key = new THREE.DirectionalLight(0xffffff, 3.2)
key.position.set(4, 8, 5)
key.castShadow = true
key.shadow.mapSize.set(1024, 1024)
key.shadow.camera.near = 0.1
key.shadow.camera.far = 30
key.shadow.camera.left = -7
key.shadow.camera.right = 7
key.shadow.camera.top = 7
key.shadow.camera.bottom = -7
scene.add(key)
const rim = new THREE.DirectionalLight(0x88aaff, 1.1)
rim.position.set(-5, 3, -4)
scene.add(rim)

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(50, 50),
  new THREE.ShadowMaterial({ color: 0x05060a, opacity: 0.36 }),
)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

const grid = new THREE.GridHelper(50, 50, 0x5d6472, 0x343844)
grid.material.transparent = true
grid.material.opacity = 0.52
scene.add(grid)

const subject = new THREE.Group()
subject.position.set(0, 1.05, 0)
scene.add(subject)

const geometry = new RoundedBoxGeometry(2.05, 2.05, 2.05, 6, 0.16)
const material = new THREE.MeshStandardMaterial({
  color: 0xc5cad4,
  metalness: 0.18,
  roughness: 0.3,
})
const mesh = new THREE.Mesh(geometry, material)
mesh.castShadow = true
mesh.receiveShadow = true
subject.add(mesh)

const edges = new THREE.LineSegments(
  new THREE.EdgesGeometry(geometry, 28),
  new THREE.LineBasicMaterial({ color: 0xf4f6fb, transparent: true, opacity: 0.22 }),
)
subject.add(edges)

const transform = new TransformControls(camera, renderer.domElement)
transform.attach(subject)
transform.setMode('translate')
transform.setSize(0.82)
transform.addEventListener('dragging-changed', (event) => {
  orbit.enabled = !event.value
  document.body.classList.toggle('is-transforming', Boolean(event.value))
})
transform.addEventListener('objectChange', updateUI)
const transformHelper = transform.getHelper()
scene.add(transformHelper)

const matrixGrid = document.querySelector<HTMLDivElement>('#matrix-grid')!
const matrixCells = Array.from({ length: 16 }, (_, index) => {
  const cell = document.createElement('span')
  cell.dataset.index = String(index)
  matrixGrid.append(cell)
  return cell
})

const groups = {
  position: document.querySelector<HTMLDivElement>('[data-group="position"]')!,
  rotation: document.querySelector<HTMLDivElement>('[data-group="rotation"]')!,
  scale: document.querySelector<HTMLDivElement>('[data-group="scale"]')!,
}
let scaleLinked = true
let isEditingInput = false

const cleanNumber = (value: number, decimals = 3) => {
  const rounded = Math.abs(value) < 0.0005 ? 0 : value
  return rounded.toFixed(decimals).replace(/\.0+$/, '.000')
}

function setInputValues(group: HTMLDivElement, values: [number, number, number]) {
  const inputs = group.querySelectorAll<HTMLInputElement>('input')
  inputs.forEach((input, index) => {
    if (document.activeElement !== input) input.value = String(Number(values[index].toFixed(3)))
  })
}

function updateUI() {
  subject.updateMatrix()
  const elements = subject.matrix.elements
  matrixCells.forEach((cell, displayIndex) => {
    const row = Math.floor(displayIndex / 4)
    const column = displayIndex % 4
    cell.textContent = cleanNumber(elements[column * 4 + row])
    cell.classList.toggle('changed', Math.abs(elements[column * 4 + row] - (row === column ? 1 : 0)) > 0.0005)
  })
  if (!isEditingInput) {
    setInputValues(groups.position, [subject.position.x, subject.position.y, subject.position.z])
    setInputValues(groups.rotation, [
      THREE.MathUtils.radToDeg(subject.rotation.x),
      THREE.MathUtils.radToDeg(subject.rotation.y),
      THREE.MathUtils.radToDeg(subject.rotation.z),
    ])
    setInputValues(groups.scale, [subject.scale.x, subject.scale.y, subject.scale.z])
  }
}

Object.entries(groups).forEach(([groupName, group]) => {
  group.querySelectorAll<HTMLInputElement>('input').forEach((input) => {
    input.addEventListener('focus', () => { isEditingInput = true })
    input.addEventListener('blur', () => { isEditingInput = false; updateUI() })
    input.addEventListener('input', () => {
      const value = Number(input.value)
      if (!Number.isFinite(value)) return
      const axis = input.dataset.axis as 'x' | 'y' | 'z'
      if (groupName === 'position') subject.position[axis] = value
      if (groupName === 'rotation') subject.rotation[axis] = THREE.MathUtils.degToRad(value)
      if (groupName === 'scale') {
        const safeValue = Math.max(0.01, value)
        if (scaleLinked) subject.scale.setScalar(safeValue)
        else subject.scale[axis] = safeValue
      }
      subject.updateMatrix()
      updateUI()
    })
  })
})

const setMode = (mode: 'translate' | 'rotate' | 'scale') => {
  transform.setMode(mode)
  document.querySelectorAll<HTMLButtonElement>('.tool').forEach((button) => {
    button.classList.toggle('active', button.dataset.mode === mode)
  })
}

document.querySelectorAll<HTMLButtonElement>('.tool').forEach((button) => {
  button.addEventListener('click', () => setMode(button.dataset.mode as 'translate' | 'rotate' | 'scale'))
})

document.querySelector('#space-toggle')!.addEventListener('click', () => {
  const nextSpace = transform.space === 'world' ? 'local' : 'world'
  transform.setSpace(nextSpace)
  document.querySelector('#space-label')!.textContent = nextSpace === 'world' ? 'World' : 'Local'
})

document.querySelector('#link-scale')!.addEventListener('click', (event) => {
  scaleLinked = !scaleLinked
  ;(event.currentTarget as HTMLButtonElement).classList.toggle('active', scaleLinked)
})

const resetTransform = () => {
  subject.position.set(0, 1.05, 0)
  subject.rotation.set(0, 0, 0)
  subject.scale.set(1, 1, 1)
  updateUI()
}
document.querySelector('#reset-button')!.addEventListener('click', resetTransform)
document.querySelector('#reset-wide')!.addEventListener('click', resetTransform)

document.querySelector('#copy-button')!.addEventListener('click', async () => {
  subject.updateMatrix()
  const values = Array.from({ length: 4 }, (_, row) =>
    Array.from({ length: 4 }, (_, column) => cleanNumber(subject.matrix.elements[column * 4 + row])).join(', '),
  )
  const text = `[\n  ${values.join(',\n  ')}\n]`
  await navigator.clipboard.writeText(text)
  const button = document.querySelector<HTMLButtonElement>('#copy-button')!
  button.classList.add('copied')
  button.querySelector('span')!.textContent = 'Copied!'
  window.setTimeout(() => {
    button.classList.remove('copied')
    button.querySelector('span')!.textContent = 'Copy matrix'
  }, 1300)
})

const cameraViews: Record<string, THREE.Vector3> = {
  iso: new THREE.Vector3(7.5, 5.8, 8.5),
  front: new THREE.Vector3(0, 2.8, 10),
  right: new THREE.Vector3(10, 2.8, 0),
  top: new THREE.Vector3(0.001, 11, 0.001),
}
let cameraAnimation: { start: THREE.Vector3; end: THREE.Vector3; started: number } | null = null
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((button) => {
  button.addEventListener('click', () => {
    const direction = cameraViews[button.dataset.view!].clone().normalize()
    const distance = camera.position.distanceTo(orbit.target)
    cameraAnimation = {
      start: camera.position.clone(),
      end: orbit.target.clone().add(direction.multiplyScalar(distance)),
      started: performance.now(),
    }
  })
})

document.addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLInputElement) return
  const keyName = event.key.toLowerCase()
  if (keyName === 'g') setMode('translate')
  if (keyName === 'r') setMode('rotate')
  if (keyName === 's') setMode('scale')
  if (keyName === 'escape') resetTransform()
})
viewport.addEventListener('contextmenu', (event) => event.preventDefault())

const resize = () => {
  const { width, height } = viewport.getBoundingClientRect()
  camera.aspect = width / Math.max(height, 1)
  camera.updateProjectionMatrix()
  renderer.setSize(width, height, false)
}
new ResizeObserver(resize).observe(viewport)

const clock = new THREE.Clock()
const animate = () => {
  requestAnimationFrame(animate)
  if (cameraAnimation) {
    const elapsed = (performance.now() - cameraAnimation.started) / 550
    const t = Math.min(1, elapsed)
    const eased = 1 - Math.pow(1 - t, 3)
    camera.position.lerpVectors(cameraAnimation.start, cameraAnimation.end, eased)
    camera.lookAt(orbit.target)
    if (t >= 1) cameraAnimation = null
  }
  orbit.update(clock.getDelta())
  renderer.render(scene, camera)
}

updateUI()
resize()
animate()
