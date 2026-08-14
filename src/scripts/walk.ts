/**
 * Entry point for the 3D viewer. Deliberately light: three and the whole room
 * construction live in ./viewer3d, downloaded only when the visitor presses
 * "Recorrer el interior en 3D". The legacy did the same by injecting a <script>
 * from a CDN.
 */
import { byId } from '../lib/data';

type Viewer = typeof import('./viewer3d');
let viewer: Viewer | null = null;

export async function openWalk(id: string) {
  const n = byId[id];
  if (!n || n.gallery.length < 2) return;

  const bg = document.getElementById('svBg')!;
  bg.classList.add('open');
  document.body.style.overflow = 'hidden';
  document.getElementById('svTitle')!.textContent = 'Interior simulado · ' + n.name;
  const loading = document.getElementById('svLoading')!;
  loading.style.display = 'flex';

  try {
    viewer ??= await import('./viewer3d');
  } catch {
    alert('No se pudo cargar el motor 3D (¿sin conexión?)');
    closeWalk();
    return;
  }
  viewer.buildRoom(n);
}

export function closeWalk() {
  document.getElementById('svBg')!.classList.remove('open');
  document.body.style.overflow = '';
  viewer?.stopRoom();
}

document.getElementById('svExit')!.onclick = closeWalk;
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.getElementById('svBg')!.classList.contains('open')) {
    closeWalk();
  }
});
