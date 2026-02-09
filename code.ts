// Kosmos — Wireframe Renderer for Figma
// Receives WireframeSpec JSON from UI and renders low-fidelity screens on the canvas.

// ─── Types ───────────────────────────────────────────────────────────

interface WireframeComponent {
  type: string;
  label?: string;
  content?: string;
  placeholder?: string;
  style?: string;
  variant?: string;
  width?: string | number;
  height?: number;
  fill?: string;
  items?: number | string[];
  itemType?: string;
  components?: WireframeComponent[];
}

interface WireframeScreen {
  id: string;
  name: string;
  description?: string;
  sourceUserflow?: string;
  layout: {
    type: string;
    padding?: number;
    gap?: number;
    components: WireframeComponent[];
  };
}

interface WireframeSpec {
  projectName: string;
  platform?: 'mobile' | 'web';
  style: {
    palette: string[];
    fidelity: string;
    cornerRadius: number;
    fontFamily?: string;
    baseFontSize?: number;
  };
  screens: WireframeScreen[];
  navigation?: { from: string; to: string; trigger: string; label: string }[];
}

interface PluginMessage {
  type: string;
  spec?: WireframeSpec;
}

// ─── Color Palette (achromatic) ──────────────────────────────────────

const C = {
  white:    { r: 1,    g: 1,    b: 1 },
  bg:       { r: 0.96, g: 0.96, b: 0.96 },
  fill:     { r: 0.88, g: 0.88, b: 0.88 },
  border:   { r: 0.74, g: 0.74, b: 0.74 },
  muted:    { r: 0.62, g: 0.62, b: 0.62 },
  secondary:{ r: 0.46, g: 0.46, b: 0.46 },
  dark:     { r: 0.38, g: 0.38, b: 0.38 },
  primary:  { r: 0.26, g: 0.26, b: 0.26 },
  black:    { r: 0.13, g: 0.13, b: 0.13 },
};

// Dimensions are set dynamically based on platform (mobile vs web)
let SCREEN_W = 375;
let SCREEN_H = 812;
let CONTENT_W = SCREEN_W - 32; // padding * 2
const SCREEN_GAP = 100;
const R = 4; // corner radius

function setDimensions(platform: 'mobile' | 'web' = 'mobile'): void {
  if (platform === 'web') {
    SCREEN_W = 1440;
    SCREEN_H = 900;
    CONTENT_W = SCREEN_W - 160; // 80*2 padding for web
  } else {
    SCREEN_W = 375;
    SCREEN_H = 812;
    CONTENT_W = SCREEN_W - 32; // 16*2 padding for mobile
  }
}

// ─── Vector Icon System ──────────────────────────────────────────────
// SVG path data for common wireframe icons, authored in 24x24 coordinate space.

const ICON_PATHS: Record<string, string> = {
  image:         'M 3 5 C 3 3.9 3.9 3 5 3 L 19 3 C 20.1 3 21 3.9 21 5 L 21 19 C 21 20.1 20.1 21 19 21 L 5 21 C 3.9 21 3 20.1 3 19 Z M 6 17 L 10 12 L 13 16 L 16 12 L 20 17 Z M 8 9 C 8.55 9 9 8.55 9 8 C 9 7.45 8.55 7 8 7 C 7.45 7 7 7.45 7 8 C 7 8.55 7.45 9 8 9 Z',
  person:        'M 12 12 C 14.21 12 16 10.21 16 8 C 16 5.79 14.21 4 12 4 C 9.79 4 8 5.79 8 8 C 8 10.21 9.79 12 12 12 Z M 12 14 C 8.67 14 2 15.67 2 19 L 2 20 L 22 20 L 22 19 C 22 15.67 15.33 14 12 14 Z',
  home:          'M 12 3 L 2 12 L 5 12 L 5 21 L 10 21 L 10 15 L 14 15 L 14 21 L 19 21 L 19 12 L 22 12 Z',
  heart:         'M 12 21 L 10.55 19.7 C 5.4 15.12 2 12.09 2 8.5 C 2 5.47 4.42 3 7.5 3 C 9.24 3 10.91 3.81 12 5.08 C 13.09 3.81 14.76 3 16.5 3 C 19.58 3 22 5.47 22 8.5 C 22 12.09 18.6 15.12 13.45 19.7 Z',
  search:        'M 10 2 C 5.59 2 2 5.59 2 10 C 2 14.41 5.59 18 10 18 C 11.85 18 13.55 17.37 14.93 16.31 L 20.31 21.69 L 21.69 20.31 L 16.31 14.93 C 17.37 13.55 18 11.85 18 10 C 18 5.59 14.41 2 10 2 Z M 10 4 C 13.31 4 16 6.69 16 10 C 16 13.31 13.31 16 10 16 C 6.69 16 4 13.31 4 10 C 4 6.69 6.69 4 10 4 Z',
  settings:      'M 12 8 C 9.79 8 8 9.79 8 12 C 8 14.21 9.79 16 12 16 C 14.21 16 16 14.21 16 12 C 16 9.79 14.21 8 12 8 Z',
  bell:          'M 12 22 C 13.1 22 14 21.1 14 20 L 10 20 C 10 21.1 10.9 22 12 22 Z M 18 16 L 18 11 C 18 7.93 16.36 5.36 13.5 4.68 L 13.5 4 C 13.5 3.17 12.83 2.5 12 2.5 C 11.17 2.5 10.5 3.17 10.5 4 L 10.5 4.68 C 7.63 5.36 6 7.92 6 11 L 6 16 L 4 18 L 4 19 L 20 19 L 20 18 Z',
  chat:          'M 20 2 L 4 2 C 2.9 2 2 2.9 2 4 L 2 22 L 6 18 L 20 18 C 21.1 18 22 17.1 22 16 L 22 4 C 22 2.9 21.1 2 20 2 Z',
  chevron_right: 'M 9 6 L 15 12 L 9 18',
  chevron_down:  'M 6 9 L 12 15 L 18 9',
  back_arrow:    'M 15 6 L 9 12 L 15 18',
  menu:          'M 3 6 L 21 6 M 3 12 L 21 12 M 3 18 L 21 18',
  star:          'M 12 2 L 15.09 8.26 L 22 9.27 L 17 14.14 L 18.18 21.02 L 12 17.77 L 5.82 21.02 L 7 14.14 L 2 9.27 L 8.91 8.26 Z',
  bookmark:      'M 17 3 L 7 3 C 5.9 3 5 3.9 5 5 L 5 21 L 12 18 L 19 21 L 19 5 C 19 3.9 18.1 3 17 3 Z',
  bag:           'M 18 6 L 16 6 C 16 3.79 14.21 2 12 2 C 9.79 2 8 3.79 8 6 L 6 6 C 4.9 6 4 6.9 4 8 L 4 20 C 4 21.1 4.9 22 6 22 L 18 22 C 19.1 22 20 21.1 20 20 L 20 8 C 20 6.9 19.1 6 18 6 Z M 12 4 C 13.1 4 14 4.9 14 6 L 10 6 C 10 4.9 10.9 4 12 4 Z',
  check:         'M 6 12 L 10 16 L 18 8',
  close_x:       'M 6 6 L 18 18 M 18 6 L 6 18',
  warning:       'M 11 4 L 13 4 L 13 14 L 11 14 Z M 11 16 L 13 16 L 13 18 L 11 18 Z',
};

