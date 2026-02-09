# Kosmos — Figma Wireframe Renderer

Plugin de Figma que convierte especificaciones JSON (WireframeSpec) en wireframes interactivos de alta fidelidad, con componentes vectoriales, iconos SVG y auto-layout nativo de Figma.

## Para que sirve

Kosmos forma parte de un pipeline de generacion automatica de wireframes:

1. El usuario describe su proyecto en el **backoffice** (Next.js)
2. Un **agente de IA** (LangGraph + GPT-4o) analiza los user flows y features del MVP y genera un JSON estructurado (WireframeSpec)
3. El JSON se guarda en **Supabase**
4. **Kosmos** lee el JSON desde Supabase y lo renderiza como frames profesionales en Figma

El resultado son wireframes achromatic (escala de grises) en formato mobile (375x812px) listos para iterar en Figma.

## Caracteristicas

### 30 componentes renderizables

| Categoria | Componentes |
|-----------|-------------|
| **Layout y Navegacion** | `navbar`, `bottomNav`, `tabs`, `divider`, `spacer`, `dotIndicator`, `buttonRow`, `statusIcon` |
| **Contenido** | `text` (heading/subheading/body/caption/link), `rectangle`, `icon`, `avatar`, `profileHeader`, `statsRow`, `avatarRow` |
| **Interactivos** | `button` (primary/secondary/text), `input`, `searchBar`, `dropdown`, `toggle`, `checkbox`, `radio`, `segmentedControl`, `socialLoginRow` |
| **Contenedores** | `card`, `list`, `listItem`, `settingsItem` |
| **Feedback** | `modal`, `toast` |

### 18 iconos SVG vectoriales

Todos renderizados como `VectorNode` nativo de Figma (no imagenes rasterizadas):

`home`, `heart`, `search`, `settings`, `bell`, `chat`, `person`, `image`, `star`, `bookmark`, `bag`, `chevron_right`, `chevron_down`, `back_arrow`, `menu`, `check`, `close_x`, `warning`

### Sistema de componentes maestros

Al ejecutarse, el plugin crea una pagina `.kosmos-components` con `ComponentNode` maestros:
- **KosmosIcon_{name}** — Un componente por icono
- **KosmosImagePlaceholder** — Rectangulo con icono de montaña centrado
- **KosmosAvatar** — Circulo con silueta de persona
- **KosmosButtonPrimary** — Boton oscuro con texto blanco
- **KosmosButtonSecondary** — Boton con borde y texto oscuro

Los renderers usan `createInstance()` para garantizar consistencia visual.

### Layout de 3 capas por pantalla

Cada screen se estructura como:

```
[ Outer Frame (375x812, sin padding) ]
  [ Navbar — edge-to-edge, fijo arriba ]
  [ Content Frame — padding 16px, layoutGrow=1, scrollable ]
  [ BottomNav — edge-to-edge, fijo abajo ]
```

Esto garantiza que el `bottomNav` siempre quede pegado al fondo y el contenido ocupe todo el espacio disponible.

## Patrones de pantalla soportados

El agente de IA genera wireframes usando patrones probados:

- **Login / Signup** — Logo + form + spacer + boton pinned + social login
- **Onboarding** — Ilustracion + texto + dotIndicator + Skip/Next
- **Home / Dashboard** — Hero banner + cards + tabs + lista destacada + bottomNav
- **Perfil / Settings** — profileHeader + statsRow + settings list + bottomNav
- **Detalle** — Hero image + titulo + body + botones + lista relacionada
- **Status / Resultado** — statusIcon (check/error/warning) + detalles + buttonRow

## Paleta de colores

Wireframes achromaticos con la siguiente paleta:

| Token | Color | Uso |
|-------|-------|-----|
| `primary` | `#212121` | Texto principal, fills oscuros |
| `secondary` | `#616161` | Texto secundario |
| `muted` | `#9E9E9E` | Captions, placeholders |
| `border` | `#E0E0E0` | Bordes, separadores |
| `fill` | `#F5F5F5` | Fondos de placeholder |
| `bg` | `#FAFAFA` | Fondos sutiles |
| `white` | `#FFFFFF` | Fondo de pantalla |

## Estructura del proyecto

```
Kosmos/
  code.ts        — Plugin principal (~1200 lineas): renderers, iconos, componentes
  ui.html        — Interfaz del plugin: selector de proyecto + paste manual de JSON
  manifest.json  — Configuracion del plugin (permisos de red para Supabase)
  package.json   — Dependencias (TypeScript, Figma typings)
  tsconfig.json  — Configuracion de TypeScript
```

## Formato del JSON (WireframeSpec)

El plugin espera un JSON con esta estructura:

```json
{
  "screens": [
    {
      "id": "screen_login",
      "name": "Pantalla de Login",
      "description": "Autenticacion del usuario",
      "layout": {
        "type": "vertical",
        "padding": 16,
        "gap": 12,
        "components": [
          { "type": "navbar", "components": [{ "type": "icon", "label": "back_arrow" }] },
          { "type": "rectangle", "label": "Logo", "height": 140 },
          { "type": "text", "content": "Iniciar Sesion", "style": "heading" },
          { "type": "input", "label": "Email", "placeholder": "nombre@ejemplo.com" },
          { "type": "input", "label": "Contraseña", "placeholder": "********" },
          { "type": "spacer" },
          { "type": "button", "label": "Iniciar Sesion", "variant": "primary" },
          { "type": "socialLoginRow", "items": ["G", "f", "T"] }
        ]
      }
    }
  ]
}
```

## Instalacion y desarrollo

```bash
# Instalar dependencias
npm install

# Compilar TypeScript
npm run build

# Compilar en modo watch (desarrollo)
npm run watch
```

Para cargar el plugin en Figma:
1. Abrir Figma Desktop
2. Menu > Plugins > Development > Import plugin from manifest
3. Seleccionar `manifest.json` de este directorio
4. Ejecutar el plugin desde el menu de plugins

## UI del plugin

El plugin tiene dos modos de uso:

- **Selector de proyecto**: Conecta con Supabase, lista los proyectos disponibles y carga el wireframe generado por el agente de IA
- **JSON manual**: Pegar directamente un WireframeSpec JSON para renderizar

## Stack tecnologico

- **Figma Plugin API** — Creacion programatica de frames, vectores y componentes
- **TypeScript** — Tipado estatico
- **Supabase** — Backend para lectura de wireframes generados
- **LangGraph + GPT-4o** — Agente de IA que genera el WireframeSpec (en repo separado)