// Icons that use strokes (open paths) instead of fills
const STROKE_ICONS = new Set(['chevron_right', 'chevron_down', 'back_arrow', 'menu', 'check', 'close_x']);

function createIconVector(iconName: string, size: number, color: RGB): VectorNode {
  const pathData = ICON_PATHS[iconName] || ICON_PATHS['star'];
  const v = figma.createVector();
  v.name = iconName;
  // Set paths first, then resize (Figma scales paths on resize)
  v.vectorPaths = [{ windingRule: 'NONZERO', data: pathData }];
  v.resize(size, size);

  if (STROKE_ICONS.has(iconName)) {
    v.fills = [];
    v.strokes = [{ type: 'SOLID', color }];
    v.strokeWeight = 2;
    v.strokeCap = 'ROUND' as StrokeCap;
    v.strokeJoin = 'ROUND' as StrokeJoin;
  } else {
    v.fills = fill(color);
    v.strokes = [];
  }

  return v;
}

// Icon name aliases for common labels from the wireframe agent
const ICON_ALIAS: Record<string, string> = {
  notifications: 'bell',
  notification: 'bell',
  close: 'back_arrow',
  back: 'back_arrow',
  hamburger: 'menu',
  favorite: 'heart',
  favourites: 'heart',
  cart: 'bag',
  shopping: 'bag',
  profile: 'person',
  user: 'person',
  account: 'person',
};

function resolveIconName(label: string): string {
  const normalized = label.toLowerCase().replace(/[^a-z_]/g, '');
  if (ICON_PATHS[normalized]) return normalized;
  if (ICON_ALIAS[normalized]) return ICON_ALIAS[normalized];
  return 'star'; // fallback
}

// Map Spanish bottom nav labels to icon names
const BOTTOM_NAV_ICON_MAP: Record<string, string> = {
  inicio: 'home', home: 'home',
  buscar: 'search', search: 'search',
  favoritos: 'heart', favorites: 'heart',
  perfil: 'person', profile: 'person',
  ajustes: 'settings', settings: 'settings',
  mensajes: 'chat', messages: 'chat', chat: 'chat',
  notificaciones: 'bell', notifications: 'bell',
  carrito: 'bag', cart: 'bag',
  guardados: 'bookmark', saved: 'bookmark',
};

function resolveBottomNavIcon(label: string): string {
  const key = label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return BOTTOM_NAV_ICON_MAP[key] || 'star';
}

// ─── Component Library ───────────────────────────────────────────────
// Master components are created on a ".kosmos-components" page and cached.

const masterComponents: Record<string, ComponentNode> = {};

async function ensureComponentLibrary(): Promise<void> {
  // Check if page already exists
  let libPage: PageNode | undefined;
  for (const page of figma.root.children) {
    if (page.name === '.kosmos-components') {
      libPage = page as PageNode;
      break;
    }
  }

  if (libPage) {
    await libPage.loadAsync();
    // Retrieve existing components
    for (const child of libPage.children) {
      if (child.type === 'COMPONENT') {
        masterComponents[child.name] = child as ComponentNode;
      }
    }
    // If we have the key components, skip creation
    if (masterComponents['KosmosImagePlaceholder'] && masterComponents['KosmosAvatar']) {
      return;
    }
  } else {
    libPage = figma.createPage();
    libPage.name = '.kosmos-components';
  }

  // Switch to lib page to create components
  const originalPage = figma.currentPage;
  await figma.setCurrentPageAsync(libPage);

  await createMasterComponents(libPage);

  // Switch back
  await figma.setCurrentPageAsync(originalPage);
}

async function createMasterComponents(page: PageNode): Promise<void> {
  let xPos = 0;
  const GAP = 60;

  // 1. Icon components
  for (const iconName of Object.keys(ICON_PATHS)) {
    const compName = `KosmosIcon_${iconName}`;
    if (masterComponents[compName]) { xPos += GAP; continue; }

    const comp = figma.createComponent();
    comp.name = compName;
    comp.resize(24, 24);
    comp.layoutMode = 'VERTICAL';
    comp.primaryAxisAlignItems = 'CENTER';
    comp.counterAxisAlignItems = 'CENTER';
    comp.primaryAxisSizingMode = 'FIXED';
    comp.counterAxisSizingMode = 'FIXED';
    comp.fills = [];

    const icon = createIconVector(iconName, 20, C.muted);
    comp.appendChild(icon);

    comp.x = xPos;
    page.appendChild(comp);
    masterComponents[compName] = comp;
    xPos += GAP;
  }

  // 2. Image Placeholder (rounded rect with mountain icon)
  if (!masterComponents['KosmosImagePlaceholder']) {
    const comp = figma.createComponent();
    comp.name = 'KosmosImagePlaceholder';
    comp.resize(200, 120);
    comp.layoutMode = 'VERTICAL';
    comp.primaryAxisAlignItems = 'CENTER';
    comp.counterAxisAlignItems = 'CENTER';
    comp.primaryAxisSizingMode = 'FIXED';
    comp.counterAxisSizingMode = 'FIXED';
    comp.fills = fill(C.fill);
    comp.cornerRadius = 8;

    const icon = createIconVector('image', 32, C.muted);
    comp.appendChild(icon);

    comp.x = xPos; comp.y = 80;
    page.appendChild(comp);
    masterComponents['KosmosImagePlaceholder'] = comp;
    xPos += 260;
  }

  // 3. Avatar (circle with person icon)
  if (!masterComponents['KosmosAvatar']) {
    const comp = figma.createComponent();
    comp.name = 'KosmosAvatar';
    comp.resize(40, 40);
    comp.layoutMode = 'VERTICAL';
    comp.primaryAxisAlignItems = 'CENTER';
    comp.counterAxisAlignItems = 'CENTER';
    comp.primaryAxisSizingMode = 'FIXED';
    comp.counterAxisSizingMode = 'FIXED';
    comp.fills = fill(C.fill);
    comp.cornerRadius = 20;

    const icon = createIconVector('person', 20, C.muted);
    comp.appendChild(icon);

    comp.x = xPos; comp.y = 80;
    page.appendChild(comp);
    masterComponents['KosmosAvatar'] = comp;
    xPos += 100;
  }
}

// ─── Core Helpers ────────────────────────────────────────────────────

function fill(color: RGB): SolidPaint[] {
  return [{ type: 'SOLID', color }];
}

function stroke(color: RGB): SolidPaint[] {
  return [{ type: 'SOLID', color }];
}

async function txt(
  chars: string,
  size: number,
  color: RGB,
  bold = false
): Promise<TextNode> {
  const t = figma.createText();
  t.fontName = { family: 'Inter', style: bold ? 'Bold' : 'Regular' };
  t.characters = chars || ' ';
  t.fontSize = size;
  t.fills = fill(color);
  t.textAutoResize = 'HEIGHT';
  return t;
}

function box(
  name: string,
  dir: 'VERTICAL' | 'HORIZONTAL',
  pad: number,
  gap: number
): FrameNode {
  const f = figma.createFrame();
  f.name = name;
  f.layoutMode = dir;
  f.paddingLeft = pad;
  f.paddingRight = pad;
  f.paddingTop = pad;
  f.paddingBottom = pad;
  f.itemSpacing = gap;
  f.primaryAxisSizingMode = 'AUTO';
  f.counterAxisSizingMode = 'AUTO';
  f.fills = [];
  return f;
}

function fillW(node: SceneNode): void {
  if ('layoutSizingHorizontal' in node) {
    (node as any).layoutSizingHorizontal = 'FILL';
  }
}

// ─── Component Renderers ─────────────────────────────────────────────

async function renderNavbar(comp: WireframeComponent): Promise<FrameNode> {
  const nav = box('Navbar', 'HORIZONTAL', 12, 8);
  nav.counterAxisAlignItems = 'CENTER';
  nav.fills = fill(C.white);
  nav.primaryAxisSizingMode = 'AUTO';
  nav.counterAxisSizingMode = 'FIXED';
  nav.resize(CONTENT_W, 52);

  if (comp.components && comp.components.length > 0) {
    for (const child of comp.components) {
      if (child.type === 'text') {
        const t = await txt(child.content || 'Title', 17, C.black, true);
        t.layoutGrow = 1;
        nav.appendChild(t);
      } else {
        // Vector icon instead of gray rectangle
        const iconName = resolveIconName(child.label || 'menu');
        const icon = renderIconNode(iconName, 24, C.primary);
        nav.appendChild(icon);
      }
    }
  } else {
    const backIcon = renderIconNode('back_arrow', 24, C.primary);
    nav.appendChild(backIcon);
    const t = await txt(comp.label || 'Screen', 17, C.black, true);
    t.layoutGrow = 1;
    nav.appendChild(t);
  }

  return nav;
}

// Helper: creates an icon node (instance or inline vector)
function renderIconNode(iconName: string, size: number, color: RGB): SceneNode {
  const compName = `KosmosIcon_${iconName}`;
  const master = masterComponents[compName];
  if (master) {
    const inst = master.createInstance();
    inst.name = iconName;
    if (size !== 24) inst.resize(size, size);
    return inst;
  }
  // Fallback: inline vector
  const wrapper = box('Icon', 'VERTICAL', 0, 0);
  wrapper.resize(size, size);
  wrapper.primaryAxisSizingMode = 'FIXED';
  wrapper.counterAxisSizingMode = 'FIXED';
  wrapper.primaryAxisAlignItems = 'CENTER';
  wrapper.counterAxisAlignItems = 'CENTER';
  const v = createIconVector(iconName, size, color);
  wrapper.appendChild(v);
  return wrapper;
}

async function renderText(comp: WireframeComponent): Promise<TextNode> {
  const styles: Record<string, [number, RGB, boolean]> = {
    heading:    [22, C.primary,   true],
    subheading: [17, C.primary,   true],
    body:       [14, C.black,     false],
    caption:    [12, C.muted,     false],
    link:       [14, C.dark,      false],
  };
  const [sz, col, b] = styles[comp.style || 'body'] || styles.body;
  return txt(comp.content || comp.label || 'Text', sz, col, b);
}

function renderRectangle(comp: WireframeComponent): SceneNode {
  const master = masterComponents['KosmosImagePlaceholder'];
  if (master) {
    const inst = master.createInstance();
    inst.name = comp.label || 'Placeholder';
    inst.resize(CONTENT_W, comp.height || 120);
    return inst;
  }
  // Fallback
  const r = figma.createRectangle();
  r.name = comp.label || 'Placeholder';
  r.resize(CONTENT_W, comp.height || 120);
  r.fills = fill(C.fill);
  r.cornerRadius = R;
  return r;
}

async function renderInput(comp: WireframeComponent): Promise<FrameNode> {
  const wrapper = box(comp.label || 'Input', 'VERTICAL', 0, 4);

  if (comp.label) {
    const lbl = await txt(comp.label, 12, C.secondary, true);
    wrapper.appendChild(lbl);
    fillW(lbl);
  }

  const field = box('Field', 'HORIZONTAL', 12, 0);
  field.fills = fill(C.bg);
  field.strokes = stroke(C.border);
  field.strokeWeight = 1;
  field.cornerRadius = R;
  field.counterAxisAlignItems = 'CENTER';
  field.counterAxisSizingMode = 'FIXED';
  field.resize(CONTENT_W, 44);

  const ph = await txt(comp.placeholder || 'Placeholder', 14, C.muted);
  field.appendChild(ph);

  wrapper.appendChild(field);
  fillW(field);

  return wrapper;
}

async function renderButton(comp: WireframeComponent): Promise<FrameNode> {
  const v = comp.variant || 'primary';
  const btn = box(comp.label || 'Button', 'HORIZONTAL', 0, 0);
  btn.counterAxisAlignItems = 'CENTER';
  btn.primaryAxisAlignItems = 'CENTER';
  btn.paddingLeft = 16;
  btn.paddingRight = 16;
  btn.paddingTop = 12;
  btn.paddingBottom = 12;
  btn.cornerRadius = 6;

  if (v === 'primary') {
    btn.fills = fill(C.primary);
    const t = await txt(comp.label || 'Button', 14, C.white, true);
    btn.appendChild(t);
  } else if (v === 'secondary') {
    btn.fills = fill(C.white);
    btn.strokes = stroke(C.primary);
    btn.strokeWeight = 1;
    const t = await txt(comp.label || 'Button', 14, C.primary, true);
    btn.appendChild(t);
  } else {
    const t = await txt(comp.label || 'Button', 14, C.dark);
    btn.appendChild(t);
  }

  return btn;
}

function renderDivider(): RectangleNode {
  const d = figma.createRectangle();
  d.name = 'Divider';
  d.resize(CONTENT_W, 1);
  d.fills = fill(C.fill);
  return d;
}

async function renderCard(comp: WireframeComponent): Promise<FrameNode> {
  const card = box(comp.label || 'Card', 'VERTICAL', 12, 8);
  card.fills = fill(C.bg);
  card.strokes = stroke(C.fill);
  card.strokeWeight = 1;
  card.cornerRadius = 8;

  // Image placeholder with mountain icon
  const imgMaster = masterComponents['KosmosImagePlaceholder'];
  if (imgMaster) {
    const img = imgMaster.createInstance();
    img.name = 'CardImage';
    img.resize(CONTENT_W, 80);
    card.appendChild(img);
    fillW(img);
  } else {
    const img = figma.createRectangle();
    img.name = 'CardImage';
    img.resize(CONTENT_W, 80);
    img.fills = fill(C.fill);
    img.cornerRadius = R;
    card.appendChild(img);
    fillW(img);
  }

  const title = await txt(comp.label || 'Card Title', 14, C.primary, true);
  card.appendChild(title);
  fillW(title);

  const sub = await txt('Descripcion del contenido', 12, C.muted);
  card.appendChild(sub);
  fillW(sub);

  return card;
}

async function renderListItem(comp: WireframeComponent): Promise<FrameNode> {
  const row = box(comp.label || 'ListItem', 'HORIZONTAL', 12, 12);
  row.counterAxisAlignItems = 'CENTER';
  row.counterAxisSizingMode = 'FIXED';
  row.resize(CONTENT_W, 64);

  // Avatar with person icon
  const avatarNode = renderAvatar();
  row.appendChild(avatarNode);

  // Text stack
  const textStack = box('TextStack', 'VERTICAL', 0, 2);
  textStack.fills = [];
  const title = await txt(comp.label || 'List Item', 14, C.primary, true);
  textStack.appendChild(title);
  fillW(title);
  const sub = await txt('Descripcion del elemento', 12, C.muted);
  textStack.appendChild(sub);
  fillW(sub);
  row.appendChild(textStack);
  textStack.layoutGrow = 1;
  (textStack as any).layoutSizingHorizontal = 'FILL';

  // Chevron
  const chevron = renderIconNode('chevron_right', 20, C.border);
  row.appendChild(chevron);

  return row;
}

async function renderList(comp: WireframeComponent): Promise<FrameNode> {
  const list = box(comp.label || 'List', 'VERTICAL', 0, 0);

  const count = typeof comp.items === 'number' ? Math.min(comp.items, 5) : 3;
  for (let i = 0; i < count; i++) {
    let row: FrameNode;
    if (comp.itemType === 'settings') {
      row = await renderSettingsListItem({
        type: 'settingsItem',
        label: `${comp.label || 'Opcion'} ${i + 1}`,
      });
    } else {
      row = await renderListItem({
        type: 'listItem',
        label: `${comp.label || 'Item'} ${i + 1}`,
      });
    }
    list.appendChild(row);
    fillW(row);

    if (i < count - 1) {
      const div = renderDivider();
      list.appendChild(div);
      fillW(div);
    }
  }

  return list;
}

function renderIcon(comp: WireframeComponent): SceneNode {
  const iconName = resolveIconName(comp.label || 'star');
  return renderIconNode(iconName, 24, C.muted);
}

async function renderBottomNav(comp: WireframeComponent): Promise<FrameNode> {
  const nav = box('BottomNav', 'HORIZONTAL', 0, 0);
  nav.fills = fill(C.white);
  nav.strokes = stroke(C.fill);
  nav.strokeWeight = 1;
  nav.counterAxisSizingMode = 'FIXED';
  nav.resize(CONTENT_W, 56);
  nav.primaryAxisAlignItems = 'SPACE_BETWEEN';
  nav.counterAxisAlignItems = 'CENTER';
  nav.paddingLeft = 16;
  nav.paddingRight = 16;

  const items = Array.isArray(comp.items) ? comp.items : ['Home', 'Search', 'Profile'];
  for (const item of items) {
    const col = box(item, 'VERTICAL', 4, 2);
    col.counterAxisAlignItems = 'CENTER';

    // Vector icon mapped from label
    const iconName = resolveBottomNavIcon(item);
    const icon = renderIconNode(iconName, 20, C.muted);
    col.appendChild(icon);

    const label = await txt(item, 10, C.muted);
    col.appendChild(label);

    nav.appendChild(col);
  }

  return nav;
}

async function renderTabs(comp: WireframeComponent): Promise<FrameNode> {
  const tabs = box('Tabs', 'HORIZONTAL', 0, 0);
  tabs.fills = fill(C.white);
  tabs.strokes = stroke(C.fill);
  tabs.strokeWeight = 1;
  tabs.counterAxisSizingMode = 'FIXED';
  tabs.resize(CONTENT_W, 40);
  tabs.primaryAxisAlignItems = 'SPACE_BETWEEN';
  tabs.counterAxisAlignItems = 'CENTER';
  tabs.paddingLeft = 8;
  tabs.paddingRight = 8;

  const items = Array.isArray(comp.items) ? comp.items : ['Tab 1', 'Tab 2', 'Tab 3'];
  for (let i = 0; i < items.length; i++) {
    const tab = box(items[i], 'VERTICAL', 8, 2);
    tab.counterAxisAlignItems = 'CENTER';

    const label = await txt(items[i], 13, i === 0 ? C.primary : C.muted, i === 0);
    tab.appendChild(label);

    if (i === 0) {
      const line = figma.createRectangle();
      line.name = 'Active';
      line.resize(30, 2);
      line.fills = fill(C.primary);
      tab.appendChild(line);
      fillW(line);
    }

    tabs.appendChild(tab);
  }

  return tabs;
}

function renderToggle(): FrameNode {
  const f = box('Toggle', 'HORIZONTAL', 2, 0);
  f.resize(44, 24);
  f.primaryAxisSizingMode = 'FIXED';
  f.counterAxisSizingMode = 'FIXED';
  f.fills = fill(C.border);
  f.cornerRadius = 12;
  f.counterAxisAlignItems = 'CENTER';

  const knob = figma.createEllipse();
  knob.name = 'Knob';
  knob.resize(20, 20);
  knob.fills = fill(C.white);
  f.appendChild(knob);

  return f;
}

function renderCheckbox(): RectangleNode {
  const r = figma.createRectangle();
  r.name = 'Checkbox';
  r.resize(20, 20);
  r.fills = fill(C.white);
  r.strokes = stroke(C.border);
  r.strokeWeight = 2;
  r.cornerRadius = R;
  return r;
}

function renderRadio(): EllipseNode {
  const e = figma.createEllipse();
  e.name = 'Radio';
  e.resize(20, 20);
  e.fills = fill(C.white);
  e.strokes = stroke(C.border);
  e.strokeWeight = 2;
  return e;
}

function renderAvatar(): SceneNode {
  const master = masterComponents['KosmosAvatar'];
  if (master) {
    return master.createInstance();
  }
  // Fallback
  const e = figma.createEllipse();
  e.name = 'Avatar';
  e.resize(40, 40);
  e.fills = fill(C.fill);
  return e;
}

async function renderSearchBar(comp: WireframeComponent): Promise<FrameNode> {
  const bar = box('SearchBar', 'HORIZONTAL', 12, 8);
  bar.fills = fill(C.bg);
  bar.strokes = stroke(C.border);
  bar.strokeWeight = 1;
  bar.cornerRadius = R;
  bar.counterAxisAlignItems = 'CENTER';
  bar.counterAxisSizingMode = 'FIXED';
  bar.resize(CONTENT_W, 44);

  // Vector search icon
  const icon = renderIconNode('search', 16, C.muted);
  bar.appendChild(icon);

  const ph = await txt(comp.placeholder || comp.label || 'Buscar...', 14, C.muted);
  bar.appendChild(ph);

  return bar;
}

async function renderDropdown(comp: WireframeComponent): Promise<FrameNode> {
  const wrapper = box(comp.label || 'Dropdown', 'VERTICAL', 0, 4);

  if (comp.label) {
    const lbl = await txt(comp.label, 12, C.secondary, true);
    wrapper.appendChild(lbl);
    fillW(lbl);
  }

  const field = box('DropdownField', 'HORIZONTAL', 12, 0);
  field.fills = fill(C.bg);
  field.strokes = stroke(C.border);
  field.strokeWeight = 1;
  field.cornerRadius = R;
  field.counterAxisAlignItems = 'CENTER';
  field.primaryAxisAlignItems = 'SPACE_BETWEEN';
  field.counterAxisSizingMode = 'FIXED';
  field.resize(CONTENT_W, 44);

  const ph = await txt(comp.placeholder || 'Seleccionar...', 14, C.muted);
  field.appendChild(ph);

  // Chevron down icon instead of gray square
  const arrow = renderIconNode('chevron_down', 12, C.muted);
  field.appendChild(arrow);

  wrapper.appendChild(field);
  fillW(field);

  return wrapper;
}

async function renderModal(comp: WireframeComponent): Promise<FrameNode> {
  const modal = box('Modal', 'VERTICAL', 24, 16);
  modal.fills = fill(C.white);
  modal.strokes = stroke(C.border);
  modal.strokeWeight = 1;
  modal.cornerRadius = 8;

  const title = await txt(comp.label || 'Modal', 17, C.primary, true);
  modal.appendChild(title);
  fillW(title);

  const body = await txt(comp.content || 'Contenido del modal', 14, C.black);
  modal.appendChild(body);
  fillW(body);

  const btn = await renderButton({ type: 'button', label: 'Aceptar', variant: 'primary' });
  modal.appendChild(btn);
  fillW(btn);

  return modal;
}

async function renderToast(comp: WireframeComponent): Promise<FrameNode> {
  const toast = box('Toast', 'HORIZONTAL', 12, 8);
  toast.fills = fill(C.primary);
  toast.cornerRadius = R;
  toast.counterAxisAlignItems = 'CENTER';
  toast.paddingTop = 10;
  toast.paddingBottom = 10;

  const t = await txt(comp.content || comp.label || 'Notificacion', 14, C.white);
  toast.appendChild(t);

  return toast;
}

// Profile Header — large centered avatar + name + subtitle + optional button
async function renderProfileHeader(comp: WireframeComponent): Promise<FrameNode> {
  const header = box('ProfileHeader', 'VERTICAL', 0, 8);
  header.counterAxisAlignItems = 'CENTER';

  // Large avatar (72x72)
  const avatarMaster = masterComponents['KosmosAvatar'];
  if (avatarMaster) {
    const av = avatarMaster.createInstance();
    av.name = 'ProfileAvatar';
    av.resize(72, 72);
    header.appendChild(av);
  } else {
    const e = figma.createEllipse();
    e.name = 'ProfileAvatar';
    e.resize(72, 72);
    e.fills = fill(C.fill);
    header.appendChild(e);
  }

  // Name
  const name = await txt(comp.label || 'Nombre Usuario', 18, C.primary, true);
  header.appendChild(name);

  // Subtitle / bio
  if (comp.content) {
    const bio = await txt(comp.content, 13, C.muted);
    header.appendChild(bio);
  }

  // Edit button (skip if variant is "none")
  if (comp.variant !== 'none') {
    const btn = await renderButton({
      type: 'button',
      label: comp.placeholder || 'Editar Perfil',
      variant: 'secondary',
    });
    header.appendChild(btn);
  }

  return header;
}

// Stats Row — horizontal counters (e.g., "120 Posts | 340 Siguiendo | 1.2k Seguidores")
async function renderStatsRow(comp: WireframeComponent): Promise<FrameNode> {
  const row = box('StatsRow', 'HORIZONTAL', 0, 0);
  row.primaryAxisAlignItems = 'SPACE_BETWEEN';
  row.counterAxisAlignItems = 'CENTER';

  const items = Array.isArray(comp.items)
    ? comp.items
    : ['120 Posts', '340 Siguiendo', '1.2k Seguidores'];

  for (let i = 0; i < items.length; i++) {
    const stat = box(items[i], 'VERTICAL', 8, 2);
    stat.counterAxisAlignItems = 'CENTER';
    stat.layoutGrow = 1;

    // Parse "123 Label" format
    const parts = items[i].split(' ');
    const number = parts[0] || '0';
    const label = parts.slice(1).join(' ') || 'Items';

    const numText = await txt(number, 18, C.primary, true);
    stat.appendChild(numText);

    const labelText = await txt(label, 12, C.muted);
    stat.appendChild(labelText);

    row.appendChild(stat);

    if (i < items.length - 1) {
      const div = figma.createRectangle();
      div.name = 'StatDivider';
      div.resize(1, 32);
      div.fills = fill(C.fill);
      row.appendChild(div);
    }
  }

  return row;
}

// Avatar Row — horizontal row of small avatars (friends/followers preview)
async function renderAvatarRow(comp: WireframeComponent): Promise<FrameNode> {
  const row = box('AvatarRow', 'HORIZONTAL', 0, 8);
  row.counterAxisAlignItems = 'CENTER';

  const count = typeof comp.items === 'number' ? Math.min(comp.items, 6) : 4;
  for (let i = 0; i < count; i++) {
    const av = renderAvatar();
    row.appendChild(av);
  }

  // "+N more" text
  if (comp.content) {
    const more = await txt(comp.content, 12, C.muted);
    row.appendChild(more);
  }

  return row;
}

// Settings List Item — icon + label + trailing (chevron or toggle)
async function renderSettingsListItem(comp: WireframeComponent): Promise<FrameNode> {
  const row = box(comp.label || 'SettingsItem', 'HORIZONTAL', 12, 12);
  row.counterAxisAlignItems = 'CENTER';
  row.counterAxisSizingMode = 'FIXED';
  row.resize(CONTENT_W, 52);

  // Left icon
  const iconName = resolveIconName(comp.label || 'settings');
  const icon = renderIconNode(iconName, 20, C.muted);
  row.appendChild(icon);

  // Label
  const label = await txt(comp.label || 'Opcion', 14, C.primary, false);
  row.appendChild(label);
  label.layoutGrow = 1;
  (label as any).layoutSizingHorizontal = 'FILL';

  // Trailing: toggle or chevron
  if (comp.variant === 'toggle') {
    const toggle = renderToggle();
    row.appendChild(toggle);
  } else {
    const chevron = renderIconNode('chevron_right', 20, C.border);
    row.appendChild(chevron);
  }

  return row;
}

// Status Icon — large circle with check/X/warning icon for result screens
function renderStatusIcon(comp: WireframeComponent): FrameNode {
  const wrapper = box('StatusIcon', 'VERTICAL', 0, 0);
  wrapper.counterAxisAlignItems = 'CENTER';

  const variant = comp.variant || 'success';
  let iconName = 'check';
  if (variant === 'error') iconName = 'close_x';
  else if (variant === 'warning') iconName = 'warning';

  // Circle container (72x72)
  const circle = figma.createFrame();
  circle.name = `Status_${variant}`;
  circle.resize(72, 72);
  circle.layoutMode = 'VERTICAL';
  circle.primaryAxisAlignItems = 'CENTER';
  circle.counterAxisAlignItems = 'CENTER';
  circle.primaryAxisSizingMode = 'FIXED';
  circle.counterAxisSizingMode = 'FIXED';
  circle.cornerRadius = 36;
  circle.fills = fill(C.white);
  circle.strokes = stroke(C.border);
  circle.strokeWeight = 2;

  const icon = createIconVector(iconName, 32, C.primary);
  circle.appendChild(icon);

  wrapper.appendChild(circle);
  return wrapper;
}

// Dot Indicator — pagination dots for onboarding/carousel screens
function renderDotIndicator(comp: WireframeComponent): FrameNode {
  const row = box('DotIndicator', 'HORIZONTAL', 0, 8);
  row.primaryAxisAlignItems = 'CENTER';
  row.counterAxisAlignItems = 'CENTER';

  const count = typeof comp.items === 'number' ? comp.items : 3;
  for (let i = 0; i < count; i++) {
    const dot = figma.createEllipse();
    dot.name = `Dot${i}`;
    dot.resize(8, 8);
    dot.fills = fill(i === 0 ? C.primary : C.fill);
    row.appendChild(dot);
  }

  return row;
}

// Button Row — horizontal row of buttons (e.g., "Skip" + "Next >", or "Cancel" + "Retry")
// variant: "text" (default, all text buttons), "mixed" (last=primary, rest=secondary)
async function renderButtonRow(comp: WireframeComponent): Promise<FrameNode> {
  const row = box('ButtonRow', 'HORIZONTAL', 0, 8);
  row.primaryAxisAlignItems = 'SPACE_BETWEEN';
  row.counterAxisAlignItems = 'CENTER';

  const items = Array.isArray(comp.items) ? comp.items : ['Omitir', 'Siguiente'];
  const rowVariant = comp.variant || 'text';

  for (let i = 0; i < items.length; i++) {
    let btnVariant = 'text';
    if (rowVariant === 'mixed') {
      btnVariant = i === items.length - 1 ? 'primary' : 'secondary';
    }

    const btn = await renderButton({
      type: 'button',
      label: items[i],
      variant: btnVariant,
    });

    if (rowVariant === 'mixed') {
      btn.layoutGrow = 1;
    }

    row.appendChild(btn);
  }

  return row;
}

// Spacer — invisible frame that grows to fill remaining vertical space.
// Use between content and a bottom-pinned button to push it down.
function renderSpacer(): FrameNode {
  const spacer = figma.createFrame();
  spacer.name = 'Spacer';
  spacer.fills = [];
  spacer.layoutGrow = 1;
  spacer.layoutMode = 'VERTICAL';
  spacer.primaryAxisSizingMode = 'AUTO';
  spacer.counterAxisSizingMode = 'AUTO';
  return spacer;
}

// Segmented Control — pill with 2-3 options, first one active (dark fill)
async function renderSegmentedControl(comp: WireframeComponent): Promise<FrameNode> {
  const container = box('SegmentedControl', 'HORIZONTAL', 3, 0);
  container.fills = fill(C.bg);
  container.strokes = stroke(C.fill);
  container.strokeWeight = 1;
  container.cornerRadius = 22;
  container.counterAxisAlignItems = 'CENTER';
  container.counterAxisSizingMode = 'FIXED';
  container.resize(CONTENT_W, 44);

  const items = Array.isArray(comp.items) ? comp.items : ['Login', 'Signup'];
  for (let i = 0; i < items.length; i++) {
    const seg = box(items[i], 'HORIZONTAL', 0, 0);
    seg.primaryAxisAlignItems = 'CENTER';
    seg.counterAxisAlignItems = 'CENTER';
    seg.cornerRadius = 20;
    seg.layoutGrow = 1;
    (seg as any).layoutSizingVertical = 'FILL';

    if (i === 0) {
      seg.fills = fill(C.primary);
      const t = await txt(items[i], 13, C.white, true);
      seg.appendChild(t);
    } else {
      seg.fills = [];
      const t = await txt(items[i], 13, C.secondary, false);
      seg.appendChild(t);
    }

    container.appendChild(seg);
  }

  return container;
}

// Social Login Row — row of small circular icons (G, f, T, etc.)
async function renderSocialLoginRow(comp: WireframeComponent): Promise<FrameNode> {
  const row = box('SocialLogin', 'HORIZONTAL', 0, 16);
  row.primaryAxisAlignItems = 'CENTER';
  row.counterAxisAlignItems = 'CENTER';

  const items = Array.isArray(comp.items) ? comp.items : ['G', 'f', 'T'];
  for (const item of items) {
    const circle = box(item, 'HORIZONTAL', 0, 0);
    circle.resize(44, 44);
    circle.primaryAxisSizingMode = 'FIXED';
    circle.counterAxisSizingMode = 'FIXED';
    circle.cornerRadius = 22;
    circle.fills = fill(C.white);
    circle.strokes = stroke(C.border);
    circle.strokeWeight = 1;
    circle.primaryAxisAlignItems = 'CENTER';
    circle.counterAxisAlignItems = 'CENTER';

    const t = await txt(item, 16, C.primary, true);
    circle.appendChild(t);

    row.appendChild(circle);
  }

  return row;
}

// ─── Component Dispatcher ────────────────────────────────────────────

async function renderComponent(comp: WireframeComponent): Promise<SceneNode> {
  switch (comp.type) {
    case 'navbar':           return renderNavbar(comp);
    case 'text':             return renderText(comp);
    case 'rectangle':        return renderRectangle(comp);
    case 'input':            return renderInput(comp);
    case 'button':           return renderButton(comp);
    case 'divider':          return renderDivider();
    case 'list':             return renderList(comp);
    case 'card':             return renderCard(comp);
    case 'icon':             return renderIcon(comp);
    case 'listItem':         return renderListItem(comp);
    case 'bottomNav':        return renderBottomNav(comp);
    case 'tabs':             return renderTabs(comp);
    case 'toggle':           return renderToggle();
    case 'checkbox':         return renderCheckbox();
    case 'radio':            return renderRadio();
    case 'avatar':           return renderAvatar();
    case 'searchBar':        return renderSearchBar(comp);
    case 'dropdown':         return renderDropdown(comp);
    case 'modal':            return renderModal(comp);
    case 'toast':            return renderToast(comp);
    case 'spacer':           return renderSpacer();
    case 'segmentedControl': return renderSegmentedControl(comp);
    case 'socialLoginRow':   return renderSocialLoginRow(comp);
    case 'profileHeader':    return renderProfileHeader(comp);
    case 'statsRow':         return renderStatsRow(comp);
    case 'avatarRow':        return renderAvatarRow(comp);
    case 'settingsItem':     return renderSettingsListItem(comp);
    case 'dotIndicator':     return renderDotIndicator(comp);
    case 'buttonRow':        return renderButtonRow(comp);
    case 'statusIcon':       return renderStatusIcon(comp);
    default: {
      const r = figma.createRectangle();
      r.name = comp.type || 'Unknown';
      r.resize(CONTENT_W, 44);
      r.fills = fill(C.fill);
      r.cornerRadius = R;
      return r;
    }
  }
}

// ─── Screen Renderer ─────────────────────────────────────────────────

async function renderScreen(screen: WireframeScreen, xOffset: number): Promise<FrameNode> {
  const padding = screen.layout.padding || 16;
  const gap = screen.layout.gap || 12;
  const components = screen.layout.components;

  // Detect chrome components (edge-to-edge, pinned to top/bottom)
  const hasNavbar = components.length > 0 && components[0].type === 'navbar';
  const hasBottomNav = components.length > 0 && components[components.length - 1].type === 'bottomNav';

  // Outer frame: NO padding — navbar and bottomNav go edge-to-edge
  const frame = figma.createFrame();
  frame.name = screen.name;
  frame.resize(SCREEN_W, SCREEN_H);
  frame.x = xOffset;
  frame.y = 0;
  frame.fills = fill(C.white);
  frame.layoutMode = 'VERTICAL';
  frame.paddingLeft = 0;
  frame.paddingRight = 0;
  frame.paddingTop = 0;
  frame.paddingBottom = 0;
  frame.itemSpacing = 0;
  frame.primaryAxisSizingMode = 'FIXED';
  frame.counterAxisSizingMode = 'FIXED';
  frame.clipsContent = true;

  // 1. Navbar — edge-to-edge at top
  let startIdx = 0;
  if (hasNavbar) {
    try {
      const nav = await renderComponent(components[0]);
      frame.appendChild(nav);
      fillW(nav);
    } catch (err) {
      console.error('[Kosmos] Error rendering navbar:', err);
    }
    startIdx = 1;
  }

  // 2. Content area — has padding, grows to fill remaining space
  const endIdx = hasBottomNav ? components.length - 1 : components.length;
  const contentComponents = components.slice(startIdx, endIdx);

  const content = figma.createFrame();
  content.name = 'Content';
  content.layoutMode = 'VERTICAL';
  content.paddingLeft = padding;
  content.paddingRight = padding;
  content.paddingTop = padding;
  content.paddingBottom = padding;
  content.itemSpacing = gap;
  content.primaryAxisSizingMode = 'AUTO';
  content.counterAxisSizingMode = 'AUTO';
  content.fills = [];
  content.layoutGrow = 1; // GROW to fill space between navbar and bottomNav

  for (const comp of contentComponents) {
    try {
      const node = await renderComponent(comp);
      content.appendChild(node);
      fillW(node);
    } catch (err) {
      console.error(`[Kosmos] Error rendering ${comp.type}:`, err);
    }
  }

  frame.appendChild(content);
  fillW(content);

  // 3. BottomNav — edge-to-edge, pinned to bottom
  if (hasBottomNav) {
    try {
      const nav = await renderComponent(components[components.length - 1]);
      frame.appendChild(nav);
      fillW(nav);
    } catch (err) {
      console.error('[Kosmos] Error rendering bottomNav:', err);
    }
  }

  figma.currentPage.appendChild(frame);
  return frame;
}

// ─── Main ────────────────────────────────────────────────────────────

figma.showUI(__html__, { width: 420, height: 520 });

figma.ui.onmessage = async (msg: PluginMessage) => {
  if (msg.type === 'cancel') {
    figma.closePlugin();
    return;
  }

  if (msg.type === 'render-wireframes' && msg.spec) {
    const spec = msg.spec;
    const allFrames: SceneNode[] = [];

    setDimensions(spec.platform || 'mobile');

    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
    await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });

    // Initialize component library (creates master components on first run)
    figma.ui.postMessage({ type: 'progress', message: 'Preparing component library...' });
    await ensureComponentLibrary();

    figma.ui.postMessage({ type: 'progress', message: `Rendering ${spec.screens.length} ${spec.platform || 'mobile'} screens...` });

    for (let i = 0; i < spec.screens.length; i++) {
      const screen = spec.screens[i];
      figma.ui.postMessage({ type: 'progress', message: `${screen.name} (${i + 1}/${spec.screens.length})` });
      const frame = await renderScreen(screen, i * (SCREEN_W + SCREEN_GAP));
      allFrames.push(frame);
    }

    figma.currentPage.selection = allFrames;
    figma.viewport.scrollAndZoomIntoView(allFrames);
    figma.ui.postMessage({ type: 'done', message: `${spec.screens.length} screens rendered.` });
  }
};
